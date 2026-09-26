/**
 * Step flow for data-driven micro exercises: which steps are visible for
 * the current `choice` answers, which entries a step may quote or pick.
 * Pure, so the runner and tests share it.
 *
 * Design: docs/exercise-scheduling-design.md §4.3.
 */

import type {
  MicroExerciseEntry,
  MicroExerciseStep,
  MicroHintSource,
  MicroPreset,
  MicroStepCondition,
  MicroStepConditions,
  MicroStepValue,
} from '@/domain/microExercises'

/** Current answers of `choice` steps, keyed by step key. */
export type MicroChoiceAnswers = Record<string, string | string[] | undefined>

export function conditionList(conditions: MicroStepConditions | undefined): MicroStepCondition[] {
  if (!conditions) return []
  return Array.isArray(conditions) ? conditions : [conditions]
}

function conditionHolds(condition: MicroStepCondition, answer: string | string[] | undefined): boolean {
  if (answer === undefined) return false
  const picked = Array.isArray(answer) ? answer : [answer]
  return picked.some((option) => condition.in.includes(option))
}

/** Every condition must hold (AND); no conditions = always visible. */
export function isMicroStepVisible(step: MicroExerciseStep, answers: MicroChoiceAnswers): boolean {
  return conditionList(step.showWhen).every((condition) => conditionHolds(condition, answers[condition.step]))
}

/**
 * Steps taking part in a run: preset steps are answered up front and
 * never shown, the rest follow their `showWhen`.
 */
export function visibleMicroSteps(
  steps: readonly MicroExerciseStep[],
  answers: MicroChoiceAnswers,
  preset: MicroPreset = {},
): MicroExerciseStep[] {
  return steps.filter((step) => !(step.key in preset) && isMicroStepVisible(step, answers))
}

/**
 * Whether anything can still follow `currentKey`: a later step that is
 * visible now, or one gated on a choice that is not answered yet. Used so
 * an unanswered branching question shows "Next", not "Save".
 */
export function hasStepsAfter(
  steps: readonly MicroExerciseStep[],
  currentKey: string,
  answers: MicroChoiceAnswers,
  preset: MicroPreset = {},
): boolean {
  const index = steps.findIndex((step) => step.key === currentKey)
  return steps.slice(index + 1).some((step) => {
    if (step.key in preset) return false
    if (isMicroStepVisible(step, answers)) return true
    const conditions = conditionList(step.showWhen)
    // Unanswered source with every answered condition still holding →
    // the step may yet appear.
    return (
      conditions.some((condition) => answers[condition.step] === undefined) &&
      conditions.every(
        (condition) => answers[condition.step] === undefined || conditionHolds(condition, answers[condition.step]),
      )
    )
  })
}

/** Choice answers stored in a saved entry (strings / string arrays only). */
export function entryChoiceAnswers(entry: MicroExerciseEntry): MicroChoiceAnswers {
  const answers: MicroChoiceAnswers = {}
  for (const [key, value] of Object.entries(entry.responses)) {
    if (typeof value === 'string') answers[key] = value
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      answers[key] = value as string[]
    }
  }
  return answers
}

/** Whether a saved entry satisfies `conditions` (AND) by its own answers. */
export function entryMatches(entry: MicroExerciseEntry, conditions: MicroStepConditions | undefined): boolean {
  const answers = entryChoiceAnswers(entry)
  return conditionList(conditions).every((condition) => conditionHolds(condition, answers[condition.step]))
}

/** Newest first. */
function byNewest(a: MicroExerciseEntry, b: MicroExerciseEntry): number {
  return b.createdAt.localeCompare(a.createdAt)
}

/**
 * Entries an `entryPick` step offers: the definition's slug, the
 * step's filter, newest first, within `days` and up to `limit`.
 */
export function pickableEntries(
  step: Extract<MicroExerciseStep, { type: 'entryPick' }>,
  entries: readonly MicroExerciseEntry[],
  now: Date = new Date(),
): MicroExerciseEntry[] {
  const days = step.days ?? 21
  const limit = step.limit ?? 10
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return entries
    .filter((entry) => entry.exerciseSlug === step.slug && entry.createdAt >= cutoff && entryMatches(entry, step.filter))
    .sort(byNewest)
    .slice(0, limit)
}

/**
 * The raw value a `hintFrom` points at, or undefined when there is
 * nothing to quote (no entry, no picked entry, empty response).
 */
export function resolveMicroHint(
  hint: MicroHintSource,
  entries: readonly MicroExerciseEntry[],
  currentResponses: Record<string, MicroStepValue | undefined>,
): MicroStepValue | undefined {
  if (hint.source === 'picked') {
    const pickedId = currentResponses[hint.pickStep]
    if (typeof pickedId !== 'string' || !pickedId) return undefined
    const picked = entries.find((entry) => entry.id === pickedId)
    return picked?.responses[hint.step] ?? undefined
  }
  const latest = entries
    .filter((entry) => entry.exerciseSlug === hint.slug && entryMatches(entry, hint.filter))
    .sort(byNewest)[0]
  return latest?.responses[hint.step] ?? undefined
}
