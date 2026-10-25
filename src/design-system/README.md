# Mindful Growth Design System V2

Design V2 jest celowo ograniczony do korzenia `.mg-design-v2`. Nie zmienia globalnych tokenów ani wyglądu ekranów legacy. Nowe powierzchnie używają wyłącznie semantycznych zmiennych `--mg-*`; źródłowe wartości palety nadal pochodzą z istniejących tokenów produktu.

## Warstwy

- `tokens.css` — kolor, typografia Nunito, spacing, organiczne promienie, elewacja, ruch, focus i z-index.
- `base.css` — scoped reset, dostępność oraz współdzielone anatomie komponentów.
- `components/` — Surface, Button, Field, SegmentedControl, PeriodNavigation, Rail, ProgressMarker, State i WizardShell.
- `adapters.css` — tymczasowe adaptery dla współdzielonych komponentów legacy używanych wewnątrz nowego workspace’u.

## Zasady

1. Surowe kolory, lokalne cienie, lokalny `font-family` i klasy `neo-*` są zabronione w `src/features/planning-next/` oraz nowych komponentach systemu. Kontroluje to `npm run check:design-system`.
2. Wzorzec trafia do systemu dopiero, gdy ma co najmniej dwóch konsumentów. Wykresy okresowe pozostają w feature, ale używają tokenów.
3. Interakcje mają widoczny `:focus-visible`. Kolor nigdy nie jest jedynym nośnikiem znaczenia — statusy mają także tekst lub ikonę.
4. `prefers-reduced-motion` redukuje animacje i przejścia w całym korzeniu V2.
5. Tekst podstawowy używa `--mg-color-ink`, a tekst pomocniczy `--mg-color-muted`; interaktywne etykiety używają mocniejszego koloru semantycznego.

## Konwencja cieni komponentowych

Strażnik dopuszcza `box-shadow` wyłącznie w postaci `var(--mg-shadow-…)`.
Komponent, który potrzebuje własnych, wyprowadzonych cieni (np. dynamiczny
akcent w `EmotionGroupPicker`), definiuje LOKALNE zmienne w przestrzeni
`--mg-shadow-<komponent>-*` (np. `--mg-shadow-egp-raise`) budowane przez
`color-mix` na tokenach — to konwencja, nie luka: wartości muszą pochodzić
z tokenów lub danych domenowych, nigdy z surowych kolorów w pliku.

## Drabinka tonalna i głębia (decyzja 2026-09-07, wspólna z UX Labem)

Jeden kierunek tonu i jeden kierunek głębi:

- `--mg-color-canvas` (strona) → `--mg-color-surface` (karta, JEDYNY poziom z cieniem `--mg-shadow-raised*`) → `--mg-color-mist` (pole = biel 45 %: `.mg-v2-field`, `.mg-v2-editor-canvas`, `.mg-v2-pill`, `.mg-v2-button`, `.mg-v2-badge`, zagnieżdżone karty `.mg-v2-surface--flat`) → `--mg-color-paper` (wnętrze = biel 80 %: hover, aktywny segment, zaznaczony chip, oraz automatycznie każde pole/chip/przycisk WEWNĄTRZ bloku `--flat`). Tło strony ma wyraźniejszy błękit, a kroki wewnątrz kart pozostają małe; im głębiej, tym bielej, nigdy z powrotem w niebieski („paski”) i nigdy do czystej bieli.
- Karty pierwszego poziomu = `mg-v2-surface mg-v2-surface--raised-sm` (bez `--paper`); karty zagnieżdżone = `--flat` bez cienia.
- Pola i edytory są treścią, nie kontrolkami: płaskie, w tonie pola, z cienką krawędzią `--mg-color-field-border`, bez `inset`; fokus = ramka akcentu, bez rozjaśniania tła. Wklęsłość (`--mg-shadow-inset*`) tylko dla kontrolek: `.mg-v2-segmented`, stan wciśnięty przycisku, zaznaczony checkbox.
- Akcja główna = `.mg-v2-button--primary`: wypełnienie `--mg-color-primary-fill` (surowy `--color-primary-strong`) z białą etykietą. Pozostałe przyciski i chipy = wnętrze z małym cieniem; ikony w kontrolkach mają kolor akcentu `--mg-color-primary`, nigdy atramentu.
- Zaznaczone chipy (`.mg-v2-pill--primary`, `--selected`) = cienki obrys akcentu, płasko — bez wklęsłości i bez niebieskiej wypełnienia.
- Karty obiektów (biblioteka): fakty pod tytułem to cicha linia `.mg-v2-meta` (tekst wyciszony, separatory „·”), nie rząd `.mg-v2-badge`; status pokazujemy tekstem TYLKO gdy nie jest domyślny, a zmienia się go w menu „⋯” (`ObjectsCardStatusMenu`). Kontrolki karty (powiązania, miesiące/lata, rozwiń, menu) siedzą w `.mg-v2-card-tray` — niewidoczne do hovera/fokusu/otwartego popovera; licznik na ikonie = `.mg-v2-icon-count` (wyciszona cyfra, bez wypełnionej kropki).
- Belka Biblioteki obiektów (2026-09-12): prawa grupa kontrolek ma wysokość pigułki — pole szukania to `.mg-v2-field--compact` (2rem, rośnie po fokusie), okres to chip → popover rok/miesiąc (`ObjectsPeriodSelect`), filtry to chip „Filtry · N” → popover z kompaktowymi multi-selectami i przełącznikiem `.mg-v2-switch` (`button[role=switch]`, tor sky-well/akcent, gałka paper). Ustawiony filtr = `.mg-v2-pill--primary.mg-v2-pill--selected`; aktywne filtry z popovera dostają rząd chipów pod belką (`ObjectsLibraryActiveFilters`), okres nie jest tam powtarzany.
- Karty obiektów (2026-09-12, faza 2): czas = `.mg-v2-timeline` (ołówek `__pencil` = kreskowana hairline, atrament `__ink` do „dziś”, kropki `__dot` ze steppera: `--today` atrament z halo, `--done` akcent, przyszła = kreskowany obrys; `--overdue` przebarwia na rose, `--open` blaknie ołówek maską), geometria w `utils/objectWindow.ts` (`ObjectCardTimeline.vue`). Przynależność = `.mg-v2-glyph-row` z `.mg-v2-glyph` (obszar = wypełniona tablica sky-field, priorytet = `--pencil` kreskowany obrys; hover/fokus wysuwa `__name` na paper) — bez kolorów obszarów życia. Oś i glify są przyciskami (`.mg-v2-inline-trigger` → paper) otwierającymi istniejące pickery; tacka hover ma tylko „⋯”, a menu duplikuje „Powiązania…/Miesiące…/Lata…”.
- Wykresy: linie i kropki atramentem `sky-800`, wypełnienia akcentem/pastelami; nie kodować `sky-600`/`sky-500`.

## Warianty organiczne

Do wyboru są trzy skończone kształty: `--mg-radius-organic-a`, `--mg-radius-organic-b` i `--mg-radius-organic-c`. Nie dodajemy ręcznych nieregularnych `border-radius` w ekranach.

## Korzeń na powłoce (2026-09-10)

Od portu „reszty aplikacji” korzeń `.mg-design-v2` siedzi na `<main>` w `AppShell.vue`, więc każdy routowany widok (także logowanie) ma tokeny, Nunito, fokus i reduced-motion. Zagnieżdżone korzenie (Dziennik, Obiekty, dialogi teleportowane do `body`) zostają — redeklaracja tych samych zmiennych jest nieszkodliwa.

- `AppCard` i `AppButton` renderują anatomie `mg-v2-*` (raised → `--raised-sm`, raised-strong → `--raised`, flat → bez cienia, inset → `--flat`; filled → `--primary`, text → `--quiet`, outlined/tonal → domyślny chip). ~170 konsumentów (kreatory ćwiczeń, profil, historia) przeszło bez edycji.
- `adapters.css` mostkuje pozostałe klasy legacy (`neo-segmented`, `neo-step-*`, `neo-back-btn`, `neo-selector`, `neo-checkbox-row`, `neo-panel`, `neo-embedded`, `neo-warning`, `neo-icon-circle`, `neo-progress-*`, `neo-toggle-*`, `neo-footer`, `neo-control`, `neo-pill`). Stany hover/pressed używają realnej specyficzności, bo muszą pobić pseudoklasy z `main.css`.
- Nowe anatomie strony: `.mg-v2-page-head` (back · eyebrow/tytuł/opis/meta · akcje; `PageHeader.vue`), `.mg-v2-section-head` + `.mg-v2-hairline` (kreskowana linia ołówka), `.mg-v2-surface--sheet` (podwójna włoskowa krawędź kartki), `.mg-v2-icon-board` (tablica ikony; `--tinted` przyjmuje `--mg-icon-board-tint` / `--mg-icon-board-tint-mix` z danych domenowych), `.mg-v2-tile` + `.mg-v2-tile-grid` (płytki katalogu z alternującymi kształtami i mikro-przekręceniem), `.mg-v2-stepper` (kropki: zrobione = akcent, bieżące = atrament z papierową obwódką, przyszłe = kreskowany obrys).
- Nić `.mg-v2-thread` (2026-10-25): pionowy stepper dla stosu kart wypełnianych po kolei (kwestionariusze, `LikertItemList`). `ol.mg-v2-thread > li.mg-v2-thread__item(--done|--current) > span.mg-v2-thread__dot + karta`; kropki w gramatyce steppera, szew ołówkiem → akcentem po zrobieniu. `--mg-thread-dot-top` wyrównuje kropkę z pierwszą linią karty. Nie dla list bez kolejności i nie jako dekoracja.
- Ćwiczenia: każdy widok trasy używa `ExercisePage.vue` (PageContainer reading + PageHeader z powrotem do katalogu); katalog trzyma zakładkę w `?tab=`.

## Wspólne tło strony (2026-09-11)

Wybrany wariant: bardziej błękitne, jednolite niebo. Domyślne
`--color-background` = `211 226 248` (`#D3E2F8`), a `--mg-color-canvas`
odwołuje się do tego samego tokena. `body` maluje tło całej aplikacji,
włącznie z przestrzenią przy docku; korzenie widoków są przezroczyste.
Pozostałe motywy zachowują własny kolor tła, także bez gradientu.

Dzisiaj i planning-next używają kontenera układu bez wgłębionej podstawy.
Zewnętrzny arkusz Kalendarza jest wyłącznie układem, bez własnego tła ani
podwójnego obrysu. Główne moduły zachowują swoje powierzchnie i cienie.
Ta zmiana nie rozjaśnia kart, nie wzmacnia cieni, nie dodaje obrysów i nie
zwiększa odstępów — poprawa separacji pochodzi ze wspólnego tła.


## Ikony Organic Outline B (2026-09-13)

Na prośbę użytkownika aplikacja używa zatwierdzonej rodziny 293 SVG z UX Lab. Źródło: `icons/organicIcons.ts` oraz `icons/seedIcons.ts`; Lab importuje ten sam katalog. Renderuj przez `AppIcon`, np. `<AppIcon name="mg-goal" class="text-xl" />`. Siatka 24×24, kontur 1.75, zaokrąglone końce, `currentColor`. Ikona jest dekoracyjna; przycisk bez tekstu musi mieć dostępną nazwę.

`icons/resolveIcon.ts` obsługuje stare nazwy bez przepisywania danych oraz dodatkowe rozróżnialne stany checkboxów, radio i skal ocen. Nowy `IconPicker` zapisuje `mg-<id>`, aby uniknąć kolizji ze starymi identyfikatorami. Emoji użytkownika i dedykowane grafiki emocji pozostają zachowane. Nieznany historyczny symbol wyświetla neutralną ikonę biblioteki, zachowując zapisaną wartość.

Klasa `material-symbols-outlined` pozostaje tymczasowo jako istniejący selektor rozmiaru/koloru; nie renderuje już tekstu fontu. Produkcyjny HTML nie pobiera fontu Material Symbols. Nie dodawać surowych spanów z nazwą symbolu. Zmiany geometrii sprawdzać w Labie w 16/20/24/32 px i uruchamiać jego eksport.

## Obciążenie i stan (2026-09-20)

Oceny tygodnia per obszar to dwie osie: **obciążenie** (atrament, `rgb(var(--sky-800))`,
krycie rośnie z poziomem) i **stan** w kolorze ćwiartki pary — tokeny ćwiartek emocji
(`--color-quadrant-*`) plus `--sky-600` dla „ciężko · dobrze” i `--sky-500` dla środka.
Reguła koloru mieszka w `src/domain/loadState.ts` (`pairColor`, `pairInk`, `loadInkCss`);
wstęga serii to `src/components/shared/charts/LoadStateRibbon.vue`. Różowa rodzina
`--mg-color-effort*` należy do starej osi Działania (klasyczny wizard) i **nie** oznacza
obciążenia — w nowych widokach jej nie używać.

## Design system A „Cirrus” (2026-10-20)

Wdrożenie propozycji A z audytu 2026-10-18 (plan i porównanie:
`ideas/html-plans/2026-10-18-design-system-proposals.html`; zasady i procesy:
`docs/design-system-governance.md`; powody: `docs/design-decisions.md`).

- **Tokeny na `:root`.** `tokens.css` deklaruje semantykę na `:root, .mg-design-v2`;
  dock, teleporty i `AppShell` czytają te same wartości. Korzeń `.mg-design-v2`
  zostaje dla `color-scheme`, fokusu i reduced-motion.
- **Nowe role:** `--mg-weight-body/label/strong/title` (400/600/700/800 — jedyne
  dozwolone wagi), `--mg-font-size-chart` (11 px, tylko osie wykresów),
  `--mg-radius-xs` (8 px), `--mg-radius-button` (= `md`; każdy przycisk tekstowy),
  `--mg-shadow-control` (chipy/przyciski — w Cirrus `none`), `--mg-shadow-raised-md`,
  `--mg-duration-base`, `--mg-color-text` (aliasy dla istniejących odwołań).
- **Skala:** `--mg-font-size-xs` = 12 px (było 11). `--mg-color-muted` =
  `rgb(var(--color-on-surface-variant))` — jedyny wyciszony atrament.
- **Cienie** liczone na `--sky-700`/bieli, nie na `--neo-*`; `inset` płaski
  (`0 1px 2px` / `0 2px 4px`).
- **Kolory domenowe:** ćwiartki emocji, akcenty kategorii ćwiczeń i `--self-*`
  w pastelach rodzin palety (`styles/tokens.css`). Literały w
  `domain/emotionGroups.ts`, `emotionFamily.ts`, `program-path/partColors.ts`
  czekają na K2 (wyjątki w strażniku).
- **Mostek legacy** (`adapters.css`, sekcja „Design system 2026-10-20”):
  `neo-raised/-card` → karta V2; `neo-panel/-embedded/-inset/-surface` → mgła;
  `neo-input` → pole; `neo-control/-pill/-selector/-icon-button/-back-btn` →
  kontrolki V2; `rounded-3xl/2xl/xl/lg/md` → `--mg-radius-xl/lg/md/sm/sm`;
  `shadow-neu-*` → dwa cienie; `font-black/bold/semibold/medium` → cztery wagi;
  `text-on-surface-variant` → `--mg-color-muted`. Mostek jest tymczasowy: nie
  dodawaj nowych konsumentów klas po lewej stronie.
- **Strażnik-zapadka:** `npm run check:design-system` skanuje całe `src/`
  (9 reguł) i porównuje z `scripts/design-system-baseline.json`; hook
  PostToolUse sprawdza każdy edytowany plik. `--list [--rule x]` wypisuje
  naruszenia, `--update-baseline` zapisuje bazę (tylko gdy dług zmalał).
- **Skill `design-system`** (`.claude/skills/design-system/SKILL.md`): procedura
  użyj → rozszerz → dodaj rolę; obowiązkowa przy każdej zmianie wyglądu.

## Fokus = papier, nie ramka (2026-10-25)

Pole tekstowe w fokusie nie dostaje pierścienia: idzie o jeden stopień bielej
(mgła → papier) i bierze krawędź `--mg-color-focus-edge`. Goły input bez własnej
krawędzi dostaje włoskową linię pod tekstem (`--mg-shadow-focus-underline`).
Pierścień `--mg-focus-ring` (2 px / 0,32) jest tylko dla kontrolek
(przyciski, linki, chipy) i dziedziczy ich promień. Jedyny właściciel fokusu pól
to `src/styles/text-field-focus.css` (selektory `#app`); `base.css` powtarza
gramatykę dla korzeni poza `#app`.

- `.mg-v2-inline-field` — goły tytuł/etykieta w nagłówku karty lub wierszu
  listy: przezroczysty do dotknięcia, hover = papier, fokus = papier +
  krawędź; geometria stała (promień `sm`, padding 4/8 px). Nie dla pól
  formularzy — te są `.mg-v2-field`.

## Zdanie pomiaru i duchy (2026-10-25)

- `.mg-v2-sentence` — jedna linia cichych słów, w której zmienne słowa są
  płaskimi pigułkami (`.mg-v2-sentence__pill`, `KrPillDropdown`), liczby
  kompaktowymi polami (`.mg-v2-field.mg-v2-sentence__num`), a klauzule dzieli
  `.mg-v2-sentence__sep`. Płynie i łamie się jak proza; nigdy nie jest kolumną
  w boksie. Tryb czytania to zwykły tekst `.mg-v2-meta` z
  `formatMeasurementSentence` — te same słowa, małe litery.
- `.mg-v2-ghost` (`--pill` w zdaniu, `--row` pusty wiersz listy, `--line`
  nieustawiona linia okresów) — „jeszcze nie” narysowane jako kreskowany obrys
  tej rzeczy w atramencie akcentu, hover = papier. Dodawanie czegoś w treści
  karty jest zawsze duchem, nigdy wypukłym `.mg-v2-button`.
- Poprawka 2026-10-25 (decyzja usera): pigułki w zdaniu są chmurami jak
  przyciski (wypełnienie + `--mg-shadow-raised-sm`, bez widocznej krawędzi;
  otwarta = papier + `--mg-shadow-inset-sm`). `.mg-v2-ghost` nie ma
  kreskowania — to wyblakła chmura (papier/55 %, opacity 0,85). Kreskowane
  obrysy zostają wyłącznie w stepperze, glifie priorytetu i linii celu.
- `.mg-v2-group` — cichy blok pod jedną częścią karty (zdanie, elementy,
  okresy, wykres): o stopień bielszy niż rodzic (mgła na karcie, papier w
  karcie `--flat` lub w innej grupie), promień `md`, padding `space-3`,
  wszystko w środku bierze kolejny stopień; opcjonalna etykieta zdaniowa
  `.mg-v2-group__label` (xs, muted, nigdy wersaliki).
- Pola bez ramki (2026-10-25, decyzja usera): `.mg-v2-field` i
  `.mg-v2-editor-canvas` mają w spoczynku przezroczystą krawędź — polem jest
  bielsze wypełnienie; krawędź akcentu pojawia się tylko w fokusie. Wyjątek:
  pole papierowe na papierowej grupie dostaje `--mg-color-border-subtle`, żeby
  nie zniknąć. `--mg-color-field-border` zostaje dla kontrolek, które same o
  nią proszą.
