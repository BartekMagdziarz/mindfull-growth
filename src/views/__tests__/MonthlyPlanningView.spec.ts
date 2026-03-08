import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import MonthlyPlanningView from '@/views/MonthlyPlanningView.vue'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import { saveDraftToDB } from '@/services/draftStorage'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRoute = {
  params: { planId: 'month-plan-1' } as Record<string, string>,
  path: '/planning/month/month-plan-1',
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => mockRoute,
}))

describe('MonthlyPlanningView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    mockRoute.params.planId = 'month-plan-1'
    mockRoute.path = '/planning/month/month-plan-1'

    const monthlyPlanStore = useMonthlyPlanStore()
    const monthlyReflectionStore = useMonthlyReflectionStore()
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const commitmentStore = useCommitmentStore()
    const projectStore = useProjectStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()
    const trackerStore = useTrackerStore()
    const habitStore = useHabitStore()
    const journalStore = useJournalStore()
    const emotionLogStore = useEmotionLogStore()

    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'updateMonthlyPlan').mockImplementation(async (id, data) => {
      const existing = monthlyPlanStore.monthlyPlans.find((plan) => plan.id === id)
      const updated = {
        ...(existing ?? {
          id,
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          year: 2026,
          projectIds: [],
          secondaryFocusLifeAreaIds: [],
        }),
        ...data,
        updatedAt: '2026-02-01T00:00:00.000Z',
      }
      const index = monthlyPlanStore.monthlyPlans.findIndex((plan) => plan.id === id)
      if (index !== -1) {
        monthlyPlanStore.monthlyPlans[index] = updated as any
      } else {
        monthlyPlanStore.monthlyPlans.push(updated as any)
      }
      return updated as any
    })

    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
    vi.spyOn(habitStore, 'loadHabits').mockResolvedValue()
    vi.spyOn(journalStore, 'loadEntries').mockResolvedValue()
    vi.spyOn(emotionLogStore, 'loadLogs').mockResolvedValue()
    vi.spyOn(trackerPeriodDexieRepository, 'getByDateRange').mockResolvedValue([])
  })

  it('persists repaired monthly tracker selection when stale ids are detected in edit mode', async () => {
    const monthlyPlanStore = useMonthlyPlanStore()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-plan-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        projectIds: ['project-1'],
        secondaryFocusLifeAreaIds: [],
        selectedTrackerIds: ['missing-tracker-id'],
      },
    ]

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: ['month-plan-1'],
        name: 'Project One',
        objective: 'Objective',
        status: 'active',
        focusMonthIds: ['month-plan-1'],
        focusWeekIds: [],
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
        name: 'Monthly Tracker',
        type: 'count',
        cadence: 'monthly',
        targetCount: 12,
        sortOrder: 0,
        isActive: true,
      },
    ]

    render(MonthlyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftProjectForm: { template: '<div />' },
          DraftProjectCard: { template: '<div />' },
          MonthlyReviewSummary: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(monthlyPlanStore.updateMonthlyPlan).toHaveBeenCalledWith('month-plan-1', {
        selectedTrackerIds: ['tracker-1'],
      })
    })
  })

  it('shows the Review Signals step in the monthly planning flow', () => {
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/month/new'

    const monthlyPlanStore = useMonthlyPlanStore()
    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-plan-prev',
        createdAt: '2000-01-01T00:00:00.000Z',
        updatedAt: '2000-01-01T00:00:00.000Z',
        startDate: '2000-01-01',
        endDate: '2000-01-31',
        year: 2000,
        projectIds: [],
        secondaryFocusLifeAreaIds: [],
      },
    ]

    render(MonthlyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftProjectForm: { template: '<div />' },
          DraftProjectCard: { template: '<div />' },
          MonthlyReviewSummary: { template: '<div />' },
          CommitmentLinkedObjectsCluster: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Signals')).toBeInTheDocument()
  })

  it('reuses the canonical monthly plan when saving from create mode for an existing period', async () => {
    mockRoute.params.planId = 'new'
    mockRoute.path = '/planning/month/new'

    const monthlyPlanStore = useMonthlyPlanStore()
    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-plan-existing',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-03T00:00:00.000Z',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        projectIds: [],
        secondaryFocusLifeAreaIds: [],
      },
    ]

    const updateSpy = vi.spyOn(monthlyPlanStore, 'updateMonthlyPlan').mockImplementation(async (id, data) => {
      const updated = {
        ...(monthlyPlanStore.monthlyPlans.find((plan) => plan.id === id) as any),
        ...data,
      }
      return updated
    })
    const createSpy = vi.spyOn(monthlyPlanStore, 'createMonthlyPlan').mockResolvedValue({
      id: 'month-plan-created',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      year: 2026,
      projectIds: [],
      secondaryFocusLifeAreaIds: [],
    } as any)

    await saveDraftToDB(
      'monthly-planning-draft-new',
      JSON.stringify({
        activeStep: 4,
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        name: '',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: 'Protect momentum',
        focusSuccessSignal: '',
        balanceGuardrail: '',
        projects: [],
        selectedTrackerIds: [],
        hasCustomTrackerSelection: false,
      })
    )

    render(MonthlyPlanningView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          DraftProjectForm: { template: '<div />' },
          DraftProjectCard: { template: '<div />' },
          MonthlyReviewSummary: { template: '<div />' },
          CommitmentLinkedObjectsCluster: { template: '<div />' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Monthly Plan' })).toBeInTheDocument()
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Save Monthly Plan' }))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'month-plan-existing',
        expect.objectContaining({
          monthIntention: 'Protect momentum',
        })
      )
    })
    expect(createSpy).not.toHaveBeenCalled()
  })
})
