# Prototype Instructions

## Custom icons — user decision 2026-09-12

- 2026-09-18: the user requested YouTube plus at least as many new icons as the existing catalog, including personal goals/habits/trackers/priorities/life areas and dedicated exercises/rituals. Collection 03 adds 121 vectors (241 total), including all 48 exercise/assessment entries and 10 rituals. Review with `collection=3`; preserve collections 01–02. The product picker and exercise catalog use the shared geometry. System-icon availability does not imply a corresponding feature has shipped.

- 2026-09-13: the user explicitly approved replacing application icons with the B family. Canonical geometry now lives in product `src/design-system/icons/organicIcons.ts` and `seedIcons.ts`; Lab re-exports it and uses it for SVG exports. `AppIcon` renders these vectors with a legacy-name compatibility map. New picker values use `mg-` IDs. This supersedes the earlier Lab-only restriction; preserve emoji and dedicated emotion artwork.

- Collection 02 adds 36 icons (120 total) chosen for frequent app workflows and personal life-area/habit customization. Preserve existing IDs/geometry; use the same B grammar. The URL `collection=2` filters this addition for review. Frequency is a design hypothesis based on app functions, not analytics.

- Follow-up: the user selected B (organic outline) and requested a broader set. `/concepts/icons` now defaults to the 84-icon B catalog in six targeted families; the original 12-icon A/B/C comparison remains under `mode=compare`. The later 2026-09-13 decision authorizes the production migration. Keep the 24px grid, 1.75px rounded outline and restrained asymmetry; new icons should reuse this grammar.

- Develop the custom icon family in UX Lab at `/concepts/icons`, alongside other experiments. Begin with 12 identical subjects in three directions: soft outline, organic outline, and organic outline with a tonal fill. Historical starting point; B was subsequently approved.
- Use authored vector geometry and product design tokens. Compare actual 16/20/24/32 px rendering and in-context cards before expanding the catalog. Keep variant, size, weight, and selected icon shareable in the URL and resettable. Production icons remain separate until a direction is selected.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable UX Lab decisions

- This project is an isolated research and prototyping surface. It may import the product's static tokens, base styles, pure period/data utilities, the shared dev-only rich fixture contract, and an explicit allowlist of presentation-only Vue components.
- It must never import application repositories, Dexie, domain stores, complete product views/wizards, or production runtime services. UX Lab state stays in memory on the 5201 origin.
- Visual grounding comes from Mindful Growth screenshots and the real Sky Mist / neumorphic tokens. Use Roboto and Material Symbols Rounded to match the product baseline; `sketchbook-v1` intentionally uses Nunito throughout for rounded, readable Polish UI copy. Do not use Concert One: despite its `latin-ext` metadata, its distributed font file lacks most Polish glyphs and creates visible fallback inside words.
- The primary example is the priority "Dążenie do zajścia w ciążę" because it tests a broad direction with a natural ending, partial personal control, and several life areas.
- A priority is not a large goal. Its progress is shown through subjective direction, evidence, support coverage, and confidence instead of a single percentage.
- Object-to-priority support is a first-class many-to-many relationship with its own contribution statement, role, expected signal, and review history.
- AI is always an explicit, per-use opt-in. It may propose and synthesize; it never creates commitments without user selection and review.
- UX notes are a separate toggleable layer. Product UI must remain understandable when notes are hidden.
- `dev:verify` on port 5199 is the canonical baseline. Lab replicas are editable experiment surfaces, never a replacement for checking the live verify route.
- "Same data" means the same rich-v1 profile, anchor day, semantic keys, values and relations. Verify and Lab intentionally keep separate browser storage and generated UUIDs.
- Workbench screens register in `src/lab/registry.ts`; UX notes live in `src/lab/content.ts`; experiment state must remain resettable and URL controls must remain shareable.
- The first reusable screen set is Today, month, week, weekly ritual and monthly ritual. New views extend this registry and reuse the same workbench shell.
- Today experiments preserve the existing left column: the action list and the product-shaped Journal, Emotions and Exercises entry points are not the current experiment variable.
- Today is desktop-only for now. Do not spend prototype or QA time on mobile layouts until that scope is reopened.
- The top context control must name the hierarchy explicitly: priority for the year, focus object for the current month, and focus object for the current week. Changing any of these controls must visibly change the right-hand overview.
- The right-hand overview must always identify the selected object and period, show its real current value against its own target when one exists, and allow drilling into further detail. Do not place unexplained aggregates, semantic scores, or ambiguous dots on the surface.
- Keep the overview sparse through progressive disclosure. Surface the selected focus, period, latest value/target, and a short history; hide secondary counts and object metadata until interaction.
- Today experiments may use only the product palette. For progress states use Sky Mist blues, lavender/purple, rose/pink, red, and neutral tokens; do not use green, yellow, amber, or mint in this view.
- The Today `sketchbook-v1` experiment is grounded in two layout-state screenshots and two hand-drawn style references supplied on 2026-07-20. Preserve the source's desktop 30/70 split, full-height grouped daily list, collapsed 3×4 shortcut board, and expanded category state with compact tabs, configurable 1/2/3-card density, detailed charts, and the shortcut grid below.
- In `sketchbook-v1`, "hand-drawn" means softly irregular radii, slightly imperfect alignment, rounded product icons, calm pencil-like data strokes, and restrained paper-like depth. It must remain legible, interactive, and inside the existing blue/lavender/rose/red palette; do not introduce yellow or green from the source draft.
- In `sketchbook-v1`, daily completion and value controls follow the Błękitna Kropka motif supplied on 2026-07-20: a large pale-blue near-circle; completed items add a smaller dark-blue near-circle instead of a checkmark, while numeric/rating values stay as navy text inside the pale shape. Do not show the former red focus star in the daily list.
- When `sketchbook-v1` expands a category, the compact category tabs and footer shortcuts retain pale-blue icon fields. Those fields morph into smaller irregular circles while labels remain outside for scanability and consistency across long Polish names.
- Expanded `sketchbook-v1` charts always use the current Monday–Sunday week, matching the production Today view's day-slot semantics. Keep seven explicit weekday positions, leave future days visually empty, and reveal compact card summaries only on hover or keyboard focus instead of showing them persistently.
- Completion-dot charts reuse the Błękitna Kropka anatomy: assigned/pending days are pale blue, completed days add the smaller navy center, unassigned days are neutral gray, and assigned past days without completion are rose. Today remains pale blue while pending and gains the navy center once completed.
- The `sketchbook-v1` week view keeps the month view's 30/70 composition but replaces the week rail with seven explicit days. Its first layer shows three weekly focus commitments, execution signals (goals, habits, trackers), and context signals (intentions, journal, emotions); object detail always resolves into Monday–Sunday evidence rather than another aggregate score.
- The week rail is deliberately quiet by default: day rows show only weekday and date. Selecting a right-side area temporarily adds one compact per-day aggregate to the rail, while the right side uses Today-style object cards and charts; the two columns must not repeat the same information. Weekly ratings stay visible above the days as one labeled four-area chart for Ciało, Emocje, Działanie and Relacje.
- The `sketchbook-v1` year view uses the same board grammar with twelve months in the left rail. Annual priorities show subjective effort for the selected month, while goal and habit percentages mean the share of assessed monthly signals that met their target through the selected/current month. Weekly intentions do not appear at annual scale.
- The year rail follows the same contextual-disclosure rule as the week rail: month rows show only month names by default. Selecting a right-side category, priority or context area temporarily adds a concise per-month signal; never show an unexplained sparkline, generic completion percentage or reflection dot on every month row.
- Calendar navigation uses one date line without an eyebrow label. The weekly view shows only its date range; Today and year show only their date/year. The week number remains useful in the month rail, where it stays together with the corresponding date range in one copy field.
- Weekly and monthly `sketchbook-v1` rituals use a compact chapter rail and one decision surface at a time. Secondary rationale and AI help stay behind explicit disclosure or per-use consent.
- The weekly reflection is an eight-step progressive flow: factual image, object-by-object review with optional comments, four separate area screens (Ciało, Emocje, Działanie, Relacje), anchors and a final journal entry. It deliberately has no separate "Co chcesz zrobić inaczej?" step. Every area records exactly two explicit axes — Wysiłek and Stan — and never restores the former Wymagania axis.
- Weekly planning keeps three focuses as a soft recommendation rather than a hard limit. It carries over inline weekly-intention creation with priority links, day and whole-week placement, row clearing, editable weekly targets and entry-day requirements; secondary rows and target controls stay behind disclosure.
- The final reflection journal carries the production capabilities forward: live word count, quick context inserts, collapsible context, explicit per-use AI summary and questions, rating summaries, weekly emotion snapshot and anchor summary. Weekly completion offers both `Zapisz refleksję` and `Zapisz i zaplanuj kolejny tydzień`; all ritual drafts show autosave status.
- Monthly planning differs from weekly planning by starting with a soft recommendation of three directions, then selecting concrete monthly goals/results/habits that support them, placing only those objects in weeks and reviewing direction coverage. Retired or orphaned objects must not be proposed as new monthly support.
- Monthly planning target editing stays behind row disclosure. The shared T26–T30 table header is the only week header: when a target row opens, automatic values or manual numeric inputs appear directly in the active week cells beneath their existing assignment dots. Never render a second week grid inside the disclosure panel. The panel contains only the month value, automatic/manual switch, guidance, balance and advanced settings. Automatic mode recalculates summable targets across active weeks, while manual mode exposes per-week exceptions and under/equal/over balance. Operator, aggregation and entry-day requirements remain under a second disclosure; whole-month placement and row clearing stay on the quiet row surface.
- Monthly reflection mirrors the current production ritual as four chapters only: Priorytety, Kompas, Kotwice and Dziennik. It has no separate week picture, object-review or “Co kontynuujesz…” decision chapter.
- The first monthly-reflection chapter shows every active priority, marks the selected top priorities with a star, records only Wysiłek, and provides continue/adjust/pause/drop verdict, optional reason, weekly-focus roll-up, supporting objects and drift only when drift exists. Do not add a second Stan axis to this priority review.
- Monthly anchors use the production questions exactly: “Z czego jestem dumny”, “Największe wyzwania” and “Jak się rozwinąłem”. The final journal synthesizes those anchors with the five-dimension month compass.
- Month navigation must make closed months reachable from the normal month screen. The ritual action changes from planning in the current month to continuing or viewing reflection in a past month, and opens the matching monthly-reflection route.
- Week cards inside the month rail show Wysiłek in rose and Stan in blue on one shared chart, with one persistent axis legend for the rail. The four area icons — Ciało, Emocje, Działanie and Relacje — replace the chart only on row hover or keyboard focus; do not repeat two titled mini-charts inside every row and do not rely on color without the shared legend.
- The weekly four-area ratings chart uses one shared plot for Wysiłek and Stan. Eight numbered markers remain visible by default; the axis legend and four area icons are disclosed only on chart hover or keyboard focus, while the area labels temporarily yield that space.
- Week and year overview tiles match the month board's icon scale and show only the primary title below the icon field. Do not restore explanatory subtitle lines inside those tiles; supporting context belongs in metrics, detail cards or a disclosed footer note.
- Expanded weekly categories reuse the same tab, density-control, card, summary and chart anatomy as Today and month. The period changes the x-axis semantics to Monday–Sunday, but it must not introduce a separate visual grammar for goals, habits, trackers or intentions.
- Weekly and monthly target editors use the otherwise empty quick-action underbar instead of opening a second large settings panel. `Cały tydzień`/`Cały miesiąc` and `Wyczyść` stay on the left; the compact target, distribution/balance and reset/settings controls appear on the right. Per-day or per-week values remain in the existing shared table columns, while advanced operator/aggregation requirements use a second disclosure only when requested.
- Final planning chapters are quality gates, not generic count summaries. Weekly planning must expose unplaced focuses and the densest day, with a direct return to `Rytm`; monthly planning must expose unsupported directions, target readiness and the densest week, with the correction CTA routed to `Wsparcie` or `Tygodnie` according to the actual gap.
- The first weekly-reflection chapter is facts-only. It shows period completion, active days, journal/emotion counts, an explicit planned/completed legend and `wykonane / plan` values per day. A day may reveal its own factual context, while object results and comments remain exclusively in the following `Przegląd` chapter.
- Weekly reflection anchors use the current production questions exactly: “Co poszło dobrze”, “Co było trudne” and “Lekcje i spostrzeżenia”. All three remain optional and follow the same progressive-disclosure accordion used by monthly anchors.

## Today variant 19 — feedback 2026-09-05

- Keep the surface quiet: do not add explanatory descriptions, captions, legends, footnotes or hierarchy labels to clarify the default view. Prefer interaction and restrained visual states.
- The user accepts the current variant 19 composition. Refine the Compass without adding text; try click-to-pin related-row highlighting with a pressed tile and click-again to clear.
- Adding to the day plan uses ONE universal plus in the `Plan dnia` header (revealed on header hover/keyboard focus), opening a cascading menu on hover or click: first list = object types, second list = plannable objects of that type. Per-group plus buttons were retired (2026-09-05). Orphan objects are never proposed. Empty type headers are hidden instead of shown as lonely labels.
- Provide direct previous/next day navigation, reversible hide/move actions and optional collapsing of completed rows. The undo toast auto-dismisses after a few seconds and is cleared by `Ukryte (N)`.
- The inline-stage chart must agree with the row control next to it: today's cell/bar/last point reflects the row's live entry. Compass tiles map priority tones mint→rose and amber→red, like the focus board.
- Detailed numeric entry behavior belongs to the production port, reusing existing application controls; this iteration stays an isolated Lab draft.

## Calendar (retrospective) concepts — decisions 2026-09-05

- The calendar is the review half of the action/review split: it looks back and across scales, never edits the plan, never lists objects on tiles, never interprets. Day is a UNIT (click → Dzisiaj for that date), not a calendar scale; scales are year / month / week.
- Lenses (Rytm · Stan · Emocje · Wpisy · Kierunki) show one metric layer at a time on small-multiple tiles; the only lens-independent slot is the ritual status dot. Comparison is small multiples only (no explicit A/B for now). Weekly ratings are two groups: Wysiłek and Stan (×4 areas).
- Past = result, current = progress + „Zamknij” CTA, future = plan size as a quiet number. Tile backgrounds never encode metrics; marks do. The 2026-07-11 quiet-principle blacklist (no badges, alerts, interpretive copy, best/worst highlighting) applies.
- Concepts 01 Kartka / 02 Wstęga / 03 Macierz / 04 Soczewka share `lab/calendarConceptData.ts`, `lab/useCalendarState.ts` and `components/calendar/*`; 03 deliberately shows all lenses as collapsed rows (one mark per cell) with only the active lens expanded — an intentional tension with "one layer at a time" that the user is to judge.

## Calendar discovery — user feedback 2026-09-06

- The user finds all four calendar concepts overloaded. Prefer fewer visible elements and progressive disclosure; visual aids must have a clear meaning instead of replacing text with unexplained symbols. Avoid persistent lists of objects, many numerical summaries, and explanatory paragraphs on the default surface.
- The central scenario is checking whether plans and recorded actions actually reflect the user's priorities, including regular attention over time. Recorded activity is evidence of attention, not proof of progress toward a life outcome.
- Priorities are ongoing directions whose appropriate level of engagement can change. The user's preparation-for-pregnancy priority currently needs a smaller scope of agreed support; do not impose a weekly quota or treat an outcome outside their control as execution performance.
- Fitness uses goals corresponding to training blocks of roughly one or two months, with their own targets. Detailed training metrics can stay in Strava; the calendar needs the broader pattern of strength sessions and cardio minutes. A dedicated plan-change-history feature is not required for this scenario.
- Morning/evening routines and weekly/monthly planning and reflection are supporting practices. Do not require a new priority for them or force all actions to have a priority.
- Return after irregular use is a core scenario. Missing records must not be presented as confirmed non-execution; reviewing history must not require filling every gap.
- Earlier retrospective-only/no-plan-edit and lens-first decisions are being reconsidered in this discovery. The user accepted the need for quick changes to future plans. The audit proposals are hypotheses, not an approved replacement design.


## Calendar 05 · Rytm kierunków — decisions 2026-09-06 (plan rev. 2)

- Directions (priorities) are rows, time units are columns (weeks of the month / months of the year), one presence mark per cell: recorded · planned-only · empty. A mark says "a recorded action exists", never progress; no KPI sidebar, no lens bar, no object lists, no priority percentage.
- Four groups in fixed order: Priorytety, Obiekty, Refleksja, Wpisy. A collapsed group is one row with one mark per cell and no numbers. Priorytety is expanded by default in the month scale and collapsed in the year scale; collapsed it shows icons of the focus priorities of the column unit (`MonthPlan.topPriorityIds` for months, priorities of `WeekPlan.topPriorities` objects for weeks). Icons encode nothing but focus.
- "Rutyny" was only a sample priority name in plan rev. 1, not an object type — never design a Rutyny group. Objects without a priority live in Obiekty (types → concrete objects rendered as series).
- The period's own rating (month compass, week Wysiłek/Stan) appears as a full-width period row when Refleksja expands — never as a column next to child units. A Σ column is allowed only where the period value is an aggregate of the cells (sums/counts of monthly-cadence series).
- Series marks follow the product resolver vocabulary (`resolveWeeklySliceVizType`/`resolveMonthlySliceVizType`): target slots (completion ≤7), day slots (completion without target), checklist day slots (multi-completion with weighted threshold), bar + target line (counter, value sum; `max`/`lte` = limit, no judgement colour), point on a value axis (value average/last, no interpolation across gaps), point on the fixed rating scale. Do not invent a sixth entryMode→chart mapping.
- Absence ≠ non-execution: no entries = null (dash), an explicit zero is a record. A month-scope assignment does not light a week cell as "plan"; it is reachable in the panel as "Na miesiąc …". Week-scope plans light every intersecting month.
- Wpisy never render full journal text: excerpt ≤90 chars, ≤3 emotion chips, "Otwórz wpis"; lists only at week/day granularity, month cells in the year open per-week counts.
- `skipped` for measurements does not exist in the product; the Lab simulates it as a port question. Quick edits of FUTURE assignments are allowed in the calendar (supersedes the 2026-09-05 "never edits" rule); block targets are never changed automatically.

## Calendar 05 — further user feedback 2026-09-06

- Accepted: a compact summary above the table for the whole displayed year, month or week, with progressively disclosed detail. Show period focus and move its own ratings/reflection here, separate from child-period ratings. Year uses its motif/directions/narrative, not an invented annual rating. This supersedes the earlier own-rating row placement.
- Wide, shallow line charts in the table are too flattened to read well. Reconsider their presentation and proportions while preserving truthful axes and missing-data semantics.
- Accepted: replace the week's per-day card stacks with the same grouped matrix grammar as month, using seven day columns, aggregate presence before disclosure, object names once at the left, and cell details on selection. Keep undated weekly assignments accessible from the week summary; do not invent daily focus.
- Bring Calendar 05 into the newer hand-drawn Today design language. The current experiment feels too close to the previous application design. Preserve cross-scale visual continuity.
- The hand-drawn treatment must include charts themselves: restrained imperfections in strokes/marks are welcome, not just irregular card containers. Preserve data meaning, legibility and missing-data gaps.
- The proposed taller chart rows or compact unconnected points plus a separate full chart have NOT been accepted as the solution to flattened charts. Explore a more creative presentation; the decision remains open.
- UX note 14 feedback: presence dots still feel somewhat abstract; do not fix this through helper descriptions, captions or explanatory paragraphs. Visualizations must explain themselves through their form and context.
- Annual focus icons convey something, but their current presentation does not resonate; reconsider it. The Objects group is used and must remain, including objects without priority links. Own-period ratings mixed beside child-period ratings are unclear; the accepted summary addresses this.

## Calendar 05 — charts and period summary, decisions 2026-09-06 (evening)

- Line series (value average/last, ratings) are drawn once per row across all columns as one continuous line; table columns only separate weeks/months (thin separators, 2px column gap). Solid segments join adjacent slots; a gap in the data is bridged with a faint dashed line, never with an interpolated value. Bars keep per-column marks at unit granularity.
- The table carries a granularity switch in its top-left corner, shown only when a line/bar series is open and the column has sub-units: month = `Tygodnie | Dni`, year = `Miesiące | Tygodnie`; week has none. Fine granularity plots daily (month) or weekly-intersected-with-month (year) samples; bars become per-sub-unit bars WITHOUT a target line, because targets belong to the column period. URL `grain=fine`. The earlier A/B lab toggle (segments vs vertical scales) is retired.
- The period summary is a KPI strip, not a text dump: focus items, then four tiles — actions with a record vs planned, targets met vs checked (only closed units where the object was planned or recorded; monthly-cadence objects via Σ), days with any entry vs elapsed days, and the period's own reflection (compass / Wysiłek·Stan, year = monthly reflections count). Meters use a lighter step of the same ramp. One anchor sentence (proud / good / year motif) sits under the tiles; the full reflection body and undated assignments open under `Więcej`.
- Sample `history` (clock 2027-04-28, Dec 2026–Apr 2027, February kept verbatim from the base fixture, everything else generated deterministically) exists to judge charts with filled columns; keep `closed` as the verify-equivalent fixture.


## Calendar 05 — year of data, rating-first summary, cloud-layered table, decisions 2026-09-06 (night)

- Sample `history` spans 2026-01-01 → 2027-04-28 (a full 2026 plus Jan–Apr 2027; Feb 2027 verbatim from the base fixture). It carries history-only objects (base block 2026, weight goal, craft KRs, walk habit) so every mark kind appears in month scale and the year view has filled columns. Initial view = year 2026.
- The period summary leads with the period's own rating: week = mean Stan (with Wysiłek/Stan per area), month = mean compass with five axes, year = mean compass over the months' reflections with a count. Beneath it four family tiles — Cele · Nawyki · Trackery · Intencje — one word + icon, percent, fraction, meter. Per-object completion: targets met over checked closed units; if no closed unit yet, recorded over planned day assignments; objects without a target count units with an entry over units started. "Na ten tydzień/miesiąc · bez dnia" is gone from the summary (the unit panel keeps its "Bez dnia" group).
- Continuous lines: solid segments join consecutive points in the same or adjacent column; a dashed bridge appears only when a whole column between them has no record. Dot/bar stroke width scales down with slot density (52 weeks in a year).
- Presence: a set made only of observations (the Trackery type row) lights presence from its records; in direction rows observations still don't count.
- Table surfaces follow Today 19: axis = inset capsule with pill units (current raised, slightly rotated); each group = its own raised card with irregular radii; an expanded direction/type + its series = nested tinted card with a left rule; no hairline row borders (only faint dashes between series); plot rows sit in an inset pocket; recorded dots are raised. Column alignment is kept by giving every card the same horizontal padding.

## Calendar 05 — surface rules, decision 2026-09-07

- One depth direction and one tone direction: only first-level cards (summary, group cards, detail panel) cast a shadow (`--cp-shadow-card`). Nesting is a monotonic ladder — each deeper surface is one step WHITER (page → card → field → inner), never alternating back to blue (user rejected the alternating variant as "stripes"). Hover = one step whiter than the parent. The stage (expanded lane, selection) is a field plus a left rule or thin outline, never an inset shadow.
- Inset (`--cp-shadow-control`) is reserved for controls: scale switch, grain switch, axis capsule, meter grooves.
- Content tones only as tokens on `.cp` in `sketch.css`: `--cp-page`, `--cp-card`, `--cp-field`, `--cp-inner`, `--cp-stage`; accents in `--cp-accent` / sky-800. Empty states keep the surface and only mute the text. Do not introduce ad-hoc `color-mix` tones in components — extend the tokens instead.

## Calendar 05 — summary content, decision 2026-09-07 (round 2)

- No aggregate scores: the period rating is a bar chart (compass axes Balans · Sens · Rozwój · Zasady · Wpływ; week = Wysiłek/Stan pairs per area). Never show a mean of compass or of areas.
- Family completion is a blob filled by percent (organic radius, slight rotation) next to the percent and fraction; no horizontal meters.
- Plot rows have no background surface of their own; only column separators. An expanded lane hides its own presence marks.
- `Więcej` must add information, not repeat it: reflection body without ratings (verdicts, demands, anchors, ritual button).
- Charts read as pencil, not instrument: axis labels only on row hover/focus; wavy baseline; bars with a light offset echo and a slight lean; dashed faint column separators. Family tiles carry the name, percent and blob only — fraction and basis live in the tooltip.

## Calendar 05 — one view per table, decision 2026-09-07 (round 4)

- The sub-period table shows ONE view at a time, chosen with a grouped select in the axis corner (Kierunki · Obiekty · Okres). No collapsed groups with presence dots, no nested expanded lane. Default = first focus direction of the period; URL `view=` (legacy `open=` accepted) and sticky across periods with fallback to default when the view has no activity.
- Summary tiles/chips are optional shortcuts that set the same view (left rule marks the active one); never the only way in. Do not add a second row of view buttons above the table.
- Active view in the summary = one step whiter, never a left rule.

## Calendar 05 — zoom, whole-period plan, one ritual action, app accent — decision 2026-09-07 (round 5)

- No detail panel. Clicking a sub-period header or any cell ZOOMS: week/month becomes the focus of its own scale (view stays), day opens Today (simulated in Lab). Browser back restores the previous scale; a query-less URL restores the scenario's initial state. Don't reintroduce `cell=`/`filter=` or in-calendar assignment editing — plan changes belong to the planning ritual.
- Chart grain is PER SERIES: a small magnifier (`.rb-zoom`) in the row's top-right corner, visible on row hover or when active, toggles days↔weeks (month) / weeks↔months (year); state in URL `fine=<objectKey,…>`. No global grain switch anywhere (header placement was rejected as unintuitive; a reserved column was rejected as empty space). The row grid has no tools column — the table's right edge equals the card edge minus padding.
- Default sample is `history` (16 continuous months) for every Lab preset; narrow samples (`closed`, `current`, `sparse`, `empty`, `boundary`, `year`) only via `?sample=`. The user wants at least a full year of data visible on entry — never make a sparse sample the default again.
- Assignments scoped to the whole viewed period are never labelled "bez dnia": they render as `periodPlan` — a dashed pencil thread under the row spanning all columns, filled to the percent of the period target, with the label "cały tydzień/miesiąc · readout". Skipped when Σ already carries the same total.
- Exactly one place for period rituals: the summary header next to "Więcej". Label follows the period state (past → write/edit reflection; current → Plan + Refleksja; future → Zaplanuj; year → Plan roku). No footer button, no buttons inside the reflection body. In product: plan opens the wizard at the assignment step with the period preset; reflection opens the full ritual.
- Accent = the app's soft blue: `--cp-accent: rgb(var(--color-primary))`, `--cp-accent-strong: rgb(var(--color-primary-strong))` for plan outlines/target lines, `--cp-ink: sky-800` for dots and lines. Never hard-code `sky-600`/`sky-500` in calendar-priority components; fills use the accent, ink stays navy. `.cp-btn` shares the chip language (inner tone, irregular radii, card shadow).


## Weekly rituals 02 — user decisions 2026-09-07

- `quiet-v2` is the weekly-only experiment: one central work surface, no chapter rail, no duplicated heading or explanatory captions. Previous/next controls are arrows with accessible names. Small clickable step dots retain the current name and count.
- Remove helper copy wherever possible. Only essential interpretation goes under a subtle accessible `?`; field labels and scale endpoints remain visible.
- Reuse Calendar 05's page/card/field/inner ramp and first-level card shadows. No alternating blue/white nested content.
- Intention creation is a compact, disclosed inline form; optional priority links stay in More options. Support editing/deletion and a soft recommendation of three focuses.
- `Dowolny dzień` is one whole-week placement, distinct from `Wszystkie dni` (seven specific assignments). Undated week placements count as planned but never inflate daily load.
- Reflection retains facts, object review, four separate Wysiłek/Stan areas, anchors and journal. Object review uses aligned day rows, optional comments, explicit zero vs missing records, and no aggregate success percentage.
- Quiet ritual drafts live only in the Lab Pinia session, keyed by revision/week/mode. UI says Szkic w Labie; refresh/reset clears them. Daily evidence is an explicit illustrative sample in quietRitual.ts, not reconstructed production records. AI previews are labeled examples and make no external calls.


## Weekly ritual 02 — compact planning rows, 2026-09-07

- Remove the separate row of actions. A single `Bez terminu` toggle and eraser share the day/target row. Retire the `Wszystkie dni` shortcut; users can still select all seven dots. This supersedes the earlier two-shortcut layout.
- `Bez terminu` means a commitment for this week without concrete dates; it never means unplanned. The summary labels genuinely empty placements `Nieprzypisane`. Toggling flexibility off restores the previous explicit day selection; clearing removes both.
- The target column shows the number only (or a dash without a target), without units, cadence or operator. Full target semantics remain in the tooltip and editor. Neither flexible placement nor selecting seven days changes the weekly target or independently imposes seven completions.

## Weekly ritual 02 — day-card review, 2026-09-07

- Planning step 3 shows seven day cards with concrete action names instead of abstract focus-load counts/bars and the duplicated object summary. Show all dated planned candidates, including actions outside the selected focus.
- Whole-week placements have a separate `W tym tygodniu · bez terminu` section and never appear on invented dates. Selected but unplaced focuses remain explicitly listed under `Jeszcze nieprzypisane`.
- Cards follow the existing surface ramp: card field, lighter action entries, no additional card shadows. Clicking an action returns to the planner with secondary rows disclosed when necessary.

- Planning review on desktop (1280px and wider) presents all seven day cards side by side. Widen this step only to use the desktop canvas (up to 1440px), preserve readable action text with wrapping, and keep responsive wrapping on smaller screens.

- Planning review groups each day and whole-week placements by Cele (goals + results), Nawyki, Trackery and Intencje. Show only nonempty groups, with icon, label and count. Groups start collapsed; hover/keyboard focus reveals a chevron, click/Enter expands names independently. Touch always shows the chevron. `sample=busy` provides an isolated, denser example using the existing fixture objects.

## Weekly ritual 02 — user decisions 2026-09-07 (evening round)

- Planning review: day cards list action names by default (flat list, family = icon, sorted Cele → Nawyki → Trackery → Intencje). Collapsible family groups are only the overflow fallback above 8 dated placements per day (`RitualPlanGroups` `flatLimit`). Whole-week (`Bez terminu`) placements have NO separate section anymore: they repeat in every day card below the dated ones, quieter (dashed), labelled „cały tydzień”. They still never count toward the flat limit or daily load. This supersedes the earlier „W tym tygodniu · bez terminu” section and the „no invented dates” rule.
- Reflection is 7 steps: Przegląd, 4 areas, Kotwice, Dziennik. The former „Fakty” step is merged into Przegląd: day column headers are only the day label and number (no record stacks, no counts, no first-column caption — the user does not want anything calculated from the number of objects/records), two dashed rows at the bottom show Dziennik (book marks per entry) and Emocje (the same `EmotionDayStack` per day) with symbols, clicking a day header selects the column and shows a one-line day detail (journal titles + emotion names only). No totals bar above the table (user decision), no view toggle.
- Area steps: Wysiłek and Stan are two vertical bars of five DRAWN ink strokes (irregular radii, alternating ±0.9° tilt, opacity ramp toward the top; rose for Wysiłek, accent for Stan), not plain boxes. `+` sits above the bar and `−` below it in the same column, the value sits beside the bar. Direct segment click and arrow keys work. Ratings are keyed `${areaIndex}:${axis}`, tags `${areaIndex}:tags`. The scale end labels (Duży/Niewielki, Bardzo dobry/Bardzo słaby) are hidden by default and revealed only on hover or keyboard focus of the axis field, with their space reserved. Tags are ONE always-open field below both rating fields, shared by the whole life area (no per-axis split, no collapsed „Tagi” button): no default vocabulary — only tags the user typed; other areas/weeks get them as „recently used” suggestions (Lab session only). No comment field.
- Journal step: no quick-insert word buttons. Context is a right-hand column beside the textarea (card widens to the desktop canvas on this step), collapsed by default. It shows: 4 areas × paired mini-bars Wysiłek/Stan (+ tags; no Wysiłek/Stan colour legend — the pairing is explained by the area step itself), emotion quadrant bar + top emotions + 7 days as mini stacked columns (`EmotionDayStack`: one band per quadrant in fixed order, band height ∝ logs, so a day with all four quadrants reads as four bands; never a single dominant colour, never loose dots), journal entry titles per day, action result chips with tone (met/missed/no data) and comments as quotes, only filled anchors (linking back to Kotwice), completed exercises. Empty sections disappear; no per-day count lists.
- Icons inside ritual controls (`.qr-icon`, `.qr-quiet`, journal tools, arrows) use the app accent (`--qr-accent`), never ink/black; filled buttons keep white.
- `sample=busy` on the reflection preset swaps in `busyEmotionDays`: explicit per-day emotion lists including a four-quadrant Monday and a six-log Thursday, to exercise the stacks.
- Accent: `--qr-accent` = `--color-primary` (the app accent, lighter than sky-600); filled controls (`.qr-primary`, next arrow) use `--color-primary-strong` for white-text contrast. Do not go back to sky-600. Tokens have no `--sky-900` — use `--sky-800` for ink; a `var()` to a missing token silently voids the whole declaration.
- Area bars: empty segments are invisible (transparent, faint outline only while hovering the bar). Before the bar is used for the first time, a faint grey ghost fill marks the previous week's level for that area/axis (`previousWeekRatings` sample, `touched` flag in the draft) — fill only, NO dashed outline; the ghost disappears permanently after the first change, even if the value is cleared again.

## Emotion picker skins — concept page 2026-09-09

- `/concepts/emotion-picker` (`EmotionPickerSkinsScenario.vue`, nav group „Emocje”) renders the REAL product `EmotionGroupPicker` four times under CSS-only skins (`.egp-skin--pencil|ladder|wash|mono`), each in overview and drill-down state. Functionality and the quadrant palette (`QUADRANT_STYLES`) are untouched — only depth, gradients, outlines and the slider-thumb face colouring differ. Lab `main.ts` now imports the product design-system CSS so `mg-design-v2` cards render.
- Skin rules must win over the component's scoped styles by specificity (`.emotion-skins-page .egp-skin--x .cls`), never by `!important`. A chosen skin is meant to move into the component as its default style, not stay as a wrapper class.

## Emotion picker refinement — user feedback 2026-09-10

- Prefer the Chmurki direction, with selection expressed through the whole tile's fill instead of a colored border. Keep keyboard focus independently visible.
- Quadrant overview cards should carry subtle irregular watercolor-like color. Emotion tiles must inherit the active quadrant hue instead of a universal blue field; slider colors should be muted.
- The concept page now adds 05 Chmurki pastelowe, 06 Akwarelowe obłoki and 07 Papier z pigmentem, preserving the first four for comparison. These are proposals, not a selected production design. Color identifies quadrant; slider position identifies intensity, independently of selection fill.

## Emotion picker 07 — follow-up 2026-09-10

- The user is closest to variant 07 and prefers uniform quadrant coloring over watercolor patches. This supersedes the earlier watercolor preference for the evolving 07 direction. Align with Calendar and Today through flat pastel fields, restrained depth and slightly irregular corners.
- Selected emotion fill must not swallow the slider: keep a light track and a darker muted ink stroke, independent of tile selection.
- Quadrant icons now have a Lab-only set of rounded, slightly irregular SVG outlines. Existing emotion faces remain pending a separate coherent icon-family refinement. Variant 07 opens by default; earlier experiments remain available.

- Slider refinement: preserve the quadrant hue in the thin fill stroke and thumb outline (85% quadrant accent, 15% black). Do not mix predominantly with the shared navy ink: that makes all four sliders look alike. Keep the light track for contrast.

- Variant 07 now exposes a live thumb-style comparison: pastel blob, paper island, face-only with a gap in the track, plus the previous outlined thumb. Default is the pastel blob. All preserve the existing selection/intensity state and keyboard focus; these are proposals awaiting user choice.

- The user approved 07 with the pastel blob thumb for the application. Ported to the shared product EmotionGroupPicker with quadrant SVG assets and a design-system paper token; selection and intensity behavior remain shared across emotion entry and journal editors.

## Szybki plan z Dzisiaj — discovery 2026-09-11

- The user requests quick day/week/month plan inspection and convenient add/edit/remove from Today without completing the planning ritual. This reopens the earlier ritual-only editing constraint for this new experiment; production remains unchanged pending design selection.
- `/concepts/quick-plan` compares inline calendar expansion, drawer, and seven-day board. Drawer is the proposed recommendation, not yet user-approved. The prototype uses rich-v1 object names with illustrative placements and panel-local memory; it does not synchronize the separate Today replica.

## Kalendarz → plan tygodnia — user feedback 2026-09-12

- Reject the large Szybki plan button. Integrate entry into the existing calendar header as a small control.
- Prefer in-place expansion, with no new window. The user likes variant 03's familiar seven-day board and wants to regain its space temporarily at the expense of other Today fields.
- Limit this iteration to weekly plan modification. Remove day/week/month scale switching from the new direction; week view must actually show seven days, not funnel back into a daily list. Month is deferred.
- Reconsider the calendar card itself: the new 04 experiment gives it an always-visible week strip for day navigation and an edit icon to expand the same surface into a weekly board. Expanded mode temporarily hides the daily list and context cards, preserving their state; this exact allocation is a proposal for review.
- 04 (`variant=calendar`) is the new default. 01–03 remain comparison history; the previous drawer recommendation is superseded. All changes remain Lab-only.
