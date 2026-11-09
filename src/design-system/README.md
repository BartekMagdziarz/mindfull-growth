# Mindful Growth Design System V2

Design V2 jest celowo ograniczony do korzenia `.mg-design-v2`. Nie zmienia globalnych tokenów ani wyglądu ekranów legacy. Nowe powierzchnie używają wyłącznie semantycznych zmiennych `--mg-*`; źródłowe wartości palety nadal pochodzą z istniejących tokenów produktu.

## Warstwy

- `tokens.css` — kolor, typografia Nunito, spacing, organiczne promienie, elewacja, ruch, focus i z-index.
- `base.css` — scoped reset, dostępność oraz współdzielone anatomie komponentów.
- `components/` — Surface, Button, Field, SegmentedControl, PeriodNavigation, Rail, RatingStack, ProgressMarker, State i WizardShell.
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
- Karty obiektów (2026-09-12, faza 2): czas = `.mg-v2-timeline` (ołówek `__pencil` = kreskowana hairline, atrament `__ink` do „dziś”, kropki `__dot` ze steppera: `--today` atrament z halo, `--done` akcent, przyszła = kreskowany obrys; `--overdue` przebarwia na rose, `--open` blaknie ołówek maską), geometria w `utils/objectWindow.ts` (`ObjectCardTimeline.vue`). Przynależność (od 2026-10-25) = linia tekstu `ObjectCardMetaLine` pod tytułem: „kiedy” (okresy / „na stałe” / „od N tygodni”) · nazwy priorytetów i obszarów, przycięte z pełną listą na hover; glify `.mg-v2-glyph*` usunięte. Oś i obie części linii są przyciskami otwierającymi istniejące pickery; tacka hover ma tylko „⋯”, a menu duplikuje „Powiązania…/Miesiące…/Lata…”.
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
- **Utility na tokenach (K2, 2026-11-02):** `rounded-mg-xs/sm/md/lg/xl/pill`,
  `shadow-mg-raised/-raised-sm/-inset-sm` i `text-mg-chart` (Tailwind,
  `tailwind.config.js`) mapują się 1:1 na `--mg-radius-*`, `--mg-shadow-*` i
  `--mg-font-size-chart`. Są dla pojedynczych elementów bez anatomii; gdy element
  ma rolę (pole, blok, opcja, chip), użyj anatomii. Strażnik przepuszcza
  `rounded-mg-*`, wszystkie inne `rounded-*` poza `rounded-full` dalej łapie.
  Tokeny promieni mają po cztery wartości, więc nie ma wariantów jednej krawędzi
  (`rounded-t-*`).
- **Następcy mostka legacy (K2, 2026-11-02/03):** `mg-v2-block` (zagnieżdżony blok
  w karcie: mgła, najsłabsza krawędź, `md`, bez układu; `--warn` = ton ostrzeżenia ze
  słowami), `mg-v2-input` (skórka pola z cienką krawędzią, bez geometrii; fokus z
  `text-field-focus.css`). Zastąpiły `neo-surface/-inset/-panel/-embedded`, `neo-warning`
  i `neo-input` w kreatorach ćwiczeń i profilu bez zmiany wyglądu. `mg-v2-field`
  (bez ramki, z geometrią) i `mg-v2-input` to dwie skórki pola — ich scalenie należy do
  otwartej decyzji „9 skórek pól → 1”. W kreatorach dochodzi `exercise-option(--active)`
  (karta wyboru) obok `exercise-pill`, `exercise-chip`, `exercise-note`
  (`components/exercises/exercise-design.css`). `mg-v2-segmented` obsługuje też
  `role="radio"` + `aria-checked`. Przycisk ikony ma rozmiary `--icon` (36 px), `--icon-sm` (32 px) i `--icon-xs` (28 px, gęste siatki). Skala tekstu jako utility: `text-mg-xs…2xl`,
  `text-mg-rating`, `text-mg-chart`, `text-mg-icon-sm/md/lg` (tylko font-size, bez
  line-height w odróżnieniu od `text-xs/sm` Tailwinda). Próbki motywów w
  Preferencjach: `--mg-theme-swatch-*` (stałe, niezależne od aktywnego motywu).
- **Welon (K2, 2026-11-03):** `--mg-color-veil` (biel 55 %, przezroczysta) i
  `--mg-color-veil-strong` (75 %) — papier kładziony na barwnym tle (tint ćwiartki
  emocji, kolor części), gdzie nieprzezroczysta mgła/papier przesunęłaby barwę ku niebu.
  Nie na zwykłych kartach i polach — tam drabinka mgła → papier.
- **Segmenty słupków (K2, 2026-11-03):** `--mg-radius-segment` (środek stosu),
  `--mg-radius-segment-top` i `-base` (zewnętrzne końce) — w px, żeby 3-pikselowy
  segment zachował kształt (procentowy `sketch` spłaszczyłby go w elipsę). Dla
  wykresów warstwowych (części w tygodniu, przegląd Momentów); pojedynczy słupek
  dalej `sketch`. Obrys segmentu barwą części = `outline: 1px; outline-offset: -1px`,
  nie lokalny `box-shadow: inset`.
- **Glify tablic i znaczniki (K2, 2026-11-03):** `--mg-font-size-icon-xl` (24 px,
  glif w `mg-v2-icon-board`, rozmiar optyczny Material Symbols) i `-icon-2xl` (36 px,
  `--lg`); utility `text-mg-icon-xl/2xl`. `--mg-font-size-mark` (9 px) — poniżej skali
  tekstu, wyłącznie licznik na kontrolce z ikoną (`mg-v2-icon-count`) i wersalikowa
  etykieta sekcji menu (`mg-v2-menu-section__label`); nigdy dla zwykłego tekstu.
- **Oś osi czasu (K2, 2026-11-03):** `--mg-radius-cloud-track` — chmurka osi celu /
  priorytetu (`mg-v2-timeline__cloud`, 1 rem wysokości), nierówne rogi w px; wgłębienie
  osi = `--mg-shadow-inset-sm`. Wypełnienie osi nie ma własnego promienia — tnie je
  chmurka, a koniec wtapia maska.
- **Strażnik-zapadka:** `npm run check:design-system` skanuje całe `src/`
  (9 reguł) i porównuje z `scripts/design-system-baseline.json`; hook
  PostToolUse sprawdza każdy edytowany plik. `--list [--rule x]` wypisuje
  naruszenia, `--update-baseline` zapisuje bazę (tylko gdy dług zmalał).
  Od 2026-11-09 (K2, partia 14) baza jest pusta: każde naruszenie w `src/` to błąd,
  nie dług do spłaty.
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
- `ReflectionProse` (2026-10-26) — odpowiedź refleksji jako proza: cicha
  etykieta zdaniowa + akapit, hover = papier, klik = ten sam blok jako
  `.mg-v2-editor-canvas` z textarea tych samych metryk; puste odpowiedzi
  zwijają się u gospodarza do linii „Dopisz: …”. Używaj zamiast textarea z
  nagłówkiem wersalikami w kartach.
- Glify przynależności (`.mg-v2-glyph*`, w tym `--cloud`/`--empty`) usunięte
  2026-10-25 po ocenie usera („pusty rząd”); przynależność to linia tekstu
  (`ObjectCardMetaLine`). `.mg-v2-icon-ghost` — pusty dysk ikony w nagłówku
  karty (`IconPicker ghost-when-empty`): wyblakły „+”, pełny na hover karty.
  `.mg-v2-card-indent` — rzędy pod tytułem karty zaczynają się tam, gdzie
  tekst tytułu (dysk 2,75 rem + odstęp).

## Jeden słupek ocen (2026-11-01)

`DsRatingStack` to jedyna skala 1–5 rysowana jako słupek chmurek: wartość nad
słupkiem (pusta bez oceny, nic nie jest preselekcją), chmurki wypełniane od dołu
z rampą krycia, −/+ pod spodem w akcencie, ślad poprzedniej wartości (`ghost`),
klawiatura strzałkami, Delete czyści, `radiogroup` z rolą `radio` na chmurkach.
`quiet` = puste chmurki i podpisy końców pokazują się dopiero w użyciu (karty
rytuału); bez niego są stale widoczne (pojedyncze pytanie w kroku ćwiczenia).
Kolor i gęstość przez zmienne `--ds-rating-fill`, `--ds-rating-bar-width`,
`--ds-rating-bar-height`, `--ds-rating-gap`, `--ds-rating-step-size` (domyślne w
`:where()`, więc każda reguła hosta wygrywa); rozmiar wartości to token
`--mg-font-size-rating`, kształt chmurki `--mg-radius-cloud-a/b`. Hosty:
`QuietRatingBar` (obciążenie = atrament, stan = kolor pary, wysiłek = róż, kompas
kompaktowy) i krótkie skale w `MicroExerciseRunner`. Rzędy 1–5 (`layout="row"`) i
skale 6–11 (`ExerciseScaleRow`) to osobne anatomie.
