# Przejęcia pełnej księgowości od stycznia 2027

Stan na 24 października 2026. Gałąź `feat/styczen-2027-przejecia` powstała z pobranego `origin/main` (`9053790`). Zmiany są przeznaczone do jednego draft PR. Merge do `main` uruchamia publikację GitHub Pages i wymaga decyzji właściciela.

## Audyt architektury przed zmianami

| Adres | Intencja i stan początkowy | Linkowanie przed zmianą | Decyzja w tym PR |
| --- | --- | --- | --- |
| `/zmiana-biura-rachunkowego.html` | Oferta przejęcia księgowości spółek: audyt, dokumenty, proces, FAQ, konsultacja. | 5 innych dokumentów HTML, m.in. home i ZDF; wskazanie w llms.txt. Link do artykułu o audycie, brak bezpośredniego linku do poradnika zmiany biura. | Główny adres oferty i kampanii. |
| `/zmiana-biura-rachunkowego-spolka-z-oo.html` | Drugi landing o niemal tej samej intencji. Podobne tytuły, obietnica zmiany „bez chaosu”, audyt, rozrachunki, dokumenty, proces i konsultacja. | 4 inne dokumenty: oferta, ZDF, doświadczenie i autor. ZDF kierował do obu landingów w różnych miejscach. | Adres i self-canonical zachowane. Dodana informacja o aktualnych warunkach oraz link do głównej usługi. |
| `/blog/zmiana-biura.html` | Poradnik: kiedy zmienić biuro, dokumenty, proces, ryzyka, FAQ. Miejscami język oferty, CTA głównie do Calendly. | 17 innych dokumentów, w tym home i blog. Brak linku do głównej usługi i do szczegółowego artykułu o audycie. | Zachowany poradnik, dodany praktyczny fragment 2026/2027 i dwa kontekstowe linki do usługi. |
| `/blog/audyt-ksiegowosci-przed-zmiana-biura.html` | Informacyjna checklista audytu (25 punktów), węższy temat niż ogólny poradnik. | 9 innych dokumentów; prowadzi do poradnika, bez linku do głównej usługi. | Zachowana checklista; krótkie wyjaśnienie osobnej wyceny i link do usługi. |

Liczby oznaczają liczbę innych plików HTML w wersji bazowej, zawierających link do danego adresu (nie liczbę wszystkich odnośników ani backlinków zewnętrznych). Wszystkie cztery strony miały canonical wskazujący na własny adres; wszystkie pozostają dostępne.

Dane GSC przekazane przez właściciela za 26.09–23.10.2026: fraza „zmiana biura rachunkowego” — 57 wyświetleń, 0 kliknięć, średnia pozycja 15,0; poradnik — 147 wyświetleń, 0 kliknięć. To sygnał do pracy nad intencją, snippetem i linkowaniem. Nie wystarcza do potwierdzenia, że przyczyną jest kanibalizacja: nie mamy podziału zapytanie × URL, historii pozycji ani danych o linkach zewnętrznych.

### Rekomendacja konsolidacji — do osobnej akceptacji

Docelowo jedna oferta na `/zmiana-biura-rachunkowego.html`, poradnik ogólny oraz odrębna checklista audytu. Oba landingi odpowiadają na ten sam problem spółki z o.o.; dodawanie kolejnych sezonowych adresów pogłębiłoby duplikację.

Przed ewentualnym połączeniem należy sprawdzić w GSC dla obu landingów zapytania, kliknięcia, wyświetlenia, wybór canonical przez Google oraz co najmniej kilka miesięcy trendu; dodatkowo backlinki i wejścia/konwersje z analityki. Jeśli dłuższy adres ma wartościowe treści lub linki, przenieść unikalne fragmenty i zaplanować mapowanie do głównego adresu.

Rekomendacja po takiej analizie: trwałe przekierowanie HTTP 301 z dłuższego adresu do głównego, aktualizacja pozostałych linków i usunięcie starego adresu z sitemap dopiero w osobnym, zatwierdzonym wdrożeniu. Przed wdrożeniem trzeba potwierdzić możliwość obsługi rzeczywistego HTTP 301 na używanej warstwie hostingu/proxy przed GitHub Pages. Nie zastępować tego bez uzgodnienia przekierowaniem JavaScript/meta refresh. Alternatywę canonical do głównej strony ocenić osobno: jest wskazówką indeksacyjną, nie przekierowaniem dla użytkownika. Ten PR nie usuwa adresów, nie dodaje przekierowań i nie zmienia canonicali.

## Zakres plików i komunikatów

| Plik | Zmiana |
| --- | --- |
| `index.html` | Blok sezonowy bezpośrednio po istniejącym hero; CTA do głównej usługi; doprecyzowanie FAQ i zgodności JSON-LD; układ formularza sezonowego na mobile. H1, hero, nawigacja, karty usług, opinie i pakiety zachowane. |
| `zmiana-biura-rachunkowego.html` | Start od stycznia 2027, harmonogram, dane do zgłoszenia, odrębne zamknięcie 2026 i wycena audytu, 9 pytań FAQ, link do poradnika, CTA do formularza sezonowego, metadane. |
| `assets/js/contact-form.js` | Dozwolony wariant `service=zmiana-biura-2027`, temat, subject, informacja i `inquiry_source`; dotychczasowe warianty zachowane. |
| `blog/zmiana-biura.html` | Poradnik 2026/2027, podział obowiązków i dwa etapy przekazania danych, linki do usługi, data aktualizacji, FAQ schema; poprawiony kontrast podpisu „Autor”. |
| `blog/audyt-ksiegowosci-przed-zmiana-biura.html` | Osobna wycena, link do głównej usługi, dateModified i zgodność FAQ. |
| `zmiana-biura-rachunkowego-spolka-z-oo.html` | Informacja o warunkach startu i głównym adresie, FAQ schema; obsługa Escape oraz fokus klawiatury dla przewijanej tabeli. |
| `ksiegowosc-spolka-z-oo.html` | Krótkie odniesienie w procesie przejęcia i link; zgodność istniejącego FAQ z JSON-LD. Ceny i pakiety zachowane. |
| `oferta.html` | Sezonowy opis w istniejącej karcie; adres głównej usługi w karcie, stopce i danych strukturalnych. |
| `zewnetrzny-dzial-finansowy.html` | Tylko link w sekcji procesu do głównego adresu przejęcia. |
| `llms.txt` | Główny URL usługi i jasne warunki, osobne wskazanie poradnika. |
| `sitemap.xml` | `lastmod=2026-10-24` dokładnie dla 8 zmienionych stron HTML; lista adresów bez zmian. |
| `docs/styczen-2027/` | Audyt, instrukcje, testy, raporty i zrzuty podglądu. |

| Element | Przed | Po |
| --- | --- | --- |
| Home | Brak dedykowanego bloku sezonowego | „Planujesz zmianę biura rachunkowego od stycznia 2027?” → „Sprawdź możliwość współpracy od stycznia 2027”. |
| Landing — początek | „Przejmujemy księgowość… Zaczynamy od audytu startowego” | Planowany start od stycznia, termin i zakres wymagają potwierdzenia; CTA „Opisz spółkę i planowany termin”. |
| Landing — koniec | Konsultacja / ogólne zapytanie | Opis firmy i skali operacji do oceny możliwości współpracy; brak automatycznej akceptacji. |
| Audyt i zamknięcie roku | Brak wyraźnego rozdzielenia od nowej obsługi | Audyt i zaległości odrębnie wyceniane; sprawozdanie, CIT-8 i inne zadania za 2026 wymagają osobnych ustaleń. |
| Formularz | Domyślny home albo ZDF | Dodatkowy wariant sezonowy z `inquiry_source=zmiana-biura-2027`. |

## Podgląd i testy

[Galeria desktop/mobile](preview/README.md) zawiera zrzuty rzeczywistego renderowania Chrome dla 360, 390 i 1440 px. Podglądy nie są opublikowaną stroną ani nowym wdrożeniem. Do lokalnego podglądu można uruchomić serwer statyczny z katalogu repozytorium. Nie wysyłać formularzy w takim podglądzie: bez warstwy mocków ich zachowany adres akcji prowadzi do produkcyjnego Web3Forms.

Testy w `qa.cjs` przechwytują **wszystkie** żądania. Dokumenty i zasoby lokalne są wczytywane z plików, Web3Forms jest mockowany, a pozostałe zewnętrzne zasoby otrzymują pustą odpowiedź. Żadne zgłoszenie ani zdarzenie testowe nie trafia do Web3Forms, GTM, GA4, Ads czy Meta.

- 24 kontrole układu: 8 zmienionych stron × 360/390/1440 px; jedno H1, bez poziomego przewijania strony, duplikatów ID, błędów JS i uszkodzonych polskich znaków.
- Lokalne linki i kotwice: kontrola plików oraz docelowych identyfikatorów.
- JSON-LD: parsowanie i zgodność pytań/odpowiedzi z widocznym FAQ na wszystkich 8 stronach.
- axe WCAG 2 A/AA i 2.1 AA; dodatkowo formularz sezonowy i rozwinięte FAQ głównej usługi. Wynik automatyczny nie zastępuje pełnego audytu dostępności.
- Formularz: sukces, odpowiedź odrzucająca, HTTP 500, utrata połączenia, błędny JSON, timeout, blokada podwójnej wysyłki, walidacja wymaganych pól i zachowanie danych przy błędzie.
- Regresja: ZDF, domyślny home, nieznana wartość service, formularze spółki i e-commerce; niezmienione UTM/GCLID/FBCLID w żądaniu; dane te nie trafiają do dataLayer.
- `web3forms_success`: tylko po potwierdzonym sukcesie i przy zgodzie; brak danych osobowych w dataLayer. Przy odmowie lub braku wyboru zgody nie ma zdarzenia sukcesu.
- Ścieżka klawiaturą z bloku sezonowego do landingu i formularza, menu mobilne, istniejący fallback bez JavaScript (bez jego wysyłania). Automatyczny wybór tematu sezonowego wymaga JS, tak jak istniejący wariant ZDF.
- Kontrole niezmienności: canonicale, home H1/hero, karty usług i ceny/pakiety; sitemap bez zmiany zbioru URL; istniejące skrypty integracji zachowane.

**Wynik końcowy: 24/24 widoki i 17/17 scenariuszy funkcjonalnych — PASS. Brak niepoprawnych linków, rozbieżności FAQ, poziomego przewijania, błędów JS oraz naruszeń wykrytych przez axe.**

Szczegółowe dowody: [qa-results.json](qa-results.json), [invariants.json](invariants.json). Testy wykonano z lokalnie dostępnymi Playwright 1.64.0 i axe 4.13.0, z kanałem Chrome. Zewnętrzne fonty/skrypty są blokowane, więc zrzuty używają dostępnych fontów zastępczych. Nie weryfikowano doręczenia e-maila przez produkcyjny Web3Forms, działania usług zewnętrznych ani konfiguracji kont analitycznych.

Uruchomienie na Windows (PowerShell), po udostępnieniu zależności testowych:

```powershell
$env:NODE_PATH = 'ścieżka-do-testowych-node_modules'
node docs/styczen-2027/qa.cjs
node --check assets/js/contact-form.js
git diff --check
```

## SEO i publikacja

- Główna oferta ma title „Zmiana biura rachunkowego od stycznia 2027 | Pełne księgi”; opis i Open Graph odpowiadają tej ofercie.
- Poradnik ma title „Zmiana biura rachunkowego krok po kroku | Poradnik 2026/2027”; nadal opisuje przygotowanie zmiany, nie powiela landingu.
- Oferta, ZDF, home, strony spółek i artykuły prowadzą do jednego celu usługowego. Landing odsyła do poradnika i checklisty audytu.
- Canonicale i wszystkie istniejące URL pozostają bez zmian. Nie ma nowych podobnych stron ofertowych, przekierowań ani zmian robots dla istniejących stron.
- FAQ schema wyrównano do widocznych odpowiedzi, również tam, gdzie rozbieżności istniały wcześniej.
- Zmieniono `dateModified` obu aktualizowanych artykułów, zachowując daty pierwotnej publikacji.

Po zatwierdzeniu i publikacji warto zgłosić ponowne indeksowanie następujących adresów (priorytet od góry), a następnie ponownie odczytać sitemap w GSC:

1. https://pracowniarachunkowosci.pl/zmiana-biura-rachunkowego.html
2. https://pracowniarachunkowosci.pl/
3. https://pracowniarachunkowosci.pl/blog/zmiana-biura.html
4. https://pracowniarachunkowosci.pl/oferta.html
5. https://pracowniarachunkowosci.pl/ksiegowosc-spolka-z-oo.html
6. https://pracowniarachunkowosci.pl/zmiana-biura-rachunkowego-spolka-z-oo.html
7. https://pracowniarachunkowosci.pl/blog/audyt-ksiegowosci-przed-zmiana-biura.html
8. https://pracowniarachunkowosci.pl/zewnetrzny-dzial-finansowy.html

W kolejnych okresach porównać query × URL, CTR i kliknięcia dla klastra zmiany biura. Przy tej skali danych nie zakładać z góry wzrostu pozycji lub konwersji ani nie traktować samego braku kliknięć jako dowodu kanibalizacji.

## Pomiar przed przyszłą kampanią reklamową

W tym PR nie uruchamiano reklam ani nie modyfikowano GTM, GA4, Ads czy Consent Mode.

1. W osobnym zadaniu sprawdzić w GTM Preview, czy istniejący trigger `web3forms_success` i zmienna `inquiry_source` rozpoznają wartość `zmiana-biura-2027`. Nie dodawać drugiej konwersji mierzonej na samym kliknięciu „Wyślij”.
2. Ustalić mapowanie zdarzenia w GA4 i ewentualny import konwersji do Ads, bez podwójnego liczenia. Zachować reguły zgód. Obecny kod nie emituje zdarzenia sukcesu przy braku zgody analitycznej.
3. W razie potrzeby zarejestrować `inquiry_source` jako wymiar zdarzenia i przygotować raport wg źródła zapytania. Nie wysyłać treści formularza, nazw, telefonu, e-maila ani pełnego URL do dataLayer.
4. Ustalić spójne UTM w adresach reklam. Obecne pola formularza czytają parametry bieżącej strony; nie dodano trwałej atrybucji. Link landing → formularz nie przenosi automatycznie UTM/GCLID. Jeśli potrzebne jest zachowanie identyfikatorów między tymi stronami, zaplanować oddzielną implementację i testy zgodności ze zgodami; nie zakładać, że ukryte pola same rozwiązują atrybucję wielostronicową.
5. Zweryfikować w raportach jakość zgłoszeń: spółki/pełne księgi, planowany termin, możliwość współpracy. To odrębne od samego sukcesu technicznego Web3Forms. Ewentualny test realnego doręczenia tylko po osobnej zgodzie właściciela.

## Wycofanie sezonu

Po zakończeniu przyjmowania zgłoszeń na styczeń przygotować osobny PR:

1. Usunąć blok `#zmiana-biura-2027` i dedykowane style `.hp-season*` z home albo zamienić go na aktualny, uzgodniony termin.
2. Na głównym landingu zastąpić badge, lead, harmonogram `#plan-2027`, sezonowe FAQ, końcowe CTA oraz title/description/OG komunikacją bez daty lub nowym potwierdzonym terminem. Zachować evergreen checklistę danych, odpłatność audytu i zasady podziału odpowiedzialności za poprzedni rok.
3. Usunąć stare daty z krótkich odniesień w ofercie, stronie spółek, drugim landingu i llms.txt. Termin na ZDF potwierdzić z właścicielem — pozostaje osobną ofertą. Poradnik może zachować fragment historyczny 2026/2027 z jednoznacznym oznaczeniem archiwalnym albo otrzymać aktualizację merytoryczną.
4. Zmienić aktualne CTA na `/#kontakt` lub nowy zatwierdzony wariant. Stary parametr `service=zmiana-biura-2027` pozostawić przejściowo jako rozpoznany alias dla starych linków, lecz zmienić jego komunikat i subject na informację o aktualnej dostępności; nie obiecywać minionego terminu. Wartość source można zachować dla historycznej atrybucji. Ostateczne usunięcie wariantu zrobić dopiero po sprawdzeniu używanych linków.
5. Wyrównać FAQ/JSON-LD, dateModified i lastmod tylko zmienionych stron, a następnie powtórzyć kontrolowane testy formularza oraz 360/390/1440 px.

Nie wycofywać całego PR automatycznym revertem, jeśli miałoby to przywrócić stare rozbieżności FAQ lub usunąć poprawki dostępności. Zmiany kampanii mają być selektywne; główny URL usługi pozostaje stały.
