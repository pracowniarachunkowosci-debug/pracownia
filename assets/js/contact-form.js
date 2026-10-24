/* Shared contact form. Routing/key stay in HTML; no persistent attribution storage. */
(function () {
  function init() {
    // Explicit contracts preserve each DOM id while distinguishing pages in GTM.
    var contracts = {
      home: {id: 'leadForm', source: 'strona-glowna', label: 'home_form'},
      ecommerce: {id: 'ecommerceForm', source: 'ksiegowosc-ecommerce', label: 'landing_ecommerce_form'},
      spolka: {id: 'spolkaForm', source: 'ksiegowosc-spolka-z-oo', label: 'landing_spolka_z_oo_form'}
    };
    document.querySelectorAll('form[data-contact-form]').forEach(function (form) {
      var contract = Object.prototype.hasOwnProperty.call(contracts, form.dataset.contactForm) && contracts[form.dataset.contactForm];
      if (!contract || form.dataset.contactInitialized) return;
      form.dataset.contactInitialized = 'true';
      initForm(form, contract);
    });
  }

  function initForm(form, contract) {
    var service = form.dataset.contactForm === 'home' ? new URLSearchParams(window.location.search).get('service') : null;
    var fromFinance = service === 'zewnetrzny-dzial-finansowy';
    var fromTransfer = service === 'zmiana-biura-2027';
    var source = fromTransfer ? 'zmiana-biura-2027' : (fromFinance ? 'zewnetrzny-dzial-finansowy' : contract.source);
    if (form.elements.inquiry_source) form.elements.inquiry_source.value = source;
    if (fromFinance || fromTransfer) {
      form.setAttribute('aria-label', fromTransfer ? 'Zmiana biura rachunkowego od stycznia 2027' : 'Zapytanie o zewnętrzny dział finansowy');
      var note = document.querySelector('.hp-form-note');
      if (note) note.setAttribute('tabindex', '-1');
      function showContact() {
        // Avoid a long smooth scroll through the homepage; do not interrupt someone already using it.
        if (!note || window.location.hash !== '#kontakt' || document.activeElement !== document.body) return;
        document.getElementById('kontakt').scrollIntoView({behavior: 'instant', block: 'start'});
        note.focus({preventScroll: true});
      }
      if (document.readyState === 'complete') showContact();
      else window.addEventListener('load', showContact, {once: true});
      if (form.elements.topic) form.elements.topic.value = fromTransfer ? 'Zmiana biura rachunkowego' : 'Zewnętrzny dział finansowy';
      if (form.elements.subject) form.elements.subject.value = fromTransfer ? 'Zmiana biura rachunkowego od stycznia 2027 - nowe zapytanie' : 'Zewnętrzny dział finansowy - nowe zapytanie';
      var contact = document.querySelector('.hp-contact');
      if (contact) contact.classList.add(fromTransfer ? 'hp-contact--transfer' : 'hp-contact--zdf');
      if (note) note.textContent = fromTransfer ? 'Zgłoszenie na pełną księgowość od stycznia 2027. Opisz spółkę, skalę operacji i stan ksiąg. Termin i zakres potwierdzamy indywidualnie. Sprawozdanie i CIT-8 za 2026 spółka ustala z dotychczasową obsługą; Pracownia nie przejmuje tych zadań. Audyt, weryfikację ksiąg i korekty wyceniamy osobno.' : 'Zapytanie o zewnętrzny dział finansowy. Pełna księgowość: zgłoszenia na start od stycznia 2027, z terminem potwierdzanym po ocenie dokumentów. Raportowanie, controlling i audyt możemy omówić osobno.';
    }
    // Without these APIs the unchanged action/method still submit directly to Web3Forms.
    if (!window.fetch || !window.FormData || !window.AbortController) return;
    var button = form.querySelector('button[type="submit"]');
    var status = form.querySelector('[data-form-status]');
    var next = form.querySelector('[data-form-next]');
    if (!button || !status) return;
    var buttonLabel = button.textContent;
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
        // GTM owns delivery to GA4/Ads. One explicit success event avoids relying
        // on gtag's default destination group or firing conversions on submit.
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'web3forms_success',
          event_category: 'lead', event_label: contract.label,
          form_id: contract.id, inquiry_source: source
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
        if (!response.ok || !result || result.success !== true) {
          setStatus('System nie potwierdził przyjęcia zapytania. Dane pozostały w formularzu. Spróbuj później lub skontaktuj się z nami telefonicznie: +48 504 853 962.', 'error');
          return;
        }
        completed = true;
        setStatus('System przyjął Twoje zapytanie. Dziękujemy — skontaktujemy się w sprawie dalszych ustaleń.', 'success');
        if (next) next.hidden = false;
        form.reset();
        measureSuccess();
      } catch (error) {
        setStatus('Nie udało się potwierdzić przyjęcia zapytania. Dane pozostały w formularzu. Sprawdź połączenie. Przed ponowną wysyłką możesz potwierdzić odbiór telefonicznie: +48 504 853 962.', 'error');
      } finally {
        clearTimeout(timeout);
        pending = false;
        form.removeAttribute('aria-busy');
        button.disabled = completed;
        button.textContent = completed ? 'Zapytanie przyjęte' : buttonLabel;
        status.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
