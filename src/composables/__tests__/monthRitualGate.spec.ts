import { describe, expect, it } from 'vitest'
import { isMonthlyReflectionUnlocked } from '@/composables/useMonthlyReflectionWizard'
import type { DayRef, MonthRef } from '@/domain/period'

// June 2026 ends 2026-06-30, so the closing-week threshold is 2026-06-24.
const MONTH = '2026-06' as MonthRef

describe('isMonthlyReflectionUnlocked (month ritual gate)', () => {
  it('locks reflection before the closing stretch', () => {
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-06-23' as DayRef)).toBe(false)
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-06-01' as DayRef)).toBe(false)
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-01-01' as DayRef)).toBe(false)
  })

  it('unlocks from the last 7 days onward', () => {
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-06-24' as DayRef)).toBe(true)
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-06-30' as DayRef)).toBe(true)
  })

  it('treats any already-ended month as unlocked', () => {
    expect(isMonthlyReflectionUnlocked(MONTH, '2026-12-31' as DayRef)).toBe(true)
  })

  it('keeps a future month locked until its own closing stretch', () => {
    const future = '2099-06' as MonthRef
    expect(isMonthlyReflectionUnlocked(future, '2026-06-15' as DayRef)).toBe(false)
    expect(isMonthlyReflectionUnlocked(future, '2099-06-24' as DayRef)).toBe(true)
  })
})
