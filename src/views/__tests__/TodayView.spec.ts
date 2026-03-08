import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import TodayView from '../TodayView.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('TodayView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()

    const journalStore = useJournalStore()
    const emotionLogStore = useEmotionLogStore()
    const emotionStore = useEmotionStore()
    const userPreferencesStore = useUserPreferencesStore()
    const yearlyPlanStore = useYearlyPlanStore()
    const monthlyPlanStore = useMonthlyPlanStore()
    const weeklyPlanStore = useWeeklyPlanStore()
    const commitmentStore = useCommitmentStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()
    const habitStore = useHabitStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const monthlyReflectionStore = useMonthlyReflectionStore()
    const yearlyReflectionStore = useYearlyReflectionStore()
    const ifsPartStore = useIFSPartStore()
    const ifsDailyCheckInStore = useIFSDailyCheckInStore()

    vi.spyOn(journalStore, 'loadEntries').mockResolvedValue()
    vi.spyOn(emotionLogStore, 'loadLogs').mockResolvedValue()
    vi.spyOn(emotionStore, 'loadEmotions').mockResolvedValue()
    vi.spyOn(userPreferencesStore, 'loadPreferences').mockResolvedValue()
    vi.spyOn(yearlyPlanStore, 'loadYearlyPlans').mockResolvedValue()
    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackerPeriods').mockResolvedValue()
    vi.spyOn(habitStore, 'loadHabits').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(yearlyReflectionStore, 'loadYearlyReflections').mockResolvedValue()
    vi.spyOn(ifsPartStore, 'loadParts').mockResolvedValue()
    vi.spyOn(ifsDailyCheckInStore, 'loadCheckIns').mockResolvedValue()

    journalStore.entries = []
    emotionLogStore.logs = []
    userPreferencesStore.dailyEmotionTarget = 3

    yearlyPlanStore.yearlyPlans = [
      {
        id: 'year-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        name: '2026',
        yearTheme: 'Grow a grounded family life',
        focusLifeAreaIds: ['life-area-1'],
      },
    ]

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        year: 2026,
        monthIntention: 'Make home life feel more intentional',
        secondaryFocusLifeAreaIds: [],
        projectIds: ['project-1'],
        selectedTrackerIds: ['tracker-1', 'tracker-2'],
      },
    ]

    weeklyPlanStore.weeklyPlans = [
      {
        id: 'week-1',
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
        startDate: '2026-03-02',
        endDate: '2026-03-08',
        focusSentence: 'Keep family close, calm, and planned',
        adaptiveIntention: 'If the week gets noisy, simplify and stay warm.',
        selectedTrackerIds: ['tracker-1'],
      },
    ]

    lifeAreaStore.lifeAreas = [
      {
        id: 'life-area-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        name: 'Family',
        icon: 'home',
        color: '#6d8dd8',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      },
    ]

    priorityStore.priorities = [
      {
        id: 'priority-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lifeAreaIds: ['life-area-1'],
        year: 2026,
        name: 'Create steadier family routines',
        successSignals: [],
        isActive: true,
        sortOrder: 0,
      },
    ]

    projectStore.projects = [
      {
        id: 'project-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
        monthIds: ['month-1'],
        focusWeekIds: ['week-1'],
        name: 'Build the shared family calendar',
        status: 'active',
      },
      {
        id: 'project-2',
        createdAt: '2026-02-15T00:00:00.000Z',
        updatedAt: '2026-02-15T00:00:00.000Z',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
        monthIds: ['month-1'],
        name: 'Finish the dinner checklist',
        status: 'completed',
      },
    ]

    commitmentStore.commitments = [
      {
        id: 'commitment-1',
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
        startDate: '2026-03-02',
        endDate: '2026-03-08',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        projectId: 'project-1',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
        name: 'Draft the calendar rhythm',
        status: 'planned',
      },
    ]

    trackerStore.trackers = [
      {
        id: 'tracker-1',
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
        parentType: 'project',
        parentId: 'project-1',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
        name: 'Calendar sessions',
        type: 'count',
        cadence: 'weekly',
        sortOrder: 0,
        isActive: true,
      },
      {
        id: 'tracker-2',
        createdAt: '2026-03-02T00:00:00.000Z',
        updatedAt: '2026-03-02T00:00:00.000Z',
        parentType: 'habit',
        parentId: 'habit-1',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
        name: 'Family review',
        type: 'adherence',
        cadence: 'monthly',
        targetCount: 4,
        sortOrder: 1,
        isActive: true,
      },
    ]

    habitStore.habits = [
      {
        id: 'habit-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        name: 'Family review',
        isActive: true,
        isPaused: false,
        cadence: 'monthly',
        lifeAreaIds: ['life-area-1'],
        priorityIds: ['priority-1'],
      },
    ]

    ifsPartStore.parts = [
      {
        id: 'part-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        name: 'Organizer',
        role: 'manager',
        bodyLocations: [],
        emotionIds: [],
        lifeAreaIds: ['life-area-1'],
      },
    ]

    ifsDailyCheckInStore.checkIns = []
  })

  it('renders the priority compass, next moves, progress lanes, and support rail', async () => {
    render(TodayView, {
      global: {
        stubs: {
          AppSnackbar: { template: '<div />' },
          TrackerInlineInput: { template: '<div>TrackerInlineInput</div>' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Keep the day pointed at your priorities')).toBeInTheDocument()
    })

    expect(screen.getByText('Create steadier family routines')).toBeInTheDocument()
    expect(screen.getAllByText('Build the shared family calendar').length).toBeGreaterThan(0)
    expect(screen.getByText('Finish the dinner checklist')).toBeInTheDocument()
    expect(screen.getByText('Next Moves')).toBeInTheDocument()
    expect(screen.getByText('Draft the calendar rhythm')).toBeInTheDocument()
    expect(screen.getByText('Weekly pulse and monthly arc')).toBeInTheDocument()
    expect(screen.getByText('Weekly Pulse')).toBeInTheDocument()
    expect(screen.getByText('Monthly Arc')).toBeInTheDocument()
    expect(screen.getByText('Support Rail')).toBeInTheDocument()
    expect(screen.getByTestId('today-layout').className).toContain(
      'lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]',
    )
  })
})
