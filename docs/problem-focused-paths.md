# Problem-focused paths — anger · anxiety · shame

Source of truth for the content of the three problem paths. Model and scheduling
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

## Anger — `anger-signal` "Złość jako sygnał" (~6 weeks, 13 steps)

Outcome: `anger-barometer` (own 5-item measure, orientative — DAR-5 licensing unclear).

| # | Step | Phase |
|---|---|---|
| 1 | anger-barometer | understanding |
| 2 | anger-map | understanding |
| 3 | pause-plan | pause |
| 4 | cognitive-distortions | thoughts |
| 5 | thought-record | thoughts |
| 6 | trailhead | need |
| 7 | protector-appreciation | need |
| 8 | need-behind-anger | need |
| 9 | structured-problem-solving | action |
| 10 | behavioral-experiment | action |
| 11 | compassionate-letter (optional) | consolidation |
| 12 | anger-barometer | consolidation |
| 13 | maintenance-plan | consolidation |

Practices: `moment-anger` daily after step 1; `paced-breathing` every 2 days after step 2.
Weekly tasks: noticeSigns · pauseInConversation · altThought · requestNotReproach ·
applySolution + calmRequest · repairRelationship.

## Anxiety — `anxiety-approach` "Lęk: podejść zamiast unikać" (~8 weeks, 15 steps)

Outcome: `gad-7` (public domain). Optional `ius-12` as step 2.

| # | Step | Phase |
|---|---|---|
| 1 | gad-7 | map |
| 2 | ius-12 (optional) | map |
| 3 | anxiety-map | map |
| 4 | worry-tree | map |
| 5 | cognitive-distortions | thoughts |
| 6 | thought-record | thoughts |
| 7 | behavioral-experiment | uncertainty |
| 8 | structured-problem-solving | problems |
| 9 | graded-exposure | approach |
| 10 | graded-exposure (continueLatest, gap 7) | approach |
| 11 | paradoxical-intention (optional) | stance |
| 12 | dereflection (optional) | stance |
| 13 | behavioral-activation (optional) | stance |
| 14 | gad-7 | consolidation |
| 15 | maintenance-plan | consolidation |

Practices: `worry-postponement` daily from step 3 until step 9 is done;
`paced-breathing` every 2 days from step 3. Weekly tasks: noticeAvoidance ·
predictionCheck · uncertainDecisions · firstStep · exposureLow + exposureNext (link to
the exposure attempt log) · meaningfulAct · planApproach. GAD-7 ≥ 10 shows a calm note
about professional help (validated cut-off; the plan said 15).

## Shame — `shame-compassion` "Ze wstydu do współczucia" (~8 weeks, 15 steps, content v2)

Outcome: `scs-sf` (Neff: permission for any use). Higher = more self-compassion.

Content v2 (2026-09-26, plan `ideas/html-plans/2026-09-26-shame-path-v2-compassion.html`):
compassion from week 1, the axis **"O czym jest ten wstyd?"** with three exits
(o tym, co zrobiłem = *czyn* → napraw · o tym, co mnie spotkało = *zdarzenie* →
zadbaj · o tym, jaki powinienem być = *wymaganie* → sprawdź; keys `act/event/demand`),
Momenty as the one log, 2–3 tasks per phase. The user-facing names were chosen
2026-09-26; the shame-or-guilt slug is kept for entry stability.

| # | Step | Phase |
|---|---|---|
| 1 | scs-sf | recognition |
| 2 | shame-map (+ `friendTest`) | recognition |
| 3 | compassionate-image | compassion |
| 4 | shame-response | compassion |
| 5 | shame-or-guilt ("O czym jest ten wstyd?", starts from a moment) | about |
| 6 | thought-record | about |
| 7 | trailhead | critic |
| 8 | protector-appreciation (+ `handover` sentence) | critic |
| 9 | compassionate-letter | critic |
| 10 | core-beliefs | beliefs |
| 11 | behavioral-experiment | outOfHiding |
| 12 | shadow-beliefs (optional) | deeper |
| 13 | exile-witnessing (optional) | deeper |
| 14 | scs-sf | consolidation |
| 15 | maintenance-plan | consolidation |

Practices: `moment-shame` every 2 days, steps 2–10 (then on demand from the weekly
tasks); `self-compassion-break` every 2 days from step 3 to the end;
`positive-data-log` every 2 days from step 10. Never more than two at once; the
soothing breath became a step of `shame-response`. Weekly tasks (2–3 per phase, each
with a `linkSlug`): nameShame · catchBody | useResponse · kindAct · soothingGesture |
friendTest · stayLonger · repairGuilt | noticeCritic · handOver | collectEvidence
(positive-data-log) · breakDemand (behavioral-experiment) | tellSafePerson ·
showImperfect · askQuestion | askSupport · keepResponse. The optional "deeper" phase
has no task.

**Content migration.** `ProgramDefinition.contentVersion` (shame: 2) and
`ProgramEnrollment.contentVersion` (absent = 1). `programContentMigration` re-maps an
older enrollment's completed steps by exercise slug against
`programCatalogLegacy.ts` (first not-yet-consumed occurrence, so the repeated
outcome instrument maps in order) and sets `currentStepIndex` to the first index
without a completion; pending step plan items are dropped and re-materialized. Runs
in the Dexie v28 upgrade and as a safety net in `runProgramScheduler`.

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
