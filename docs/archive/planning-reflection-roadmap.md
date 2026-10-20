# Planning ↔ Reflection — Implementation Roadmap & Backlog

> **Dokument historyczny.** Bieżący punkt wejścia i rekomendowana kolejność prac są w
> [`current-status-and-roadmap.md`](current-status-and-roadmap.md). Ten plik zachowuje szczegółowe
> decyzje i statusy wcześniejszych epików; nie należy traktować jego sekcji „Recommended sequencing”
> jako nowszej od audytu z 2026-08-15.

> **Purpose.** A single, status-verified backlog of every planned-but-not-yet-shipped change to the
> planning/reflection loop, cut into implementable stories. Companion to the concept doc
> `planning-reflection-redesign.md` (the *why* + design) and `weekly-planning-steps-design-audit.md`
> (UI/UX detail). Display side lives in `calendar-3row-design-brief.md` (the "Strumień" stream view).
>
> **Status verified against live code on 2026-06-21**, **re-verified 2026-07-03** during a worktree
> cleanup audit (statuses below reflect the 2026-07-03 tree). Legend:
> `✅ done` · `🟡 partial` · `⬜ not started`. Sizes: **S** ≤½ day · **M** ~1 day · **L** multi-day.
>
> **Cleanup-audit delta (2026-07-03).** The weekly-UI stream landed a **redesign, not the Epic-W polish
> as written**: it *merged* the `intentions` + `priorities` steps into one `plan` step and added a new
> `days` step (**V3 shipped** — day-assignment folded into the ritual; see Epic V). Net effect on Epic W:
> **W1 ⬜ still not done**, **W2/W3 🟡 partial** (details in-place below). **M5b** = data scaffold only, no
> picker UI yet. Known dead code carried in the tree (harmless, vue-tsc 0): `isSavingPlan` ref in
> `WeeklyReflectionWizard.vue` (written, never rendered — the intended save indicator), the unused
> `intention?` field on `weekPlanCandidate.ts`, and the orphaned `priorityIds` plumbing on
> `weeklyIntentionService` (awaiting M5b).

---

## 0. Already shipped (do NOT re-do)

The entire **weekly intention + unified-wizard** layer is live on `main` (verified file:line):

- ✅ `WeeklyIntention` object + Dexie table (v22) + `subjectType:'weeklyIntention'`.
- ✅ `WeekPlan.topPriorities` (≤3 refs) + `setWeekTopPriorities` + `normalizeTopPriorities`.
- ✅ Unified `WeeklyReflectionWizard` — 8 steps `intentions→priorities→review→demands→actions→state→anchors→journal`.
- ✅ Date-gating `isReflectionUnlocked` (reflection locked until Saturday).
- ✅ `review` step (`ReflectionObjectReview.vue`) — objects + per-object comment + top-3 star, persisted to `PeriodObjectReflection` (`periodType:'week'`). **This is the weekly confrontation step.**
- ✅ Today view weekly-intentions section + `isTopPriority` badge.
- ✅ `W→W+1` "plan next week" flow; `WeekKontextCard` single entry button; dead `WeekPlanningWizard.vue` removed.
- ✅ Weekly anchors slimmed 6→3 (`wentWell/challenges/lessons`).

Everything below is the remaining backlog.

---

## Epic M — Monthly priority-focus layer  *(the headline; design = redesign §12)*

The month's missing "top-3 → accountability" loop. Top-3 over **annual `Priority` objects**; effort =
subjective **1–5 self-rating**; full ritual incl. **verdicts** `continue/adjust/pause/drop`. Decisions
M1–M3 settled 2026-06-21. Build order is a vertical-slice pipeline — each story ships value alone.

| ID | Story | Size | Status | Depends on |
|----|-------|------|--------|-----------|
| **M1** | **Monthly top-3 pick — full "Zaplanuj miesiąc" ritual** | L | ✅ done (browser-verified 2026-06-28) | — |
| **M2** | **Monthly priority assessment (effort + verdict)** | L | ✅ done (browser-verified) | M1 |
| **M3** | **Monthly AI payload** | S–M | ✅ done | M2 |
| **M4** | **Weekly↔monthly focus confrontation** (in the priorities-review step) | M–L | ✅ done (browser-verified 2026-06-28) | M2 |
| **M5a** | `WeeklyIntention.priorityIds` — data layer (link intentions to priorities) | S | ✅ done (2026-06-28) | — |
| **M5b** | Intention→priority picker UI (weekly intention composer) | S | 🟡 scaffold only (no picker UI) | M5a + weekly-UI chat |
| **M6** | Priorities-review layout: cards side by side in one row (not stacked full-width) | S | ✅ done (browser-verified 2026-06-28) | M2 |

> **Progress (2026-06-23) — Epic M IMPLEMENTED end-to-end** (vue-tsc exit 0, locale parity OK, 33 targeted tests green, full suite = only the 9 pre-existing fails). Headless foundation (2026-06-22): `MonthPlan.topPriorityIds`, `PeriodObjectReflection.effort/verdict`, `ReflectionSubjectType:'priority'`, `PriorityVerdict`, normalizers, `assertReflectionSubjectExists` branch, `monthlyPriorityService` + spec. UI (2026-06-23): `useMonthlyReflectionWizard` rewritten into the unified ritual (`plan → priorities-review → ratings → anchors → journal`) with month-end date-gating (`isMonthlyReflectionUnlocked` + `monthRitualGate.spec.ts`); top-3 persists **live on toggle**, assessments on **save**. `MonthlyReflectionWizard.vue` gets the "Zaplanuj miesiąc" picker step + the effort(1–5)/verdict/reason review step + `summaryContext.priorities`. AI `ReflectionPriorityLine` gains `effort`/`verdict` (PL labels kontynuuj/dostosuj/wstrzymaj/porzuć). `MonthKontextCard` shows "Otwórz miesiąc" for any month (plan ahead). i18n added to en+pl. **Remaining: live browser verification** (not yet run); bundle `priorityItems` NOT needed (composable loads directly).

### M1 — Monthly top-3 pick  🟡 (data+svc done; UI pending)
*Goal:* at month-open the user picks ≤3 active Priorities to focus on; persisted; shippable without any reflection change.
- **Data:** add `MonthPlan.topPriorityIds?: string[]` (plain ID array, soft-limit ≤3) + `normalizeMonthTopPriorityIds()` wired into `normalizeMonthPlanPayload` (`planningState.ts:423`). No Dexie migration.
- **Service:** `setMonthTopPriorities(monthRef, priorityIds)` (lazy upsert, copy of `setWeekTopPriorities`) + `getActivePrioritiesForMonth(monthRef)` (extract the filter at `usePlannerState.ts:366-374` → status `active` ∧ `years ⊇ month year`, sorted by `order`).
- **UI (DECIDED 2026-06-21 — full ritual):** a guided **"Zaplanuj miesiąc"** flow. Mirror the weekly unified-wizard pattern in the *monthly* wizard — a `priorities` planning step (intro framing + ≤3 picker over active Priorities), date-gated so reflection steps stay locked until month-end. Entered from `MonthKontextCard`; persist via `setMonthTopPriorities`.
- **i18n:** new `planning.monthlyPlanning.priorities.*` (EN+PL), mirror `weekPlanning.priorities.*`.
- *Accept:* pick/unpick ≤3 priorities on a month, reload → persists; >3 shows gentle warning.

### M2 — Monthly priority assessment  ⬜
*Goal:* in monthly reflection, rate effort 1–5 + verdict per active Priority; top-3 starred.
- **Data:** extend `PeriodObjectReflection` (`planningState.ts:98`) with `effort?: number|null` (1–5) + `verdict?: 'continue'|'adjust'|'pause'|'drop'|null`; make `note` **optional**; add `'priority'` to `ReflectionSubjectType` + `REFLECTION_SUBJECT_TYPES`; new `normalizeEffort`/`normalizeVerdict`. Delete-row logic fires only when note **and** effort **and** verdict all empty (update the weekly path too).
- **Repo:** `assertReflectionSubjectExists` gets a `'priority'` branch → `priorityDexieRepository.getById`.
- **Service:** `setMonthlyPriorityAssessment(monthRef, priorityId, {effort, verdict, note})` (upsert/delete) + extend `getMonthlyReflectionDataBundle` (`reflectionDataQueries.ts:1147`) to return `priorityItems: {priority, isTopPriority, effort?, verdict?, note?}[]` (loads active priorities + `topPriorityIds` + month `PeriodObjectReflection` rows).
- **UI:** new **first** step `priorities-review` in `MonthlyReflectionWizard` (currently `ratings→anchors→journal`): list active Priorities, star top-3, each row effort 1–5 control + verdict picker + optional reason. Generalize `ReflectionObjectReview.vue` (today weekly-only) to accept a priority item, or fork it.
- **i18n:** `planning.reflection.monthly.verdicts.{continue,adjust,pause,drop}` — **reuse the stream brief's PL labels** `kontynuuj/dostosuj/wstrzymaj/porzuć`.
- *Accept:* rate effort+verdict on each active priority, reload → persists; top-3 visibly distinguished.

### M3 — Monthly AI payload + history  ⬜
- Populate `summaryContext.priorities` in `MonthlyReflectionWizard` (it currently omits it) from `priorityItems`; extend `ReflectionPriorityLine` with `effort?`/`verdict?` (additive — weekly unaffected). The `[PRIORYTETY]` serializer already exists.
- *(Stretch)* monthly top-3 hit-rate / effort trend across months (joins `topPriorityIds` × prior `PeriodObjectReflection`) → feeds M-C calibration & Epic S.

### M4 — Weekly↔monthly focus confrontation  ⬜ (next)
*Goal:* in monthly reflection, confront the month's top-3 **Priorities** with what was actually picked as **weekly top-3** across the month's weeks — rolled up by priority via object→priority links. Answers "did the start-of-month plan show up in what mattered week to week?" **Replaces the dropped S1.**
*Why this shape (decided 2026-06-28):* a week-card "x/3 met" badge overloaded the cards and broke on monthly-cadence picks (a monthly-cadence object can't be cleanly met/missed in one week). Moving the accounting to the month sidesteps both and lands the "rozliczenie" at the altitude the redesign always wanted (§5 continuity thread). **No new persistence** — `WeekPlan.topPriorities` per week is already permanent; this is read + aggregate + one UI step.
- **Link map (verified in domain):** weekly picks are KR/habit/(tracker)/intention. **Habit/Tracker** → `priorityIds` (direct). **KeyResult** → via `goalId → Goal.priorityIds` (KR has *no* `priorityIds`). **WeeklyIntention** → none today → **M5** adds it. `priorityIds` is an array (0..n) and often empty → see drift.
- **Compute (new assembler):** for the month's child weeks, read each `WeekPlan.topPriorities`; resolve each pick → its priority set; group by priority. Per month-priority: weeks-with-focus count + the picked objects. A **"poza planem" (drift) bucket** = weekly picks whose priority isn't in the month top-3, plus all *unlinked* picks (incl. intentions until M5). Flag month priorities with **0 weekly focus** (neglect signal).
- **UI:** extend the `priorities-review` step — under each priority a `Fokus tygodni: ●●●○ 3/4 — [obiekty]` line; a "Poza planem miesiąca" section below. Read-only.
- **Decisions settled (2026-06-28):** drift/unlinked = **first-class signal** (not noise); frame as a reflective **mirror**, not analytics/causal claim; show 0-focus priorities.
- *Accept:* a month with weekly picks shows, per priority, which weeks/objects focused on it + a drift list; degrades gracefully when weeks have no plan.
- **Progress (2026-06-28): assembler SHIPPED & verified** — `src/services/monthlyFocusService.ts`: pure `computeMonthlyFocus(weekRefs, picksByWeek, activePriorityIds)` + async `getMonthlyFocusConfrontation(monthRef, activePriorityIds)` (resolves habit/tracker direct, **KR via goal**, intention via M5a; drift = no active-priority link, `unlinked` flag). Returns `{ weekRefs, perPriority:[{priorityId, focusWeekRefs, objects:[{…,weekRefs}]}], drift:[{…,unlinked}] }`. `monthlyFocusService.spec.ts` 5/5 (vue-tsc 0). **Remaining = UI** (next, with M6).

### M5 — Weekly intention → priority linking  ⬜
*Goal:* let weekly intentions link to priorities so **every** weekly pick can map in M4 (today intentions are unlinkable → always drift).
- **M5a — data (safe, ours):** add `WeeklyIntention.priorityIds: string[]` + `normalizeWeeklyIntentionPayload` (un-forbid + `normalizeIdArray`); `createWeeklyIntention` accepts `priorityIds`. Additive optional → **no Dexie migration**.
- **M5b — UI (🟡 scaffold only, 2026-07-03):** the **data path is wired but no picker UI exists**.
  `weeklyIntentionService` (`CreateWeeklyIntentionInput`/`UpdateWeeklyIntentionInput`) already accepts
  `priorityIds` (defaults to `[]`), but `IntentionComposer.vue` never sets it — so every intention still
  ships with empty `priorityIds` and lands in drift (graceful). **Remaining:** the actual optional,
  lightweight priority picker in the intention creation/edit flow. Keep it optional to preserve
  "intentions are maximally easy to create".

### M6 — Priorities-review horizontal layout  ⬜
*Goal:* in the `priorities-review` step, lay the priority cards **side by side in one row** instead of stacked full-width (each currently takes its own full-width row).
- **Note:** the step lists **all active priorities (≤5)**, not just 3 → the row holds up to 5 compact columns.
- **Tension with M4:** M4 adds a "Fokus tygodni + objects" block per card, so the column must stay compact (effort a tight 1–5, verdict a compact segmented/select, reason a small textarea, focus as ●●● dots). **Do M6 + M4's UI together.**

---

## Epic W — Weekly ritual UI/UX polish  *(detail = weekly-planning-steps-design-audit.md)*

> **RESHAPED BY REDESIGN (2026-07-03).** The weekly-UI stream did **not** implement Epic W as written —
> it *merged* the separate `intentions` + `priorities` steps into a single **`plan`** step and added a
> **`days`** step (V3). So several W1–W3 line items are **moot-by-redesign** rather than skipped, and the
> statuses below are re-scored against the merged `plan` step. `IntentionCard.vue`/`WeeklyPlanner*.vue`
> were deleted; new files are `WeekDayAssignmentStep.vue` / `WeekPlanObjectCard.vue` / `weekPlanCandidate.ts`.
> `D-limit` (hard vs soft cap) still undecided.

Pure presentation on the already-shipped weekly wizard. Independent of Epic M.

| ID | Story | Size | Status |
|----|-------|------|--------|
| **W1** | Wizard chrome + step headers | M | ⬜ not done |
| **W2** | Intentions step polish (now in merged `plan` step) | M | 🟡 partial |
| **W3** | Priorities step polish (now in merged `plan` step) | M | 🟡 partial |

### W1 — Wizard chrome + step headers  ⬜ not done *(re-verified 2026-07-03)*
None of these shipped (the stepper mechanism dims locked steps, but the chrome/headers below are absent):
- ⬜ Split the stepper into a **planning phase** + visually-distinct **locked "Refleksja od soboty"** phase — only the functional lock-gate exists, no two-phase visual grouping.
- ⬜ Max-width centered content container (~960–1120px; today still only `px-4`).
- ⬜ Labelled footer actions (`Wstecz` / `Dalej` / `Zakończ`) — Back/Next are **still icon-only** (text lives in `aria-label`).
- ⬜ Save-state indicator (`Zapisano` / `Zapisywanie…`) — **`isSavingPlan` ref exists but is never rendered** (dead code).
- ⬜ Per-step header block: eyebrow + title + description.

### W2 — Intentions step polish  🟡 partial *(re-verified 2026-07-03; step folded into merged `plan` step)*
- ✅ Stable grid (was `flex-wrap`) — candidates render in `grid ... sm:grid-cols-2 lg:grid-cols-3`; composer dropped its fixed width for `w-full`.
- ✅ Intention edit/delete actions — `WeekPlanObjectCard.vue` renders edit + delete for intentions, wired to new `updateWeeklyIntention` / `deleteWeeklyIntention`.
- ✅ Empty state.
- ⬜ Section headers "Twoje intencje" / "Dodaj intencję" — moot: intentions are mixed into the unified candidate grid alongside KRs/habits (no separate section).
- ⬜ Visible field labels — labels are `sr-only` / `aria-label` only.

### W3 — Priorities step polish  🟡 partial *(re-verified 2026-07-03; step folded into merged `plan` step)*
- ✅ Live counter — header shows `Wybrano {n}/{max}` (e.g. "Wybrano 2/3").
- ⬜ Split selected / remaining sections — single grid; selected cards only highlighted, not sectioned.
- ⬜ Proper checkbox semantics — **still `radio_button_unchecked` / `check_circle`** icons (adds `aria-pressed`, but not `check_box`).
- ⬜ `isSavingPlan` UI — never surfaced (dead code, as W1).
- ⬜ **debounce/queue** on toggle — **NOT done**; `toggleCandidate` still fires `void persistTopPriorities()` immediately on every click → the concurrent-write **race risk remains open**.
- **Decision needed:** hard cap at 3 vs keep soft limit (see §Decisions).

---

## Epic L — Loop closure & reflection refinement  *(redesign §5, §6, §8, D2)*

| ID | Story | Size | Status | Notes |
|----|-------|------|--------|-------|
| **L1** | `successNote` in reflection confrontation | S–M | ✅ done (2026-06-28) | rendered on shared `WeekObjectTile` → shows in planning grid + review |
| **L2** | Slim monthly anchors 6→3 | S | ✅ code | now `proudOf/challenges/growth` (summary card still renders historical 6) |
| **L3** | Remove §5 loop-closure promise (no backing data) | S | ✅ doc-done | **DECIDED 2026-06-21: drop it** — §5 updated |
| **L4** | Make (monthly) anchors step skippable | S | ✅ code | non-blocking advance + "optional" hint on the step |

- **L1:** `successNote` exists on `MeasurementMonth/WeekState` and is surfaced in planning summaries, but no reflection UI reads it. Add it to `ReflectionObjectReview` so the confrontation shows the planned success criterion next to actual execution.
- **L3 (DECIDED — drop):** the §5 forward-feed promise has no backing data (the `improvements`/`lookingAhead` anchors were removed per D2/1c). Resolution: **promise removed from §5** — loop closure = the confrontation/continuity thread only (shipped weekly). No new forward fields. *(§5 doc updated 2026-06-21.)*

---

## Epic S — Stream surfacing & calibration  *(display brief = calendar-3row-design-brief.md)*

| ID | Story | Size | Status | Depends on |
|----|-------|------|--------|-----------|
| ~~**S1**~~ | ~~Weekly top-3 "x/3 dotrzymane" on `StreamWeekCard`~~ — **DROPPED 2026-06-28** → replaced by **M4** | — | ❌ dropped | — |
| **S2** | Monthly top-3 (+effort ring) on `StreamMonthCard` | M | ✅ done (browser-verified 2026-06-28) | Epic M |
| **S3** | Focus-alignment trend across months *(reshaped — was "hit-rate")* | M | ⬜ later | M4 |
| **S4** | Month theme on stream | S | ⬜ | V2 (theme persisted) |

> **S2 done (2026-06-28):** the year-ribbon `StreamMonthCard` right-1/3 now shows the **real** month top-3 (from `MonthPlan.topPriorityIds`), each ring coloured by the priority's **effort** self-rating (null = picked-but-unrated → dimmed). Decisions: **effort only** (no verdict on the tile), unfilled slots render **"—"**, **ribbon only** (no detail-panel list). Swapped `placeholderPriorities` → real `monthPriorities` loader in `streamData.ts` (batch-loads monthPlans + priorities + month `PeriodObjectReflection` once per year); `StreamPriorityVM` gained `name`/`empty`; dead `priorityPlaceholders` i18n removed. vue-tsc 0, stream spec 20/20, browser-verified. Verdict surfacing on the tile = future (deferred with the brief's "pasek werdyktów").

- **S1 dropped** (2026-06-28): the week-card metric overloaded the cards and broke on monthly-cadence picks → the accounting moved into monthly reflection as **M4**.
- **S3 (reshaped):** the old "hit-rate" framing assumed S1's week-card met/missed. Since S1 is gone, S3 becomes a *cross-month* trend of the **M4 focus-alignment** signal (how consistently weekly attention tracked the month plan) — a later, optional analytics surface once M4 ships.
- **Stale-slot cleanup:** brief line 64 ("prognoza Wymagań → kalibracja") is obsolete per D6 — remove when the brief is next revised.

---

## Epic T — Tech debt

| ID | Story | Size | Status |
|----|-------|------|--------|
| **T1** | Slim reflection data bundles | M | ✅ monthly done (2026-06-28); weekly deferred |

- **Monthly half DONE (2026-06-28):** dropped 7 unread fields from `MonthlyReflectionDataBundle` (`journalSummary`, `habitSummary`, `trackerSummary`, `exerciseSummary`, `weeklyReflectionSnippets`, `monthWeekRefs`-from-bundle, `dailyCalendarSummaries`) + their computation — incl. the **expensive per-day `buildDailyCalendarSummaries`** loop (every day × emotion/journal filtering) and `buildWeeklySnippets` + `addDayRef` + 3 dead type defs. Verified: vue-tsc 0, 31 reflection/monthly specs green, no new regressions (consumers = monthly composable + `summaryContext` only; `MeasurementPlanningSummary` keeps `successNote` for L1).
- **Weekly half DEFERRED (contested):** the weekly bundle's now-unused fields (`dailyBreakdown`, `goalReflectionGroups`, `habitReflectionItems`, `trackerReflectionItems`, `weeklySummary`) are consumed by `useWeeklyReflectionWizard.ts` — owned + mid-churn by the weekly-UI chat. Slim there once that settles (coordinate).

---

## Epic V — Parked (v2+, explicitly deferred)

Real backlog items, intentionally out of the near-term cut. Listed so nothing is lost.

| ID | Story | Status | Source |
|----|-------|--------|--------|
| **V1** | Boundary-week chained ritual (close week→close month→open month→open week) | ⬜ | §6.3, §10b |
| **V2** | Month theme + OUT list on `MonthPlan` + UI | ⬜ | §6.2, §12.2 |
| **V3** | Day-assignment folded into the weekly ritual (vs separate planner grid) | ✅ done (2026-07-03) | §3, §6.1, §10 1f |
| **V4** | If-then / implementation-intention step | ⬜ | §6.1 step 8, 1e (dropped from MVP) |
| **V5** | Silos joining — tag journal/emotion with objects + correlation analytics | ⬜ | §10b (larger data-model change) |
| **V6** | AI extensions — intention suggestions, plan-overload flagging, multi-period narration | ⬜ | §10b |

> **V3 SHIPPED (2026-07-03).** Day-assignment is now a real **`days`** step inside `WeeklyReflectionWizard`
> (`WeekDayAssignmentStep.vue`, wired after the `plan` step; reuses the retained `useWeeklyPlannerState`
> and renders 7 day cards in the `stream/StreamCard` visual language). The separate planner grid + its
> `open-grid` entry point were removed (`WeeklyPlanner.vue` / `WeeklyPlannerDayGrid.vue` /
> `WeeklyPlannerSidebar.vue` deleted). Also folded M4's monthly focus-confrontation UI is still pending
> the design; the confrontation **assembler** (`monthlyFocusService`) is live.

---

## Recommended sequencing

1. **Epic M** — M1✅ M2✅ M3✅ M4-assembler✅ M5a✅. **Next: M4 UI** (surface the focus confrontation in the priorities-review step, with M6) + **M5b picker UI** (data scaffold already in `weeklyIntentionService`).
2. **Epic W (W1–W3)** — reshaped by the merged `plan`+`days` redesign (V3 ✅). **W1 ⬜ chrome still open**, **W2/W3 🟡** (remaining: visible labels, selected/remaining split, checkbox semantics, **debounce on the priorities toggle** — race risk); also owns **M5b**.
3. **Epic L (L1)** — `successNote` in reflection (L2/L3/L4 done).
4. **Epic S** — S1 **dropped** (→ M4), S2✅, S3 reshaped/later (after M4), S4 needs V2.
5. **Epic T1** — opportunistic.
6. **Epic V** — parked.

## Product decisions

*(resolved 2026-06-21)*
- **D-pick (M1): ✅ full "Zaplanuj miesiąc" ritual** (not the inline card picker).
- **D-loop (L3): ✅ drop** the §5 loop-closure promise (no backing data).
- **D-anchors (L2/L4): ✅ monthly anchors → 3, anchors step skippable.**
- **D-limit (W3):** owned by the separate weekly-UI workstream — not decided here.

*(resolved 2026-06-28)*
- **D-weekfocus (S1→M4): ✅ drop the week-card "x/3" metric**; move weekly-top-3 accounting into **monthly reflection** as a weekly↔monthly focus confrontation (M4). Reasons: card overload + monthly-cadence breaks per-week met/missed.
- **D-intentlink (M5): ✅ make weekly intentions linkable to priorities** (`WeeklyIntention.priorityIds`) so every weekly pick maps; **drift/unlinked = first-class signal**, framed as a mirror not analytics. M5b picker UI = coordinate with the weekly-UI chat.
