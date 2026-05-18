import type { Goal } from '@/domain/planning'

export type SmartLetter = 'S' | 'M' | 'A' | 'R' | 'T'

export interface SmartCompleteness {
  S: boolean
  M: boolean
  A: boolean
  R: boolean
  T: boolean
  score: number
  missing: SmartLetter[]
}

interface GoalLike {
  title?: string
  description?: string
  successDefinition?: string
  whyMatters?: string
  confidenceRating?: number
  obstacles?: string
  resources?: string
  priorityIds?: string[]
  lifeAreaIds?: string[]
  targetDate?: string
}

function hasText(value?: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function computeSmartCompleteness(
  goal: GoalLike | Goal,
  keyResultCount: number,
): SmartCompleteness {
  const specific = hasText(goal.title) && (hasText(goal.successDefinition) || hasText(goal.description))
  const measurable = keyResultCount >= 1
  const achievable =
    typeof goal.confidenceRating === 'number' && (hasText(goal.obstacles) || hasText(goal.resources))
  const relevant =
    (goal.priorityIds?.length ?? 0) > 0 ||
    (goal.lifeAreaIds?.length ?? 0) > 0 ||
    hasText(goal.whyMatters)
  const timeBound = hasText(goal.targetDate)

  const letters: Array<{ key: SmartLetter; ok: boolean }> = [
    { key: 'S', ok: specific },
    { key: 'M', ok: measurable },
    { key: 'A', ok: achievable },
    { key: 'R', ok: relevant },
    { key: 'T', ok: timeBound },
  ]

  return {
    S: specific,
    M: measurable,
    A: achievable,
    R: relevant,
    T: timeBound,
    score: letters.filter((l) => l.ok).length,
    missing: letters.filter((l) => !l.ok).map((l) => l.key),
  }
}
