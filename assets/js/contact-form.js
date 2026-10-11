/* Shared contact form. Routing/key stay in HTML; no persistent attribution storage. */
(function () {
  function init() {
    var form = document.getElementById('leadForm');
    if (!form) return;
    var fromFinance = new URLSearchParams(window.location.search).get('service') === 'zewnetrzny-dzial-finansowy';
    var source = fromFinance ? 'zewnetrzny-dzial-finansowy' : 'strona-glowna';
    form.elements.inquiry_source.value = source;
    if (fromFinance) {
      form.setAttribute('aria-label', 'Zapytanie o zewnętrzny dział finansowy');
      var note = document.querySelector('.hp-form-note');
      note.setAttribute('tabindex', '-1');
      function showContact() {
        // Avoid a long smooth scroll through the homepage; do not interrupt someone already using it.
        if (window.location.hash !== '#kontakt' || document.activeElement !== document.body) return;
        document.getElementById('kontakt').scrollIntoView({behavior: 'instant', block: 'start'});
        note.focus({preventScroll: true});
      }
      if (document.readyState === 'complete') showContact();
      else window.addEventListener('load', showContact, {once: true});
      form.elements.topic.value = 'Zewnętrzny dział finansowy';
      form.elements.subject.value = 'Zewnętrzny dział finansowy - nowe zapytanie';
      document.querySelector('.hp-contact').classList.add('hp-contact--zdf');
      document.querySelector('.hp-form-note').textContent = 'Zapytanie o zewnętrzny dział finansowy. Pełna księgowość: zgłoszenia na start od stycznia 2027, z terminem potwierdzanym po ocenie dokumentów. Raportowanie, controlling i audyt możemy omówić osobno.';
    }
    // Without these APIs the unchanged action/method still submit directly to Web3Forms.
    if (!window.fetch || !window.FormData || !window.AbortController) return;
    var button = form.querySelector('button[type="submit"]');
    var status = document.getElementById('lead-status');
    var next = document.getElementById('lead-next');
    var pending = false;
    var completed = false;

    function setStatus(message, state) {
      status.textContent = message;
      status.dataset.state = state;
    }

    function measureSuccess() {
      // Only a fixed source label leaves the form; no fields, URL, email or telephone.
      var consent = false;
      try { consent = localStorage.getItem('cookieConsent') === 'all'; } catch (error) { /* Deny by default. */ }
      if (!consent) return;
      // Analytics failure must never turn an accepted request into a form error.
      try {
        if (typeof gtag === 'function') gtag('event', 'generate_lead', {
          event_category: 'lead', event_label: 'home_form',
          form_id: 'leadForm', inquiry_source: source
        });
      } catch (error) { /* The API acceptance remains authoritative. */ }
      try { if (typeof fbq === 'function') fbq('track', 'Lead'); } catch (error) { /* As above. */ }
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (pending || completed || !form.reportValidity()) return;
      pending = true;
      button.disabled = true;
      button.textContent = 'Wysyłanie...';
      form.setAttribute('aria-busy', 'true');
      setStatus('Wysyłamy zapytanie. Poczekaj na potwierdzenie.', 'pending');
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 30000);
      try {
        var payload = Object.fromEntries(new FormData(form));
        // Accept only our own known service identifier, never an arbitrary query value.
        payload.inquiry_source = source;
        var response = await fetch(form.action, {
          method: 'POST', headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: JSON.stringify(payload), signal: controller.signal
        });
        var result = await response.json();
        if (!response.ok || result.success !== true) {
          setStatus('System nie potwierdził przyjęcia zapytania. Dane pozostały w formularzu. Spróbuj później lub skontaktuj się z nami telefonicznie: +48 504 853 962.', 'error');
          return;
        }
        completed = true;
        setStatus('System przyjął Twoje zapytanie. Dziękujemy — skontaktujemy się w sprawie dalszych ustaleń.', 'success');
        next.hidden = false;
        form.reset();
        measureSuccess();
      } catch (error) {
        setStatus('Nie udało się potwierdzić przyjęcia zapytania. Dane pozostały w formularzu. Sprawdź połączenie. Przed ponowną wysyłką możesz potwierdzić odbiór telefonicznie: +48 504 853 962.', 'error');
      } finally {
        clearTimeout(timeout);
        pending = false;
        form.removeAttribute('aria-busy');
        button.disabled = completed;
        button.textContent = completed ? 'Zapytanie przyjęte' : 'Wyślij zapytanie';
        status.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
