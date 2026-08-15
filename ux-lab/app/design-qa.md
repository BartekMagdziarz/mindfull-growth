# Design QA — planning and weekly-reflection wizards

## Scope

- Final QA covers the compact weekly/monthly target editors, both planning-review chapters, the factual first chapter of weekly reflection and the weekly anchor questions.
- The declared prototype scope remains desktop-only at a 1280×720 CSS viewport.

## Visual evidence and normalization

- Source visual truth:
  - oversized monthly target-settings crop: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/month-plan-v6-source-oversized-target-settings.png` — 1902×362 px, focused user screenshot, density not declared;
  - unclear weekly-reflection picture: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-reflect-v6-source-unclear-picture.png` — 2032×1094 px, user screenshot, density not declared.
- Browser-rendered implementation evidence from the in-app browser at a 1280×720 CSS viewport and DPR 2; the browser API returns CSS-sized 1280×720 screenshots:
  - monthly compact target row, manual mode: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/month-plan-v6-compact-target-row-final.jpg`;
  - weekly factual reflection with one day selected: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-reflect-v6-facts-final.jpg`;
  - weekly planning review: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-plan-v6-review-final.jpg`;
  - monthly planning review: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/month-plan-v6-review-final.jpg`;
  - weekly production-aligned anchors: `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-reflect-v6-anchors-final.jpg`.
- Focused implementation evidence was cropped from the same 1280×720 captures to the 875×650 ritual-stage bounds:
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/month-plan-v6-compact-target-focused.jpg`;
  - `/Users/mg/Developer/mindfull-growth/ux-lab/app/qa/new-calendar/week-reflect-v6-facts-focused.jpg`.
- The source and post-fix implementation were opened together in the same comparison input for both affected screens. The source target-settings image is a focused crop whereas the implementation includes the full stage; no pixel-level scale claim is made. Layout hierarchy, occupied height, interaction grouping and information density were compared after normalizing to the content region.

## Comparison history, findings and fixes

- [P1] Monthly `Tygodnie` and weekly `Rytm` opened target settings in a second, tall panel that repeated context and consumed most of the step.
  - Fixed by placing quick actions on the left and a 34 px compact editor on the right of the same underbar. Weekly/monthly values remain in their existing day/week columns; advanced operator and aggregation controls open only through `Ustawienia`.
  - Post-fix evidence: `month-plan-v6-compact-target-row-final.jpg` and `month-plan-v6-compact-target-focused.jpg`. Manual T26–T28 values stay directly below the shared week header; there is no duplicate week grid or explanatory slab.
- [P1] The first weekly-reflection chapter exposed unlabeled dots and duplicated object rows, so it was unclear what was factual and what required review.
  - Fixed by renaming the chapter to `Fakty`, adding four period facts, an explicit planned/completed legend, per-day `wykonane / plan` values, a disclosed factual day detail and a handoff explaining that six objects are reviewed next.
  - Post-fix evidence: `week-reflect-v6-facts-final.jpg` and `week-reflect-v6-facts-focused.jpg`. The first chapter contains zero object-review rows.
- [P1] The final weekly/monthly planning chapters were generic summaries without a clear decision or route back to the cause of a problem.
  - Fixed by turning them into quality gates. Weekly review shows focus placement and seven-day density; monthly review shows direction coverage, five-week density and target readiness. Warning copy distinguishes a missing assignment/support relationship from a soft density warning, and the CTA routes to `Rytm`, `Wsparcie` or `Tygodnie` accordingly.
  - Post-fix evidence: `week-plan-v6-review-final.jpg` and `month-plan-v6-review-final.jpg`. The monthly `Dobierz wsparcie` interaction was verified to open the `Wsparcie` chapter.
- [P1] Weekly anchor wording did not match the production application.
  - Fixed to the production set: `Co poszło dobrze`, `Co było trudne`, `Lekcje i spostrzeżenia`; each remains optional behind disclosure.
  - Post-fix evidence: `week-reflect-v6-anchors-final.jpg` plus automated exact-text assertions.
- [P2] Early review-state logic treated every complete plan as successful even when a day/week was unusually dense, and the monthly correction button always returned to weeks.
  - Fixed with distinct soft warnings for more than two weekly focuses per day or more than three monthly objects per week, and a dynamic monthly correction target based on the actual gap.
  - Post-fix evidence: weekly review names `Wt` as dense; monthly review prioritizes the uncovered direction and routes to `Wsparcie`.
- No actionable P0, P1 or P2 findings remain.

## Required fidelity assessment

- **Fonts and typography:** passed. Nunito, Polish glyphs, display/body weights, compact uppercase kickers, line heights and truncation match the established `sketchbook-v1` hierarchy. The new facts and warning copy remain short and scan at the scoped viewport.
- **Spacing and layout rhythm:** passed. The 30/70 shell, irregular radii, quiet underbars and persistent footer remain stable. The target editor now consumes one compact row rather than a second large section; no global horizontal or vertical overflow is present at 1280×720.
- **Colors and visual tokens:** passed. All states use existing Sky Mist, rose and neutral tokens. Rose is reserved for attention states; completion and active controls retain the established blue hierarchy.
- **Image quality and asset fidelity:** passed. No photographic/product imagery is present. Existing Material Symbols Rounded assets and the experiment's established CSS data-visualization primitives are reused; no new illustrative substitute or custom SVG was introduced.
- **Copy and content:** passed. The first reflection chapter now names its data and the following step. Planning reviews state the exact gap and correction. Weekly anchors match production wording exactly.
- **Icons:** passed. Material Symbols retain the established size and optical alignment. Attention, support, schedule, journal and emotion icons have explicit semantic labels in adjacent text.
- **States and interactions:** passed. Weekly target editing propagates to the final review; monthly automatic/manual distribution, three inline weekly inputs and advanced settings were exercised; weekly day detail opens; monthly correction opens `Wsparcie`; anchors render the exact three production questions.
- **Accessibility:** passed for the scoped prototype. Interactive rows are buttons with expanded state or descriptive aria labels, facts do not rely on color alone, warning meaning is repeated in text, and progressive disclosures are keyboard-addressable controls.
- **Viewport resilience:** passed for the declared desktop-only 1280×720 scope. The document measured 1280×720 with zero global overflow. Tablet and mobile remain intentionally out of scope per `AGENTS.md`.
- **AI shortcut artifacts:** passed. New charts are restrained data bars within the existing product grammar, not decorative fake analytics; there are no generic hero illustrations, placeholder avatars or prompt-derived explanatory notes leaking into the product UI.

## Functional verification

- Weekly planning: compact editor is inside the quick-action underbar; edited target reaches the review; review has four selected objects in the test scenario, seven day-load bars and three checks; missing placement and dense-day states are detected.
- Monthly planning: target editor is inside the quick-action underbar; the shared T26–T30 header is not repeated; automatic/manual distribution, three inline week inputs, balance and two advanced selects work; review has three direction rows, five week bars and the dynamic correction CTA.
- Weekly reflection: eight chapters remain; first chapter has four facts and seven days but zero object-review rows; day detail opens; four area chapters still capture only Wysiłek and Stan; anchors use the exact three production questions; final journal capabilities remain intact.
- Browser diagnostics: viewport 1280×720, DPR 2, document scroll dimensions 1280×720 on the final verified route. The in-app browser developer log contains only Vite debug/connect messages and zero warning/error entries across the verified routes and interactions.

## Primary verification

- `npm test -- --run`: 25/25 tests passed.
- `npm run build`: import boundaries, Vue typecheck and production Vite build passed.
- Browser routes verified:
  - `/preview/ritual-week/sketchbook-v1/plan`
  - `/preview/ritual-month/sketchbook-v1/plan`
  - `/preview/ritual-week/sketchbook-v1/reflect`

final result: passed

---

# Design QA — plansza fokusu (`focus-board-v1`, 2026-07-25)

## Scope

- Nowy eksperyment `focus-board-v1` dla widoków Dzisiaj, Tydzień i Miesiąc: prawa strona w trzech strefach (akcje okresu → fokus okresu → przeglądarka kart z filtrami typ obiektu / priorytet), wspólna gramatyka między skalami.
- Decyzje projektowe z sesji 2026-07-25: intencje nie mają przycisku w skali dziennej (żyją w Planie dnia po lewej i jako chip filtra od tygodnia wzwyż); klik w priorytet = filtr (otwieranie huba priorytetu odłożone); słowny fokus dnia bez wieczornej oceny; wpis tygodnia/miesiąca wydzielony z rytuału refleksji, z pytaniami stałymi albo od AI (na żądanie).
- Desktop-only, 1280×720, zgodnie z zakresem labu.

## Visual evidence

Zrzuty z headless Chromium 1280×720 (weryfikacja delegowana do Codex CLI), w `ux-lab/app/qa/focus-board/`:

- `today-default.png` — dzień: akcje (Dziennik/Emocje/Ćwiczenia), pusty stan fokusu dnia, karty fokusu tygodnia, chipy bez „Intencje", grupa „Intencje tygodnia" w Planie dnia.
- `today-focus-set.png` — ustawiony słowny fokus dnia (cytat + ołówek edycji).
- `today-filter-habits.png` — filtr „Nawyki" podmienia karty.
- `week-default.png` — tydzień: akcje (Plan/Refleksja/Wpis tygodnia), trzy kafle fokusu tygodnia jako filtry, chip „Intencje" obecny.
- `week-entry-ai.png` — panel wpisu tygodnia z trzema pytaniami „od AI" i notką o działaniu AI na żądanie.
- `month-default.png` — miesiąc: akcje (Plan/Refleksja/Wpis miesiąca), trzy priorytety z wysiłkiem jako strefa fokusu, karty span/kropki po tygodniach.
- `month-priority-filter.png` — klik w priorytet filtruje karty („Wspierają: Regularny ruch i kondycja · 12 kart").

## Findings and fixes

- [P2] Kropka tonu priorytetu `mint` renderowała się na zielono (a `amber` bursztynowo) — poza dozwoloną paletą widoku Dzisiaj (AGENTS.md). Naprawione po zrzutach: w tym wariancie `tone-mint` → róż (`--rose-400`), `tone-amber` → czerwień (`--color-error`); zrzuty pokazują jeszcze starą zieleń przy „Obecność dla bliskich".
- [P3, akceptowane] Długie tytuły kart (np. „Utrzymać wagę poniżej 80 kg…") są ucinane wielokropkiem — to ta sama anatomia karty co w `sketchbook-v1` (podsumowanie na hover/focus).
- Fałszywy alarm Codexa: etykieta „Plan dnia" istnieje jako `aria-label` sekcji listy dnia (Codex szukał widocznego tekstu).
- Konsola przeglądarki czysta na wszystkich trzech trasach i interakcjach (tylko komunikaty Vite).

## Open questions (do oceny z użytkownikiem)

- Czy pusty filtr priorytetu (nudge „podepnij obiekty w hubie") jest osiągalny w prawdziwych danych częściej niż w fixture (tu wszystkie 3 priorytety mają obiekty)?
- Czy wydzielony wpis okresu obok pełnej refleksji nie dubluje kroku dziennika w rytuale — ocenić po użyciu.
- Fokus dnia: czy sama pusta zachęta wystarczy jako poranny rytuał.

## Primary verification

- `npm test -- --run`: 29/29 (w tym 3 nowe scenariusze planszy fokusu: dzień/tydzień/miesiąc).
- `npm run build`: granice importów, vue-tsc i produkcyjny build przechodzą.
- Trasy: `/preview/today/focus-board-v1/current`, `/preview/calendar-week/focus-board-v1/current`, `/preview/calendar-month/focus-board-v1/current`.

final result: passed (po poprawce palety tonów)

## Iteracja 2 (2026-07-26): mniej tekstu, jeden filtr

- Feedback usera: za dużo tekstów pomocniczych; rząd chipów filtrów pokazywał za dużo opcji naraz.
- Zmiany: usunięte podpisy stanu na przyciskach akcji, dopisek "kliknięcie filtruje karty poniżej", meta-linia nad kartami, podpisy częstotliwości/wysiłku na kaflach fokusu i zdanie pomocnicze przy "Ustal fokus dnia". Chipy zastąpione jednym dropdownem (`.fb-filter`: Fokus / Typ obiektu / Priorytet); wybrany priorytet jest widoczny jako wartość dropdownu, kafle priorytetów w miesiącu i dropdown sterują tym samym stanem filtra. W skali dziennej dropdown nie ma opcji "Intencje".
- Weryfikacja: `npm test` 29/29, `npm run build` zielony; zrzuty (Codex, 1280×720, konsola czysta, bez overflow): `today-v2.png`, `today-v2-habits.png`, `week-v2.png`, `week-v2-priority.png`, `month-v2.png`, `month-v2-priority.png` w `ux-lab/app/qa/focus-board/`.

final result: passed
