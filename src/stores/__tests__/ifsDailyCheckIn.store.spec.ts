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

  it('filters current week check-ins using local calendar weeks', () => {
    const store = useIFSDailyCheckInStore()

    store.checkIns = [
      buildCheckIn('prev-week', new Date(2026, 2, 8, 23, 30).toISOString()),
      buildCheckIn('monday', new Date(2026, 2, 9, 8, 0).toISOString()),
      buildCheckIn('thursday', new Date(2026, 2, 12, 21, 15).toISOString()),
      buildCheckIn('sunday', new Date(2026, 2, 15, 10, 0).toISOString()),
    ]

    expect(store.currentWeekCheckIns.map((checkIn) => checkIn.id)).toEqual([
      'monday',
      'thursday',
      'sunday',
    ])
    expect(store.weeklyCheckInCount).toBe(3)
  })
})
