import { describe, it, expect } from 'vitest'
import { computeStreak, computeWeeklyStreak } from '../streaks'

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

describe('computeWeeklyStreak', () => {
  // 2026-03-20 is a Friday. Its Mon-Sun week is 2026-03-16 … 2026-03-22.
  const ref = new Date(2026, 2, 20)

  it('returns 0 for an empty array', () => {
    expect(computeWeeklyStreak([], ref)).toBe(0)
  })

  it('returns 1 when only the current week has an entry', () => {
    expect(computeWeeklyStreak([localNoon(2026, 3, 20)], ref)).toBe(1)
  })

  it('counts consecutive weeks ending in the current week', () => {
    const timestamps = [
      localNoon(2026, 3, 4),  // week of 2026-03-02
      localNoon(2026, 3, 11), // week of 2026-03-09
      localNoon(2026, 3, 17), // week of 2026-03-16
    ]
    expect(computeWeeklyStreak(timestamps, ref)).toBe(3)
  })

  it('stops at a missed week', () => {
    const timestamps = [
      localNoon(2026, 2, 23), // week of 2026-02-23
      // gap: no entry in week of 2026-03-02
      localNoon(2026, 3, 10), // week of 2026-03-09
      localNoon(2026, 3, 17), // week of 2026-03-16
    ]
    expect(computeWeeklyStreak(timestamps, ref)).toBe(2)
  })

  it('counts streak ending last week when current week is empty', () => {
    const timestamps = [
      localNoon(2026, 3, 9),  // week of 2026-03-09
      localNoon(2026, 3, 11), // week of 2026-03-09 (same)
    ]
    expect(computeWeeklyStreak(timestamps, ref)).toBe(1)
  })

  it('returns 0 when most recent entry is two weeks old', () => {
    const timestamps = [localNoon(2026, 3, 4)] // week of 2026-03-02
    expect(computeWeeklyStreak(timestamps, ref)).toBe(0)
  })

  it('handles week starts on Sunday correctly (Sunday belongs to previous Mon-Sun week)', () => {
    // 2026-03-22 is the Sunday of the 2026-03-16 week
    expect(computeWeeklyStreak([localNoon(2026, 3, 22)], ref)).toBe(1)
  })
})
