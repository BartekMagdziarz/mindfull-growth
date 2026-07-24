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

## Warianty organiczne

Do wyboru są trzy skończone kształty: `--mg-radius-organic-a`, `--mg-radius-organic-b` i `--mg-radius-organic-c`. Nie dodajemy ręcznych nieregularnych `border-radius` w ekranach.
