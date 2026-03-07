import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import YearlyPlanningView from '../YearlyPlanningView.vue'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { saveDraftToDB } from '@/services/draftStorage'

const mockPush = vi.fn()
const mockRoute = {
  params: { year: '2026' } as Record<string, string>,
  path: '/planning/year/2026',
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => mockRoute,
}))

describe('YearlyPlanningView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()

    const yearlyPlanStore = useYearlyPlanStore()
    const priorityStore = usePriorityStore()
    const valuesDiscoveryStore = useValuesDiscoveryStore()
    const wheelOfLifeStore = useWheelOfLifeStore()
    const lifeAreaStore = useLifeAreaStore()

    vi.spyOn(yearlyPlanStore, 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(valuesDiscoveryStore, 'loadDiscoveries').mockResolvedValue()
    vi.spyOn(wheelOfLifeStore, 'loadSnapshots').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
  })

  it('renders the yearly planning header and loads data', async () => {
    const yearlyPlanStore = useYearlyPlanStore()

    render(YearlyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          WheelOfLifeExercise: { template: '<div />' },
          RatingSlider: { template: '<div />' },
          DraftPriorityForm: { template: '<div />' },
          DraftPriorityItem: { template: '<div />' },
          YearlyReviewSummary: { template: '<div />' },
          DreamingExercise: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Yearly Planning')).toBeInTheDocument()

    await waitFor(() => {
      expect(yearlyPlanStore.loadYearlyPlans).toHaveBeenCalled()
    })
  })

  it('renders life area narratives and saves them', async () => {
    const yearlyPlanStore = useYearlyPlanStore()
    const lifeAreaStore = useLifeAreaStore()

    lifeAreaStore.lifeAreas = [
      {
        id: 'la-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        name: 'Health',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      },
    ]

    yearlyPlanStore.yearlyPlans = []
    vi.spyOn(yearlyPlanStore, 'createYearlyPlan').mockResolvedValue({
      id: 'plan-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      year: 2026,
      focusLifeAreaIds: ['la-1'],
      primaryFocusLifeAreaId: 'la-1',
      lifeAreaNarratives: { 'la-1': 'Baseline narrative.' },
    })

    await saveDraftToDB(
      'yearly-planning-draft-2026',
      JSON.stringify({
        activeStep: 7,
        focusLifeAreaIds: ['la-1'],
        primaryFocusLifeAreaId: 'la-1',
        lifeAreaNarratives: { 'la-1': '' },
      })
    )

    render(YearlyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          WheelOfLifeExercise: { template: '<div />' },
          RatingSlider: { template: '<div />' },
          DraftPriorityForm: { template: '<div />' },
          DraftPriorityItem: { template: '<div />' },
          YearlyReviewSummary: { template: '<div />' },
          DreamingExercise: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Life Area Baseline Narratives')).toBeInTheDocument()
    })
    const textarea = screen.getByPlaceholderText('Where are you now in this area? What\'s working? What needs attention?')
    await fireEvent.update(textarea, 'Feeling stretched and rebuilding energy.')

    await fireEvent.click(screen.getByRole('button', { name: 'Priorities' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save Yearly Plan' }))

    await waitFor(() => {
      expect(yearlyPlanStore.createYearlyPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          lifeAreaNarratives: { 'la-1': 'Feeling stretched and rebuilding energy.' },
        })
      )
    })
  })
})
