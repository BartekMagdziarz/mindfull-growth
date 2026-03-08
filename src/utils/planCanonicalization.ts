export interface CanonicalPlanLike {
  createdAt: string
  updatedAt: string
}

export function sortByPlanRecency<T extends CanonicalPlanLike>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const updatedDiff = b.updatedAt.localeCompare(a.updatedAt)
    if (updatedDiff !== 0) return updatedDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function getCanonicalPlansByPeriod<T extends CanonicalPlanLike>(
  plans: T[],
  getPeriodKey: (plan: T) => string
): T[] {
  const canonicalByKey = new Map<string, T>()

  for (const plan of sortByPlanRecency(plans)) {
    const key = getPeriodKey(plan)
    if (!canonicalByKey.has(key)) {
      canonicalByKey.set(key, plan)
    }
  }

  return Array.from(canonicalByKey.values())
}

export function getCanonicalPlanForPeriod<T extends CanonicalPlanLike>(
  plans: T[],
  getPeriodKey: (plan: T) => string,
  targetKey: string
): T | undefined {
  return getCanonicalPlansByPeriod(plans, getPeriodKey).find(
    (plan) => getPeriodKey(plan) === targetKey
  )
}

export function isLegacyYearToken(value?: string): value is string {
  return Boolean(value && /^\d{4}$/.test(value))
}
