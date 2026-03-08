import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/vue'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import WeeklyPlanningView from '../WeeklyPlanningView.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useHabitStore } from '@/stores/habit.store'
import { useHabitOccurrenceStore } from '@/stores/habitOccurrence.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { saveDraftToDB } from '@/services/draftStorage'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRoute = reactive({
  params: { planId: 'new' } as Record<string, string>,
  path: '/planning/week/new',
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => mockRoute,
}))

describe('WeeklyPlanningView', () => {
  function getCurrentWeekRange(): { startDate: string; endDate: string } {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now)
    start.setDate(now.getDate() + diff)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const format = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const dayOfMonth = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${dayOfMonth}`
    }

    return {
      startDate: format(start),
      endDate: format(end),
    }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/week/new'

    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const commitmentStore = useCommitmentStore()
    const projectStore = useProjectStore()
    const monthlyPlanStore = useMonthlyPlanStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()
    const habitStore = useHabitStore()
    const habitOccurrenceStore = useHabitOccurrenceStore()

    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(weeklyPlanStore, 'updateWeeklyPlan').mockImplementation(async (id, data) => {
      const existing = weeklyPlanStore.weeklyPlans.find((plan) => plan.id === id)
      const updated = {
        ...(existing ?? {
          id,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-05',
          endDate: '2026-01-11',
        }),
        ...data,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      const index = weeklyPlanStore.weeklyPlans.findIndex((plan) => plan.id === id)
      if (index !== -1) {
        weeklyPlanStore.weeklyPlans[index] = updated as any
      } else {
        weeklyPlanStore.weeklyPlans.push(updated as any)
      }
      return updated as any
    })
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(habitStore, 'loadHabits').mockResolvedValue()
    vi.spyOn(habitOccurrenceStore, 'loadOccurrences').mockResolvedValue()

    const trackerStore = useTrackerStore()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
  })

  it('renders the weekly planning header and loads data', async () => {
    const weeklyPlanStore = useWeeklyPlanStore()

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Weekly Planning')).toBeInTheDocument()

    await waitFor(() => {
      expect(weeklyPlanStore.loadWeeklyPlans).toHaveBeenCalled()
    })
  })

  it('renders battery trends and constraints note instead of capacity UI', async () => {
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const { startDate } = getCurrentWeekRange()

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const dayOfMonth = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${dayOfMonth}`
    }

    const currentStart = new Date(`${startDate}T00:00:00`)
    const previousStart = new Date(currentStart)
    previousStart.setDate(previousStart.getDate() - 7)
    const previousEnd = new Date(previousStart)
    previousEnd.setDate(previousEnd.getDate() + 6)

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-prev',
        createdAt: `${formatDate(previousStart)}T00:00:00.000Z`,
        updatedAt: `${formatDate(previousStart)}T00:00:00.000Z`,
        startDate: formatDate(previousStart),
        endDate: formatDate(previousEnd),
      } as any,
    ]

    weeklyReflectionStore.weeklyReflections = [
      {
        id: 'reflection-prev',
        createdAt: `${formatDate(previousEnd)}T00:00:00.000Z`,
        updatedAt: `${formatDate(previousEnd)}T00:00:00.000Z`,
        weeklyPlanId: 'plan-prev',
        batterySnapshot: {
          body: { demand: 3, state: 4 },
          mind: { demand: 2, state: 3 },
          emotion: { demand: 4, state: 2 },
          social: { demand: 1, state: 5 },
        },
      } as any,
    ]

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Battery trends')).toBeInTheDocument()
    })

    expect(screen.getByText('Constraints note')).toBeInTheDocument()
    expect(screen.queryByText("How's Your Capacity This Week?")).not.toBeInTheDocument()
    expect(screen.queryByText('1-3 commitments')).not.toBeInTheDocument()
  })

  it('resolves date-based weekly routes to the matching plan id', async () => {
    mockRoute.params.planId = '2026-02-02'
    mockRoute.path = '/planning/week/2026-02-02'

    const weeklyPlanStore = useWeeklyPlanStore()
    const commitmentStore = useCommitmentStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-date-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedTrackerIds: ['tracker-1'],
      },
    ]

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect(commitmentStore.loadCommitments).toHaveBeenCalledWith({ weeklyPlanId: 'plan-date-1' })
    })
  })

  it('reseeds edit mode when stored draft window does not match the routed plan', async () => {
    mockRoute.params.planId = 'plan-stale'
    mockRoute.path = '/planning/week/plan-stale'

    const weeklyPlanStore = useWeeklyPlanStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-stale',
        createdAt: '2026-01-24T00:00:00.000Z',
        updatedAt: '2026-01-24T00:00:00.000Z',
        startDate: '2026-01-26',
        endDate: '2026-02-01',
        selectedTrackerIds: [],
      },
    ]

    await saveDraftToDB(
      'weekly-planning-draft-plan-plan-stale',
      JSON.stringify({
        activeStep: 3,
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
        constraintsNote: '',
        focusSentence: '',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: [],
        selectedTrackerIds: [],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: false,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-01-26')
    })
  })

  it('reseeds the draft when navigating between weekly plan routes', async () => {
    mockRoute.params.planId = 'plan-a'
    mockRoute.path = '/planning/week/plan-a'

    const weeklyPlanStore = useWeeklyPlanStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-a',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedTrackerIds: ['tracker-a'],
      },
      {
        id: 'plan-b',
        createdAt: '2026-01-24T00:00:00.000Z',
        updatedAt: '2026-01-24T00:00:00.000Z',
        startDate: '2026-01-26',
        endDate: '2026-02-01',
        selectedTrackerIds: ['tracker-b'],
      },
    ]

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-02-02')
    })

    mockRoute.params.planId = 'plan-b'
    mockRoute.path = '/planning/week/plan-b'

    await waitFor(() => {
      expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-01-26')
    })
  })

  it('persists repaired tracker selection in edit mode when stale selected ids are detected', async () => {
    mockRoute.params.planId = 'plan-3'
    mockRoute.path = '/planning/week/plan-3'

    const weeklyPlanStore = useWeeklyPlanStore()
    const monthlyPlanStore = useMonthlyPlanStore()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-3',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        selectedTrackerIds: ['missing-tracker-id'],
      },
    ]

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: ['project-1'],
      },
    ]

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: ['month-1'],
        name: '5K Base Build',
        status: 'active',
        focusWeekIds: ['plan-3'],
        focusMonthIds: ['month-1'],
      },
    ]

    trackerStore.trackers = [
      {
        id: 'tracker-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Training runs',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
    ]

    await saveDraftToDB(
      'weekly-planning-draft-plan-plan-3',
      JSON.stringify({
        activeStep: 1,
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
        constraintsNote: '',
        focusSentence: '',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: ['project-1'],
        selectedTrackerIds: ['missing-tracker-id'],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: true,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect(weeklyPlanStore.updateWeeklyPlan).toHaveBeenCalledWith('plan-3', {
        selectedTrackerIds: ['tracker-1'],
      })
    })
  })

  it('reuses the canonical weekly plan when saving from create mode for an existing week', async () => {
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/week/new'

    const { startDate, endDate } = getCurrentWeekRange()
    const weeklyPlanStore = useWeeklyPlanStore()

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'plan-existing',
        createdAt: `${startDate}T00:00:00.000Z`,
        updatedAt: `${startDate}T12:00:00.000Z`,
        startDate,
        endDate,
        selectedTrackerIds: [],
      },
    ]

    const createSpy = vi.spyOn(weeklyPlanStore, 'createWeeklyPlan').mockResolvedValue({
      id: 'plan-created',
      createdAt: `${startDate}T00:00:00.000Z`,
      updatedAt: `${startDate}T00:00:00.000Z`,
      startDate,
      endDate,
    } as any)

    await saveDraftToDB(
      `weekly-planning-draft-${startDate}`,
      JSON.stringify({
        activeStep: 4,
        startDate,
        endDate,
        name: '',
        constraintsNote: '',
        focusSentence: 'Stay steady',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: [],
        selectedTrackerIds: [],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: false,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Weekly Plan' })).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Save Weekly Plan' }))

    await waitFor(() => {
      expect(weeklyPlanStore.updateWeeklyPlan).toHaveBeenCalledWith(
        'plan-existing',
        expect.objectContaining({
          focusSentence: 'Stay steady',
        })
      )
    })
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('reveals tracker selection after focusing a project in step 2', async () => {
    const { startDate, endDate } = getCurrentWeekRange()
    const monthStart = `${startDate.slice(0, 7)}-01`
    const monthDate = new Date(`${monthStart}T00:00:00`)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const monthEndDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

    const monthlyPlanStore = useMonthlyPlanStore()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: monthStart,
        endDate: monthEndDate,
        year: Number(startDate.slice(0, 4)),
        secondaryFocusLifeAreaIds: [],
        projectIds: ['project-1'],
      },
    ]

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: ['month-1'],
        name: '5K Base Build',
        status: 'active',
        focusWeekIds: [],
        focusMonthIds: ['month-1'],
      },
    ]

    trackerStore.trackers = [
      {
        id: 'tracker-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Training runs completed',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
    ]

    await saveDraftToDB(
      `weekly-planning-draft-${startDate}`,
      JSON.stringify({
        activeStep: 1,
        startDate,
        endDate,
        name: '',
        constraintsNote: '',
        focusSentence: '',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: [],
        selectedTrackerIds: [],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: false,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect(
        screen.getByText('Focus at least one project above to choose trackers for this week.')
      ).toBeInTheDocument()
    })

    await fireEvent.click(screen.getAllByRole('switch')[0])

    await waitFor(() => {
      expect(screen.getByText('Training runs completed')).toBeInTheDocument()
    })
  })

  it('shows non-terminal projects in step 2 even when no monthly plan overlaps the week', async () => {
    const { startDate, endDate } = getCurrentWeekRange()
    const projectStore = useProjectStore()

    projectStore.projects = [
      {
        id: 'project-active',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: 'Project Active',
        status: 'active',
        focusWeekIds: [],
        focusMonthIds: [],
      },
      {
        id: 'project-paused',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: 'Project Paused',
        status: 'paused',
        focusWeekIds: [],
        focusMonthIds: [],
      },
      {
        id: 'project-completed',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: 'Project Completed',
        status: 'completed',
        focusWeekIds: [],
        focusMonthIds: [],
      },
    ]

    await saveDraftToDB(
      `weekly-planning-draft-${startDate}`,
      JSON.stringify({
        activeStep: 1,
        startDate,
        endDate,
        name: '',
        constraintsNote: '',
        focusSentence: '',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: [],
        selectedTrackerIds: [],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: false,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Project Active')).toBeInTheDocument()
      expect(screen.getByText('Project Paused')).toBeInTheDocument()
    })

    expect(screen.queryByText('Project Completed')).not.toBeInTheDocument()
  })

  it('shows only weekly project trackers in weekly tracker selection', async () => {
    const { startDate, endDate } = getCurrentWeekRange()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: '5K Base Build',
        status: 'active',
        focusWeekIds: [],
        focusMonthIds: [],
      },
    ]

    trackerStore.trackers = [
      {
        id: 'tracker-weekly',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Weekly Runs',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
      {
        id: 'tracker-monthly',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Monthly Runs',
        type: 'count',
        cadence: 'monthly',
        targetCount: 12,
        sortOrder: 2,
        isActive: true,
      },
    ]

    await saveDraftToDB(
      `weekly-planning-draft-${startDate}`,
      JSON.stringify({
        activeStep: 1,
        startDate,
        endDate,
        name: '',
        constraintsNote: '',
        focusSentence: '',
        adaptiveIntention: '',
        commitments: [],
        focusedProjectIds: ['project-1'],
        selectedTrackerIds: [],
        weeklyTrackerTargets: {},
        hasCustomTrackerSelection: false,
      })
    )

    render(WeeklyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftCommitmentForm: { template: '<div />' },
          DraftCommitmentCard: { template: '<div />' },
          WeeklyReviewSummary: { template: '<div />' },

        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Weekly Runs')).toBeInTheDocument()
    })

    expect(screen.queryByText('Monthly Runs')).not.toBeInTheDocument()
  })
})
