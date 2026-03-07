import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useProjectStore } from '@/stores/project.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useHabitStore } from '@/stores/habit.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import YearlyPlanningView from '@/views/YearlyPlanningView.vue'
import MonthlyPlanningView from '@/views/MonthlyPlanningView.vue'
import WeeklyPlanningView from '@/views/WeeklyPlanningView.vue'

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

describe('Planning flow integrations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRoute.params = {}
    mockRoute.path = ''
    sessionStorage.clear()

    vi.spyOn(useYearlyPlanStore(), 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(usePriorityStore(), 'loadPriorities').mockResolvedValue()
    vi.spyOn(useValuesDiscoveryStore(), 'loadDiscoveries').mockResolvedValue()
    vi.spyOn(useWheelOfLifeStore(), 'loadSnapshots').mockResolvedValue()
    vi.spyOn(useLifeAreaStore(), 'loadLifeAreas').mockResolvedValue()

    vi.spyOn(useMonthlyPlanStore(), 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(useProjectStore(), 'loadProjects').mockResolvedValue()

    vi.spyOn(useWeeklyPlanStore(), 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(useWeeklyReflectionStore(), 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(useCommitmentStore(), 'loadCommitments').mockResolvedValue()
    vi.spyOn(useHabitStore(), 'loadHabits').mockResolvedValue()
    vi.spyOn(useTrackerStore(), 'loadTrackers').mockResolvedValue()
    vi.spyOn(useIFSPartStore(), 'loadParts').mockResolvedValue()
    vi.spyOn(useIFSDailyCheckInStore(), 'loadCheckIns').mockResolvedValue()
  })

  it('renders the yearly planning view', () => {
    render(YearlyPlanningView)
    expect(screen.getByText('Yearly Planning')).toBeInTheDocument()
  })

  it('renders the monthly planning view', () => {
    render(MonthlyPlanningView)
    expect(screen.getByText('Monthly Planning')).toBeInTheDocument()
  })

  it('renders the weekly planning view', () => {
    render(WeeklyPlanningView)
    expect(screen.getByText('Weekly Planning')).toBeInTheDocument()
  })
})
