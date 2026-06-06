# AI Assistant — Scaling the Profile-Build & Chat Context

> **Status:** Approved 2026-06-06, not yet implemented. Source of truth for this initiative.
> Sequenced: **Pillar 1 (instrument) → Pillar 2 (budget-assemble) → Pillar 3 (summarize)**.
> Builds on commit `dd27edc` (Ollama native `/api/chat` + auto `num_ctx`).

## Context (why this exists)

As the user accumulates data (journal entries, emotion logs, exercises, reflections),
two LLM payloads grow:
- **(A)** the user context injected into **chat/exercises**, and
- **(B)** the **profile-build** payload that dumps raw records into one local-LLM call.

The recently-shipped Ollama fix (`dd27edc`) already surfaced the failure mode: a large
input overflowed the context window, the prompt was truncated, and the model returned an
"all-empty but successful" profile. We added a pre-flight `contextTooLarge` guard, but the
guard runs on an estimate that **systematically under-counts the real payload**, and we
**still don't log what each build actually costs**.

Goal of this work: scale context not just to *fit* the window, but for **speed** and
**quality** (lost-in-the-middle). Direction: tiered/progressively-summarized context —
recent N weeks raw + older data as weekly/monthly aggregates, assembled to a token budget.
**First step is INSTRUMENTATION** — measure, then design. This document is the grounded map
of both pipelines plus the sequenced improvement plan.

---

## Part 1 — Grounded map (answers the 5 research questions)

### A. Chat / exercise context — what's injected (Q1)

Single decision point: `withProfileContextSystemPrompt(systemPrompt, {useProfile})`
(`src/services/userContext.ts:77`). When `useProfile` is true and a saved profile exists, it
prepends a markdown block built by `buildUserContext` (`userContext.ts:21`):

```
## User Profile Context
_Note: …_            (optional)
### Summary / Values / Emotional Patterns / Strengths / Challenges /
### Relationships / Themes / Recent Arc / Suggested Directions
```

- **9 fixed sections + note**, empty sections skipped, English labels (markers for the LLM).
  Prepended as `${block}\n\n${systemPrompt}`. **No truncation / no budget.**
- **Key insight: this is the *generated profile*, a bounded ~2–5k-token artifact — not raw
  data. The profile IS the summarization layer for chat.** So Pipeline A is bounded by
  construction; the scaling pressure is almost entirely in Pipeline B.
- **Chat** (`chat.store.ts`): also injects the **single current journal entry**
  (`constructJournalEntryContext`, bounded) + profile gated by `profileContextDefault`
  (default **true**, `userPreferences.store.ts`). Base prompt = one of 5 intentions.
- **Exercises** (`ifsLLMAssists` / `cbtLLMAssists` / `logotherapyLLMAssists.ts`): same
  `withProfileContextSystemPrompt` helper, but `useProfile` defaults to **false**, and they
  inject exercise-specific context instead of a journal entry. No journal.
- `profileContextDefaultJournal` (default true) exists but is **currently unused** — a hook
  for a future "inject journal into chat" feature.

### B. Profile build — full flow (Q2)

`buildProfile(scope)` — `src/stores/userProfile.store.ts:182`:

1. Validate scope; `PROFILE_MAX_TOKENS = 6000` (answer budget).
2. **Pre-flight guard (local providers only, `:216`)**:
   `scope.approxTokenCount + 6000 + 2048 > OLLAMA_NUM_CTX_CEILING(65536)` → throw `contextTooLarge`.
3. Resolve `dateRange` → `{start,end}`; gather only the enabled `dataTypes`, each filtered by
   **date range + `includedObjectIds[type]` + `filters`** (`:233-381`).
4. `buildProfilePayload(...)` (`src/services/profileLLMAssists.ts:315`) → one bracketed string:
   `[SCOPE] [FOUNDATION SNAPSHOT] [JOURNAL ENTRIES] [EMOTION LOGS] [EXERCISE SESSIONS]
   [WEEKLY REFLECTIONS] [MONTHLY REFLECTIONS] [LIFE AREAS] [PLANNING SNAPSHOT] [END OF DATA]`.
5. `sendMessage([{role:user, content: payload}], systemPrompt, {maxTokens, model})` (`:409`) —
   note `withProfileContextSystemPrompt(..., {useProfile:false})`: the profile is **never** fed
   into its own generation.
6. `parseProfileResponse` (strips `<think>`, matches `#`..`######`/`**bold**` headers, maps to
   the 9 section ids); throws `emptyResponse` if every section is blank.
7. **`finally`**: write build-log via `profileBuildLogDexieRepository.add(...)` (`:462`).

Per-type data & formatting (`profileLLMAssists.ts` formatters):

| Type | Source | Payload shape | Bounded? |
|---|---|---|---|
| journal | `journalStore.sortedEntries` | `--- Entry {id} ({date})` + Title + `Emotions\|People\|Contexts\|Life areas` (resolved names) + body | **No — dominant** |
| emotionLogs | `emotionLogStore.sortedLogs` | `--- Log {id}` + meta line + note | **No** |
| exerciseSessions | `getExerciseSessionBundlesForPeriod` | `--- {type} ({date},{id})` + `summariseExerciseSession` one-liner | per-item capped |
| weekly/monthlyReflections | `structuredReflectionDexieRepository` | `--- Week/Month {ref}` + ratings + promptResponses + freeform | grows ~52/12 per yr |
| foundation | `buildFoundationSnapshot()` | full markdown (purpose, values, assessments) | **Yes (snapshot)** |
| planning + lifeAreas | `buildPlanningSnapshot()` + `buildLifeAreasSnapshot()` | bulleted active items + exec metrics | **Yes (snapshot)** |

Scope constraints: `dateRange` presets `last30/last90/last12m/all`; `includedObjectIds` is
enforced as `ids.size===0 || ids.has(id)` (empty = all); `filters` = emotionQuadrants /
peopleTagIds / contextTagIds (lifeAreaIds stored but a no-op today).

### C. What we already aggregate (Q3)

- **Reflections are USER-WRITTEN and optional** (`src/domain/reflection.ts`) — ratings +
  promptResponses + freeform. They are **not** auto-rollups of raw logs, so progressive
  summarization of journal/emotionLogs **cannot depend on them** (they may not exist).
- **`aiSummary` field on weekly/monthly reflections is a LIVE, partially-built feature** —
  wired into both wizards (`useWeeklyReflectionWizard.ts:84/194/245`,
  `useMonthlyReflectionWizard.ts`) with i18n incl. *"AI will scan your entries, emotions and
  ratings and pull out the main themes of the week"* + an `aiSummaryLoading` state. **Not free
  real estate** — but a conceptual sibling of Pillar-3 narrative summaries (same substrate).
- **Snapshot builders already produce compact deterministic aggregates** (reuse these):
  - `buildFoundationSnapshot()`, `buildLifeAreasSnapshot()`, `buildPlanningSnapshot()` —
    the planning one even computes streaks / % / trend over a 90-day window.
  - `summariseExerciseSession()` — one-liner; `extractWeeklyRatings`/`extractMonthlyRatings`
    — numeric `Record<string, number|null>` (12 weekly / 5 monthly dims).
  - `getQuadrant(emotion)` (`src/domain/emotion.ts`) — ready for emotion-distribution rollups.

### D. Token accounting + the two gaps (Q4)

- Estimate: `estimateTokens = chars/4` (`profileScopeQueries.ts:91`) summed per-type in
  `queryScopePreview`, stored as `scope.approxTokenCount`, shown in the wizard and in
  `ProfileBuildLogPanel.vue:310`.
- **Gap 1 — real usage is dropped.** Native Ollama returns `prompt_eval_count`/`eval_count`
  → `nativeUsage()` → `LLMDiagnostics.usage` (`{prompt_tokens, completion_tokens, total_tokens}`,
  snake_case) → surfaced via `options.onDiagnostics`. **`buildProfile` passes no
  `onDiagnostics`, so it's lost.** Build-log `tokenUsage?: {promptTokens, completionTokens,
  totalTokens}` exists (`userProfile.ts:90`) and **`ProfileBuildLogPanel.vue:90-156` already
  renders it** — the field is just never written. (`eval_count` includes thinking tokens.)
- **Gap 2 — the estimate lies, two ways:**
  1. **Wrong ratio.** Guard uses **chars/4**; the *real* window sizing uses **chars/3**
     (`NUM_CTX_CHARS_PER_TOKEN`, `llmService.ts:35`) on the full payload via
     `computeOllamaNumCtx`. The guard under-reserves relative to what actually gets sent.
  2. **Wrong content.** Preview counts journal as just `title+body /4` (omits per-entry
     scaffolding + resolved emotion/people/context/lifeArea **names**), foundation as flat
     `200`/item (real = full snapshot markdown), and **planning as `0`** (`:297`) though the
     payload embeds planning **and** lifeAreas snapshots; reflections omit serialized
     promptResponses.
  - Net: `approxTokenCount` can sit materially **below** the real prompt → the guard waves a
    scope through → `num_ctx` clamps at 65536 → Ollama truncates → `emptyResponse`. The exact
    class the `dd27edc` fix meant to kill, just relocated into the estimator.

### E. Growth profile (Q5)

- **Unbounded:** journal (**dominant** — full body per entry), emotionLogs, weekly/monthly
  reflections (~52 + 12 / year).
- **Bounded (snapshots):** foundation, planning, lifeAreas; exerciseSessions are per-item
  capped (one-liner).
- Over years, **journal alone** will breach the window and dominate latency — the prime
  target for tiered summarization.

---

## Part 2 — Improvement plan (sequenced: instrument → assemble → summarize)

### Pillar 1 — Instrumentation (committed first; the measurement foundation)

**1.1 Log real usage (zero view change).** In `buildProfile`, pass `onDiagnostics` to the
`sendMessage` call (`userProfile.store.ts:409`), capture `lastUsage = d.usage ?? lastUsage`
(callback fires twice non-streaming; last-non-undefined wins), and in the `finally` log write
(`:462`) map snake→camel: `tokenUsage = { promptTokens: prompt_tokens ?? 0, completionTokens:
completion_tokens ?? 0, totalTokens: total_tokens ?? prompt+completion }`. Panel already renders
it. Document that `completionTokens` includes reasoning (Ollama folds thinking into `eval_count`)
and `promptTokens` is the calibration gold signal.

**1.2 One honest estimator (single source of truth).** Extract the data-gather +
`buildProfilePayload` from `buildProfile` (`:233-398`) into a shared
`assembleProfilePayload(scope)` returning `{ text, tokensByType, tokensByAge, droppedByType }`.
Point **both** preview (`profileScopeQueries.ts` / `useProfileBuildWizard.computePreview`) and
build at it, so preview == build minus the LLM. Switch `estimateTokens` to **chars/3** via the
constant exported from `llmService.ts` so guard and `num_ctx` can't disagree. (Bounded snapshot
builders + exercise bundles already run at build; sub-second on local Dexie.)

**1.3 Per-type × age breakdown.** Compute `tokensByType` + coarse `tokensByAge`
(`0-30d / 31-90d / 91-365d / 365d+`) inside the assembler; surface in the wizard preview and
persist a compact copy into the build log next to actual `prompt_tokens` (the build-log panel is
the right home; leave the AIPlayground live panel alone).

**1.4 Calibration (fast follow).** After ≥3 successful builds, derive empirical
`charsPerToken = payloadChars / prompt_eval_count` (rolling, per model+Polish) and feed it back
into `estimateTokens`. Ship chars/3 now; calibrate later.

### Pillar 2 — Budget-aware payload assembler

Turn `assembleProfilePayload` from "dump everything then throw" into "fill to a budget."

- **Budget (computed, not fixed):** invert `computeOllamaNumCtx`:
  `maxPromptTokens = OLLAMA_NUM_CTX_CEILING − (PROFILE_MAX_TOKENS + reasoningHeadroom(effort))
  − NUM_CTX_MARGIN(512) − safety`. Read the same effective `reasoningEffort` the build uses
  (the current fixed `+2048` is only correct at `high`; it's 512/1024/2048 for low/med/high).
  Non-local providers: skip the hard RAM budget, apply a soft cost cap (configurable).
- **Algorithm:** (1) admit bounded high-signal blocks whole in priority order — foundation →
  planning+lifeAreas → reflections → exercise one-liners; (2) split the remainder between the
  unbounded streams with **reserved quotas (journal 70% / emotionLogs 30%)** so journal can't
  starve logs, two-pass with slack donation; (3) fill each stream **newest-first**, keeping
  blocks grouped to match the existing `[JOURNAL ENTRIES]`/`[EMOTION LOGS]` structure.
- **Pins:** the wizard auto-fills `includedObjectIds` with *all* matching ids, so "present" ≠
  "hand-picked." Distinguish explicit de-selection from the auto-filled set (a `userPinned`
  marker, or compare against the unfiltered count); pins always included first, counted against
  budget; only the unpinned remainder is auto-budgeted.
- **Replace the hard guard** (`:216`): assembly-to-budget normally succeeds; throw
  `contextTooLarge` only when bounded blocks + pins alone exceed budget.
- **Overflow seam:** V1 = drop newest-first overflow + record `droppedByType`; V2 = optional
  `summaryProvider` replaces dropped older periods with a `[SUMMARIZED HISTORY]` block (Pillar 3).

### Pillar 3 — Progressive summarization

- **Tiers (assembler-driven defaults):** Tier 0 raw = last **8 weeks**; Tier 1 weekly aggregates
  = weeks 9–26; Tier 2 monthly aggregates = months 7+. The raw boundary shrinks under budget pressure.
- **Deterministic per-period rollup** (one record per ISO week / month), reusing existing
  primitives — offline, free, exact: emotion **quadrant distribution** (`getQuadrant`) + top
  emotions; journal `{entryCount, topPeople, topContexts, wordCount, capped 1-line leads}`;
  averaged `extract*Ratings`; exercise counts; planning exec-metrics pattern scoped to the
  period. ~50–150 tok/period vs thousands raw, shaped like the existing snapshot builders.
- **Narrative (LLM, sparing):** only for periods being **dropped** where qualitative texture
  matters; **monthly only**, one `sendMessage` over that month's raw.
- **Storage + invalidation:** **new Dexie table `profilePeriodSummaries` at `version(21)`**
  (current latest is 20) — `{id, periodRef, kind, tier, content, inputHash, recordCount, model?,
  createdAt}`. **Do NOT reuse `aiSummary`** (live user-authored field, different period
  semantics). Invalidate by **content hash** over the period's sorted record ids + `updatedAt`
  (no store hooks needed for v1; optional eager deletion in `journal.store`/`emotionLog.store`
  update/delete seams later).
- **Strategy: hybrid** — deterministic always (carries the bulk of the signal), narrative LLM
  only for the dropped tail. Compute lazily at build time; optional pre-warm at month rollover.

---

## Open decisions (recommendation → tradeoff)

1. **Estimator: assemble-real-payload vs patch-per-type estimators** → **assemble-real-payload**.
   Patching still needs name resolution + snapshots to be honest and converges on the same code;
   the assembler reuses it. Tradeoff: preview does the full bounded gather (slightly slower, exact).
2. **Tokenizer ratio: chars/4 vs chars/3 vs calibrated** → **chars/3 now, calibrated later**.
   Matches `num_ctx`, kills the truncation gap. Tradeoff: may over-reserve slightly.
3. **Budget: fixed reserve vs computed-from-settings** → **computed** (invert
   `computeOllamaNumCtx` + per-effort headroom). Tradeoff: small coupling to llmService constants.
4. **Aggregates: deterministic vs LLM vs hybrid** → **hybrid**. Tradeoff: more parts, but
   offline-friendly and cost-bounded.
5. **Summary timing: at-close vs cadence vs lazy-at-build** → **lazy-at-build** (deterministic
   always; narrative for dropped periods), optional rollover pre-warm. Tradeoff: first build over
   huge history pays narrative latency unless pre-warmed.
6. **Invalidation: content-hash vs store-hook eager** → **content-hash v1**, eager deletion later
   if build-time recompute is slow. Tradeoff: recompute cost on read vs added mutation coupling.
7. **Storage: reuse `aiSummary` vs new `profilePeriodSummaries`** → **new table (v21)**. Tradeoff:
   a migration vs colliding with a live user-facing field.
8. **Per-type rollups vs one period digest** → **one per-period digest**. The assembler swaps a
   whole period's raw for one block. Tradeoff: coarser reuse, simpler budgeting.
9. **Reflections: depend on vs enrich-where-present** → **compute independently, enrich with the
   user's reflection text/ratings when they exist**. Tradeoff: can't lean on sparse reflections.
10. **`includedObjectIds`: treat auto-filled set as pins vs distinguish de-selection** →
    **distinguish**; pins always in, remainder auto-budgeted. Tradeoff: one extra wizard flag.

---

## Verification

- **Pillar 1:** unit-test snake→camel mapping; integration-test that a stubbed `onDiagnostics`
  usage payload lands in the build-log row and renders in `ProfileBuildLogPanel`; assert
  `preview estimate == estimateTokens(assembleProfilePayload(scope).text)` (single-source);
  on synthetic data, compare logged `approxTokenCount` vs real `prompt_eval_count` (expect within
  ~10–15% at chars/3).
- **Pillar 2:** unit `assembleProfilePayload` on over-budget data — total ≤ budget, all bounded
  blocks present, newest kept / oldest dropped, 70/30 quotas + slack donation, pins always in;
  assert old `contextTooLarge` no longer fires for fittable scopes; E2E: a dataset that previously
  threw `contextTooLarge`/`emptyResponse` now yields non-empty sections.
- **Pillar 3:** golden tests (stable rollup markdown; quadrant counts match `getQuadrant`; rating
  averages match `extract*Ratings`); reduction ≥10× with top people/contexts/quadrants preserved;
  edit one record → `inputHash` mismatch → recompute, other periods stay cached; signal check —
  raw-only vs raw-recent+summarized-old produce comparable per-section themes.

---

## Critical files

- `src/stores/userProfile.store.ts` — `buildProfile`: add `onDiagnostics` (`:409`), write
  `tokenUsage` (`:462`), extract data-gather (`:233-398`) into the assembler, replace the guard (`:216`).
- `src/services/profileLLMAssists.ts` — home for `assembleProfilePayload` + budget math beside
  `buildProfilePayload`.
- `src/services/profileScopeQueries.ts` — repoint preview to the shared assembler; chars/3;
  per-type×age breakdown (`estimateTokens:91`, `queryScopePreview:106`).
- `src/services/profileLLMAssistsHelpers.ts` — deterministic period rollups reusing snapshot /
  exec-metrics patterns + `getQuadrant` + `extract*Ratings`.
- `src/services/userDatabase.service.ts` — `version(21)` `profilePeriodSummaries` table (Pillar 3).
- Reference-only: `src/services/llmService.ts` (`LLMUsage`, `computeOllamaNumCtx`, headroom
  constants), `src/components/profile/ProfileBuildLogPanel.vue` (already renders `tokenUsage`),
  `src/composables/useWeeklyReflectionWizard.ts` (`aiSummary` is live — don't reuse).
