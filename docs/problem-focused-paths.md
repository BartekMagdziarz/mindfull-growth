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

## Shame — `shame-compassion` "Ze wstydu do współczucia" (8 weeks + Powrót, 27 steps, content v3)

Outcomes: `scs-sf` (start · połowa · koniec · powrót) and `fscrs` (start · koniec · powrót;
three 0–4 means: inadequate / hated / reassured self). `outcomeSlugs` drives one series per
instrument in the detail view, filled only from the steps' own attempts.

Content v3 (2026-10-04, plan `ideas/html-plans/2026-10-04-shame-path-v3.html`, research
`ideas/research/2026-10-04-*`): **phases = weeks** (`w1…w8` + `return`), the compass
reactions become **IFS parts** (Ukrywający · Krytyk · Oskarżyciel · Odwracający uwagę, created by
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

**P2 progress (2026-10-04).** P2a is committed (`f3b5c60`): Moments progress, own sentences, practice helpfulness and eleven PL/EN knowledge cards. The interactive Sky Mist concept is now available in UX Lab at `/concepts/shame-path` (dashboard / weekly reflection / Today panel; start / mid-path / quiet / paused / completed / return scenarios). It uses illustrative, isolated records with the real pure progress functions and knowledge copy. The local `neomorphism-frontend` skill now reflects Today, Calendar and Objects: lighter nested surfaces, subtle first-level shadows, organic shapes and minimal copy. The production port awaits the user's design review, as required by plan §8.

**Still to come (plan phases P2–P4):** the week-card dashboard with the three Momenty
progress images, knowledge cards, "Moje zdania", the reflection step's week glance and
"unlogged" question, the wizard bridges (`startFrom`, letter checklist, `partTag`
preselection, maintenance plan → repeat plans), Powrót surfacing in Today, the dose-check
rhythm proposal and the AI week-pattern line.

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
