import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import type { IFSDailyCheckIn } from '@/domain/exercises'

function buildCheckIn(id: string, createdAt: string): IFSDailyCheckIn {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    practiceType: 'self-energy-moment',
    selfEnergyQuality: 'calm',
  }
}

describe('ifsDailyCheckIn.store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 12, 9, 0))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps check-ins from the rolling last-7-days window (today included, local days)', () => {
    const store = useIFSDailyCheckInStore()

    // Today is Thu 2026-03-12 → window Fri 03-06 … Thu 03-12.
    store.checkIns = [
      buildCheckIn('too-old', new Date(2026, 2, 5, 23, 30).toISOString()),
      buildCheckIn('window-start', new Date(2026, 2, 6, 0, 10).toISOString()),
      buildCheckIn('prev-week', new Date(2026, 2, 8, 23, 30).toISOString()),
      buildCheckIn('monday', new Date(2026, 2, 9, 8, 0).toISOString()),
      buildCheckIn('thursday', new Date(2026, 2, 12, 21, 15).toISOString()),
      buildCheckIn('future', new Date(2026, 2, 15, 10, 0).toISOString()),
    ]

    expect(store.currentWeekCheckIns.map((checkIn) => checkIn.id)).toEqual([
      'window-start',
      'prev-week',
      'monday',
      'thursday',
    ])
    expect(store.weeklyCheckInCount).toBe(4)
    expect(store.hasEnoughForWeeklySummary).toBe(false)
    expect(store.checkInsNeededForWeeklySummary).toBe(1)
  })
})
