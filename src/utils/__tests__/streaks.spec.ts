import { describe, it, expect } from 'vitest'
import { computeStreak } from '../streaks'

/**
 * Helper: build a local-noon ISO timestamp for the given date parts.
 * Using noon avoids UTC-offset shifts changing the local calendar day.
 */
function localNoon(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

describe('computeStreak', () => {
  const ref = new Date(2026, 2, 20) // 2026-03-20

  it('returns 0 for an empty array', () => {
    expect(computeStreak([], ref)).toBe(0)
  })

  it('returns 1 when only today has an entry', () => {
    expect(computeStreak([localNoon(2026, 3, 20)], ref)).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    const timestamps = [
      localNoon(2026, 3, 18),
      localNoon(2026, 3, 19),
      localNoon(2026, 3, 20),
    ]
    expect(computeStreak(timestamps, ref)).toBe(3)
  })

  it('stops at a gap', () => {
    const timestamps = [
      localNoon(2026, 3, 16),
      // gap on 2026-03-17
      localNoon(2026, 3, 18),
      localNoon(2026, 3, 19),
      localNoon(2026, 3, 20),
    ]
    expect(computeStreak(timestamps, ref)).toBe(3)
  })

  it('counts streak ending yesterday when today has no entry', () => {
    const timestamps = [
      localNoon(2026, 3, 18),
      localNoon(2026, 3, 19),
    ]
    expect(computeStreak(timestamps, ref)).toBe(2)
  })

  it('returns 0 when most recent entry is two days ago', () => {
    const timestamps = [localNoon(2026, 3, 18)]
    expect(computeStreak(timestamps, ref)).toBe(0)
  })

  it('deduplicates multiple entries on the same day', () => {
    const timestamps = [
      new Date(2026, 2, 20, 8, 0, 0).toISOString(),
      new Date(2026, 2, 20, 12, 0, 0).toISOString(),
      new Date(2026, 2, 20, 18, 0, 0).toISOString(),
      new Date(2026, 2, 19, 10, 0, 0).toISOString(),
    ]
    expect(computeStreak(timestamps, ref)).toBe(2)
  })

  it('defaults referenceDate to now when omitted', () => {
    const today = new Date()
    const ts = today.toISOString()
    expect(computeStreak([ts])).toBe(1)
  })
})
