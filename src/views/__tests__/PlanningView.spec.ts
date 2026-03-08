import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import PlanningView from '../PlanningView.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import { useProjectStore } from '@/stores/project.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useHabitStore } from '@/stores/habit.store'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('PlanningView', () => {
  let weeklyPlanStore: ReturnType<typeof useWeeklyPlanStore>
  let weeklyReflectionStore: ReturnType<typeof useWeeklyReflectionStore>
  let monthlyPlanStore: ReturnType<typeof useMonthlyPlanStore>
  let monthlyReflectionStore: ReturnType<typeof useMonthlyReflectionStore>
  let yearlyPlanStore: ReturnType<typeof useYearlyPlanStore>
  let yearlyReflectionStore: ReturnType<typeof useYearlyReflectionStore>
  let projectStore: ReturnType<typeof useProjectStore>
  let commitmentStore: ReturnType<typeof useCommitmentStore>
  let trackerStore: ReturnType<typeof useTrackerStore>
  let lifeAreaStore: ReturnType<typeof useLifeAreaStore>
  let priorityStore: ReturnType<typeof usePriorityStore>
  let habitStore: ReturnType<typeof useHabitStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    weeklyPlanStore = useWeeklyPlanStore()
    weeklyReflectionStore = useWeeklyReflectionStore()
    monthlyPlanStore = useMonthlyPlanStore()
    monthlyReflectionStore = useMonthlyReflectionStore()
    yearlyPlanStore = useYearlyPlanStore()
    yearlyReflectionStore = useYearlyReflectionStore()
    projectStore = useProjectStore()
    commitmentStore = useCommitmentStore()
    trackerStore = useTrackerStore()
    lifeAreaStore = useLifeAreaStore()
    priorityStore = usePriorityStore()
    habitStore = useHabitStore()

    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(yearlyPlanStore, 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(yearlyReflectionStore, 'loadYearlyReflections').mockResolvedValue()
    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(habitStore, 'loadHabits').mockResolvedValue()

    weeklyPlanStore.weeklyPlans = []
    weeklyReflectionStore.weeklyReflections = []
    monthlyPlanStore.monthlyPlans = []
    monthlyReflectionStore.monthlyReflections = []
    yearlyPlanStore.yearlyPlans = []
    yearlyReflectionStore.yearlyReflections = []
    projectStore.projects = []
    commitmentStore.commitments = []
    trackerStore.trackers = []
    lifeAreaStore.lifeAreas = []
    priorityStore.priorities = []
    habitStore.habits = []

    vi.clearAllMocks()
  })

  it('renders page title and intro copy', () => {
    render(PlanningView)
    expect(screen.getByText('Planning Hub')).toBeInTheDocument()
    expect(
      screen.getByText('Align your actions with what matters most')
    ).toBeInTheDocument()
  })

  it('renders three section tabs (Week, Month, Year)', () => {
    render(PlanningView)
    expect(screen.getByRole('tab', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Year' })).toBeInTheDocument()
  })

  it('uses neumorphic segmented classes and keeps active tab state', async () => {
    render(PlanningView)

    const weekTab = screen.getByRole('tab', { name: 'Week' })
    const monthTab = screen.getByRole('tab', { name: 'Month' })

    expect(weekTab).toHaveClass('neo-segmented__item')
    expect(monthTab).toHaveClass('neo-segmented__item')
    expect(weekTab).toHaveClass('neo-segmented__item--active')
    expect(monthTab).not.toHaveClass('neo-segmented__item--active')

    await fireEvent.click(monthTab)

    expect(monthTab).toHaveClass('neo-segmented__item--active')
    expect(weekTab).not.toHaveClass('neo-segmented__item--active')
  })

  it('defaults to Week calendar section', async () => {
    render(PlanningView)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Week' })).toBeInTheDocument()
    })
  })

  it('switches to Month calendar when Month tab clicked', async () => {
    render(PlanningView)
    await fireEvent.click(screen.getByRole('tab', { name: 'Month' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Month' })).toBeInTheDocument()
    })
  })

  it('switches to Year calendar when Year tab clicked', async () => {
    render(PlanningView)
    await fireEvent.click(screen.getByRole('tab', { name: 'Year' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Year' })).toBeInTheDocument()
    })
  })

  it('shows projects and trackers manager card in foundations', () => {
    render(PlanningView)
    expect(screen.getByText('Projects & Trackers')).toBeInTheDocument()
  })

  it('exposes delete period actions on each planning horizon when a period exists', async () => {
    weeklyPlanStore.weeklyPlans = [
      {
        id: 'week-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        startDate: '2026-03-02',
        endDate: '2026-03-08',
        selectedTrackerIds: [],
      } as any,
    ]
    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
        selectedTrackerIds: [],
      } as any,
    ]
    yearlyPlanStore.yearlyPlans = [
      {
        id: 'year-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
      } as any,
    ]

    render(PlanningView)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete selected week period' })).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByRole('tab', { name: 'Month' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete selected month period' })).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByRole('tab', { name: 'Year' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete selected year period' })).toBeInTheDocument()
    })
  })
})
