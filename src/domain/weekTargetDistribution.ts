/**
 * Split a period target evenly across `weekCount` weeks.
 *
 * Integer mode (count targets): largest-remainder distribution with the
 * extras going to the earlier weeks — 12/4 → [3,3,3,3], 10/4 → [3,3,2,2],
 * 7/3 → [3,2,2].
 *
 * Non-integer mode (value targets with sum aggregation): equal shares rounded
 * to 2 decimals, with the first week absorbing the rounding remainder so the
 * parts always add up to `total` exactly.
 */
export function distributeTargetEvenly(
  total: number,
  weekCount: number,
  integer: boolean
): number[] {
  if (!Number.isFinite(total) || total < 0 || !Number.isInteger(weekCount) || weekCount <= 0) {
    return []
  }

  if (integer) {
    const wholeTotal = Math.round(total)
    const base = Math.floor(wholeTotal / weekCount)
    const extras = wholeTotal - base * weekCount
    return Array.from({ length: weekCount }, (_, index) => (index < extras ? base + 1 : base))
  }

  const share = Math.round((total / weekCount) * 100) / 100
  const parts = Array.from({ length: weekCount }, () => share)
  const remainder = Math.round((total - share * weekCount) * 100) / 100
  parts[0] = Math.round((parts[0] + remainder) * 100) / 100
  return parts
}
