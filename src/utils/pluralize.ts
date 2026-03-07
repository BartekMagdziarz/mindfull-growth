/**
 * Polish pluralization helper.
 * Polish has 3 plural forms:
 *   1 → singular (e.g., "1 wpis")
 *   2-4 (except 12-14) → paucal (e.g., "2 wpisy")
 *   0, 5-21, 25-31... → plural (e.g., "5 wpisów")
 */
export function pluralizePl(n: number, one: string, few: string, many: string): string {
  const absN = Math.abs(n)
  if (absN === 1) return one
  const lastTwo = absN % 100
  const lastOne = absN % 10
  if (lastTwo >= 12 && lastTwo <= 14) return many
  if (lastOne >= 2 && lastOne <= 4) return few
  return many
}

/**
 * English pluralization helper (simple singular/plural).
 */
export function pluralizeEn(n: number, one: string, other: string): string {
  return Math.abs(n) === 1 ? one : other
}
