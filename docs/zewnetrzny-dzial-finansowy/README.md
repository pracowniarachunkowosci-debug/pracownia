# Zewnętrzny dział finansowy — etap 1

Data: 11 października 2026. Zadanie: [#18](https://github.com/pracowniarachunkowosci-debug/pracownia/issues/18).
Gałąź: `codex/zewnetrzny-dzial-finansowy`. Punkt wyjścia: `main` / `0bc0dec2f70753f2093fca645092de1910c32395`.

## Zakres

Nowy landing `/zewnetrzny-dzial-finansowy.html` przedstawia kompleksową współpracę właścicielom i zarządom rozwijających się spółek, szczególnie produkcyjnych, hurtowni i firm handlowych. Opisuje marżę, płynność, magazyn i produkcję, cztery obszary obsługi, obecne pakiety, przygotowanie danych, przejęcie ksiąg i siedem pytań FAQ.

Główne CTA prowadzi do istniejącego formularza `/#kontakt`. Alternatywa otwiera obecne Calendly. Pakiety odsyłają bezpośrednio do Start/Rozwój/Strategia w ofercie. Ceny nie są powielane. Doradztwo podatkowe przypisano współpracującemu uprawnionemu doradcy; kadry oraz rozszerzone projekty wymagają uzgodnienia zakresu i wyceny. Nie dodano opinii, case studies ani obietnic wyników.

Na stronie głównej i w ofercie dodano wyłącznie po jednej sekcji linkującej. Pozostały kod obu plików jest identyczny z bazowym commitem: H1, title, canonical, pakiety, nawigacja, formularz i integracje. Nie zmieniono istniejących treści KSeF, CIT ani klastrów SEO. Analiza historii objęła m.in. ostatni klaster SEO/KSeF, poprawkę mobilnego overflow i korekty cen z września.

Landing ma własne niewielkie CSS/JS, bazujące na obecnym szablonie i kolorach. Nie ładuje nowych bibliotek, obrazów hero ani fontów zewnętrznych. Widoczne breadcrumbs, Service, BreadcrumbList i FAQPage opisują treść strony. `sitemap.xml` ma jeden nowy URL; datę 2026-10-11 otrzymały wyłącznie nowy landing oraz dwie edytowane strony. Dodano wpis `llms.txt`.

## Podgląd

![Nowa strona — desktop](desktop.png)

![Nowa strona — telefon](mobile.png)

## Walidacja

[Zapis wyników automatycznych](browser-report.json).

Sprawdzana ścieżka: strona główna/oferta → landing → formularz kontaktowy lub Calendly. Testy lokalne nie wysyłają zapytań do biura ani nie rezerwują spotkań.

| Kontrola | Wynik |
| --- | --- |
| `git diff --check` | Bez błędów |
| HTML nowej strony (`html-validate:standard`) | 0 błędów; dopuszczony istniejący zapis zamykania tagów void |
| Składnia JS (`node --check`) | Bez błędów |
| JSON-LD | Service + BreadcrumbList + FAQPage; 7 odpowiedzi zgodnych dokładnie z widoczną treścią |
| Linki nowej strony | 26 unikalnych lokalnych odnośników/zasobów/kotwic: HTTP 200, kotwice istnieją |
| Sitemap | Poprawny XML, jeden nowy URL, lastmod innych stron bez zmian |
| Widoki 320, 390, 768, 900, 1024, 1440 px | Bez poziomego przewijania; menu, Escape, przywracanie fokusu i FAQ działają |
| Dostępność axe, WCAG 2 A/AA i 2.1 AA | 0 wykrytych naruszeń, również przy widocznym banerze cookies |
| Stabilność układu | CLS 0 w sześciu lokalnych widokach po poprawce inicjalizacji menu |
| Consent Mode v2 | Domyślne cztery odmowy przed GTM/GA4; oba wybory, zapis, powrót i reset; Meta dopiero po zgodzie |
| CTA | Jedno zdarzenie na kliknięcie; osobne etykiety dla formularza/Calendly i miejsca kliknięcia; kliknięcie nie zgłasza `generate_lead` |
| Formularz | CTA otwiera obecny `#leadForm`; endpoint i wymagane pola zachowane |
| Brak JavaScript / niedostępny localStorage | Nawigacja, FAQ i zwykłe linki działają bez JS; brak pamięci nie blokuje wyboru cookies |
| Ochrona starej strony | Automatyczne porównanie potwierdza identyczność całego wcześniejszego kodu index/oferta po odjęciu nowych sekcji |
| Zewnętrzne adresy | Odczyt Calendly i skryptu GrowthOS: HTTP 200 |

Pomiar wydajności dotyczy lokalnego układu z zastąpionymi odpowiedziami skryptów zewnętrznych. Nie jest pomiarem produkcyjnych Core Web Vitals. HTML, CSS i JS nowej strony mają łącznie około 50 KB przed kompresją. Brak nowego etapu budowania aplikacji.

### Odtworzenie testów

W repozytorium nie było frameworka testów. Dodano odrębny skrypt `scripts/verify-zewnetrzny-dzial-finansowy.cjs`; zależności QA nie są ładowane przez stronę ani instalowane w repozytorium. Użyto Node 20.19.5, Chrome 155, Playwright 1.64.0, axe 4.13.0 i html-validate 10.17.0.

1. Uruchom serwer statyczny w katalogu repozytorium na adresie lokalnym.
2. Zainstaluj narzędzia QA w katalogu tymczasowym: `npm install --prefix <katalog-QA> playwright@1.64.0 @axe-core/playwright@4.13.0 html-validate@10.17.0`.
3. Ustaw `NODE_PATH` na `<katalog-QA>/node_modules`, `ZDF_QA_URL` na adres serwera i opcjonalnie `ZDF_QA_OUTPUT` na katalog raportów.
4. Uruchom `node scripts/verify-zewnetrzny-dzial-finansowy.cjs`. Skrypt zapisuje JSON i zrzuty ekranów. Domyślnie używa zainstalowanego Chrome; `ZDF_BROWSER` pozwala wybrać kanał przeglądarki.
5. Uruchom `node --check assets/js/zewnetrzny-dzial-finansowy.js` oraz `git diff --check`.

`ZDF_BASE_REF` domyślnie wskazuje powyższy commit bazowy; porównanie ochrony istniejącego kodu dotyczy zakresu tego PR. Testy przeglądarkowe przechwytują żądania zewnętrzne, dzięki czemu nie tworzą leadów ani ruchu analitycznego. Nie potwierdzają odbioru wiadomości w skrzynce, zapisu rezerwacji, dostarczenia zdarzeń do GA4 ani odpowiedzi czatu GrowthOS na wiadomość użytkownika.

## Do przeglądu przed publikacją

Właściciel powinien potwierdzić, że opis zakresu i sposobu obsługi odpowiada aktualnej organizacji pracy. Nie zmieniono cen, pakietów ani deklaracji uprawnień. Nie wykonano merge ani wdrożenia; GitHub Pages jest skonfigurowany na `main`.

## Rekomendacje na etap 2 — bez rozpoczęcia prac

- Porównać intencje wyszukiwania i dane GSC dla nowego landingu, raportów/controllingu oraz analiz finansowych. Dopiero na tej podstawie rozstrzygnąć potrzebę osobnej strony dla controllingu produkcyjnego.
- Przeprowadzić pełny audyt linków i danych strukturalnych całego serwisu oraz kontrolę na rzeczywistych telefonach.
- Zweryfikować dostarczanie zdarzeń w GTM/GA4 DebugView i pełną ścieżkę obsługi zapytania: odebranie formularza, rezerwację Calendly i czat GrowthOS, z uzgodnionymi danymi testowymi.
- Ustalić, jak rozpoznawać i oceniać jakość zapytań z tego landingu: branża, skala firmy, potrzeby zarządu i termin rozpoczęcia współpracy. Nie tworzyć wewnętrznych kampanii UTM zaburzających atrybucję.
- Po akceptacji i ewentualnym wdrożeniu sprawdzić indeksowanie, wydajność ze wszystkimi skryptami oraz rzeczywiste konwersje. Etap 2 wymaga odrębnego polecenia właściciela.
