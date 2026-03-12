import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import DailyIFSCheckInView from '../exercises/DailyIFSCheckInView.vue'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSDailyCheckIn } from '@/domain/exercises'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function buildCheckIn(id: string, createdAt: string): IFSDailyCheckIn {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    practiceType: 'self-energy-moment',
    selfEnergyQuality: 'calm',
  }
}

describe('DailyIFSCheckInView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 12, 9, 0))
    setActivePinia(createPinia())

    const checkInStore = useIFSDailyCheckInStore()
    const partStore = useIFSPartStore()

    vi.spyOn(checkInStore, 'loadCheckIns').mockResolvedValue()
    vi.spyOn(partStore, 'loadParts').mockResolvedValue()

    checkInStore.checkIns = [
      buildCheckIn('first', new Date(2026, 2, 9, 8, 0).toISOString()),
      buildCheckIn('second', new Date(2026, 2, 12, 19, 30).toISOString()),
    ]
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a full monday-through-sunday week strip from the shared calendar backbone', () => {
    const { container } = render(DailyIFSCheckInView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          DailyCheckInWizard: { template: '<div />' },
        },
      },
    })

    expect(container.querySelectorAll('.w-7.h-7.rounded-full')).toHaveLength(7)
    expect(screen.getByText('2 check-ins this week')).toBeInTheDocument()
  })
})
