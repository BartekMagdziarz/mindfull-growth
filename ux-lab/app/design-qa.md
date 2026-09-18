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

## Wariant 19 — spokojne interakcje dnia (2026-09-05)

- Zachowano teksty i układ domyślnej powierzchni. Kompas przypina podświetlenie powiązań po kliknięciu, z wciśniętym stanem kafla; ponowne kliknięcie usuwa zaznaczenie. Lista nie zmienia kolejności ani liczby wierszy.
- Plusy przy nagłówkach pojawiają się na hover/focus i otwierają lokalny picker istniejących obiektów z wyszukiwaniem. Dodanie nie tworzy duplikatu wystąpienia.
- Strzałki zmieniają dzień; wybór daty w rozwiniętym kalendarzu również zmienia dzień. Poza dniem bieżącym dostępny jest powrót „Dziś”. Przeniesiony obiekt trafia do wybranego dnia.
- Cofnięcie dodania/ukrycia/przeniesienia jest dostępne w dyskretnym komunikacie. Później wpisane pomiary nie są cofane wraz z operacją planowania.
- Ikona przy „Plan dnia” zwija wykonane działania; zapisane pomiary pozostają widoczne. Zwinięte działania można ponownie rozwinąć.
- Stan dat i przypisań jest wyłącznie lokalną symulacją w pamięci Labu; odświeżenie/reset przywraca fixture. Dni poza bazowym mają syntetyczny plan. Wykresy, Kompas i najbliższe terminy nadal korzystają z kontekstu fixture; pełne domenowe zachowanie i edytory wartości pozostają zadaniem portu.
- Browser QA na lokalnym preview: przypięcie Kompasu, przeniesienie zadania na kolejny dzień, przejście do tego dnia, Cofnij z powrotem do dnia źródłowego i dodanie celu z pickera. Obejrzano stan wybranego kafla w podglądzie; nie wykonano pełnego audytu dostępności ani mobile.
- Automatycznie: scenariusze interakcji i regresje Labu; build sprawdza typy i granice importów.

## Wariant 19 — korekty po przeglądzie (2026-09-05, wieczór)

- Kompas: ton `mint` priorytetu „Obecność dla bliskich” malowany różem, `amber` czerwienią (reguła palety Today). Zmierzone w przeglądarce: pole ikony bez zieleni.
- Wykres w rozszerzeniu wiersza przyjmuje żywy stan dnia (`live`): dzisiejsza kropka/słupek/ostatni punkt zgadza się z kontrolką obok; kliknięcie stempla natychmiast zmienia wykres. Dni przeszłe pozostają pozycyjną aproksymacją z fixture (bez historii per dzień).
- Toast Cofnij wygasa po ~7 s, każda nowa operacja odnawia czas; „Ukryte (N)” czyści komunikat zamiast zostawiać nieaktualne „Ukryto…”.
- Dodawanie: jeden plus w nagłówku „Plan dnia” (widoczny na hover/fokus nagłówka), kaskada typ → obiekt otwierana hoverem lub klikiem (przypięcie dla klawiatury), Esc i utrata fokusu zamykają; sieroty (`status: 'orphan'`) wykluczone, kadencja miesięczna zostaje (cele z terminem mają własny wykres „cały miesiąc”). Plusy przy grupach usunięte, puste grupy ukryte.
- Weryfikacja: `npm test` (41), `vue-tsc`, `check:boundaries`; headless Playwright na 5201 (zrzuty, kolory kafli, wygaszenie toastu, brak pustych nagłówków po zmianie dnia, spójność kropki „dziś” ze stemplem).

final result: passed

## Calendar concepts 01–04 — 2026-09-06

- Scope: four divergent retrospective-calendar concepts under the new `Kalendarz` workbench view (`/views/calendar`, previews `/preview/calendar/{sheet-v1|ribbon-v1|matrix-v1|zoom-v1}/{current|closed}`). Desktop 1280×860, live date 2026-09-05 (Saturday, T35 in canonical non-ISO product weeks).
- Evidence (Playwright, repo `node_modules/playwright`, full-page PNG, DPR 1): `qa/calendar/01-sheet-month-rytm.png`, `01-sheet-month-stan.png`, `01-sheet-year-emocje.png`, `01-sheet-week.png`, `01-sheet-closed-day.png`, `02-ribbon-rytm.png`, `02-ribbon-wpisy-month.png`, `03-matrix-month-rytm.png`, `03-matrix-month-stan.png`, `03-matrix-year-kierunki.png`, `03-matrix-week.png`, `04-zoom-month.png`, `04-zoom-year.png`, `04-zoom-week.png`. No console or page errors across all routes.
- Passed: three scales keep the period when switching (anchor = today when inside focus); lens switch + condensed legend in one spot; ritual dot as the only lens-independent slot; time asymmetry (past = marks, current = marks + „Zamknij”, future = plan counts as quiet text); small multiples of 6–8 previous periods in the panel; keyboard in 04 (← → Enter Esc).
- Known, accepted for the review round: day cells are empty under Stan/Kierunki (those lenses are weekly/monthly); ribbon needs horizontal scroll and cuts the first visible week; matrix object rows show only the current/past columns with values (future = „·”); data beyond the 16 fixture weeks is deterministic synthetic (hash + seasonal wave), so absolute values are not verify-equivalent.
- Gates: `vue-tsc` clean, `check:boundaries` OK, vitest 48/48 (new `src/__tests__/calendar.spec.ts`). Product side: `src/dev/richVerificationScenario.ts` gained the `calendar` view/presets; `richVerificationScenario.spec.ts` updated; product `vue-tsc` clean.

## Wariant 19 — wdrożony w produkcie (2026-09-06)

- Port do `src/features/planning-next` (skala dnia) zakończony: fazy F0–F4 wg `ideas/html-plans/2026-09-05-today-v19-inline-stage-port.html`. Replika `action3-stage-inline-v1` staje się historyczna; kolejne eksperymenty na dniu startują od stanu produktu.
- Różnice względem repliki, świadome: „Otwórz” prowadzi do biblioteki obiektów; intencje tygodnia nie opuszczają swojego tygodnia; Powtórki/Ścieżki jako czwarta karta prawej kolumny tylko gdy należne; nagłówek workspace w skali dnia zachowuje tylko przełącznik skali (data i strzałki w karcie kalendarza).


## Calendar 05 · Rytm kierunków — 2026-09-06

- Scope: nowy eksperyment `priority-rhythm-v1` w widoku `Kalendarz` (`/views/calendar?variant=priority-rhythm-v1`, preview `/preview/calendar/priority-rhythm-v1/{current|closed}?sample=closed|current|sparse|empty|boundary|year`), wg planu `ideas/html-plans/2026-09-06-calendar-priority-rhythm-implementation.html` (rew. 2). Osobny scenariusz `priority-month-v1` (luty 2027, zegar 01.03.2027; boundary = wrzesień 2026, zegar 05.10.2026) — nie rich-v1. Desktop 1280×860.
- Zbudowane: cztery grupy w stałej kolejności (Priorytety · Obiekty · Refleksja · Wpisy), zwinięta grupa = jeden znacznik obecności na komórkę bez liczb; Priorytety w miesiącu rozwinięte (kierunki z `MonthPlan.topPriorityKeys`, „Pozostałe kierunki”), zwinięte = ikony fokusu kolumny (tydzień: priorytety obiektów z `WeekPlan`, miesiąc w roku: `topPriorityKeys`); Obiekty → typy → obiekty jako serie; Refleksja → wiersz okresu (kompas miesiąca / Wysiłek·Stan tygodnia, rozciągnięty na całą oś) + komórki jednostek; Wpisy → Dziennik/Emocje/Ćwiczenia, 7 slotów dni w tygodniu, słupek „dni z wpisem” w roku. Serie wg tabeli entryMode z planu §05b: sloty celu, sloty dni, sloty checklisty (próg z wag), słupek+cel (limit `max` bez koloru oceny), punkt na osi wartości (bez interpolacji przez luki, oś z marginesem), punkt na stałej skali ocen; Σ tylko dla kadencji miesięcznej w skali miesiąca. Panel pod osią: działania datowane, „Bez dnia”, „Obserwacje”, kontekst tygodnia (refleksja, dziennik w skrócie ≤90 znaków, emocje ze słowami i natężeniem, ćwiczenia), „Zmień termin” dla przyszłych przypisań z Zapisz/Anuluj i Cofnij. Tydzień: 7 kolumn kart (≤3 + „Pokaż pozostałe”), filtr kierunku, „Na ten tydzień”, wiersz Wpisy, wiersz okresu tygodnia po rozwinięciu. URL: `sample, scale, ref, groups, open, more, cell, filter`; Wstecz odtwarza nawigację; kotwica = zaznaczenie → poprzednia kotwica → zegar → początek okresu, temat (otwarty kierunek) przechodzi między skalami i staje się filtrem w tygodniu.
- Evidence (Playwright, `node_modules/playwright` z repo, full-page PNG, DPR 1, konsola czysta, bez poziomego overflow): `qa/calendar-priority/00-workbench.png`, `01-month-default.png`, `02-month-fitness.png`, `03-month-panel-week3.png`, `04-month-reflection.png`, `05-month-priorities-folded.png`, `06-month-objects-habits.png`, `07-month-entries.png`, `08-month-entries-panel.png`, `09-year.png`, `09b-year-context.png`, `10-week.png`, `10b-week-day-panel.png`, `10c-week-reflection-row.png`, `12-current.png`, `13-current-editor.png`, `14-current-moved.png`, `15-boundary.png`, `16-sparse.png`, `17-empty.png`, `18-year-sample.png`.
- Kryteria planu §09 sprawdzone: luty 7/8 i 515/600 identyczne w punktach, odczytach i sumach (test); tygodnie 2 i 4 Przygotowania do ciąży = kreska, nie zaległość (przypisanie miesięczne nie zapala tygodnia; widoczne w panelu jako „Na miesiąc luty”); panel tygodnia 3 odróżnia „Pominięte” (symulacja) od nawyków bez zapisu i pokazuje skrót notatki 20.02 oraz brak refleksji; current: przeniesienie 19→20.02 zmienia oba dni, suma slotów tygodnia = 2, Cofnij przywraca jedno przypisanie; boundary: 31.08 i 01.10 poza sumami września, częściowy tydzień bez celu, plan tygodniowy bez dnia w panelu „Na tydzień 28.09–04.10”; tracker Sen nie zapala obecności; zero (kawy 21.02 w sparse) ≠ brak; Waga bez interpolacji w tygodniu 2; Kawy tydzień 2 „ponad limit” bez koloru; Poranek 17.02 obrys częściowy; Sprawa Σ 1/1; luty→rok→miesiąc→tydzień wraca do lutego (W05) z zachowanym tematem; rok bez danych zostaje pusty; brak pełnej treści dziennika w DOM.
- Symulacje (nie potwierdzają integracji): stan `skipped`/`cancelled` (produkt nie ma go dla miar), przejścia „Otwórz dzień/wpis/refleksję” = notatka w warstwie Labu + toast, przesunięcie przypisania w pamięci instancji (reset repliki / odświeżenie przywraca scenariusz, ale zaznaczenie i rozwinięcia zostają w URL — odstępstwo od planu §04 „reset czyści też wybór”, bo klucz remountu nie rozróżnia resetu od odświeżenia).
- Znane ograniczenia do oceny: nawigacja strzałkami w macierzy nieobsłużona (Tab/Enter/Esc działa; Esc zamyka edytor → panel → rozwinięcie); nazwy serii z podtytułem celu ucinane przy 236 px kolumny nazw („Blok zi…”); tydzień 26.04–02.05 z planem bloku wiosennego daje obrys planu także w maju (plan tygodniowy przecinający dwa miesiące — zgodnie z §05, ale do oceny czy nie myli); wiersz „Na ten tydzień” w tygodniu pokazuje też plany miesięczne (Waga, Sprawa) jako chipy.
- Gates: `vue-tsc` clean, `check:boundaries` OK, vitest 76/76 (nowe `calendarPriorityData.spec.ts` 19, `calendarPriorityReplica.spec.ts` 9), `npm run build` zielony. Produkt nietknięty (żadnych zmian w `src/` produktu).

final result: passed (do oceny użytkownika wg pytań z notatek UX 14)

## Calendar 05 — wykresy ciągłe, granulacja, podsumowanie okresu (2026-09-06, wieczór)

- Scope: kontynuacja `priority-rhythm-v1` po sesji, która urwała się na wykresach. Zmiany tylko w `ux-lab/app` (produkt nietknięty).
- Wykresy: punkty (Waga, Sen, Energia) rysowane jednym SVG na cały wiersz (`SeriesLine.vue`) — odcinki między sąsiednimi slotami, kreskowany mostek przez luki bez interpolacji, cel kreskowany per kolumna tylko do zegara, min/max osi przy krawędzi kolumny nazw, odczyt kolumny na hover/fokusie/zaznaczeniu; klik w punkt otwiera panel kolumny. Odstępy kolumn 4→2 px, w wierszach wykresów 0 (separatory cienką kreską). `PeriodPlot.vue` i tryb A/B usunięte.
- Przełącznik granulacji w rogu tabeli (`Tygodnie | Dni` w miesiącu, `Miesiące | Tygodnie` w roku; w tygodniu brak), widoczny tylko przy otwartej serii z linią/słupkami; `grain=fine` w URL. W granulacji drobnej słupki (Cardio, Kawy) przechodzą na warstwę wiersza jako słupki podjednostek bez linii celu (cel dotyczy sumy kolumny); sloty i sloty dni nie zmieniają się.
- Podsumowanie okresu: kafle `Działania z zapisem a / b`, `Cele tygodni|tygodnia|zamkniętych okresów`, `Dni z wpisem`, `Refleksja …` (kompas / Wysiłek·Stan / liczba refleksji miesięcy) + miernik, zdanie-kotwica pod kaflami, `Więcej` rozwija treść refleksji i „bez dnia”. Liczby z `periodStats` (czysta funkcja): luty closed = 29/32 działań, 12/24 celów, 13/28 dni, 3/4 refleksji tygodni (test).
- Próbka `history` (zegar 28.04.2027): grudzień 2026–kwiecień 2027, luty bez zmian względem `closed`, reszta z deterministycznego generatora (LCG); blok zimowy 2×/tydz., wiosenny 3×/tydz., waga co 5–8 dni z trendem, kawy/sen/poranek/wieczór codziennie-ish, refleksje tygodni i miesięcy, dziennik/emocje/ćwiczenia.
- Evidence (Playwright headless, 1280×860, konsola czysta): `qa/calendar-priority/19-history-month-weeks.png` … `28-history-panel-from-dot.png` (miesiąc tygodnie/dni, nawyki i Sen w dniach, rok miesiące/tygodnie, podsumowanie roku, tydzień, otwarte podsumowanie lutego, panel z kliknięcia w punkt). Sprawdzone skryptem: odczyt widoczny na hover (`ost. 79,5 kg`), `elementFromPoint` na punkcie = `.sl-dot`, klik → panel `Waga · 12–18 kwietnia 2027`, przełącznik zdejmuje `grain` z URL.
- Znane do oceny: w tygodniu wiersz Wagi z jednym punktem jest wysoki i pusty; nazwy serii z podtytułem bloku łamią się w kolumnie nazw; przyszłe kolumny w granulacji drobnej są puste (bez znacznika planu); klik w punkt zaznacza kolumnę, nie konkretny dzień.
- Gates: `vue-tsc` clean, `check:boundaries` OK, vitest 82/82 (naprawione 2 przestarzałe testy ikon fokusu → pasy fokusu; +6 nowych), `npm run build` zielony.

final result: passed (do oceny użytkownika: czy ciągłe linie i granulacja rozwiązują „spłaszczone wykresy”; czy cztery liczby podsumowania to właściwy wybór)


## Calendar 05 — rok danych, ocena okresu w podsumowaniu, „chmurzysta” tabela (2026-09-06, noc)

- Scope: druga runda uwag do `priority-rhythm-v1` (Lab only, produkt nietknięty): (1) dane na cały rok i sprawdzenie wszystkich rodzajów wykresów, (2) podsumowanie z oceną okresu jako głównym elementem i wykonaniem rodzin, (3) usunięcie „Na ten tydzień/miesiąc · bez dnia”, (4) nieregularność i warstwowość kształtów jak w widoku „Dzisiaj”.
- Dane: próbka `history` = 01.01.2026 → zegar 28.04.2027 (16 miesięcy; luty 2027 nadal dosłownie z bazy). Nowe obiekty tylko w tej próbce: blok bazowy 2026 (siła 2×, cardio 120 min), cel „Waga poniżej 80 kg” (waga przepięta pod niego), rzemiosło (Portfolio → Głęboka praca 8 h/tydz. counter, Czytanie fachowe 2×), nawyk Spacer bez celu, sprawa organizacyjna co miesiąc. Przypisania tygodniowe dla nawyków we wszystkich tygodniach, plan miesiąca dla każdego miesiąca, plan roku 2026 „Fundament”, refleksje tygodni (~85 %) i miesięcy (~90 %). Start widoku: rok 2026. Test pilnuje, że czerwiec 2026 pokrywa wszystkie rodzaje znaczników skali miesiąca (`slots`, `day-slots`, `checklist-slots`, `bar-target`, `point`, `rating-point`).
- Wykresy sprawdzone na roku: sloty→słupki miesięczne, słupki tygodniowe (52 kolumny) z mniejszymi kropkami/słupkami (gęstość slotów na kolumnę steruje rozmiarem), linia wagi 12 miesięcy i 52 tygodni. Reguła mostka zmieniona: odcinek ciągły łączy kolejne punkty z tej samej lub sąsiedniej kolumny (rzadkie pomiary w tygodniu to nie luka), kreska tylko gdy cała kolumna między nimi jest bez zapisu. Wiersz typu złożony wyłącznie z obserwacji (Trackery) pokazuje ich zapisy jako obecność; w kierunkach obserwacje dalej nie zapalają obecności.
- Podsumowanie (`PeriodSummary.vue`): nagłówek „Fokus tygodnia/miesiąca/roku” z chipami; po lewej wgłębiony kafel **Ocena tygodnia/miesiąca/roku** — duża liczba (tydzień: średni Stan, miesiąc: średnia kompasu, rok: średnia kompasu z refleksji miesięcy + „x z y miesięcy”), pod nią cztery obszary z parą słupków Wysiłek/Stan i wartością Stanu albo pięć osi kompasu z segmentami i wartością; brak refleksji = zdanie + przycisk rytuału. Po prawej 2×2 kafle rodzin z ikoną i jednym słowem: **Cele · Nawyki · Trackery · Intencje** — procent, ułamek i miernik. Ułamek per obiekt (`objectCompletion`): z celem = spełnione/sprawdzane cele zamkniętych jednostek (tydzień bez planu i bez zapisu nie liczy się); bez zamkniętej jednostki = zapisane/zaplanowane działania dnia; bez celu = jednostki z zapisem/rozpoczęte. Luty closed: Cele 6/10, Nawyki 4/12, Trackery 4/4, Intencje 2/2; ocena 3,4 (test). „Bez dnia” usunięte z podsumowania (zostaje w panelu jednostki, gdzie dotyczy konkretnego okresu).
- Tabela w języku „Dzisiaj” (`RhythmBoard.vue` + `sketch.css`): oś jako wgłębiona kapsuła z jednostkami-pigułkami (bieżąca wypukła i lekko obrócona); każda grupa to osobna karta na papierze (nieregularne promienie 25/30/24/28 naprzemiennie, cień `raised-sm`, otwarta mocniej); rozwinięty kierunek/typ i jego serie tworzą zagnieżdżoną kartę z lewą kreską (jak scena wiersza w Dzisiaj); wiersze bez linijek, serie oddzielone tylko delikatną kreską przerywaną; wykresy liniowe/słupkowe siedzą we wgłębieniu na cały wiersz; kropki obecności wypukłe; Σ w małych dołkach; kolumny trzymają jedną siatkę (te same poziome paddingi kart; kontrola `getBoundingClientRect` — różnice ≤ 3 px między osią i komórkami). Nagłówki grup pisane wersalikami z odstępem jak „NAWYKI”.
- Evidence (Playwright headless 1280 px, konsola czysta): `qa/calendar-priority/19-history-year-2026-months.png` … `28-history-apr-2027-days.png` (rok miesiące/tygodnie, rzemiosło w tygodniach, czerwiec dni Forma, nawyki, Sen w dniach, tydzień, otwarte podsumowanie lutego, rok z refleksją i wpisami, kwiecień 2027 dni).
- Znane do oceny: kafle rodzin mieszają podstawy (cele spełnione + obecność zapisu) w jednym ułamku — podpowiedź kafla wymienia podstawy; nazwy serii z podtytułem bloku łamią się w kolumnie nazw; w tygodniu wiersz Wagi bywa pusty; Intencje poza lutym 2027 „brak w okresie”.
- Gates: `vue-tsc` clean, `check:boundaries` OK, vitest 82/82 (zmienione testy statystyk/podsumowania/history/obecności), `npm run build` zielony.

final result: passed (do oceny użytkownika: czy karty grup i zagnieżdżona karta kierunku dają „chmurzystość” Dzisiaj; czy ocena + cztery rodziny to właściwa treść podsumowania)

## Calendar 05 — jeden kierunek głębi, cztery tony (2026-09-07)

- Diagnoza po uwagach usera („coś przeszkadza w kolorach”): za dużo stopni tonalnych i za duże skoki (pięć tonów w samym podsumowaniu), głębia w obie strony na tym samym poziomie (wypukłe kafle obok wklęsłego kafla oceny; wklęsła kieszeń wykresu jaśniejsza od wklęsłego pola kierunku), ton nie podążał za głębią, rozwinięty kierunek miał trzy sygnały naraz (ton + wklęsły cień + kreska).
- Pierwsza próba (naprzemiennie kartka → pole → kartka) odrzucona przez usera: „paski” biało-niebieskie. Obowiązuje **drabinka w jednym kierunku**: im głębiej zagnieżdżone, tym bielsze, równymi krokami. Tokeny w `sketch.css` na `.cp`: `--cp-page` (sky-200 45 % / sky-100) → `--cp-card` (sky-100, jedyna powierzchnia z cieniem `--cp-shadow-card`) → `--cp-field` (biel 45 %) → `--cp-inner` (biel 80 %); `--cp-stage` zaznaczenie · `--cp-accent`. Hover = jeden stopień bielszy niż rodzic. Wszystko płaskie poza kartkami pierwszego poziomu. Scena = pole + lewa kreska (bez cienia). Wklęsłe (`--cp-shadow-control`) tylko kontrolki: przełącznik skali, przełącznik granulacji, kapsuła osi, rowki mierników. Stany puste bez osobnego tonu (tylko wyciszony tekst). Ramka strony `cp__paper` płaska.
- Zastosowanie: podsumowanie = kartka; kafel oceny i kafle rodzin = pole; obszary tygodnia, segmenty kompasu, orby ikon, rowki mierników = wnętrze; chipy fokusu i przyciski = wnętrze z cieniem (najbliżej patrzącego). Tabela: karty grup = kartka; rozwinięty kierunek = pole + kreska; wnętrze wykresu = wnętrze; kropki obecności, pasy fokusu, sloty = wnętrze; zaznaczenie = scena + cienki obrys. Kontrolki wklęsłe (skala, granulacja, oś) mają ton kartki, aktywny segment = wnętrze z cieniem.
- Evidence: `qa/calendar-priority/19…27` odświeżone (ten sam zestaw ujęć), konsola czysta; vitest 82/82, `vue-tsc` czysty.

final result: passed (do oceny użytkownika: czy drabinka strona→kartka→pole→wnętrze ma dobre kroki, czy kartka na stronie jest dość widoczna)

## Calendar 05 — korekty podsumowania i wierszy (2026-09-07, runda 2)

- Wykresy liniowe/słupkowe bez jaśniejszego pola pod spodem (user: „brak pola czystszy”); zostają tylko cienkie separatory kolumn.
- Ocena okresu bez łącznych średnich (sztuczna metryka): miesiąc = pięć nierównych słupków kompasu z wartością nad słupkiem, osie **Balans · Sens · Rozwój · Zasady · Wpływ** (nowe nazwy w `COMPASS`); tydzień = cztery obszary × para słupków Wysiłek/Stan; rok = słupki średnich osi z refleksji miesięcy + „refleksje x z y miesięcy”.
- Wykonanie rodzin = nierówny kleks wypełniony od dołu procentem (gradient `--fill`), obok procent i ułamek; brak w okresie = pusty kleks z kreską.
- Rozwinięty kierunek/typ nie pokazuje już pasów/kropek obecności w swoim nagłówku — opowiadają o tym serie pod spodem.
- „Więcej” w miesiącu/tygodniu nie powtarza ocen: `ReflectionBody` z `hide-ratings` pokazuje tylko werdykty priorytetów (miesiąc), Wymagania (tydzień), trzy kotwice i przycisk rytuału; cytat-kotwica znika po rozwinięciu.
- Evidence: `qa/calendar-priority/19…27` odświeżone; vitest 82/82, `vue-tsc` czysty.

final result: passed (do oceny użytkownika)

## Calendar 05 — kafle bez ikon i ułamków, wykresy „ołówkiem” (2026-09-07, runda 3)

- Kafle rodzin: tylko nazwa (16 px), procent i kleks; ułamek i podstawa liczenia przeniesione do podpowiedzi kafla (`title`).
- Wykresy mniej klinicznie: oś min/max widoczna tylko na hover lub fokusie wiersza (`.rb-series:hover .rb-axis-bounds`), linia bazowa słupków to delikatna fala, słupki mają echo (jaśniejszy, przesunięty duplikat) i lekkie, deterministyczne pochylenie, separatory kolumn kreskowane i bledsze, wobble linii ±1,4.
- Evidence: `qa/calendar-priority/19…27` odświeżone + `28-history-jun-2026-hover-axis.png` (oś i odczyt na hover); vitest 82/82, `vue-tsc` czysty. Po drodze złapany brak `</li>` (500 w podglądzie, 3 pliki testów nie wstały) — naprawiony.

final result: passed (do oceny użytkownika)

## Calendar 05 — jedno spojrzenie tabeli wybierane listą w rogu osi (2026-09-07, runda 4)

- Problem: zwinięte grupy z kropkami „nic nie mówiły”, a jako puste przyciski byłyby za duże; rodziny w podsumowaniu i w tabeli powtarzały nazwy obok siebie. Odrzucone: (a) kafle podsumowania jako jedyne wejście do tabeli (klikalność nieoczywista), (b) rząd przycisków nad tabelą (drugi rząd tych samych nazw). Wybrane: **lista rozwijana w rogu rzędu osi** — tabela pokazuje jedno spojrzenie naraz, nazwa występuje tylko jako wybrana opcja.
- Lista (`viewOptions`, pogrupowana): Kierunki (fokus okresu najpierw, potem inne z aktywnością; „Fokus tygodni/miesięcy” = pasy z gwiazdką), Obiekty (Cele · Nawyki · Trackery · Intencje tygodnia — tylko rodziny z aktywnością), Okres (Oceny tygodni/miesięcy, Wpisy). Domyślnie pierwszy kierunek fokusu; w tygodniu nie ma fokusu i ocen podokresów (są w podsumowaniu). Wybór w URL `view=` (alias `open=`), „lepki” między okresami: jeśli nie ma sensu w okresie, tabela wraca do domyślnego, a URL zachowuje wybór.
- Znikają: grupy PRIORYTETY/OBIEKTY/REFLEKSJA/WPISY, ich kropki, zagnieżdżona karta kierunku, „Pozostałe kierunki”. Zostaje jedna kartka z wierszami. Przełącznik granulacji przeniesiony na prawy koniec rzędu osi, w stale zarezerwowanej kolumnie (miesiąc, rok), żeby szerokości kolumn nie skakały między spojrzeniami.
- Skróty w podsumowaniu (droga druga, nieobowiązkowa): chip priorytetu → `dir:`; kafel rodziny → `type:` (cały kafel klikalny); ikonka w rogu kafla oceny → `reflection`. Aktywne spojrzenie ma lewą kreskę na swoim chipie/kaflu. Główna droga to lista.
- Stan: `useCalendarPriorityState` bez `expandedGroups/openRow/openObject/moreDirections`; `view` = `resolveView(requested)`; `setView` zamyka panel (poza „cała jednostka”) i w tygodniu ustawia filtr panelu na kierunek.
- Evidence: `qa/calendar-priority/19…27` odświeżone (rok Forma miesiące/tygodnie, rzemiosło, czerwiec Forma dni, Nawyki, Sen, tydzień, luty z otwartym podsumowaniem, rok oceny miesięcy); vitest 82/82 (spec repliki przepisany pod listę), `vue-tsc` czysty, konsola czysta.

final result: passed (do oceny użytkownika: czy lista w rogu jest wystarczająco widoczna jako „co pokazuje tabela”; czy skróty z kafli są potrzebne)

## Calendar 05 — korekty po rundzie 4 (2026-09-07)

- Przełącznik granulacji wraca do kapsuły osi (prawy koniec, wewnątrz toru); kolumna narzędzi istnieje tylko wtedy, gdy przełącznik jest — bez pustego pasa po prawej stronie kartki (szerokości kolumn mogą się różnić między spojrzeniami z wykresami i bez; user wybrał brak pustego miejsca).
- Aktywne spojrzenie w podsumowaniu bez lewej kreski: chip/kafel/kafel oceny są o jeden stopień bielsze.
- Ocena tygodnia bez legendy kolorów (Wysiłek/Stan zostają w podpowiedzi obszaru i w aria-label).

## Calendar 05 — runda 5 (2026-09-07): zoom zamiast panelu, pas „cały tydzień”, jedna akcja rytuału, akcent aplikacji

- **Pusty pas po prawej — właściwa poprawka.** Kolumna narzędzi w siatce wierszy zniknęła całkiem. Prawa krawędź ostatniej komórki = krawędź kartki minus padding (zmierzone w Playwright: 1190 vs 1205 px; z kolumną Σ: Σ 1192). Pierwsza próba (przełącznik w nagłówku obok skali) odrzucona przez usera jako nieintuicyjna.
- **Granulacja per wykres.** Mała lupa (`.rb-zoom`, `zoom_in`/`zoom_out`) w prawym górnym rogu wiersza serii z linią/słupkami, widoczna po najechaniu na wiersz albo gdy włączona; tytuł „Wykres w dniach/tygodniach” (miesiąc) · „w tygodniach/miesiącach” (rok). Stan per seria w URL `fine=cardio,weight` (dawny globalny `grain=` usunięty); w tygodniu lupy nie ma (dzień bez podjednostek).
- **Domyślna próbka = `history`** (16 miesięcy ciągłych danych, 01.2026–04.2027, luty 2027 jawny). User widział 1–2 miesiące, bo presety Labu (`current`/`closed`) otwierały wąskie próbki. Teraz każdy preset otwiera `history` (rok 2026), a wąskie podwarianty wybiera się przez `?sample=` albo listą w warstwie Labu. Testy dla lutego 2027 jawnie ładują `?sample=closed`.
- **Panel szczegółów usunięty.** Klik w nagłówek podokresu albo w komórkę = zoom: tydzień/miesiąc staje się fokusem swojej skali (spojrzenie zostaje w URL `view=`), dzień → przejście do Dzisiaj (w Labie toast). Wstecz przeglądarki wraca do poprzedniej skali; adres bez parametrów odtwarza stan początkowy scenariusza. Skasowane: `PeriodDetail`, `AssignmentEditor`, `EntriesLists`, `WeekBoard`, `PresenceBand`, `calendarPriorityPanel.ts`, parametry URL `cell`/`filter`, lokalne przenoszenie przypisań z Cofnij (zmiana planu należy do rytuału planowania, nie do kalendarza).
- **„Bez dnia” → plan na cały okres.** `SeriesProjection.periodPlan` (przypisanie do oglądanego tygodnia w skali tygodnia / miesiąca w skali miesiąca, pomijane gdy Σ mówi to samo) rysowany jako kreskowana nitka pod komórkami rozpięta na wszystkie kolumny, z kleksem akcentu do procentu celu i etykietą „cały tydzień · 1 / 5 dni” / „w planie” / „bez zapisu”. Statusy: planned · partial · done · short · unrecorded.
- **Jedna akcja rytuału** w nagłówku podsumowania obok „Więcej”, zależna od stanu okresu: przeszły → „Napisz refleksję” / „Edytuj refleksję”; bieżący → „Plan” + „Refleksja”; przyszły → „Zaplanuj tydzień/miesiąc”; rok → „Plan roku”. Usunięte: przycisk w stopce, przyciski w treści refleksji (`ReflectionBody` bez emitów), przycisk w pustym kaflu oceny. W produkcie plan ma otwierać wizard od kroku przypisań z okresem ustawionym z góry, refleksja — pełny rytuał. `.cp-btn` przerysowany do języka chipów (wnętrze, nieregularne rogi, cień kartki; quiet = przezroczysty, hover = pole).
- **Akcent.** User miał rację: `--cp-accent` był `sky-600` (62 110 184), ciemniejszy niż błękit aplikacji. Teraz `--cp-accent = rgb(var(--color-primary))` (112 168 232, ten sam co akcenty widoku Dzisiaj), `--cp-accent-strong = --color-primary-strong` dla obrysów planu i linii celu, `--cp-ink = sky-800` dla kropek i linii. Kleksy, słupki oceny, słupki serii, kompas, Wysiłek/Stan, paski wpisów przełączone na tokeny; żadnego `sky-600`/`sky-500` w komponentach.
- Gates: `vue-tsc` czysty (Lab i root), vitest 90/90 (spec replik przepisany: zoom w podokres, lupa per wykres, akcje, pas, domyślna próbka), Playwright bez błędów konsoli. Zrzuty `qa/calendar-priority/40–52` (poprzednie 19–28 skasowane; 50 = domyślne wejście, 51–52 = lupa).

## Weekly ritual 02 · Spokojny rytuał — 2026-09-07

- Preview: `/preview/ritual-week/quiet-v2/plan` and `/preview/ritual-week/quiet-v2/reflect`; `?step=1` opens the shared-axis review/assignment step.
- Verified in Chrome at its existing desktop viewport: focus selection, assignment matrix with whole-week band, compact reflection rows, Wysiłek/Stan scales and final journal. Final-step context and AI start collapsed. Long content scrolls within the card on desktop so arrow controls remain reachable.
- Build/typecheck/import boundary check pass. 45 tests pass across quietRitual.spec.ts and replicas.spec.ts (6 new interaction/data tests, 39 existing replica tests).
- The daily evidence sample is explicit and illustrative, preserving missing vs zero and computing results from the same records. This is not a production-data preview. Intention creation/edit/removal and all ritual responses use the Lab's session-only Pinia state; refresh/reset clears it. AI is an explicitly labeled preview with no service call.
- Product routes, monthly rituals and existing reference/sketchbook variants remain unchanged by this experiment. Mobile CSS is included; mobile browser QA is not claimed.

### Quiet ritual — compact row revision, 2026-09-07

- Numeric-only target, inline `Bez terminu` toggle and clear icon replace the underbar. Removed the all-days shortcut; seven day cells still support all-day selection.
- Verified desktop Chrome screenshot: aligned headers, one-line action row and weekly band. Six ritual interaction tests and Lab build/typecheck/boundaries pass. Test covers restoration of three prior dates, selecting all seven without changing target 3, then clearing.

### Quiet ritual — day-card review revision, 2026-09-07

- Replaced duplicated object summary and load marks with seven responsive day cards and an undated section. Desktop Chrome preview checked: names wrap, seven day headings remain visible, empty Sunday is explicit, and the undated habit is separate. The existing footer stays in reach.
- Updated the ritual interaction test to assert the actual actions per day, empty-day display and undated separation. Six tests plus build/typecheck/import boundaries pass.

### Weekly grouped review — 2026-09-07

- Browser-checked `?step=2&sample=busy`: seven columns, mixed families, independently expanded Monday habits and grouped undated placements. The compact day rows show icons, family names and counts; only the expanded group exposes action names.
- Full Lab build currently blocked by unrelated CalendarPriorityRhythmReplica/useCalendarPriorityState API mismatches (selected/selectCell/WeekFilter). This iteration does not edit those files.

### Quiet ritual — flat day cards, merged review, vertical bars, context column — 2026-09-07

- Verified in headless Chromium at 1440×900: `/preview/ritual-week/quiet-v2/plan?step=2&sample=busy` shows seven cards with all dated names visible and four dashed whole-week rows under each; `/reflect?step=0` shows day headers with record stacks, Dziennik/Emocje symbol rows and column selection; `?step=1` shows two vertical bars with −/+ and the tags panel; `?step=6` shows the writing surface with the context column (ratings pairs, quadrant bar, journal titles, action chips, anchors quote).
- Lab typecheck, import boundaries and 94 tests pass (11 in quietRitual.spec.ts: flat cards + overflow grouping, merged review, bars/tags, context column).
- Emotion names/quadrants, journal titles and exercises in the Lab are explicit illustrative samples in `quietRitual.ts`, sized by the rich-v1 per-day counts; the product would source them from `WeeklyReflectionDataBundle` (emotionSummary, journalSummary, exerciseSummary, weekObjectItems).

### Quiet ritual — revision after user review (same evening)

- Removed the „Działanie” caption and computed record stacks/counts from the review headers; day detail lists journal titles and emotion names only. Bars redrawn as ink strokes with `+` above / `−` below in the bar column and the value beside; tags split per axis (Wysiłek / Stan). Control icons switched to the accent colour. Emotion day row in the context column shows one dot per emotion.
- Headless Chromium 1440×900 re-check of `/plan?step=2`, `/reflect?step=0`, `?step=1` (bars + both tag panels), journal context column. Lab typecheck, boundaries and 94 tests pass.

### Quiet ritual — emotion day stacks — 2026-09-07

- Per-day emotions in the review row and in the journal context are `EmotionDayStack` mini columns (band per quadrant, height by count, quadrant border colour for contrast). Checked `/reflect?step=0&sample=busy` and `?step=6&sample=busy`: Monday shows four bands, Tuesday one tall band, Sunday a faint dash. Component test covers 4-quadrant label, 6-log scaling within 36px and the empty state. quietRitual.spec.ts: 12 tests; full Lab suite 95 (one unrelated calendar test timed out once under load and passed on rerun).

### Quiet ritual — accent + previous-week ghost — 2026-09-07

- Accent switched to `--color-primary` (strong variant on filled buttons); found and fixed a missing-token bug (`--sky-900` did not exist, which voided `--qr-ink` and the new ghost rule). Empty bar segments are now invisible; an untouched bar shows a dashed ghost at last week's level (Ciało: Wysiłek 3, Stan 4), gone after first use. Headless Chromium check: ghost visible on load, disappears on the touched axis only. Lab typecheck, boundaries, 95 tests pass.

### Grouped weekly review — verification resumed 2026-09-08

- Current quietRitual.spec.ts: all 12 tests pass. Full Lab build, TypeScript and import boundary checks now pass; the earlier calendar API blocker is no longer present. `git diff --check` is clean.

### Quiet ritual — ghost, scale labels, tags field, context legend — 2026-09-08

- Previous-week ghost: dashed outline removed, the level now reads as a plain faint fill (`rgb(var(--sky-800) / 0.08)`) inside the ink-stroke shape; hovering the bar still outlines every segment, ghost cells included.
- Scale end labels (`Duży`/`Niewielki`, `Bardzo dobry`/`Bardzo słaby`) are hidden by default and fade in on hover or keyboard focus of the axis field (`:hover`, `:has(:focus-visible)`); their space stays reserved so the bar does not shift.
- Tags left the axis cards: one always-open `Tagi` field under both rating fields, shared by the life area, keyed `${areaIndex}:tags` (was `${areaIndex}:${axis}`). Suggestions remain „recently used only”, Lab session scope.
- The journal context column no longer carries the Wysiłek/Stan colour legend.
- Headless Chromium 1440×950: `/preview/ritual-week/quiet-v2/reflect?step=1` (ghost without dashes, labels only on hover, tags field below), `?step=6` with the context column open (no legend), no console errors. Lab typecheck clean, 95 tests pass.

## 2026-09-11 — Szybki plan z Dzisiaj

- Route: `/concepts/quick-plan?variant=drawer&notes=0` (also `inline`, `board`). Desktop scope, actual browser viewport 1265 × 712; no mobile claim.
- Read the current Today route on verify (5199); reused Lab variant 19, adding only an optional slot in its calendar card. Product source unchanged by this experiment.
- Visually checked inline, drawer/week, drawer/month and seven-column board. Corrected inherited product min-width on the concept and panel; final inline page and panel have equal client/scroll widths (1265 and 410 respectively), with no horizontal overflow at this viewport.
- Browser exercised: edit 15 km placement from 12 to 15 September (cross-week; destination visible); remove it; undo restores it; add an existing object; month lists weeks; all three layouts open/close. Editor focuses the date field. Escape cancels the editor; panel focus supports a subsequent Escape. Native dialog contains focus and closing restores the trigger.
- `npm --prefix ux-lab/app run test`: 103 tests passed. `npm --prefix ux-lab/app run build`: boundaries, typecheck and build passed (existing bundle-size warning).
- Illustrative assignments and panel-local state only. All variant layouts reuse the same panel implementation; production cadence rules, date-picker shortcut, shared state across variants, new-object creation, persistence and save-failure flows are specified in `docs/today-quick-plan-ux-proposal.md`, not implemented here.

## 2026-09-12 — 04 Kalendarz → plan tygodnia

- New default `variant=calendar`; prior 01–03 preserved. Compact calendar header control replaces the large CTA in 04. No day/month switch and no dialog rendered in this variant.
- Desktop visual check at 1440 × 900: seven day columns visible together, zero open dialogs and no document horizontal overflow (client/scroll 1425). Temporary viewport restored after QA. Narrow in-app preview stacks the compact calendar above the daily list and confines weekly horizontal scrolling to the board.
- Browser checked: move 15 km from Tuesday to Friday, source/destination reflected on same board; collapse/reopen retains changes; undo; add runs to Friday; collapsed calendar selection changes viewed date; return to today; next week shows seven empty day columns and a current-week shortcut.
- Escape cancels editor first while keeping expansion, then collapses to the day and returns focus to the small edit-calendar icon. Existing row rescheduling is wired through the custom calendar slot; legacy calendar remains the fallback for other variants.
- 103 existing Lab tests pass; import-boundary check, typecheck and build pass. No production files changed by this iteration. Illustrative panel assignments remain separate from the Today replica data.
## 2026-09-12 — Własne ikony / Studium 01

- `/concepts/icons?notes=0`: 12 authored subjects in three directions (36 variants). C shares B's contours and adds a 16% tonal fill; these are concepts awaiting selection. Uses product tokens and a static Lab-only SVG catalog.
- Browser QA: 1440×1080 desktop, 390×844 and 320×800 narrow viewports. No document horizontal overflow after overriding the inherited product 1180px minimum on this experiment only. Replaced percentage blob radii with the product's card radii. Comparison columns have aligned sample rows even when mobile headings wrap.
- Exercised selection of C / Odpoczynek, URL updates, size 16px, stroke 2px, editing/closing the sample journal, marking the sample task complete, and reset to B / Dziennik / 24px / 1.75px. Readback confirmed 36 samples, rendered SVG size/stroke, completion state, and edited text. Temporary viewport restored after QA.
- All 111 existing Lab tests passed; import boundaries, typecheck and build passed. Existing bundle-size warning and two unmatched-route warnings in monthly ritual tests remain. No production icon migration in this experiment.
## 2026-09-12 — Organic Outline / 84 icons

- User selected direction B. Default `/concepts/icons` is now an 84-icon library; the 36-sample A/B/C study remains at `mode=compare`. Six categories: 14 planning, 14 reflection, 14 life, 14 activity, 20 interface and 8 navigation icons.
- Browser reviewed the library at 1440×1080 and 390×844, with additional overflow measurement at 320×800 (scroll width 320). Reviewed planning, reflection, life and activity families at 24px, interface/navigation at 32px. Temporary viewport override restored after QA.
- Exercised Polish search without diacritics (`zyczliwosc`), category filtering (20 interface, 8 navigation), size changes and returning to all 84. Search/category/selection/size persist in URL. Fixed rapid URL updates merging stale search state, and atomic empty-result reset.
- Export initially used Blob downloads; the embedded browser did not report a download event. Replaced this with generated same-origin files and ordinary download links. Validated all 84 standalone SVG files plus the 84-symbol sprite as XML. Browser save-to-disk completion is not claimed. Generator runs during Lab build and is available as `npm run export:icons` for development.
- 114 tests passed, including original contour preservation, unique IDs, categories, valid SVG/sprite XML, normalized search and URL/filter/empty/comparison interactions. Build and boundary checks passed; existing large-bundle and monthly-test route warnings remain.
- `organic-icons.md` records the family grammar, SVG usage and review limits. No production icon replacement in this iteration.
## 2026-09-13 — Organic Outline / collection 02

- Added 36 icons selected from common planning, reflective-practice, life-area and habit needs: 120 total. Existing 84 icons retain IDs and contours. New `collection=2` URL filter shows only the additions; search and category filters intersect with it.
- Desktop review at 1440×1080 covered all six new groups; adjusted the pin silhouette after visual review. Mobile reviewed at 390×844 and 320×800 without horizontal document overflow. Controls wrap to preserve category and collection labels. Search for `rodzicielstwo` returned one icon, clearing with the keyboard restored 36; 16px rendering and the four-size selected preview worked.
- 114 tests passed, including preservation of the first collection, 120 unique IDs, 36 additions, valid SVG XML/sprite, URL restoration and new-collection filtering. Updated the search fixture because `sen` correctly also matches `basen` in the swimming icon's keywords.
- Export generated 120 standalone SVGs and a 120-symbol sprite; all files parsed as XML. Build and boundary checks passed (existing large-bundle warning). Temporary browser viewport restored; catalog left on the new collection.


## Organic icons — application migration, 2026-09-13

- User authorized applying B throughout the application. Product and Lab now share the 120-icon source; export build still emits all 120 SVGs. AppIcon renders trusted SVG paths, maps legacy names, and preserves user emoji.
- Product build and Lab build pass (existing chunk-size warnings). Full product suite: 2231 passed, 1 skipped. Lab: 114 passed. Focused migration tests cover static AppIcon usage, saved entity catalog, exercise/program/emotion catalogs, distinct rating/control states, canonical picker selection and focus restoration.
- Browser review on verification origin 5199: Calendar, Today, Objects and Exercises; corrected missing legacy aliases loop/outlined_flag. Search “zyczliwosc” yields Życzliwość dla siebie. Picker uses opaque paper and resets inherited minimum height; final browser screenshot confirms compact panel. Exercises shows 23 SVG icons and zero unresolved names. No verification data edited.
- Existing design-system check still reports six violations in planning-next.css (raw colors, legacy class and local shadows); icon migration does not edit that stylesheet.
