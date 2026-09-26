/**
 * Step flow for data-driven micro exercises: which steps are visible for
 * the current `choice` answers. Pure, so the runner and tests share it.
 *
 * Design: docs/exercise-scheduling-design.md §4.3.
 */

import type { MicroExerciseStep } from '@/domain/microExercises'

/** Current answers of `choice` steps, keyed by step key. */
export type MicroChoiceAnswers = Record<string, string | string[] | undefined>

export function isMicroStepVisible(step: MicroExerciseStep, answers: MicroChoiceAnswers): boolean {
  const condition = step.showWhen
  if (!condition) return true
  const answer = answers[condition.step]
  if (answer === undefined) return false
  const picked = Array.isArray(answer) ? answer : [answer]
  return picked.some((option) => condition.in.includes(option))
}

export function visibleMicroSteps(
  steps: readonly MicroExerciseStep[],
  answers: MicroChoiceAnswers,
): MicroExerciseStep[] {
  return steps.filter((step) => isMicroStepVisible(step, answers))
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
): boolean {
  const index = steps.findIndex((step) => step.key === currentKey)
  return steps.slice(index + 1).some((step) => {
    if (isMicroStepVisible(step, answers)) return true
    const source = step.showWhen?.step
    return source !== undefined && answers[source] === undefined
  })
}
