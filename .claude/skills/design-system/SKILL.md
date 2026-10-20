---
name: design-system
description: Workflow for ANY visual/UI change in mindfull-growth — new view, component, wizard step, card, chip, chart, colour, shadow, radius, font size, or "make X look like Y". Loads the design-system rules (tokens --mg-*, anatomies mg-v2-*, tonal ladder, four weights, shapes), decides whether to reuse, extend the shared layer, or add a token role, and runs the guard + canonical-viewport screenshots. Use before touching <style>, class lists, or anything the user calls design/wygląd/styl/kolor/kształt.
---

# Design system — jak pracować nad wyglądem

Źródła prawdy (czytaj w tej kolejności, zanim napiszesz CSS):

1. `src/design-system/README.md` — tokeny, anatomie, drabinka tonalna, decyzje.
2. `docs/design-system-governance.md` — zasady i procesy (warstwy, co wolno,
   DoD komponentu, deprecjacja, bramki).
3. `docs/design-decisions.md` — log decyzji (ADR). Nowa decyzja = nowy wpis.
4. `src/design-system/tokens.css` (semantyka) i `src/styles/tokens.css`
   (prymitywy, motywy) — wartości.

## Decyzja: użyć, rozszerzyć czy dodać

Przed implementacją odpowiedz na trzy pytania i zapisz odpowiedź w odpowiedzi
dla użytkownika:

1. **Czy istnieje anatomia/komponent?** (`mg-v2-surface/-button/-pill/-field/
   -tile/-icon-board/-page-head/-section-head/-stepper/-segmented/-popover`,
   `DsButton/DsSurface/DsSegmentedControl/AppCard/AppButton/AppDialog/
   PageHeader/ExercisePage/MicroExerciseRunner/QuietRitualShell`). Jeśli tak —
   użyj, nie kopiuj stylów.
2. **Czy brakuje roli, nie wartości?** Gdy widok „potrzebuje innego koloru /
   cienia / rozmiaru”, to zwykle brakuje ROLI semantycznej. Dodaj token
   `--mg-<kategoria>-<rola>` w `src/design-system/tokens.css` (wartość z
   prymitywów `--sky-*`/`--rose-*`, `color-mix`), opisz w README, wpis w
   decyzjach. Nigdy literału w widoku.
3. **Czy wzorzec ma ≥ 2 konsumentów (albo jest szablonem strony)?** Wtedy
   anatomia trafia do `base.css` + komponent `Ds*`/`App*` z kompletem stanów
   (hover / focus-visible / pressed / selected / disabled / error), a11y i
   testem. Pojedynczy konsument żyje w feature CSS — ale wyłącznie na tokenach.

## Zasady niezmienne (skrót)

- Drabinka: niebo → karta (jedyny poziom z cieniem) → mgła (pole/chip) →
  papier (wnętrze/hover). Głębiej = bielej, nigdy czysta biel, nigdy z powrotem
  w niebieski.
- Jedna rodzina cieni: `--mg-shadow-raised` (nakładka), `-raised-sm` (karta),
  `-control` (chip/przycisk), `-inset(-sm)` (tylko kontrolki).
- Typografia: `--mg-font-size-xs…2xl` (12/13/15/18/24/32) + `--mg-font-size-chart`;
  wagi `--mg-weight-body/label/strong/title` (400/600/700/800). Zakaz
  `text-[Npx]`, px/rem w `font-size`, wag 500/650/750/850/900.
- Kształt = rola: nośnik ikony = koło organiczne (`--mg-radius-icon-field-*`);
  karta `lg`; pole `sm`; przycisk `--mg-radius-button`; chip `pill`; słupki
  `sketch`. Zakaz literalnego `border-radius` i `rounded-*` poza `rounded-full`.
- Atramenty: `--mg-color-ink`, `--mg-color-muted` (jedyny muted),
  `--mg-color-primary-strong` (interaktywne etykiety). Statusy zawsze z tekstem
  lub ikoną. Kolory danych: `data-fill/state/state-soft/effort-fill`, linie
  `sky-800`. Ćwiartki emocji i części IFS — tylko ich tokeny.
- Mało słów, zero liczb na wierzchu; akcje zaraz po treści; nic rozciągniętego
  na całą szerokość szerokiej kolumny.
- Legacy `neo-*`, `shadow-neu-*`, `rounded-2xl` itp. są mostkowane w
  `adapters.css` i wycofywane — nie dodawaj nowych konsumentów.

## Procedura

1. Przeczytaj README i (jeśli dotyczy) feature CSS obszaru.
2. Zaimplementuj przez anatomie/komponenty i tokeny.
3. `node scripts/check-design-system.mjs --file <zmienione pliki>` — hook
   PostToolUse robi to po każdej edycji; pełny bieg `npm run check:design-system`
   przed commitem. Nowe naruszenie = popraw, nie dopisuj do bazy. Jeśli
   zmniejszyłeś dług: `--update-baseline`.
4. Zrzut 1512 × 982 @2x na 5199 (`verify-app`), obok sąsiedniego widoku tej
   samej rodziny; dla większych zmian `node ideas/design-system-2026-10/capture.mjs --tag <x> --lite`
   + `analyze.mjs <x>` (progi: docs/design-system-governance.md §6).
5. Gdy zmieniłeś część wspólną: README (anatomia/token: kiedy używać, czego nie),
   `docs/design-decisions.md` (kontekst → decyzja → konsekwencje → data),
   `--update-baseline` jeśli dług zmalał.
6. W odpowiedzi dla użytkownika: co użyte z systemu, co dodane do części
   wspólnej i dlaczego, wynik strażnika, ścieżki zrzutów.
