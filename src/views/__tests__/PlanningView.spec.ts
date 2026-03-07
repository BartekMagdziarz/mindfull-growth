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

  beforeEach(() => {
    setActivePinia(createPinia())
    weeklyPlanStore = useWeeklyPlanStore()
    weeklyReflectionStore = useWeeklyReflectionStore()
    monthlyPlanStore = useMonthlyPlanStore()
    monthlyReflectionStore = useMonthlyReflectionStore()
    yearlyPlanStore = useYearlyPlanStore()
    yearlyReflectionStore = useYearlyReflectionStore()

    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(yearlyPlanStore, 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(yearlyReflectionStore, 'loadYearlyReflections').mockResolvedValue()

    weeklyPlanStore.weeklyPlans = []
    weeklyReflectionStore.weeklyReflections = []
    monthlyPlanStore.monthlyPlans = []
    monthlyReflectionStore.monthlyReflections = []
    yearlyPlanStore.yearlyPlans = []
    yearlyReflectionStore.yearlyReflections = []

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
})
