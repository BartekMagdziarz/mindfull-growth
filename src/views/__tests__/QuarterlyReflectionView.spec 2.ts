import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import MonthlyReflectionView from '@/views/MonthlyReflectionView.vue'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'

const mockPush = vi.fn()
const mockRoute = {
  params: { planId: 'month-plan-1' } as Record<string, string>,
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('MonthlyReflectionView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()

    const monthlyPlanStore = useMonthlyPlanStore()
    const monthlyReflectionStore = useMonthlyReflectionStore()
    const weeklyPlanStore = useWeeklyPlanStore()
    const weeklyReflectionStore = useWeeklyReflectionStore()
    const commitmentStore = useCommitmentStore()
    const projectStore = useProjectStore()
    const trackerStore = useTrackerStore()
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()
    const journalStore = useJournalStore()
    const emotionLogStore = useEmotionLogStore()

    monthlyPlanStore.monthlyPlans = [
      {
        id: 'month-plan-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
      },
    ]

    vi.spyOn(monthlyPlanStore, 'loadMonthlyPlans').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(weeklyPlanStore, 'loadWeeklyPlans').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(commitmentStore, 'loadCommitments').mockResolvedValue()
    vi.spyOn(projectStore, 'loadProjects').mockResolvedValue()
    vi.spyOn(trackerStore, 'loadTrackers').mockResolvedValue()
    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(priorityStore, 'loadPriorities').mockResolvedValue()
    vi.spyOn(journalStore, 'loadEntries').mockResolvedValue()
    vi.spyOn(emotionLogStore, 'loadLogs').mockResolvedValue()
    vi.spyOn(trackerPeriodDexieRepository, 'getByDateRange').mockResolvedValue([])
  })

  it('renders the monthly reflection wizard', async () => {
    render(MonthlyReflectionView)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Monthly Reflection', level: 1 })
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole('heading', { name: 'Monthly Reflection', level: 1 })
    ).toBeInTheDocument()
  })
})
