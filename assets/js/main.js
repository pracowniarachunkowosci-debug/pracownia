(function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[]).push(arguments);},
  l=d.createElement(e),l.async=1,l.src=u,
  n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n)})
  (window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');
  ml('account', '1873815');

window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);} gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');

!function(f,b,e,v,n,t,s){
  if(f.fbq)return;
  n=f.fbq=function(){
    n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)
  };
  if(!f._fbq)f._fbq=n;
  n.push=n;
  n.loaded=!0;
  n.version='2.0';
  n.queue=[];
  t=b.createElement(e);
  t.async=!0;
  t.src=v;
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s);
}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '2249646038845826');
fbq('track', 'PageView');


// Ustaw rok w stopce
    document.getElementById('year').textContent = new Date().getFullYear();

    // Formularz -> mailto (działa bez backendu). Podmień EMAIL na właściwy.
    const EMAIL = 'biuro@pracownia-rachunkowosci.pl';
    const form = document.getElementById('leadForm');
    const toast = document.getElementById('formToast');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get('name');
      const company = data.get('company');
      const email = data.get('email');
      const phone = data.get('phone') || '-';
      const message = data.get('message');
      const consent = document.getElementById('consent').checked;

      if (!consent) { alert('Zaznacz zgodę RODO.'); return; }

      const subject = encodeURIComponent('Zapytanie – Pracownia Rachunkowości');
      const body = encodeURIComponent(
        `Imię i nazwisko: ${name}\nFirma: ${company}\nE-mail: ${email}\nTelefon: ${phone}\n\nWiadomość:\n${message}`
      );

      const href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
      window.location.href = href;
      toast.style.display = 'block';
    });

if (typeof ScrollReveal === "function") {
  const sr = ScrollReveal();
  sr.reveal('#opinie .card', {
    origin: 'bottom',
    distance: '40px',
    duration: 700,
    delay: 100,
    interval: 150,
    easing: 'ease-out',
    reset: false
  });

  sr.reveal('#proces .card', {
    origin: 'bottom',
    distance: '40px',
    duration: 700,
    delay: 100,
    interval: 150,
    easing: 'ease-out',
    reset: false
  });
}

document.addEventListener("DOMContentLoaded", () => {
    // === MENU TOGGLE ===
    const menu = document.getElementById("mainMenu");
    const toggleBtn = document.querySelector(".hamburger");

    if (toggleBtn && menu) {
      const setMenuState = (open) => {
        menu.classList.toggle("active", open);
        document.body.classList.toggle("menu-open", open);
        toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
        toggleBtn.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
        toggleBtn.classList.toggle("is-active", open);
      };

      toggleBtn.addEventListener("click", () => {
        const isOpen = menu.classList.contains("active");
        setMenuState(!isOpen);
      });

      menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => setMenuState(false));
      });

      document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          setMenuState(false);
        }
      });

      const desktopMq = window.matchMedia("(min-width: 769px)");
      const handleViewportChange = (event) => {
        if (event.matches) {
          setMenuState(false);
        }
      };
      if (desktopMq.addEventListener) {
        desktopMq.addEventListener("change", handleViewportChange);
      } else if (desktopMq.addListener) {
        desktopMq.addListener(handleViewportChange);
      }

      setMenuState(false);
    }

    // === FORMULARZ WALIDACJA ===
    const form = document.querySelector("form");
    if (form) {
      const name = document.getElementById("name");
      const company = document.getElementById("company");
      const email = document.getElementById("email");
      const phone = document.getElementById("phone");
      const message = document.getElementById("message");
      const consent = document.querySelector("input[name='consent']");

      form.addEventListener("submit", function (e) {
        let valid = true;
        let errors = [];

        form.querySelectorAll("input, textarea").forEach(field => {
          field.style.borderColor = "#E5E7EB";
        });

        if (name.value.trim().length < 2) {
          errors.push("Podaj imię i nazwisko.");
          name.style.borderColor = "red";
          valid = false;
        }

        if (company.value.trim().length < 2) {
          errors.push("Podaj nazwę firmy.");
          company.style.borderColor = "red";
          valid = false;
        }

        if (!email.value.includes("@") || email.value.length < 6) {
          errors.push("Podaj poprawny adres e-mail.");
          email.style.borderColor = "red";
          valid = false;
        }

        if (message.value.trim().length < 10) {
          errors.push("Wiadomość musi mieć min. 10 znakółw.");
          message.style.borderColor = "red";
          valid = false;
        }

        if (!consent.checked) {
          errors.push("Zaznacz zgodę na przetwarzanie danych.");
          valid = false;
        }

        if (!valid) {
          e.preventDefault();
          alert(errors.join("\n"));
        }
      });
    }
  });
