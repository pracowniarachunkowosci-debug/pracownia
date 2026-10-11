    document.addEventListener('DOMContentLoaded', function () {
      var year = document.getElementById('year');
      if (year) year.textContent = new Date().getFullYear();

      var menu = document.getElementById('mainMenu');
      var burger = document.querySelector('.burger');

      if (menu && burger) {
        function setMenu(open) {
          menu.classList.toggle('is-open', open);
          burger.classList.toggle('is-active', open);
          burger.setAttribute('aria-expanded', open ? 'true' : 'false');
          burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
        }

        burger.addEventListener('click', function () {
          setMenu(!menu.classList.contains('is-open'));
        });

        menu.querySelectorAll('a').forEach(function (link) {
          link.addEventListener('click', function () { setMenu(false); });
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            setMenu(false);
            burger.focus();
          }
        });
      }

      function hasAnalyticsConsent() {
        try { return localStorage.getItem('cookieConsent') === 'all'; } catch (error) { return false; }
      }

      document.querySelectorAll('.js-track-calendly').forEach(function (link) {
        link.addEventListener('click', function () {
          if (typeof gtag === 'function' && hasAnalyticsConsent()) {
            gtag('event', 'click_calendly', {
              event_category: 'engagement',
              event_label: 'zewnetrzny_dzial_finansowy_calendly',
              cta_location: link.dataset.ctaLocation || 'footer'
            });
          }
        });
      });

      document.querySelectorAll('.js-track-contact').forEach(function (link) {
        link.addEventListener('click', function () {
          if (typeof gtag === 'function' && hasAnalyticsConsent()) {
            gtag('event', 'click_contact', {
              event_category: 'engagement',
              event_label: 'zewnetrzny_dzial_finansowy_form',
              cta_location: link.dataset.ctaLocation
            });
          }
        });
      });

      var consentKey = 'cookieConsent';
      var banner = document.getElementById('cookie-banner');
      var acceptAll = document.getElementById('acceptAll');
      var acceptEssential = document.getElementById('acceptEssential');
      var marketingLoaded = false;

      function updateGoogleConsent(granted) {
        if (typeof gtag !== 'function') return;
        gtag('consent', 'update', {
          ad_storage: granted ? 'granted' : 'denied',
          analytics_storage: granted ? 'granted' : 'denied',
          ad_user_data: granted ? 'granted' : 'denied',
          ad_personalization: granted ? 'granted' : 'denied'
        });
      }

      function loadMetaPixel() {
        if (marketingLoaded || window.fbq) return;
        marketingLoaded = true;
        !function(f,b,e,v,n,t,s){
          if(f.fbq)return;
          n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
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
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '2249646038845826');
        fbq('track', 'PageView');
      }

      function hideBanner() { if (banner) banner.style.display = 'none'; }
      function showBanner() { if (banner) banner.style.display = 'block'; }

      function saveConsent(value) {
        try { localStorage.setItem(consentKey, value); } catch (error) { /* Session-only consent. */ }
      }

      function applySavedConsent() {
        var savedConsent;
        try { savedConsent = localStorage.getItem(consentKey); } catch (error) { /* Ask again. */ }
        if (savedConsent === 'all') {
          updateGoogleConsent(true);
          loadMetaPixel();
          hideBanner();
          return;
        }
        if (savedConsent === 'essential') {
          updateGoogleConsent(false);
          hideBanner();
          return;
        }
        showBanner();
      }

      if (acceptAll) {
        acceptAll.addEventListener('click', function () {
          saveConsent('all');
          updateGoogleConsent(true);
          loadMetaPixel();
          hideBanner();
        });
      }

      if (acceptEssential) {
        acceptEssential.addEventListener('click', function () {
          saveConsent('essential');
          updateGoogleConsent(false);
          hideBanner();
        });
      }

      window.resetCookieConsent = function () {
        try { localStorage.removeItem(consentKey); } catch (error) { /* Already unavailable. */ }
        window.location.reload();
      };

      applySavedConsent();
    });
