# Problem-focused paths — anger · anxiety · shame

Source of truth for the content of the three problem paths. Anger and anxiety v2 (2026-10-18):
`ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html`. Model and scheduling
rules: `docs/exercise-scheduling-design.md` §4.5 (problem-path amendments, D7, D8).
Original plan and research notes: `ideas/html-plans/2026-09-23-problem-focused-paths.html`
(local artifact).

Code: `src/data/programCatalog.ts` (definitions), `src/locales/{pl,en}/programs.json`
(copy: title, description with limits, `phases.<key>.{title,question}`,
`steps.stepN.intro`, `practices.<slug>.intro`, `tasks.<key>.{title,why}`,
`reflection.severity`, shared `ui.*` / `week.*`).

## Shared structure

- **Measure in, measure out** — the `outcomeSlug` instrument is the first and the
  last-but-one step; the path view shows "Na początku" / "Na końcu".
- **Map of the problem** (micro, 5–7 min) → **phases** → **plan podtrzymania**.
- **Practices** alongside the steps (≤ 2 at once), 3–5 min, daily or every other day.
- **Weekly real-world task** per phase, proposed in the quiet weekly plan, reviewed in
  the quiet weekly reflection's "Ścieżka" step (severity 1–5 + phase question).
- **No knowledge cards** (user decision 2026-09-23): psychoeducation alone is weak
  (d≈0.36 in the anger meta-analysis); each task carries one "why" sentence only.

## Anger — `anger-signal` "Złość jako sygnał" (6 weeks + Powrót, 19 steps, content v2)

Outcome: `anger-barometer` (own 5-item measure, orientative — DAR-5 licensing unclear),
measured at the start · halfway · the end · the return (`outcomeSlugs`).

**Content v2 (2026-10-18, plan `ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html`)**
ports the shame v3 shape: **phases = weeks** (`w1…w6` + `return`), "Mój znak" (`signSlug`,
the shared `my-sign` micro launched with `?kind=anger`), the barometer halfway with
`dose-check`, the letter for a worse day, the close on the maintenance plan (`closesPath`)
and **Powrót** 56 days later (`afterCompletion`). v1 enrollments are re-mapped by slug
(`programCatalogLegacy.ts`, `programContentMigration`); no Dexie change.

| # | Step | Week |
|---|---|---|
| 1–3 | anger-barometer · anger-map (+ `reactionKinds`) · my-sign (`kind=anger`) | w1 Rozpoznanie |
| 4–5 | pause-plan (→ `afterSave` Momenty with "Pauza" ticked) · cognitive-distortions | w2 Pauza |
| 6–8 | thought-record (`startFrom: moment`) · anger-barometer (połowa) · dose-check | w3 Inne spojrzenie |
| 9–11 | trailhead (`startFrom: moment`, `tagPart: program:anger-signal`) · protector-appreciation (`partTag: program:anger-signal`) · need-behind-anger (`startFrom: moment`, `momentPrefill { observation: situation }`) | w4 To, co ważne |
| 12–13 | structured-problem-solving · behavioral-experiment | w5 Własny wybór |
| 14–17 | compassionate-letter (optional, `startFrom: moment`) · anger-barometer · letter-to-future-self · maintenance-plan (**closesPath**) | w6 Co zostaje |
| 18–19 | anger-barometer (+56 d) · path-return (`kind=anger`) — `afterCompletion` | Powrót |

Practices (never more than two at once): `paced-breathing` every 2 days until the dose
check; `moment-anger` every 2 days from the map to the letter. Weekly tasks 2–3 per week,
every one anchored on `moment-anger` with a `countRule` over the anger moves (noticeSigns ·
noticeCost · pauseInConversation · announceReturn · breathBefore · altThought · factOnly ·
requestNotReproach · nameNeed · returnToTalk · applySolution · calmRequest · sayNoCalmly ·
repairRelationship · keepPause). Knowledge cards: angerPause (w2) · angerRumination (w3) ·
angerNeed (w4) · angerRepair (w6) · angerSafety (pinned). `scaleLabels.total` =
"Natężenie złości". "Moje słowa" (`PathSentencesCard` with `kind: 'anger'`) collects the
requests from "Potrzeba i prośba" and the return promises from the pause plan.

**No IFS registry for anger** (D4): the part met at the trailhead is only tagged
`program:anger-signal` on save (`TrailheadView` `?tagPart=`), so "Co próbuje chronić"
preselects it through `initialPartTag`. The anxiety path does no parts work.

## Anxiety — `anxiety-approach` "Lęk: podejść zamiast unikać" (8 weeks + Powrót, 22 steps, content v2)

Outcomes: `gad-7` (start · połowa · koniec · powrót) and `ius-12` (start · koniec, both
optional); the detail view shows one track per scale (`scaleLabels.<instrument>.<scale>`,
because both instruments have a `total`).

| # | Step | Week |
|---|---|---|
| 1–4 | gad-7 · ius-12 (optional) · anxiety-map (+ `reactionKinds`) · my-sign (`kind=anxiety`) | w1 Rozpoznanie |
| 5–6 | worry-tree · cognitive-distortions | w2 Zmartwienie czy zadanie |
| 7–8 | thought-record (`startFrom: moment`) · behavioral-experiment (`startFrom: moment` — the Moment's `thought` is the prediction, its situation the context) | w3 Inne spojrzenie |
| 9–11 | structured-problem-solving · gad-7 (połowa) · dose-check | w4 Na co mam wpływ |
| 12 | graded-exposure | w5 Małe podejście |
| 13–14 | graded-exposure (continueLatest, gap 7) · paradoxical-intention (optional) | w6 Wrócić do próby |
| 15–16 | dereflection (optional) · behavioral-activation (optional) | w7 To, co ważne |
| 17–20 | gad-7 · ius-12 (optional) · letter-to-future-self · maintenance-plan (**closesPath**) | w8 Co zostaje |
| 21–22 | gad-7 (+56 d) · path-return (`kind=anxiety`) — `afterCompletion` | Powrót |

Practices: `paced-breathing` every 2 days until the worry tree; `worry-postponement` daily from
the worry tree to the second exposure; `moment-anxiety` every 2 days from the map to the
activation step (the breath cannot return later — one window per slug). Weekly tasks 2 per
week: noticeAvoidance · noticeUrge (`part: 'check'`) · postponeWorry (`worry-postponement`) ·
sortWorry · predictionCheck · uncertainDecisions · firstStep · leaveOneUnknown · exposureLow
(`graded-exposure`) · stayAMinute · exposureNext · doItAnyway · meaningfulAct · attentionOut ·
planApproach · keepWorryTime. Knowledge cards: anxietySmallSteps (pinned) · anxietyWorry
(pinned, w2) · anxietyUncertainty (w3–w4) · anxietyLearning (w5–w6) · anxietySafety (w1, w5).
GAD-7 ≥ 10 keeps the calm note about professional help.

## Momenty v2 for anger and anxiety — reaction families (2026-10-18)

`src/domain/momentFamilies.ts` describes how a path reads "who took the wheel":
`MOMENT_FAMILIES[kind]` = the reaction step (`compass` · `angerReaction` · `anxietyReaction`),
the moves step (`response` · `angerResponse` · `anxietyResponse`), the strength step
(`strength` · `angerStrength` · `anxietyStrength`), the keys in stacking order (the self key
first) and the backfill moves. Two pairs per family on the shame palette (`partColors.ts`:
lilac / lavender = inward, rose-200 / rose-400 = outward, sky = self):

- **anger**: Pauza (self) · Milczenie · Na siebie · Ostrzej · Wybuch;
- **anxiety**: Podejście (self) · Odkładanie · Wycofanie · Sprawdzanie · Zamartwianie.

The anger and anxiety branches of `moments` are the quick five (reaction · noticed · moves ·
strength → "Zapisz teraz"; `earlyFinishAfter` takes one anchor per branch) with optional
prose after them (situation, the map-hinted body step, the thought, the anger `need` list,
the anxiety `outcome`); the 0–10 `intensity` is gone (old entries read as `ceil(intensity/2)`).
`momentsProgress(entries, weeks, unlogged, kind)` is generic (`MomentsWeekStats.kind`,
`byPart` keyed by the family), as are `PathPartsChart`, `PathMomentsGlance`, the reflection's
MOMENTY section (chart, "Były momenty, których nie zapisałeś?", Dopisz with the family's
reactions and moves, the week-pattern sentence — the prompt names the path), `taskCountsEntry`
and `backfillMoment` (`reaction` instead of `compass`). The path view shows the block as
"Reakcje" for anger and anxiety, "Części" for shame.

**Shared micros branch on the path** (no new catalog entries): `my-sign` and `path-return`
start with an optional `kind` step that the step presets through `launchQuery.kind`
(`MicroExerciseView` turns `?kind=` into a preset); the dose check and the letter carry the
same query so the saved screen opens the right path and the letter lands on the right
enrollment (`recordFutureLetter(…, programSlug)`). `anger-map` / `anxiety-map` ask for the
reaction families (`reactionKinds`) which hint the Momenty reaction and "Mój znak".

## Shame — `shame-compassion` "Ze wstydu do współczucia" (8 weeks + Powrót, 27 steps, content v3)

Outcomes: `scs-sf` (start · połowa · koniec · powrót) and `fscrs` (start · koniec · powrót;
three 0–4 means: inadequate / hated / reassured self). `outcomeSlugs` drives one series per
instrument in the detail view, filled only from the steps' own attempts.

Content v3 (2026-10-04, plan `ideas/html-plans/2026-10-04-shame-path-v3.html`, research
`ideas/research/2026-10-04-*`): **phases = weeks** (`w1…w8` + `return`), the compass
reactions become **IFS parts** (Ukrywający · Krytyk · Agresor · Odwracający uwagę, created by
the shame map with tags `shame-compass:<reaction>`), a safe place and the named resistances
before the first inward practice, the compassionate self, a mid-path dose check, fierce
self-compassion (defender voice), writing after a moment, a letter to the future self, the
path **closes on the maintenance plan** (`closesPath`) and **Powrót** follows 56 days later
(`afterCompletion` steps delivered to the completed enrollment). Goal stated in the
dashboard: "zauważać wstyd szybciej, odpowiadać ciepłem zamiast atakiem na siebie, atakiem
na innych lub ukryciem, i wracać do kontaktu" + the user's own "Mój znak" (`signSlug`).

| # | Step | Week |
|---|---|---|
| 1–4 | scs-sf · fscrs · shame-map (parts) · my-sign | w1 Rozpoznanie |
| 5–7 | safe-place (+ resistances) · compassionate-image (toOther first) · compassionate-self | w2 Oparcie |
| 8–9 | shame-response (unblend, anchor, log-a-moment after save) · shame-or-guilt | w3 Odpowiedź |
| 10–12 | thought-record (`startFrom: moment`) · scs-sf (połowa) · dose-check | w4 Inne spojrzenie |
| 13–15 | trailhead (`startFrom: moment`) · protector-appreciation (`partTag` Krytyk) · direct-access (optional) | w5 Krytyk |
| 16–17 | compassionate-letter (`startFrom: moment`) · defender-voice | w6 Własny głos |
| 18–20 | core-beliefs (`startFrom: fairDemand`) · behavioral-experiment · exile-witnessing (optional) | w7 Wyjście z ukrycia |
| 21–24 | scs-sf · fscrs · letter-to-future-self · maintenance-plan (**closesPath**) | w8 Utrwalenie |
| 25–27 | scs-sf (+56 d) · fscrs · path-return — `afterCompletion` | Powrót |

Practices (never more than two at once): `paced-breathing` daily until step 7;
`moment-shame` every 2 days steps 4–14; `self-compassion-break` every 2 days from step 7 to
the close; `shame-writing` every 2 days in week 6; `positive-data-log` (frame `demand`) every
2 days from step 18 to the close. Weekly tasks 2–3 per week (new: receiveKindness ·
unblendSay · sayNo · readAloud · defendSelf); the follow-up phase has none.

**Momenty v3** (shame branch): five taps first — `compass` (part, incl. `none`), `noticed`
(during / soon / hours / later), `response` (+ `unblend`, `defend`), `strength` 1–5 — then
"Zapisz teraz" (`earlyFinishAfter`); `situation`, `about`, body, critic, kind voice, next time
are optional. Anger / anxiety / other branches unchanged.

**Runner v3 features**: `prefill` (shown + editable; `afterSave.prefillFrom` carries answers
between micros), `minLength` (soft), `optionsFrom: 'programPractices'`, `labelsFromParts`,
`optionalWhen`, `innerPractice` ("Za dużo na dziś" → saves with `tooMuchToday`, hands over to
`paced-breathing?notice=tooMuch`), `hintFrom.full`.

**Content migration.** `contentVersion` 3; legacy lists v1 and v2 in `programCatalogLegacy.ts`;
re-mapped by the scheduler safety net on the next Today load (open enrollments only — closed
paths keep their history; no Dexie upgrade this time, the user restarts the path anyway). The detail view offers "Zacznij od nowa" (abandon + enroll).

**P2 (2026-10-05) — the path view, the reflection block and the Today card are in the product.**
`ProgramDetailView` is the Lab's round-5 concept (`/concepts/shame-path`) on `PageContainer`
"wide": header with the goal sentence (`programs.<slug>.goal`, else the description), the
user's "Mój znak" and a ⋯ menu (pause / resume / restart / abandon); left `PathJourney`
("Twoja droga": one row per phase with a well, the title and one mark per step; the current
phase open with its `why`, the steps — a filled chip only on the current one — and two
collapsible rows `PathPracticesRow` and `PathWorldRow`); right `PathNowCard` (current step +
intro + Rozpocznij, the due practice, chips Zapisz moment · Mój plan · List od Ciebie),
Postęp = `PathMomentsGlance` (parts × weeks small multiples, tone = strength 1–5, response
discs / noticing bars / numbers table behind "Szczegóły") + `PathMeasureTracks` (one track
per scale, first and latest measurement as discs, grids behind "Szczegóły";
`features/program-path/outcomeSeries.ts`), `PathSentencesCard` and `PathKnowledgeCard`
(two titles, side drawer, `readCards` via `programEnrollmentStore.markCardRead`). Components
live in `src/features/program-path/` with `program-path.css` as the shared vocabulary;
`ProgramStepTile`, `ProgramPracticeRail`, `ProgramWeekPanel`, `ProgramMomentsRow` and
`ProgramOutcomeSummary` are gone. The weekly reflection's "Ścieżka" block shows the compact
glance (this week next to the previous one) and asks "Były momenty, których nie zapisałeś?"
(`program.<id>.unlogged`, buckets from `UNLOGGED_BUCKETS`; `unloggedSeries` feeds the path
view). The Today "Ścieżki" card shows "tydzień n z m" for week-phased paths, the next step
even when it is not due yet, and up to two chips (Zapisz moment · Mój plan). E2E:
`e2e/verification-shame-v3.spec.ts` (v2 spec removed) and `verification-problem-paths.spec.ts`.

**P3 (2026-10-05) — the bridges into the wizards.** A step with `startFrom: 'moment'`
(Zapis myśli, Punkt wejścia, List do siebie) opens `MomentPickerDialog` from the path view and
the Today card (`features/program-path/useStepLauncher.ts`) and launches the exercise with
`?momentId=`; the wizard reads it through `useMomentSeed` and PREFILLS the situation, the
critic's line and — in Punkt wejścia — the part that took the wheel (`shamePartByReaction`),
all editable. `startFrom: 'fairDemand'` opens Co myślę o sobie with `?seed=fairDemand`: the
latest critic line as the thought, the latest reasonable demand from "O czym jest ten wstyd?"
as the alternative. `launchQuery.partTag` preselects the protector in Docenienie protektora
and Rozmowa z częścią (`initialPartTag`). List współczucia gets a "Sprawdź" step after the
letter: Gilbert's six qualities as ticks (`CompassionateLetter.checklist`), a warning when
the letter contains advice/"powinieneś", a soft 300-character note, and "Wstaw do listu jako
szkic" that inserts the AI draft into the editor. Docenienie protektora prefills "czego się
boi" from the part card and adds a `body-check` step after the part's answer
(`IFSProtectorAppreciation.bodyCheck`: softens · same · tightens). After Co zostaje ze mną,
`MaintenanceRepeatsPanel` turns the kept practices into repeat plans at the chosen rhythm.
Already in place from P1: "Jeszcze nie" in Świadkowanie, `?frame=demand` in the positive data
log, `labelsFromParts` in Momenty.

**P4 (2026-10-05) — after the steps.** Today lists `deliveringEnrollments`, so the closed
path's Powrót step shows up on its day with the context "Powrót". The letter to a future
self is recorded on its enrollment when saved (`programFollowUpService.recordFutureLetter`
→ `futureLetter { entryId, showAt }`, `returnIn` w4/w8/w12 → +28/56/84 days); from `showAt`
on the path view's Teraz offers "List od Ciebie", and Today shows a "List od ciebie" row for
a week. "Czy nie za dużo?" with "za dużo" or "nie robię ich" makes the path view propose a
calmer rhythm (`domain/programFollowUp.ts` `doseProposal`: faster-than-every-third-day
practices → every 3 days; "none" → everything but the breath weekly; `PathDoseCard` with
"Rzadziej / Zostaw tylko oddech" and "Zostaw jak jest" = `keepRhythmOverrides`); one click
writes `practiceOverrides` (`programEnrollmentStore.applyPracticeOverrides`) and the
scheduler re-reads them through `effectivePractice`. Never "do more". The dose-check saved
screen links to the proposal. After Powrót the kept practices can run on as weekly repeats
and the path can be opened to start again. The weekly reflection's shame block has
"Zaproponuj wzorzec tygodnia": `pathLLMAssists.describeWeekPattern` with the new
`PATH_WEEK_PATTERN` prompt (pl/en, `prompts/path.*.ts`) turns the week's
`MomentsWeekStats` (+ previous week, up to three kind sentences) into one descriptive
sentence, shown as "Propozycja", never judging or consoling; the path's records stay out of
the companion's history. With P4 the v3 plan is complete.

**P6 (2026-10-11) — the path view after Lab round 6 (`/concepts/path-view-v2`).**
"Twoja droga" (`PathJourney`): one row per week — the number well on the left, the title level
with it, ONE state disc on the right (fill + "done/total" while current, the done well once
closed, an empty well before); the open week's row keeps the card tone (closed rows lift to
mist on hover), and below it ONE mist field holds both its "why" sentence and the steps as
paper tiles in one row (columns = the week's step count, max four; since 2026-10-17 — three
equal ladder steps card → field → tile, no in-between tones). Since 2026-10-17 one tile per
open week is *in focus*: two columns wide, the whole intro and "Po co:" — the current step by
default, any tile on click (the head is the toggle; the current tile keeps its ring and button
either way; clicking the focused tile returns to the default). The other tiles show the first
sentence of their intro (`firstSentence` in `pathModel.ts`, sentence segmenter, three lines
max). The head is the title alone, one row in the usual case, with a small muted glyph of the
step's *form of work* before it (decision 2026-10-17, four groups): **pomiar** derives from the
catalog `kind: 'assessment'` (so the "— pomiar" suffixes left the SCS-SF/FSCRS titles; the
repeat labels "w połowie drogi" / "na koniec" / "po ośmiu tygodniach" stay), and
**wyobraźnia** (imagery and parts work), **namysł** (writing and thinking: records, letters,
maps, beliefs) and **działanie** (plans, experiments, decisions, checks) come from the optional
`form` field on the catalog entry (`ExerciseForm`, `exerciseStepForm()` in
`src/domain/exerciseCatalog.ts`; glyphs `form-*` in `organicIcons.ts`; names under
`programs.ui.form.*`; `exerciseCatalog.spec` guards that every path step has one). Every tile
keeps ONE meta slot
in the bottom-right corner: minutes, "opcjonalny · N min", "pominięto", or the done well +
date with Cofnij sliding in on hover. Older wording below: title, the step's intro as the
"co" sentence;
the current tile is lit (ring) with "Po co:"
(`programs.<slug>.steps.step<n>.why`, 27 sentences for the shame path in PL and EN) and the only
filled button on the page; a done tile keeps the tone, quiets the ink and slides its completion
date + "Cofnij" in on hover. "Od nowa" is a link in the journey head with an inline confirm (the
restart dialog and the ⋯ menu item are gone; Wstrzymaj / Porzuć stay under ⋯). "Cofnij" =
`undoLastStep` / `canUndoLastStep` in `programSchedulerService` (active enrollment, the step
before the current one completed — a skipped step cannot be taken back; the exercise record
stays in history, the pending step item is replaced). The "Teraz" card, `PathPracticesRow` and
`PathWorldRow` are replaced by ONE card, `PathPracticesCard` ("Praktyki" · "Gdy wrócisz" when
paused · "Powrót" on the return): the active practices, Momenty and the week's real-world task
as tiles (`.pp-tile-grid`, every action the same quiet chip; the task's wells are its state in
the tile head; "Zmień" opens the task choice; "Mój plan" / "List od Ciebie" are links in the
head). Postęp = two mist blocks (`.pp-block`): "Części" with `PathPartsChart` (columns per
week, time left → right, pastel two-family palette in `partColors.ts` — reds for attack:
Krytyk rose-200 · Agresor rose-400; violets for hiding: Odwracający uwagę lilac · Ukrywający
lavender; Ja = sky; legend small on the LEFT in the same 7.4 rem column as the Pomiar labels,
hover writes the week's counts beside the names) above the round-5 details, and "Pomiar"
(no dashed divider). "Warto wiedzieć" = small tiles (icon field + title). The closed block is a
compact left-aligned cluster. Rule for the whole view: the right edge of a row is for STATE
only, an ACTION sits right after its content, no dashed separators, tones go in one direction
(card → mist → paper). Renames: the attack-others part is **Agresor** (EN "the Aggressor"; the
seeded IFS part name too — existing parts keep their stored name); the FSCRS/SCS-SF scale labels
are nouns (Współczucie dla siebie · Uspokajanie siebie · Poczucie, że nie wystarczam · Niechęć
do siebie). E2E: `e2e/verification-shame-v3.spec.ts` follows the new structure.

## New building blocks (2026-09-23)

- **Micro runner**: `choice` steps (single/multiple), `showWhen` branching (since
  2026-09-26 also an array = AND), definition `followUp` (e.g. worry time → worry
  tree). Micro definitions: paced-breathing, moments, anger-map, pause-plan,
  need-behind-anger, shame-map, shame-or-guilt, shame-response, compassionate-image,
  worry-postponement, anxiety-map, maintenance-plan (listed under the CBT tab; three
  are daily-suggestion candidates).
- **Momenty (2026-09-26)**: one moment log (`moments`) with a `kind` answer
  (shame / anger / anxiety / other) replaced the shame and anger logs. Paths use the
  catalog **variants** `moment-shame` / `moment-anger` (`ExerciseCatalogEntry.variantOf`
  = definition + preset answers, `hiddenInCatalog`): plan items, practices,
  completions and task links carry the variant slug, entries live under `moments`.
  Dexie v27 moved the old rows. New runner elements: `hintFrom` (a quiet quote from
  the latest entry of another micro, or from the entry picked in this run),
  `entryPick` step (choose a recent entry, e.g. a moment to work on), `optionHints`
  copy (a verb under a choice pill), presets.
- **Micro runner layout (2026-10-17)**: the step card is two zones — head (question
  at `xl`, note at `md`, context quote as plain text, the step's *why* as a round
  "?" disc at the row's end with a floating note: `ExerciseStepWhy variant="disc"`)
  and body (the answer on the zone's full width), 24 px apart; `MicroExerciseView`
  uses the `focus` page width (896 px). Choice cells share each row equally by
  option count (2 → a pair ≤ 9 rem, 3–5 → n columns, 6–9 → 3, ≥ 10 → 2); scales up
  to five steps (strength, "did it help") are the reflection's cloud stack
  (`ExerciseRatingStack`, same recipe as `QuietRatingBar` on product tokens, no card
  chrome) that starts **empty** — `null` until tapped, "Dalej"/"Zapisz teraz" wait
  for a required rating, an unrated optional scale saves no value; six to eleven
  steps are a grid of N tiles with the end labels under the first and last one,
  textareas set their minimum in lines (global `field-sizing: content` ignores
  `rows`), progress dots stay hidden while only one step is known. Plan and audit:
  `ideas/html-plans/2026-10-17-moments-wizard-layout-pass.html`.
- **Runner (2026-10-18)**: `earlyFinishAfter` accepts a list of anchors (one per branch);
  `afterSave.prefillFrom` accepts `{ set }` for a fixed answer (the pause plan hands over
  "Pauza"); a path step may carry `momentPrefill` (`useStepLauncher` encodes the picked
  Moment's answers as `?prefill=` for a micro step).
- **Instruments**: `gad-7`, `anger-barometer`, `ius-12` (sum scoring with named bands,
  `sumScoring`) and `scs-sf` (mean). Polish wording is a working translation — swap for
  validated versions once permissions are sorted (see instrument licensing notes).
  Problem-path instruments are NOT part of the profile build payload.
- **Graded exposure attempt log**: rungs with SUDS before/peak/after, duration, safety
  behaviours used, "mastered"; each attempt records a completion.

## Open

- Anger measure: ask the DAR-5 authors; keep `anger-barometer` labelled orientative.
- Q1 from the plan: should the anger/shame logs also write an emotion-log entry?
- Maintenance plan v2: turn kept practices into repeat plans instead of free text.

**P7 (2026-10-11) — Today, round 2 (Lab `/concepts/today-tiles`).** The day's exercises left
the right column: repeats, path steps and path practices due today or overdue (and the ones
finished today) are rows of the day plan in a "Praktyki" group (`NextDayPractices`, after the
object groups) — lead icon, title, the well on the right with a play glyph that launches the
exercise (`useStepLauncher` for steps, the catalog route otherwise); a completed plan item
fills the well (matched through the completion's `recordId`). The tray (jutro · data · pomiń)
sits right after the title on hover. `NextDayPrograms` is now one progress tile per delivering
path: icon, title, one `pp-mark` per week (done / current) or a `pp-disc` meter for a path
without weeks, "tydzień n z m"; a sentence on hover (week · phase · today's step), and on click
a small expansion with the next step and its intro, this week's practices and task (lazy
`weekTaskState`), the fresh letter, the quick chips (Zapisz moment · Mój plan) and "Otwórz
ścieżkę". "Najbliżej" shares the tile grammar (`.ndt-*` in `planning-next.css`): title + state
only, the goal's planned end in the tooltip, Podsumuj cel · Przesuń termin permanently in the
footer of an overdue goal, "Jeszcze n" / "Minione (n)" as links in the head. *The "Ścieżki"
card described here was superseded by P9 (2026-10-17).*

**P8 (2026-10-11) — the "Ścieżka" step in the weekly reflection (Lab
`/concepts/path-week-reflection`, rounds 1–3b).** The block is ONE reading column (46 rem,
centred) with three sections, each a tone whiter than the block: ZADANIE TYGODNIA (task tile
with the Today disc "done/target"; the counted days — "wt. · Krytyk · coś dla siebie" — only on
hover/focus of the tile; "Jak poszło z tym zadaniem?"; "Zostań przy zadaniu" as a quiet chip),
MOMENTY (`PathPartsChart` `compact`: fixed 2.6 rem columns, this week next to the previous one,
the dashed estimate cap also on a quiet week; "Szczegóły" = Moments list + numbers table;
"Zaproponuj wzorzec tygodnia" as a link under the chart; "Były momenty, których nie zapisałeś?"
→ żaden · Dopisz · "więcej, bez szczegółów" with the 1–2 / 3–5 / więcej buckets behind it) and
TYDZIEŃ n · <phase> (the phase's `why` in the eyebrow's title; severity question and scale in one
row; the phase question). No sentence under an eyebrow, nothing stretched to the card's width.
**A task counts the task, not any Moment**: `ProgramWeeklyTask.countRule` (`TaskCountRule`:
`any` = any move other than "nothing", `options` = the Moment's `response` must contain one of
them, `part` = the compass must be that part) and `taskCountsEntry` in
`programTaskBridgeService` — `recordTaskProgress` reads the entry and skips tasks whose rule
fails (tasks without a rule still count every completion, e.g. the plan-day-only ones). Four new
Moment answers carry the shame tasks: `kindAct` (Coś dla siebie, jak dla przyjaciela), `gesture`
(Dłoń na sercu), `stayed` (Minuta dłużej), `thanked` (Podziękowanie Krytykowi); the Critic tasks
(noticeCritic, handOver) also need `compass: attackSelf`. **Backfilled Moments**
(`momentBackfillService.backfillMoment`, store `createBackfilledMoment`): ≤ 2 per week
(`BACKFILL_LIMIT`), day · part · optional moves, saved as a `moments` entry with
`noticed: 'later'`, `backfilled: 'yes'`, `createdAt` = the day at 12:00 local, no completion row;
they feed the stats like any Moment but are drawn hatched (`PathPartsChart` `backfilled` prop,
`.pc__seg.is-later`), tagged "dopisany" in lists, and run through the bridge so a backfill with
the task's move counts the day. `WeekTaskState.doneDays` lists the counted days. i18n:
`programs.week.section*`, `programs.week.backfill.*`, `exerciseWizards.micro.moments.response`.
E2E: the reflection part of `verification-shame-v3.spec.ts`.

**Seed and E2E for v2 (2026-10-18).** The verification seed (`RICH_SCENARIO_VERSION` 11) carries
the anxiety path in its v2 shape (step 8/22, seven Moments, the map's reaction kinds, "Mój
znak") and a new anger enrollment (step 7/19, the barometer halfway due today, eight Moments,
pause plan, an accepted `altThought` task). E2E: `e2e/verification-anger-v2.spec.ts` and the
v2 version of `verification-problem-paths.spec.ts`.

**P9 (2026-10-17) — the "Ścieżki" card in Today, round 3 (plan
`ideas/html-plans/2026-10-17-today-paths-field.html`).** The user found the P7 tile weak (a
wide field with little in it, numbers everywhere, the step duplicated from the day plan).
`NextDayPrograms` is now one block per **active** path: a 3-column grid two rows tall. Left,
both rows: the path — title, the phase's title (none for a path without phases) and a row of
dots (weeks, or steps when the path has none; done / current / later; no "Tydzień 4" or "Krok 7
z 15" text — the position is the dots, the numbers only in `aria-label`/`title`). The dots use
the day plan's chart grammar (`NextObjectChartCard`: organic disc, done = sky field with the
state disc inside, current = the dashed pending mark). The whole field is the link to the path
view; "Otwórz ścieżkę" floats in over its bottom edge on hover/focus, no space reserved (the card
head has no link any more). Top middle and
right: two action tiles in ONE grammar (eyebrow + round glyph, title, a quiet line), because both
lead into an exercise — "Następny krok" (the step's title, "dziś" · "jutro" · "zaległy" without
the rose · a short date; launches through `useStepLauncher`, the moment picker when the step
starts from a moment) and "Zapisz moment" (eyebrow = the moment variant's title, e.g. "Moment
wstydu"; paths with `momentKind`). Bottom middle + right: the week's accepted task — eyebrow and title on the left, its state as N
dots (x filled) on the right; the fraction "2 z 3 dni" only in `title`/`aria-label`; without an accepted task the
row is absent (`grid-template-areas` per missing zone). Round 6 replaced the five-zones-in-one-row
layout of the morning, which was too dense at the user's ~33 rem right column (canonical
viewport, see `docs/agent-verification.md`). After "Czy nie za dużo?" with "za
dużo"/"nie robię ich" a quiet sentence under the row links to the path view's proposal. Gone
from Today: the "W tym tygodniu" practices sentence, the fresh-letter line, the "Mój plan"
chip, the week-marks row. Two active paths = two blocks in one card. Below a 28 rem card (container query)
the fields stack in one column. **Paused paths show nothing in Today** (user decision), closed
ones only through the markers below and the day plan.

**The letter and the return moved to "Najbliżej"** as two new `DayMarker` kinds
(`dayUpcomingQueries.ts`: `letter`, `return`, both carrying `enrollmentId` / `programSlug` /
`programTitleKey`, titles resolved in `dayViewModels`). They belong to the enrollment, which may
already be closed while another path is active — before P9 the letter lived only in the path
tile and was lost for "za 12 tygodni" once the closed enrollment stopped delivering. The letter
appears from `futureLetter.showAt` on, never ahead (no calendar dot either), labelled "dziś" and
then "do przeczytania" (waiting, not late — no rose); once read (`futureLetter.readAt`, no
Dexie change: a nested optional field) the marker is `done` = "przeczytany", sits on the day it
was read and leaves a week later. Opening the quote in `PathPracticesCard` (from the marker via
`?letter=1&enrollment=<id>`, or by hand) emits `letterOpened` →
`programEnrollmentStore.markFutureLetterRead`. The path view resolves the letter's owner
(`letterEnrollment`): the enrollment the marker named, else the shown one, else the latest due
letter of the path — a letter outlives its run, so after "Zacznij od nowa" the active enrollment
shows the closed run's letter. The return is one marker per
closed enrollment with `afterCompletion` steps, on the first follow-up step's eligible day (last
completion + its gap, the close date as the fallback anchor), announced ahead like a goal
deadline, "zaległy" in rose when behind, `done` once the last follow-up step is. Both open the
path view. `futureLetterFresh` and the `wellness.programLetter*` / `plannedOverdueSince` keys
were removed. Seed: a second, closed shame enrollment (close −50 d → Powrót in 6 days, letter
written with "za 4 tygodnie" → waiting for 23 days). E2E: the Today and Najbliżej tests in
`verification-shame-v3.spec.ts`; unit: `NextDayPrograms.spec`, `dayUpcomingQueries.spec`,
`dayViewModels.spec`, `NextDayUpcoming.spec`.
