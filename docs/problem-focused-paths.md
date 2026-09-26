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

Practices: `anger-log` daily after step 1; `paced-breathing` every 2 days after step 2.
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

## Shame — `shame-compassion` "Ze wstydu do współczucia" (~8 weeks, 14 steps)

Outcome: `scs-sf` (Neff: permission for any use). Higher = more self-compassion.

| # | Step | Phase |
|---|---|---|
| 1 | scs-sf | recognition |
| 2 | shame-map | recognition |
| 3 | shame-or-guilt | actOrSelf |
| 4 | thought-record | actOrSelf |
| 5 | trailhead | critic |
| 6 | protector-appreciation | critic |
| 7 | compassionate-image | compassion |
| 8 | compassionate-letter | compassion |
| 9 | core-beliefs | beliefs |
| 10 | behavioral-experiment | outOfHiding |
| 11 | shadow-beliefs (optional) | deeper |
| 12 | exile-witnessing (optional) | deeper |
| 13 | scs-sf | consolidation |
| 14 | maintenance-plan | consolidation |

Practices: `shame-log` every 2 days, steps 2–9; `paced-breathing` every 2 days,
steps 3–5; `self-compassion-break` every 2 days, steps 6–9; `positive-data-log` every
2 days from step 10. Weekly tasks: nameShame · repairGuilt · noticeCritic · kindAct ·
collectEvidence (link: positive-data-log) · tellSafePerson + showImperfect · askSupport.
The optional "deeper" phase has no task.

## New building blocks (2026-09-23)

- **Micro runner**: `choice` steps (single/multiple), `showWhen` branching, definition
  `followUp` (e.g. worry time → worry tree). 12 new micro definitions: paced-breathing,
  anger-log, anger-map, pause-plan, need-behind-anger, shame-log, shame-map,
  shame-or-guilt, compassionate-image, worry-postponement, anxiety-map,
  maintenance-plan (listed under the CBT tab; three are daily-suggestion candidates).
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
