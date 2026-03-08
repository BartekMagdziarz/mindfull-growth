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
const mockReplace = vi.fn()
const mockRoute = {
  params: { planId: 'new' } as Record<string, string>,
  path: '/planning/year/new',
  query: {} as Record<string, string>,
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => mockRoute,
}))

describe('YearlyPlanningView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/year/new'
    mockRoute.query = {}

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
      lifeAreaNarratives: { 'la-1': 'Baseline narrative.' },
    })

    await saveDraftToDB(
      'yearly-planning-draft-2026',
      JSON.stringify({
        activeStep: 6,
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

  it('redirects legacy year routes to the canonical yearly plan id', async () => {
    mockRoute.params.planId = '2026'
    mockRoute.path = '/planning/year/2026'

    const yearlyPlanStore = useYearlyPlanStore()
    yearlyPlanStore.yearlyPlans = [
      {
        id: 'plan-newest',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
      } as any,
      {
        id: 'plan-older',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
      } as any,
    ]

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
      expect(mockReplace).toHaveBeenCalledWith('/planning/year/plan-newest')
    })
  })

  it('updates the routed yearly plan instead of creating a duplicate for the same year', async () => {
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/year/new'
    mockRoute.query = { year: '2026' }

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

    yearlyPlanStore.yearlyPlans = [
      {
        id: 'plan-existing',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: ['la-1'],
        primaryFocusLifeAreaId: 'la-1',
      } as any,
    ]

    vi.spyOn(yearlyPlanStore, 'updateYearlyPlan').mockResolvedValue({
      ...(yearlyPlanStore.yearlyPlans[0] as any),
      yearTheme: 'Clarity',
    })
    vi.spyOn(yearlyPlanStore, 'createYearlyPlan').mockResolvedValue({
      id: 'plan-created',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      year: 2026,
      focusLifeAreaIds: ['la-1'],
      primaryFocusLifeAreaId: 'la-1',
    } as any)

    await saveDraftToDB(
      'yearly-planning-draft-2026',
      JSON.stringify({
        activeStep: 8,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        name: '',
        yearTheme: 'Clarity',
        priorities: [],
        valuesAlignment: {},
        valuesReflectionNote: '',
        valuesDiscoveryId: '',
        yourStory: '',
        fantasticDay: '',
        wheelOfLifeSnapshotId: '',
        dreaming: {
          outcomes: [],
          difference: '',
          worthDoing: '',
          vipsNotice: '',
          vipAfterYear: '',
          vipsSeeInYou: '',
          vipsNoticeProgress: '',
          knowAboutYourself: '',
          oneClue: '',
          progressClues: [],
        },
        lifeAreaNarratives: {},
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
      expect(screen.getByRole('button', { name: 'Save Yearly Plan' })).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Save Yearly Plan' }))

    await waitFor(() => {
      expect(yearlyPlanStore.updateYearlyPlan).toHaveBeenCalledWith(
        'plan-existing',
        expect.objectContaining({
          yearTheme: 'Clarity',
          year: 2026,
        })
      )
    })
    expect(yearlyPlanStore.createYearlyPlan).not.toHaveBeenCalled()
  })
})
