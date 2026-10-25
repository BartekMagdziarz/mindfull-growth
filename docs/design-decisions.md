# Decyzje designu (ADR-lite)

Jeden wpis = jedna decyzja: kontekst → decyzja → konsekwencje → data. Nowsze na
górze. README design systemu opisuje STAN; ten plik opisuje POWÓD. Zasady i
procesy: `docs/design-system-governance.md`.

## 2026-10-20 — Strażnik-zapadka na całym `src/`

Kontekst: strażnik pilnował tylko wybranych katalogów; 2,1 tys. literałów
(font-size, promienie, cienie, `neo-*`, `rounded-*`, `text-[Npx]`) w 191 plikach
leżało poza nim. Decyzja: `scripts/check-design-system.mjs` skanuje całe `src/`
dziewięcioma regułami i porównuje z `scripts/design-system-baseline.json`; plik
nie może mieć więcej naruszeń niż w bazie; `--update-baseline` tylko w dół.
Hook PostToolUse (`.claude/settings.json` → `scripts/hooks/design-system-post-edit.mjs`)
sprawdza każdy edytowany plik. Konsekwencje: stary dług nie blokuje, nowy —
tak; dług widać liczbowo w bazie (`byRule`).

## 2026-10-20 — Propozycja A „Cirrus” jako design system

Kontekst: audyt 304 zrzutów wykazał 32 rozmiary fontu, 9 wag, 29 kolorów
tekstu, 62 promienie, 31 cieni i trzy warstwy stylów; trzy propozycje
(A Cirrus / B Stratus / C Cumulus) sprawdzono jako nakładki tokenów na żywej
aplikacji (`ideas/html-plans/2026-10-18-design-system-proposals.html`).
Decyzja użytkownika: zacząć od A (najmniejsze ryzyko — utrwala to, co już ma
Dzisiaj/Kalendarz/Obiekty). Konsekwencje:

- tokeny semantyczne `--mg-*` deklarowane na `:root` i `.mg-design-v2`, więc
  dock, dialogi teleportowane do `body` i przycisk „wstecz” w powłoce mają te
  same wartości;
- cztery wagi (`--mg-weight-body/label/strong/title` = 400/600/700/800),
  `--mg-font-size-xs` = 12 px (było 11), `--mg-font-size-chart` = 11 px tylko
  dla osi wykresów;
- jedna rodzina cieni na `--sky-700` zamiast tokenów `--neo-*`;
  `--mg-shadow-control: none` (chipy i przyciski płaskie), `inset` płaski;
  zdefiniowane dotąd brakujące `--mg-shadow-raised-md`, `--mg-duration-base`,
  `--mg-color-text`;
- jeden muted: `--color-on-surface-variant` = 71 97 127 i `--mg-color-muted`
  czyta go wprost;
- `--mg-radius-xs` (8 px) i `--mg-radius-button` (= md) jako nowe role;
- ćwiartki emocji, akcenty kategorii ćwiczeń i 8 „C” Self-Energy w pastelach
  rodzin nieba/róży/lawendy/mięty/bursztynu zamiast saturowanych web-kolorów;
- body w Nunito (`var(--mg-font-sans)`), `AppDialog` zawsze w korzeniu V2 z
  panelem `mg-v2-surface --raised`;
- mostek legacy w `adapters.css` (sekcja „Design system 2026-10-20”): `neo-*`,
  `rounded-*`, `shadow-neu-*`, `font-*`, `text-on-surface-variant` → tokeny.
  Mostek jest tymczasowy (governance §5.4).

Nie zrobione (K2): migracja literałów w `quiet-ritual.css`/`planning-next.css`,
kolory ćwiartek w `emotionGroups.ts`/`emotionFamily.ts`/`partColors.ts`, 12
stepperów → 1, ~25 chipów → 1, 9 skórek pól → 1, skala Tailwinda `text-sm` itd.
Odrzucone na razie: fill przycisku głównego sky-600 (5,1:1) — zostaje decyzja
Laba 86 142 210 (3,4:1); do rozważenia przy K2.

## 2026-10-20 — Daty w locale aplikacji

Kontekst: Dziennik, Emocje i Historia pokazywały „Today, 11:00 AM” / „Oct 9,
2026” w polskim UI (`formatEntryDate` bez locale, `toLocaleDateString('en-US')`).
Decyzja: `useT().locale` przekazywane do `formatEntryDate`, `toLocaleDateString`
z locale aplikacji, „Dziś, HH:MM” z klucza `journal.editor.todayTime`.

## 2026-10-25 — Responsive page as an explicit shell opt-in

AI planning assistant reuses Cirrus surfaces, fields, buttons and segmented controls
from the approved UX Lab concept, without new tokens. The application shell normally
requires 1180 px; routes whose content supports narrow screens can opt in through
`meta.responsive`. The shared `mg-v2-responsive-page` anatomy removes that minimum
only for those routes. Below 760 px, the same route flag moves the existing dock
into a horizontal bottom capsule. Other routes retain their desktop geometry.
The assistant switches between conversation and draft on narrow screens.

## 2026-10-25 — Nić: pionowy stepper dla stosu kart (`.mg-v2-thread`)

Kontekst: kwestionariusze (SCS-SF, GAD-7, IPIP…) pokazywały postęp paskiem nad
kartami, który znika po przewinięciu, a zaznaczona odpowiedź była niewidoczna
(mostek `neo-pill`, backlog B-10).
Decyzja: nowa anatomia `.mg-v2-thread` w `base.css` — stepper obrócony w pion.
Każda karta wisi na niebie obok kropki w gramatyce `.mg-v2-stepper` (zrobione =
akcent, bieżąca = atrament z halo, przyszła = kreskowany obrys); szew do
następnej kropki jest ołówkiem (kreskowana linia jak `.mg-v2-hairline`), a po
odpowiedzi tuszem akcentu. Postęp czyta się obok każdej karty na ekranie, więc
bez przyklejonego paska i bez liczb. Odpowiedzi to `.exercise-chip` (wybrana =
wypełnienie akcentem, jak w kreatorach ćwiczeń); pierwsza odpowiedź łagodnie
przewija do następnej otwartej karty, ostatnia — do przycisków strony
(reduced-motion: bez animacji).
Konsekwencje: jednostronicowe kwestionariusze nie mają już paska nad kartami;
wielostronicowe zachowują go jako licznik całości. Nić nadaje się do każdego
stosu kart wypełnianych po kolei (np. przyszłe ankiety, listy kontrolne).

## 2026-10-25 — Rytuał powrotu po przerwie: karta w Dzisiaj i macierz „co zachować”

Kontekst: po kilku tygodniach bez zapisów aplikacja nie miała pojęcia przerwy —
każdy dzień bez wpisu był porażką, a scheduler rytmu dopełniał minione tygodnie
w chwili powrotu. Użytkownik chciał rytuału „wyczyść i zaplanuj na nowo”, bez
encji przerwy, bez AI, z możliwością uzupełnienia dowolnego pomiaru wstecz.
Decyzja: (1) karta „Wracasz po przerwie” w prawej kolumnie Dzisiaj nad
Kompasem, w gramatyce kart `ndt-card` (DsSurface raised-sm, eyebrow, jedno
zdanie, dwa przyciski `mg-v2-button`), bez liczb zaległości; (2) rytuał na
`QuietRitualShell` (cztery kroki, zapis tylko przy „Start”); (3) faza „Co
zachować” to wspólna `AssignmentMatrix` z tygodniami w kolumnach (komórka =
zachowaj, kropka w rogu = był w planie); (4) edytor tygodnia `rr-grid`: dysk
= zaplanowany (koło organiczne `--mg-radius-icon-field-a`), obok wykonanie w
gramatyce trybu, pusty zaplanowany dzień jest legalny; (5) decyzje w wierszach
`rr-row` z segmentem `rr-seg` (jak `gc-seg` w zamykaniu celu). Wszystko na
rolach `--qr-*` i tokenach `--mg-*`; bez nowych tokenów ani anatomii wspólnych.
Konsekwencje: `rr-seg` jest trzecim konsumentem wzorca segmentu w rytuałach
(`gc-seg`, `qr-*`) — kandydat na anatomię `mg-v2-segmented` w cichym tonie;
selektory kontrolek z obrysem muszą być zawężone do `.quiet-ritual`, bo
globalne `.quiet-ritual button { border: 0 }` je zeruje.

## 2026-10-25 — Fokus = papier, nie ramka (cała aplikacja)

Kontekst: jeden właściciel fokusu pól (`src/styles/text-field-focus.css`,
selektor `#app`) rysował wklęsłą ramkę 2 px w kolorze akcentu, a korzeń V2
dokładał pierścień 3 px (`--mg-focus-ring`); na gołych tytułach kart bez
promienia dawało to ostry niebieski prostokąt. Użytkownik: „w całej aplikacji
do poprawy, potrzebujemy czegoś dużo bardziej subtelnego”.
Decyzja: pole tekstowe w fokusie nie dostaje pierścienia — idzie o jeden
stopień bielej (mgła → papier) i bierze krawędź akcentu
`--mg-color-focus-edge` (primary-strong / 0,6). Goły input bez własnej
krawędzi dostaje jedną włoskową linię pod tekstem
(`--mg-shadow-focus-underline`), żeby fokus z klawiatury był widoczny bez
prostokąta. Pierścień klawiatury zostaje tylko dla kontrolek (przyciski,
linki, chipy): `--mg-focus-ring` = 2 px / 0,32 i dziedziczy promień
kontrolki. Nowa anatomia `.mg-v2-inline-field` dla gołych tytułów w
nagłówkach kart i wierszach list (hover = papier, fokus = papier + krawędź).
Konsekwencje: `text-field-focus.css` pozostaje jedynym właścicielem fokusu
pól (selektory `#app`), reguły w `base.css` powtarzają tę samą gramatykę dla
korzeni poza `#app` (teleporty). `.mg-v2-editor-canvas` w fokusie też bieleje.
Kontrast krawędzi do sprawdzenia na zrzutach rytuałów i czatu (R1 w planie
`ideas/html-plans/2026-10-25-object-cards-calm.html`).

## 2026-10-25 — Zdanie pomiaru: jedno zdanie, dwa tryby; duchy zamiast przycisków

Kontekst: rozwinięta karta pomiaru (rezultat, nawyk, tracker) pokazywała cel
jako wieżę pigułek w boksie „Cel”, skalę ocen jako osobny blok „Skala od/do”,
próg checklisty jako osobną linię „Zalicz dzień przy…”, a warunek dni jako link
z kropkowanym podkreśleniem; zwinięta karta czytała inny, kapitalizowany
skrót („Tygodniowy · Wartość · Ostatnia wartość Co najwyżej 80”).
Decyzja: (1) `formatMeasurementSentence` (`utils/measurementTargetFormat.ts`)
jest jedynym czytanym zdaniem pomiaru — małe litery, klauzule rozdzielone „·”:
próg checklisty („komplet elementów” / „3 z 4 pkt”), agregacja, operator,
wartość, jednostka („razy”, „dni”, „na 5”), warunek dni, kadencja.
(2) `MeasurementTargetSentence` edytuje to samo zdanie: klauzula skali
(„od 1 do 5”, prop `editableScale`, emit `update:scale`) i klauzula progu
checklisty (prop `multi`, emit `update:threshold`) wchodzą do zdania; bloki
„Skala” i wiersz progu w `MultiItemsEditor` zniknęły. (3) Anatomia
`.mg-v2-sentence`: pigułki płaskie (`.mg-v2-sentence__pill`, otwarta =
obrys akcentu), liczby = `.mg-v2-field.mg-v2-sentence__num`, separator
`__sep`. (4) Anatomia `.mg-v2-ghost` (`--pill/--row/--line`): „dodaj X” to
kreskowany duch X w atramencie akcentu, nigdy wypukły przycisk w treści
karty — „+ dni” zamiast linku „+ warunek dni”, usunięcie warunku = cichy
„×” w zdaniu. (5) `KrPillDropdown` przeszedł na `.mg-v2-pill` +
`.mg-v2-popover` (bez `neo-*`). Stary `formatMeasurementTargetSummary`
zostaje dla chipów rytuałów.
Konsekwencje: podgląd KR niesie `ratingScale/Min`
(`objectsLibraryQueries`); hosty przekazują fakty checklisty przez
`checklistSentenceFacts`. Układ kart (siatka Okresy|Cel, nagłówki
wersalikami, linia okresów, tacka checklisty) to faza P2 planu
`ideas/html-plans/2026-10-25-object-cards-calm.html`.

## 2026-10-25 — Chmury zamiast obrysów: pigułki zdania, duchy bez kresek, grupy na karcie

Kontekst: po P2 planu „spokojne karty” użytkownik odrzucił trzy rzeczy:
obrysowane pigułki-selekty w zdaniu pomiaru („przyciski bez ramki wyglądają
jak chmury i taki efekt chcemy”), kreskowane obrysy duchów („zbyt
matematyczne, chcemy rysunkowy charakter”) i brak czytelnego podziału
rozwiniętej karty („nie wiadomo, co do czego należy”). Do tego granatowa
linia i kropka wykresów liniowych.
Decyzja: (1) kontrolki w treści karty są chmurami jak każdy przycisk:
wypełnienie + `--mg-shadow-raised-sm`, krawędź przezroczysta; otwarta
pigułka = papier + `--mg-shadow-inset-sm`. Pola (liczby, opis) zostają
treścią z cienką krawędzią. (2) `.mg-v2-ghost` bez kreskowania: wyblakła
chmura tej rzeczy (papier/55 %, opacity 0,85), hover = pełna chmura. Kreski
zostają tylko tam, gdzie już były decyzją: przyszłe kropki steppera, glif
priorytetu, linia celu na wykresie. (3) Nowa anatomia `.mg-v2-group`: cichy
blok pod każdą częścią karty (zdanie, elementy, okresy, wykres), o jeden
stopień bielszy niż rodzic (mgła na karcie, papier w karcie mglistej),
z opcjonalną etykietą zdaniową `.mg-v2-group__label`; wiersze checklisty mają
własne pola papieru, „Dodaj element” to mała chmura pod listą. (4) Wykres
liniowy rysuje się `--mg-color-data-fill` jak słupki, a ostatnia wartość to
dysk w gramatyce `.mg-well--done` (sky-field + rdzeń `--mg-color-state`).
Konsekwencje: P2 w `docs/objects-library-toolbar-and-cards.md` czyta się z
tą poprawką; README opisuje `.mg-v2-group`. Przy P3/P4 nie wprowadzać
kreskowanych obrysów ani obrysowanych kontrolek.

## 2026-10-25 — Kafelki elementów, glif-chmura, wcięcie pod tytułem

Kontekst: wiersze elementów checklisty były długie i rezerwowały puste prawo
na tackę; glif priorytetu miał kreskowany obrys; góra karty była chaotyczna
(pusty dysk ikony, rzędy zaczynające się pod dyskiem, trzy wagi glifów).
Opcje z mockupami: `ideas/html-plans/2026-10-25-checklist-items-and-card-head.html`.
Decyzja (user: C + G1 + H1): (1) elementy jako kafelki 3 w rzędzie bez akcji;
jeden pasek edycji pod siatką otwierany klikiem w kafelek, więc żaden element
nie rezerwuje miejsca na tackę; dodawanie = wyblakły kafelek. (2) Priorytet =
`.mg-v2-glyph--cloud`, obszar = płaska tablica, pusty = wyblakła chmura „+”;
`--pencil` usunięty. (3) Rzędy pod tytułem wcięte do początku tekstu tytułu
(`.mg-v2-card-indent`), pusty dysk ikony = `.mg-v2-icon-ghost` (opcja
`ghost-when-empty` w `IconPicker`).
Konsekwencje: e2e checklisty liczy kafelki (`data-testid="multi-item"`) i
sprawdza pasek (`multi-item-editor`); kreskowane obrysy zostają tylko w
stepperze i linii celu na wykresie. H3 (nazwy zamiast glifów) odłożone.
