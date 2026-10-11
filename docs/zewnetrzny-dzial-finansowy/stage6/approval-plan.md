# Etap 6 — plan do zatwierdzenia, niewykonany

Poniższe kroki dotyczą przyszłych działań. Audyt etapu 6 nie upoważnia do ich wykonania. [Stan odczytany](README.md), [wynik przerwanego preflight GA4](ga4-test-result.json).

## A. Minimalne odblokowanie pojedynczego testu GA4

**Rekomendacja:** wskazanie dostępnej, niezależnej właściwości testowej albo zgoda na utworzenie nowej właściwości „Pracownia — QA PR19” i jednego strumienia WWW. Nowy strumień w produkcyjnej właściwości `424296976` nie wystarczy. Nie używać kont innych marek ani produkcyjnego globalnego tagu połączonego z Ads.

1. Przed próbą sprawdzić, że testowa właściwość i jej niezależny Google tag nie mają miejsc docelowych/linków Ads (także menedżera), importów konwersji, UPD, Google Signals, User-ID ani odbiorców eksportowanych do reklam. Nie akceptować nowych warunków za właściciela. Zweryfikować dostęp do DebugView i pełne ustawienia bez wysyłania próbnych zdarzeń.
2. Przygotować niepublikowaną konfigurację testową odpowiadającą tagowi 14, z nowym Measurement ID i tymi samymi czterema parametrami. Zachować kopię bieżącego workspace 6. Nie zmieniać produkcyjnej GA4. Testowy tag ma wymagać `analytics_storage`, a reklamy pozostają denied. Tagi Ads 5 i UPD 9 mają pozostać nieuruchamialne w sesji testowej; sama odmowa zgody nie jest blokadą transportu wszystkich cookieless pingów.
3. Lokalny podgląd musi egzekwować blokadę sieci obejmującą wszystkie transporty (fetch/XHR/beacon/obraz/iframe/formularz), globalne UPD, Ads, Meta, Web3Forms, Calendly i GrowthOS. Google tag/GTM mogą pobrać wyłącznie niezbędną konfigurację; żaden produkcyjny kolektor nie może przejść. Nie wystarczy zezwolić na całą domenę `google-analytics.com`: trzeba sprawdzać docelowy testowy `tid` i nazwę zdarzenia, URL oraz body. Blokować m.in. `ccm/form-data`, `pagead/form-data`, konwersje/re-marketing Ads i próby innych zdarzeń.
4. Najpierw sprawdzić te bramki całkowicie offline, na atrapach; nie wyłączać istniejących zabezpieczeń, CSP ani rozszerzeń. Pozwolenie dla jednego docelowego żądania wymaga uprzedniego wykazania izolacji. Jeśli narzędzia nie umożliwią egzekwowania wszystkich ograniczeń, znów przerwać bez wysyłki.
5. Dopiero wtedy uruchomić Preview na localhost kodu PR. Wygenerować **jeden syntetyczny** `web3forms_success`, np. para `leadForm / zewnetrzny-dzial-finansowy`, bez wypełniania lub submit formularza i bez wołania jego handlera Meta. Jednorazowy bezpiecznik transmisji ma zostać zużyty przed wysyłką, bez retry i bez ponawiania po niejednoznacznym wyniku. Zamknąć bramkę po pierwszej próbie.
6. Odbiór zaliczyć tylko przy zgodności: tag testowy uruchomiony raz, jedno żądanie `generate_lead` do właściwego testowego ID, odpowiedź kolektora i **ten sam sygnał w DebugView testowej właściwości** z nieosobowymi `form_id` i `inquiry_source`. Sam firing/HTTP 2xx nie jest dowodem przetworzenia. Zapis dowodu bez client ID, cookies, IP, pól formularza lub innych danych identyfikujących. Brak w DebugView → wynik niepotwierdzony, bez drugiej próby.
7. Przywrócić workspace 6 do ustalonego wariantu produkcyjnego i porównać eksport z kopią; usunąć diagnostyczne nadpisania tylko w ramach zatwierdzonego testu. Nie publikować. Sukces testowej właściwości oznacza wyłącznie **GA4 test received=TAK**; **GA4 prod nadal niepotwierdzone**.

Alternatywa z aktywnym filtrem produkcyjnej GA4 wymaga osobnej zgody na zmianę produkcji i sprawdzenia wszystkich ścieżek eksportu. Nie jest rekomendowana tutaj. Google opisuje opóźnienie wdrożenia filtra do 24–36 godzin, a aktywne wykluczenie ma trwały skutek dla nowych danych. Nie zakładać, że zmiana ustawienia natychmiast zagwarantuje izolację. [Filtry developer traffic](https://support.google.com/analytics/answer/13296662?hl=en), [skutki filtrów](https://support.google.com/analytics/answer/13296761).

## B. Pełny wariant A — globalne UPD i EC

**Osobna zgoda powinna obejmować wszystkie trzy warstwy:** globalny tag „księgowość”, ustawienia EC WWW i leadów konta Ads `555-488-5593` oraz późniejszą publikację przygotowanego wariantu GTM. Wyłączenie jednej warstwy nie upoważnia do deklaracji, że nie ma innych źródeł danych.

1. Uzgodnić z właścicielem, czy poza repo istnieje CRM/API/upload lub inna witryna używająca wspólnego tagu. Zachować świeży eksport GTM live i workspace 6, SHA strony, zrzuty globalnego UPD, oba ustawienia EC Ads i ustawienia działania `7402979249`. Odnotować czas i operatora. Jeśli stan różni się od raportu, przeliczyć zakres przed zmianą.
2. W ustalonym oknie wyłączyć w globalnym Google tag zezwolenie na UPD i automatyczne wykrywanie; zweryfikować zapis. Dotyczy obu miejsc docelowych tagu, nie tylko nowego landingu. Nie wyłączać zwykłego Google tag/GA4 ani Consent Mode.
3. W Ads → Cele → Konwersje → Ustawienia wyłączyć EC WWW i EC potencjalnych klientów; sprawdzić działanie `7402979249`. Dzisiejszy UI pokazuje dwa osobne ustawienia i metody. Google opisuje przejście do jednolitego modelu EC, dlatego przy przyszłym wykonaniu kierować się świeżym UI i efektem wszystkich źródeł, nie liczbą historycznych przełączników. [Dokumentacja konfiguracji EC](https://support.google.com/google-ads/answer/14664077?hl=en).
4. Zachować tag UPD 9 paused, brak `user_data` w Ads 5, cztery dozwolone pary CE13 i cztery nieosobowe parametry GA4. Produkcyjny tag 9 na submit nadal istnieje do czasu zatwierdzonej publikacji GTM; samo wyłączenie globalnego autodetect nie zastępuje tej migracji.
5. W lokalnym Preview z całkowitą blokadą kolektorów powtórzyć: brak zgody/essential, all, cofnięcie zgody w oczekiwaniu, błędy API, sukces atrapy, duplikat submit, starszy `form_submit`, błędne pary i bezpośrednie thank-you. Sprawdzić brak prób UPD/form-data, brak danych formularza w DLV/parametrach i brak przedwczesnej konwersji. Wyniki z etapu 5 nie zastępują kontroli po globalnej zmianie.
6. Dopiero po akceptacji testów uzgodnić wspólne okno kod + GTM. Nowy kod na wszystkich trzech formularzach musi być dostępny przed przełączeniem konwersji wyłącznie na CE13; sama publikacja kodu pozostawi stare produkcyjne Ads na submit, a samo GTM przed kodem zgubi sygnały starszych formularzy. Ograniczyć tę przejściową niespójność wspólnym oknem i końcową kontrolą. Nie wznawiać reklam podczas niezweryfikowanej migracji.

Kontrola zgód nie może polegać na wstrzymaniu reklam: serwis nadal może otrzymywać ruch organiczny. Kod obecnie emituje własny sukces tylko przy `cookieConsent=all`; w GTM wymagane są dodatkowo analytics_storage dla GA4 oraz ad_storage/ad_user_data/ad_personalization dla Ads. Zgoda użytkownika nie usuwa potrzeby wyłączenia EC w wariancie A. PII nie może trafić do dataLayer, event_label, URL, parametrów ani raportu QA.

### Rollback po ewentualnym przyszłym wdrożeniu

- W razie błędu zatrzymać dalsze publikacje i emisję diagnostyczną, zachować dowody. Wstrzymane kampanie pozostawić wstrzymane. Preferować poprawkę bezpiecznego draft lub wyłączenie wadliwego pomiaru z zachowaniem działającego formularza.
- Kod i GTM cofać jako uzgodnioną parę z zapisanych wersji; poprzedni GTM zawiera błędny submit i UPD. **Nie przywracać automatycznie wersji 4 jako „bezpiecznego” rollbacku.** Powrót do niej wymaga świadomej decyzji właściciela i odpowiedniego ograniczenia wadliwych tagów.
- Rollback GTM nie cofa globalnego UPD, EC w Ads ani ustawień celów. Pozostawić UPD/EC OFF i fałszywą konwersję poza biddingiem, dopóki właściciel osobno nie zatwierdzi innego stanu. Gdy właściciel świadomie nakaże przywrócenie EC, odtworzyć zapisane wartości i zweryfikować oba miejsca docelowe; ponowne włączenie transmisji danych wymaga osobnej zgody.
- Nie kasować ani nie przepisywać historii pomiarów. Odnotować okno zmiany definicji konwersji, możliwą lukę i wcześniejszą błędną semantykę.

## C. Wyłączenie fałszywej „Rezerwacji terminu” z optymalizacji

Zmiany te działają od razu w Ads; nie są częścią draft GTM. Stan bieżący: 0 aktywnych kampanii, dwie wstrzymane z domyślnymi celami; custom goals puste.

1. Po osobnej zgodzie ponownie odczytać **wszystkie aktywne i wstrzymane kampanie**, custom goals, cele domyślne oraz trzy wskazane działania. Zachować ustawienia i świeży, adekwatny raport segmentowany po działaniu konwersji. Nie używać historycznego zakresu z obecnego panelu jako prognozy.
2. Ustawić działanie **7372277673** → optymalizacja **Dodatkowe/Secondary**. Zachować je i historię do audytu. Sprawdzić, że nie jest uwzględnione w kolumnie Konwersje/strategii stawek poprzez używane cele.
3. Obecnie jest to jedyne Primary w kategorii Rezerwacje terminów. Wyłączyć tę błędną kategorię z domyślnych celów konta. Jeśli przed wykonaniem pojawi się prawidłowa konwersja rezerwacji w tej kategorii, nie usuwać jej automatycznie — ograniczyć zmianę do błędnego działania i uzgodnionej konfiguracji kampanii.
4. Potwierdzić efekt w **Leads 15.11** i **Performance Max-2-OPT** oraz ewentualnych nowych kampaniach. Obecnie obie dziedziczą cele konta; nie potrzeba tworzenia własnego wyjątku. Gdy pojawią się cele niestandardowe, usunąć z używanych celów błędną akcję: Secondary w custom goal nadal może wpływać na stawki. [Primary i Secondary](https://support.google.com/google-ads/answer/11461796?hl=en), [cele kampanii](https://support.google.com/google-ads/answer/9143218?hl=en).
5. Zachować natywne **7402979249** jako jedyny Primary formularza po wdrożeniu CE13 i potwierdzeniu odbioru. Import **7382427293** pozostawić Secondary. Nie dodawać `generate_lead` jako drugiego Primary tego samego zgłoszenia. Osobno uzgodnić wyłączenie starych reguł page_view z kluczowych zdarzeń/raportowania GA4 — zmiana Ads nie naprawia produkcyjnej semantyki GA4.
6. Osobno zdecydować, czy subskrypcje i follow-on views YouTube powinny być celem optymalizacji kampanii nastawionych na obsługę księgową. Połączenia telefoniczne ocenić według jakości/definicji, bez hurtowego wyłączenia poprawnych leadów. Nie zmieniać budżetu, strategii i celów jednocześnie.
7. Zapisać stan po zmianie oraz dziennik dat. Wznowienie kampanii, zmiana budżetu/stawek i publikacja strony wymagają własnej zgody. Nie uruchamiać ich jako efekt uboczny naprawy celu.

**Wpływ na Smart Bidding:** liczba raportowanych konwersji może spaść, bo usunięty zostanie sygnał odsłony; nie oznacza to automatycznie utraty prawdziwych leadów. Maximize Conversions zmieni zestaw sygnałów optymalizacji. Po wznowieniu możliwe jest uczenie i wahania wyników; nie można zagwarantować wzrostu jakości, CPA lub stałego czasu stabilizacji bez danych. Oceniać osobno okresy przed/po zmianie definicji i po upływie rzeczywistego opóźnienia konwersji; dokumentacja Google zaleca uwzględnienie cykli konwersji. [Migracja celów i okres obserwacji](https://support.google.com/google-ads/answer/14593387?hl=en).

## Decyzje do przekazania właścicielowi

1. Dostęp do izolowanej właściwości testowej lub zgoda na jej utworzenie; potem jedna kontrolowana próba według A. Bez tego test pozostaje niewykonany.
2. Zgoda na wyłączenie globalnego UPD i **obu** ustawień EC Ads, z potwierdzeniem innych witryn/CRM/API używających danych.
3. Zgoda na wyłączenie `7372277673` z bidding/default goals oraz dalszy porządek legacy GA4 i mikrocelów YouTube. Jedno źródło Primary formularza: rekomendowane natywne `7402979249`.
4. Uzgodnienie treści przejęcia księgowości: FAQ e-commerce i reklama wstrzymanej kampanii kontra styczeń 2027 na ZDF. W tym etapie nie edytowano treści ani reklam.
5. Po spełnieniu warunków — oddzielna zgoda na wspólne okno publikacji strony/GTM oraz zakres odbioru produkcyjnego. Test Web3Forms, Ads i wznowienie kampanii nie są objęte zgodą etapu 6.
