# Google Ads i globalne UPD — plan do osobnej akceptacji

**Nie wykonano żadnego z poniższych zapisów.** Ustawienia konta Ads i globalnego tagu Google działają natychmiast; nie są częścią wersjonowanego workspace 6.

## 1. Dokończenie wariantu A bez enhanced conversions

11.10.2026 odczytano konfigurację wspólnego tagu „księgowość”, identyfikatory `G-H210DZ34Y8`, `GT-NFR3Q2D`, `AW-17646661298`, `GT-NMC3NXLJ`. Ma miejsca docelowe GA4 „pracownia” i konto Google Ads. Panel wyraźnie ostrzega o natychmiastowym skutku zmian.

Włączone są **Zezwalaj na wykorzystywanie danych przekazywanych przez użytkowników**, **Automatycznie wykrywaj dane przekazywane przez użytkowników** oraz wszystkie trzy kategorie: e-mail, telefon, imię/nazwisko/adres. Ręczne selektory są wyłączone. [Dowód odczytu](global-upd-readonly.jpg).

W draft GTM wstrzymano tag 9 i usunięto `user_data` z tagu 5. To usuwa te dwa źródła EC, ale **nie wyłącza globalnego automatycznego UPD**. Preview lokalny potwierdził także blokowane przez fixture próby `ccm/form-data` / `pagead/form-data`, mimo wstrzymanego tagu 9. Nie wysłano ich do kolektorów. Zmienna UPD 8 pozostaje niezmieniona i bez aktywnego użycia przez tagi draft; nie oznacza to, że globalny skaner jest wyłączony.

Po osobnej akceptacji właściciela:

1. Potwierdzić wpływ na oba miejsca docelowe i zapisać stan początkowy globalnego tagu oraz EC w Ads. Nie akceptować nowych warunków usługi.
2. W globalnym tagu wyłączyć zezwolenie na UPD (wraz z automatycznym pozyskiwaniem). Nie dodawać PII do Data Layer ani nowych selektorów.
3. Sprawdzić Ads → Cele → Konwersje → ustawienia konwersji rozszerzonych dla WWW oraz działanie `7402979249`. Odczyt etapu 4 wskazywał „zarządzane przez GTM”. Jeśli EC pozostaje włączone na koncie/działaniu, wyłączyć je w ramach tej samej zaakceptowanej operacji. Sprawdzić pozostałe instalacje tagu i integracje.
4. Ponownie wykonać lokalny Preview z blokadą kolektorów: brak źródeł UPD i prób form-data, tag 9 paused, tag 5 bez user_data. To warunek gotowości pełnego wariantu A; nie jest dowodem odbioru GA4.

[Dokumentacja Google o konfiguracji i wyłączeniu EC](https://support.google.com/google-ads/answer/13262500?hl=en).

## 2. Wyłączenie fałszywej „Rezerwacji terminu” z optymalizacji

Punkt wyjścia z odczytu etapu 4: działanie **7372277673**, `Rezerwacja terminu`, Primary/Podstawowe, uwzględnione w celach konta, import `ads_conversion_Rezerwacja_terminu_1`, reguła odsłony `/blog/zmiana-biura.html`. To nie jest potwierdzenie spotkania. [Szczegóły odczytu](../stage4/ads-review.json).

Po osobnej akceptacji, przed zmianą zapisać listę aktywnych kampanii, ich cele, strategie i bieżące ustawienia; nie zmieniać równocześnie budżetów ani stawek.

1. Zmienić działanie 7372277673 z **Podstawowe** na **Dodatkowe/Secondary**.
2. Usunąć ten fałszywy sygnał z celów domyślnych konta. Jeśli współdzieli kategorię z prawidłowymi działaniami, nie wyłączać bez analizy całej kategorii: pozostawić właściwe Primary, wykluczyć błędne działanie i sprawdzić cel.
3. Przejrzeć **każdą aktywną kampanię**, jej cele specyficzne oraz cele niestandardowe. Usunąć działanie z celów niestandardowych wykorzystywanych do stawek — samo Secondary tego nie gwarantuje.
4. Zweryfikować brak tego działania w konfiguracjach optymalizacji i zapisać dziennik zmian. Historyczne wyniki zachować do audytu; nie usuwać działania ani nie przepisywać historii. Ocenić wpływ na wolumen sygnału i uczenie strategii.
5. Dopiero po uzgodnieniu rozwiązania z Calendly zaprojektować osobne potwierdzenie faktycznie zarezerwowanego terminu. Kliknięcie linku ani odsłona artykułu nie zastępuje rezerwacji.

Google potwierdza, że **Secondary nadal służy do stawek, jeśli jest częścią używanego celu niestandardowego**: [Primary i Secondary](https://support.google.com/google-ads/answer/11461796?hl=en), [cele kampanii](https://support.google.com/google-ads/answer/9143218?hl=en).

## 3. Jedno źródło podstawowej konwersji formularza

Rekomendacja: zachować natywne Ads **7402979249**, `TechSol - Formularz kontaktowy 69747` (One/Jedna), jako pojedynczy podstawowy sygnał potwierdzonego formularza po odbiorze. GTM tag 5 ma historycznie inną nazwę `...45209`, ale ID konwersji `17646661298` i label `_YKtCLH_gcobELLdyt5B` pasują do działania.

Istniejący import `pracownia (web) lead_formularz`, **7382427293**, pozostawić Secondary. Nie dodawać `generate_lead` jako drugiego Primary tego samego zgłoszenia. Ewentualne zmiany kluczowych zdarzeń/importów GA4 wymagają osobnej decyzji. Reguły tworzenia `lead_formularz` w GA4 i wyjątki kampanii nie zostały jeszcze kompletnie sprawdzone; nie deklarować braku duplikacji na poziomie całego konta wyłącznie na podstawie draft GTM.
