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
