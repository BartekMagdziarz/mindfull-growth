import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import WeeklyReflectionView from '@/views/WeeklyReflectionView.vue'
import MonthlyReflectionView from '@/views/MonthlyReflectionView.vue'
import YearlyReflectionView from '@/views/YearlyReflectionView.vue'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRoute = {
  params: {} as Record<string, string>,
  path: '',
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useRoute: () => mockRoute,
}))

describe('Planning reflection integrations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRoute.params = {}
    mockRoute.path = ''

    vi.spyOn(useWeeklyPlanStore(), 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(useWeeklyReflectionStore(), 'loadReflectionByPlanId').mockResolvedValue(undefined)
    vi.spyOn(useCommitmentStore(), 'loadCommitments').mockResolvedValue()
    vi.spyOn(useProjectStore(), 'loadProjects').mockResolvedValue()
    vi.spyOn(useLifeAreaStore(), 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(usePriorityStore(), 'loadPriorities').mockResolvedValue()
    vi.spyOn(useJournalStore(), 'loadEntries').mockResolvedValue()
    vi.spyOn(useEmotionLogStore(), 'loadLogs').mockResolvedValue()
    vi.spyOn(useEmotionStore(), 'loadEmotions').mockResolvedValue()
    vi.spyOn(useIFSDailyCheckInStore(), 'loadCheckIns').mockResolvedValue()
    vi.spyOn(useIFSSelfEnergyStore(), 'loadCheckIns').mockResolvedValue()
    vi.spyOn(useIFSPartStore(), 'loadParts').mockResolvedValue()

    vi.spyOn(useMonthlyPlanStore(), 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(useMonthlyReflectionStore(), 'loadMonthlyReflections').mockResolvedValue()

    vi.spyOn(useYearlyPlanStore(), 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(useYearlyReflectionStore(), 'loadYearlyReflections').mockResolvedValue()
  })

  it('renders the weekly reflection view', () => {
    mockRoute.params = { planId: 'plan-1' }
    useWeeklyPlanStore().weeklyPlans = [
      {
        id: 'plan-1',
        createdAt: '2026-02-02T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
      } as any,
    ]
    render(WeeklyReflectionView)
    expect(screen.getByText('Weekly Reflection')).toBeInTheDocument()
  })

  it('renders the monthly reflection view', () => {
    render(MonthlyReflectionView)
    expect(
      screen.getByRole('heading', { name: 'Monthly Reflection', level: 1 })
    ).toBeInTheDocument()
  })

  it('renders the yearly reflection view', () => {
    render(YearlyReflectionView)
    expect(screen.getByText('Yearly Reflection')).toBeInTheDocument()
  })
})
