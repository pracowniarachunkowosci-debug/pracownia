// main.js — wersja bez MailerLite, z Meta Pixel zostawionym pod kampanie
// Meta Pixel ładuje się dopiero po zgodzie marketingowej/analitycznej.

document.addEventListener("DOMContentLoaded", function () {
  // Rok w stopce
  var year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Menu mobilne — obsługa wariantów używanych w projekcie
  var menu = document.getElementById("mainMenu");
  var burger = document.querySelector(".hp-burger") || document.querySelector(".hamburger");

  if (menu && burger) {
    function setMenu(open) {
      menu.classList.toggle("is-open", open);
      menu.classList.toggle("active", open);
      document.body.classList.toggle("menu-open", open);
      burger.classList.toggle("is-active", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    }

    burger.addEventListener("click", function () {
      var isOpen = menu.classList.contains("is-open") || menu.classList.contains("active");
      setMenu(!isOpen);
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setMenu(false);
      }
    });
  }

  // Przenoszenie UTM-ów i kliknięć reklam do ukrytych pól formularza
  var params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (key) {
    var input = document.querySelector('input[name="' + key + '"]');
    var value = params.get(key);
    if (input && value) {
      input.value = value;
    }
  });

  // Podstawowa walidacja formularza
  var leadForm = document.getElementById("leadForm") || document.querySelector("form");
  var formSuccess = document.getElementById("formSuccess");

  if (leadForm) {
    leadForm.addEventListener("submit", function (event) {
      var name = document.getElementById("name");
      var company = document.getElementById("company");
      var email = document.getElementById("email");
      var message = document.getElementById("message");
      var consent = leadForm.querySelector('input[name="consent"]') || document.getElementById("consent");

      var errors = [];

      if (name && name.value.trim().length < 2) {
        errors.push("Podaj imię i nazwisko.");
        name.style.borderColor = "red";
      }

      if (company && company.value.trim().length < 2) {
        errors.push("Podaj nazwę firmy.");
        company.style.borderColor = "red";
      }

      if (email && (!email.value.includes("@") || email.value.trim().length < 6)) {
        errors.push("Podaj poprawny adres e-mail.");
        email.style.borderColor = "red";
      }

      if (message && message.value.trim().length < 10) {
        errors.push("Wiadomość musi mieć minimum 10 znaków.");
        message.style.borderColor = "red";
      }

      if (consent && !consent.checked) {
        errors.push("Zaznacz zgodę na przetwarzanie danych.");
      }

      if (errors.length) {
        event.preventDefault();
        alert(errors.join("\n"));
        return;
      }

      // Event lead dla GA4/GTM
      if (typeof gtag === "function") {
        gtag("event", "generate_lead");
      }

      // Event lead dla Meta Pixel — tylko jeśli pixel został załadowany po zgodzie
      if (typeof fbq === "function") {
        fbq("track", "Lead");
      }

      var button = leadForm.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
        button.textContent = "Wysyłanie...";
      }

      if (formSuccess) {
        setTimeout(function () {
          formSuccess.style.display = "block";
          if (button) {
            button.disabled = false;
            button.textContent = "Wyślij zapytanie";
          }
        }, 1200);
      }
    });
  }

  // Consent Mode + Meta Pixel
  var consentKey = "cookieConsent";
  var legacyConsentKey = "cookie-consent";
  var banner = document.getElementById("cookie-banner");
  var acceptAll = document.getElementById("acceptAll") || document.getElementById("accept-all");
  var acceptEssential = document.getElementById("acceptEssential") || document.getElementById("accept-essential");

  function updateGoogleConsent(granted) {
    if (typeof gtag === "function") {
      gtag("consent", "update", {
        ad_storage: granted ? "granted" : "denied",
        analytics_storage: granted ? "granted" : "denied",
        ad_user_data: granted ? "granted" : "denied",
        ad_personalization: granted ? "granted" : "denied"
      });
    }
  }

  function loadMetaPixel() {
    if (window.fbq) return;

    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments);};
      if(!f._fbq)f._fbq=n;
      n.push=n;
      n.loaded=!0;
      n.version="2.0";
      n.queue=[];
      t=b.createElement(e);
      t.async=!0;
      t.src=v;
      s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    fbq("init", "2249646038845826");
    fbq("track", "PageView");
  }

  function hideBanner() {
    if (banner) {
      banner.style.display = "none";
    }
  }

  function showBanner() {
    if (banner) {
      banner.style.display = "block";
    }
  }

  var savedConsent = localStorage.getItem(consentKey) || localStorage.getItem(legacyConsentKey);

  if (!savedConsent) {
    showBanner();
  } else if (savedConsent === "all") {
    updateGoogleConsent(true);
    loadMetaPixel();
    hideBanner();
  } else {
    updateGoogleConsent(false);
    hideBanner();
  }

  if (acceptAll) {
    acceptAll.addEventListener("click", function () {
      localStorage.setItem(consentKey, "all");
      localStorage.setItem(legacyConsentKey, "all");
      updateGoogleConsent(true);
      loadMetaPixel();
      hideBanner();
    });
  }

  if (acceptEssential) {
    acceptEssential.addEventListener("click", function () {
      localStorage.setItem(consentKey, "essential");
      localStorage.setItem(legacyConsentKey, "essential");
      updateGoogleConsent(false);
      hideBanner();
    });
  }

  window.resetConsent = function () {
    localStorage.removeItem(consentKey);
    localStorage.removeItem(legacyConsentKey);
    window.location.reload();
  };
});
