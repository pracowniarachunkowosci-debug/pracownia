# Etap 3 — diagnoza GA4 / Google Ads i przygotowanie naprawy

11.10.2026. [Instrukcja właściciela](https://github.com/pracowniarachunkowosci-debug/pracownia/pull/19#issuecomment-6108690869). Zmiany wyłącznie na gałęzi PR #19. **0 kolejnych rzeczywistych leadów, 0 testowych konwersji wysłanych do Google, 0 zmian zapisanych w GTM.** Bez publikacji, merge, Calendly i GrowthOS.

**Ponowna weryfikacja przed synchronizacją:** po zgodzie właściciela kontrola uprawnień znów pozwoliła uruchomić polecenia Git. Potwierdzono gałąź `codex/zewnetrzny-dzial-finansowy`, bazowy HEAD PR `e69debbf1d495992b8db766fd6dedd41788421d1` i niezmienione `main` (`0bc0dec2f70753f2093fca645092de1910c32395`). Ponownie wykonano regresję integracji oraz testy formularza: **23 kontrole PASS, 30 atrap, 0 rzeczywistych wysyłek**, przebieg **11.10.2026, 14:26:59 CEST**. Pliki wyników i zrzut poniżej dotyczą tego przebiegu. Lokalny serwer testowy zatrzymano. Zmiany GTM i publikacja pozostają poza zakresem tej synchronizacji.

## Aktualny stan

| Warstwa | Status |
| --- | --- |
| API accepted | **TAK**, jedyna rzeczywista próba 11.10 o 13:29:54 CEST, HTTP 200 i `success: true` |
| E-mail received | **TAK**, właściciel potwierdził odbiór o 13:30 CEST w [komentarzu](https://github.com/pracowniarachunkowosci-debug/pracownia/pull/19#issuecomment-6108684288) |
| Kod sygnału sukcesu | **Przygotowany i sprawdzony lokalnie**; wymaga konfiguracji GTM opisanej niżej |
| GA4 measured | **NIEPOTWIERDZONE**; lokalny test emisji nie jest odbiorem w GA4 |
| Google Ads premature firing | **DO NAPRAWY w GTM**; nie zmieniono obecnej reguły |
| PR published / GTM published | **NIE / NIE** |

## Diagnoza: dowody i granice pewności

**Google Ads — przyczyna potwierdzona.** Tagi 5 i 9 odwołują się do reguły 6 „TechSol - form_submit 93474”. Definicja to **Zdarzenie niestandardowe**, nazwa **`form_submit`**, wszystkie takie zdarzenia, bez warunku sukcesu API i bez ograniczenia do konkretnego formularza. Przesłanie formularza może więc uruchomić Ads przed odpowiedzią Web3Forms, także gdy API później odmówi. Opcja „Raz na stronę” w tagu konwersji nie naprawia momentu wyzwalania; może zużyć pierwsze wywołanie na nieudaną próbę.

**Korekta dokładnej nazwy:** poprzedni raport zapisał moment submit jako `gtm.formSubmit`. Odczyt definicji GTM w etapie 3 ustalił właściwy trigger jako **`form_submit`**. Nie należy używać żadnego z tych sygnałów jako potwierdzenia sukcesu. Odczyt konfiguracji ma tu większą precyzję niż wcześniejszy opis osi zdarzeń.

**GA4 — potwierdzona luka w integracji, mechanizm routingu jest wnioskiem.** Formularz wysyłał `gtag('event', 'generate_lead', …)` bez `send_to`. Główna definiuje funkcję kolejkującą `gtag`, ustawia Consent Mode i ładuje GTM, ale nie ma własnego `gtag('config', 'G-H210DZ34Y8')`. W GTM są tylko cztery tagi: Google tag, Conversion Linker oraz dwa Ads; nie ma tagu GA4 Event / reguły odbierającej potwierdzenie formularza. Google tag nr 7 inicjalizuje pomiar strony, co nie jest jawnym mapowaniem nowego zdarzenia sukcesu na GA4.

W jednorazowym teście `generate_lead` był w dataLayer, ale Tag Assistant pokazał brak wysłanego działania do `G-H210DZ34Y8`. DebugView zawierał inne zdarzenia lokalnej sesji. Najbardziej spójne wyjaśnienie to brak docelowego routingu dla polecenia `gtag` na głównej, przy inicjalizacji przez GTM. Zgodnie z [dokumentacją routingu Google](https://developers.google.com/tag-platform/gtagjs/routing), polecenie bez `send_to` korzysta z grupy domyślnej tworzonej przez `config`; konfiguracja landingu nie przechodzi przez pełną nawigację do głównej. Nie odczytano wewnętrznej grupy odbiorców biblioteki Google ani nie wykonano testu A/B do kolektora, więc szczegółowego mechanizmu nie oznaczamy jako udowodnionego runtime. Naprawa poniżej eliminuje zależność od tego mechanizmu.

**Zgoda / debug:** własny kod wymagał `cookieConsent=all`, które w rzeczywistym teście było wybrane; DebugView odbierał `page_view`, `scroll`, `form_start`, `user_engagement` z lokalnego URL. Tag Google ma wbudowane kontrole czterech zgód, „dodatkowa zgoda: Nie ustawiono”, nie jest ograniczony do opublikowanych kontenerów. Nie znaleziono blokady całego pomiaru lub trybu debug. Nie jest to pełny audyt filtrów i reguł modyfikowania zdarzeń w GA4; ich sprawdzenie pozostaje częścią odbioru po konfiguracji.

**GTM + gtag.js:** główna ma tylko loader GTM; landing ZDF i strona raportów mają równolegle GTM oraz bezpośredni loader/config gtag.js dla tej samej właściwości. Kontener uruchamia ten sam Google tag na Initialization — All Pages. To potwierdzone nakładanie się sposobów konfiguracji i ryzyko duplikacji `page_view`, nie dowód dwóch hitów. Nie potwierdzono podwójnego leada ani podwójnie zaksięgowanej konwersji Ads. Etap 3 nie zmienia szeroko bootstrapu istniejącego serwisu; ujednolicenie konfiguracji wymaga osobnego porównania pageviews/CTA przed i po zmianie.

## Inwentaryzacja odczytana z prywatnego GTM

Kontener **GTM-WC88L2GJ**, konto **6321819993**, container ID **234024853**, workspace **5**. W dostępnych odczytach przed diagnozą i podczas niej liczba zmian wynosiła **0**. Nie użyto zapisu ani publikacji. Końcowy ponowny odczyt ekranu przeglądu nie doszedł do skutku: automatyczna kontrola dostępu do przeglądarki dwukrotnie przekroczyła limit czasu; nie była to decyzja o niebezpieczeństwie działania. Nie obchodzono tej kontroli. Numery poniżej pochodzą z adresów obiektów GTM, nie z końcówek nazw nadanych przez TechSol.

| Obiekt / ID | Odczytana konfiguracja |
| --- | --- |
| Tag **7**, „Tag Google G-H210DZ34Y8” | Google tag, ID `G-H210DZ34Y8`, Initialization — All Pages; brak dodatkowych parametrów konfiguracji; raz na zdarzenie; dodatkowe zgody nieustawione |
| Tag **5**, „TechSol - Formularz kontaktowy 45209” | Google Ads Conversion Tracking; `AW-17646661298`, label `_YKtCLH_gcobELLdyt5B`; trigger **6**; priorytet 1; raz na stronę; `user_data={{Dane przekazywane przez użytkowników}}`; brak setup/teardown |
| Tag **9**, „Google Ads User-provided Data Event roz. konwersja” | Ads ID `17646661298`; ta sama zmienna user data **8**, trigger **6**; priorytet 1; raz na zdarzenie |
| Zmienna **8**, „Dane przekazywane przez użytkowników” | Automatic collection: e-mail włączony, telefon oraz imię/nazwisko/adres wyłączone; brak wykluczeń elementów |
| Reguła **6**, „TechSol - form_submit 93474” | Custom Event `form_submit`, wszystkie zdarzenia; odwołania z tagów **5** i **9** |
| Tag **4** / reguła **3** | Conversion Linker / „TechSol - Page View - Conversion Linker 26829”; bez zmian |

Tagi Ads mają wbudowane kontrole `ad_storage`, `ad_personalization`, `ad_user_data`; dodatkowe zgody są nieustawione. Taki stan nie oznacza braku obsługi Consent Mode — nie jest też gwarancją blokowania całego tagu przy odmowie. [Opis Google rozróżnia kontrole wbudowane i dodatkowe](https://support.google.com/tagmanager/answer/10718549?hl=en).

## Przygotowana minimalna poprawka kodu

`assets/js/contact-form.js` zastępuje bezpośrednie polecenie `gtag(generate_lead)` jednym komunikatem:

```js
window.dataLayer.push({
  event: 'web3forms_success',
  event_category: 'lead',
  event_label: 'home_form',
  form_id: 'leadForm',
  inquiry_source: 'zewnetrzny-dzial-finansowy' // albo stałe 'strona-glowna'
});
```

Komunikat powstaje tylko po **HTTP 2xx oraz boolean `success === true`**, przy aktualnej zgodzie `all`. Zachowano blokadę wysyłki w trakcie oczekiwania i po sukcesie, sprawdzanie walidacji oraz obsługę błędów. Nie ma drugiej równoległej ścieżki `gtag(generate_lead)`. Meta Lead nadal korzysta z dotychczasowej bramki sukcesu i zgody. Błąd odbiorcy analityki nie zmienia wyniku API.

Ładunek ma wyłącznie nazwę zdarzenia i cztery stałe, dozwolone parametry. Nie dodano PII, identyfikatora leada, cookies, trwałej kolejki ani danych użytkownika. Przy essential nie ma sygnału konwersji, a późniejsza zgoda nie odtwarza zaakceptowanego wcześniej leada. Deduplikacja dotyczy bieżącego formularza w danym dokumencie, nie różnych kart lub nowych zapytań po przeładowaniu.

To jest **nowy kontrakt z GTM**, nie samodzielna naprawa odbioru przez Google. Bez zmian kontenera nie powstanie nowe zdarzenie GA4. Nie należy publikować samego kodu jako zakończonej naprawy pomiaru.

## Instrukcja GTM — do wykonania dopiero po zgodzie właściciela

1. Utworzyć oddzielny workspace na bazie aktualnej wersji kontenera; zachować eksport bazowy do rollbacku. Sprawdzić, czy inna osoba nie zmieniła tagów od niniejszego odczytu. **Nie publikować.**
2. Dodać zmienne Data Layer Variable, **wersja 2**: `DLV - form_id` → `form_id`, `DLV - inquiry_source` → `inquiry_source`. Nie używać wbudowanego „Form ID” ani „Form Text” jako substytutu danych zdarzenia.
3. Dodać trigger **`CE - web3forms_success - leadForm`**, typ **Custom Event**, nazwa dokładnie **`web3forms_success`**, bez regex dla nazwy. Warunki: `DLV - form_id` równe `leadForm`; `DLV - inquiry_source` pasuje do `^(zewnetrzny-dzial-finansowy|strona-glowna)$`. Nie przypisywać mu `form_submit`, `gtm.formSubmit`, kliknięcia ani thank-you.
4. Dodać **`GA4 - generate_lead - API success`**, natywny tag **Google Analytics: GA4 Event**, Measurement ID **`G-H210DZ34Y8`**, Event name **`generate_lead`**. Parametry: `event_category=lead`, `event_label=home_form`, `form_id={{DLV - form_id}}`, `inquiry_source={{DLV - inquiry_source}}`. Tylko nowy trigger z kroku 3, raz na zdarzenie. Dodatkowa zgoda `analytics_storage` wymagana dla tego tagu, zgodnie z dotychczasową zasadą braku własnej konwersji przy essential. Bez stałego `debug_mode=true` w produkcji, bez `user_data`, automatycznej kopii pól lub drugiego tagu dla tego samego zdarzenia. Zachować Google tag **7** do inicjalizacji. [Oficjalna instrukcja GA4 Event](https://support.google.com/tagmanager/answer/13034206?hl=en) i [Custom Event](https://support.google.com/tagmanager/answer/7679219?hl=en).
5. W tagu Ads **5** zachować identyfikator i etykietę konwersji oraz obecną wycenę (nie wymyślać wartości). **Usunąć przypisanie starej reguły 6**, zastąpić triggerem z kroku 3; nie dodawać nowego jako alternatywy obok starego. „Raz na zdarzenie”, dodatkowo wymagane `ad_storage`, `ad_user_data`, `ad_personalization`, zgodnie z aktualnym wariantem zgody all. Nie pozostawiać setup/teardown lub drugiego tagu wykonującego tę samą konwersję przy submit. Regułę 6 można pozostawić bez odwołań dla historii.
6. Rozstrzygnąć osobno enhanced conversions, zgodnie z poniższą sekcją. **Nie przepinać automatycznie tagu 9 na nowy event i nie uznawać go przez to za sprawdzony.**
7. W Google Ads sprawdzić akcję odpowiadającą powyższemu ID/label: model zliczania leadów, status primary/secondary oraz ewentualny import GA4 `generate_lead`. Wybrać jedno główne źródło optymalizacji dla tego samego zapytania; jednoczesny natywny Ads i import GA4 jako primary mogą zawyżać cele. Nie przełączano tych ustawień i nie potwierdzono obecnego importu.
8. W GA4 sprawdzić filtry danych/developer traffic, ewentualne reguły modyfikacji/tworzenia `generate_lead`, oznaczenie jako kluczowe zdarzenie oraz wymiar niestandardowy `inquiry_source`. Te ustawienia nie zastępują brakującego tagu wysyłającego. Nie tworzyć `generate_lead` na podstawie `form_submit` lub odsłony podziękowania.
9. Osobno zatwierdzić kontrolowany Preview. Najpierw sprawdzić firing i zgody w środowisku blokującym kolektory oraz z atrapą API. Jeżeli potrzebny jest DebugView, ustalić osobną testową właściwość GA4 lub świadomie zaakceptować oznaczony sygnał do docelowej właściwości; zabezpieczyć Ads przed syntetyczną konwersją. **Preview może wysyłać rzeczywiste dane do usług.** Obecny izolowany runner nie ładuje GTM, więc nie dowodzi działania nowych tagów. Żaden taki live test nie został wykonany w etapie 3.
10. Dopiero po pozytywnym odbiorze oraz **odrębnej zgodzie na publikację** skoordynować wdrożenie kodu i kontenera. Stare landingi nie emitują `web3forms_success`: po odpięciu reguły 6 ich submit przestanie uruchamiać te tagi. To usunięcie niezweryfikowanego sygnału, ale również zmiana zakresu pomiaru — właściciel musi zaakceptować ją albo najpierw objąć te formularze osobną migracją i testami. Rollback powinien przywracać zgodny zestaw kodu i kontenera, z jawną informacją o powrocie wcześniejszej usterki.

## Enhanced conversions — decyzja przed edycją

Zmienna **8** automatycznie wyszukuje e-mail i jest używana **w dwóch miejscach**: parametrze `user_data` tagu konwersji **5** oraz tagu user-provided data **9**. Sam tag 9 jest sygnałem danych do dopasowania, **nie dowodem zaksięgowania drugiej konwersji**. Zbieranie danych wcześniej w sesji bywa wspieranym mechanizmem Google, lecz właściciel wymaga teraz powiązania obsługi tego formularza z potwierdzonym sukcesem.

Rekomendowany pierwszy zakres: standardowa konwersja Ads bez nowych danych użytkownika — po zgodzie właściciela wstrzymać tag **9**, usunąć mapowanie `user_data` w tagu **5** i sprawdzić również automatyczne UPD w ustawieniach współdzielonego Google tagu „księgowość”. Samo wstrzymanie tagu 9 nie usuwa drugiego źródła user data. Nie rozszerzać zbierania danych na GA4. Ten wariant celowo ogranicza enhanced conversions i wymaga akceptacji, nie został zastosowany.

Jeżeli enhanced conversions mają pozostać: właściciel powinien potwierdzić warunki Google, zakres zgody i informacji o przetwarzaniu. Potrzebny jest osobny projekt przekazania danych wyłącznie do natywnej funkcji Ads, po sukcesie i przy zgodzie reklamowej. Formularz resetuje pola przed emisją eventu; automatyczny odczyt DOM w nowym momencie nie gwarantuje dostępności e-maila. Nie opóźniano resetu i nie zapisano PII w dataLayer/storage „na zapas”. Należy ustalić pojedynczą metodę UPD, jej czas życia i usuwanie danych oraz sprawdzić ją niezależnie. [Dokumentacja enhanced conversions](https://support.google.com/google-ads/answer/13262500?hl=en) opisuje odrębne metody zbierania i warunki zgód; nie potwierdzono ich spełnienia dla obecnego konta.

## Wykonane testy bez usług zewnętrznych

Dowody: [wynik 23 kontroli](conversion-report.json), [regresja integracji / HTML / JS](technical-report.json), [zrzut](offline-tests.jpg).

- **23 kontrole PASS, 30 żądań do atrap, 0 realnych wysyłek i 0 żądań do kolektorów Google.** Faktyczny DOM strony i produkcyjny skrypt formularza uruchomiono w Chrome, z lokalną atrapą `fetch` oraz CSP blokującą zewnętrzne script/connect/img/frame i natywny formularz.
- Walidacja, oczekiwanie, podwójny submit i submit po sukcesie; dokładnie jeden komunikat po odpowiedzi. Błędy `success:false`, `success:"true"`, 400/403/429/500, błędny JSON, sieć, timeout: zero konwersji, zachowane pola i poprawne ręczne ponowienie na atrapie. Sukces HTTP 201 także poprawny.
- Zgody all/essential/brak/nieznana, niedostępny storage, wycofanie lub przyznanie zgody w czasie oczekiwania, brak odtwarzania leada po późniejszej zgodzie. Tylko dozwolone pola/źródła, brak PII i równoległego `gtag(generate_lead)`.
- Brak globalnego `gtag` nie blokuje komunikatu GTM; wyjątek dataLayer lub Meta nie zmienia sukcesu API. Bezpośrednie podziękowanie nie zawiera kodu pomiaru.
- Kontrola integracji: GTM/GA4/Consent bootstrap, GrowthOS, Calendly, linkowanie i HTML zachowane; 18 skryptów inline oraz zmieniane pliki JS poprawne składniowo; 0 nowych błędów HTML. `git diff --check`: PASS. Nie powtarzano niezmienionych testów wydajności i całego SEO.

Odtworzenie: `node scripts/preview-contact-qa.cjs`, otworzyć **http://127.0.0.1:8768/__qa__/run**, uruchomić przycisk testów. Serwer wiąże wyłącznie loopback. Wyniki trafiają do tego katalogu (lub `ZDF_QA_OUTPUT`). Nie usuwać CSP ani nie używać tego runnera jako publicznego podglądu. Pozostałe sprawdzenie: `NODE_PATH=<katalog-QA>/node_modules ZDF_QA_OUTPUT=<katalog-raportów> node scripts/verify-integrations.cjs` (składnia zmiennych środowiskowych zależy od powłoki).

Istniejący `scripts/verify-contact-form.cjs` zaktualizowano do nowego kontraktu i sprawdzono składnię; nie uruchamiano go ponownie w etapie 3. Powyższy nowy runner wykonał testy w przeglądarce. Są to testy **emisji i obsługi formularza**, nie symulacja dowodząca poprawności silnika GTM lub odbioru GA4/Ads.

## Akceptacje potrzebne do dalszych prac

1. Zgoda na przygotowanie zmian w prywatnym workspace GTM według kroków 1–8, w tym odłączenie starego triggera i wpływ na starsze formularze.
2. Wybór: standardowa konwersja bez UPD (rekomendowany pierwszy krok) albo osobny zakres zachowania enhanced conversions po weryfikacji zgód i przepływu danych.
3. Osobna zgoda na test z rzeczywistym kolektorem GA4/Ads, jeśli jest potrzebny do odbioru. **Nie oznacza to zgody na kolejny realny Web3Forms.**
4. Odrębne zatwierdzenie publikacji GTM, merge i wdrożenia strony dopiero po odbiorze. Na razie wszystkie pozostają zablokowane decyzją właściciela.
