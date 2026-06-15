import { describe, expect, it } from 'vitest'
import { isReflectionUnlocked } from '@/composables/useWeeklyReflectionWizard'
import type { DayRef, WeekRef } from '@/domain/period'
import { getChildPeriods } from '@/utils/periods'

const WEEK = '2026-W10' as WeekRef
const days = getChildPeriods(WEEK) // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]

describe('isReflectionUnlocked (week ritual gate)', () => {
  it('locks reflection before the penultimate day (Saturday)', () => {
    expect(isReflectionUnlocked(WEEK, days[4])).toBe(false) // Friday
    expect(isReflectionUnlocked(WEEK, '2026-01-01' as DayRef)).toBe(false) // well before the week
  })

  it('unlocks from the penultimate day (Saturday) onward', () => {
    expect(isReflectionUnlocked(WEEK, days[5])).toBe(true) // Saturday
    expect(isReflectionUnlocked(WEEK, days[6])).toBe(true) // Sunday
  })

  it('treats any already-ended week as unlocked', () => {
    expect(isReflectionUnlocked(WEEK, '2026-12-31' as DayRef)).toBe(true)
  })

  it('keeps a future week locked until its own penultimate day', () => {
    const future = '2099-W10' as WeekRef
    const futureDays = getChildPeriods(future)
    expect(isReflectionUnlocked(future, '2026-06-15' as DayRef)).toBe(false)
    expect(isReflectionUnlocked(future, futureDays[5])).toBe(true)
  })
})
