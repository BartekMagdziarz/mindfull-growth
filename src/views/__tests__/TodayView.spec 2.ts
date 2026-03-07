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

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('TodayView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

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
    vi.spyOn(habitStore, 'loadHabits').mockResolvedValue()
    vi.spyOn(weeklyReflectionStore, 'loadWeeklyReflections').mockResolvedValue()
    vi.spyOn(monthlyReflectionStore, 'loadMonthlyReflections').mockResolvedValue()
    vi.spyOn(yearlyReflectionStore, 'loadYearlyReflections').mockResolvedValue()
    vi.spyOn(ifsPartStore, 'loadParts').mockResolvedValue()

    journalStore.entries = []
    emotionLogStore.logs = []
  })

  it('renders the dashboard after loading', async () => {
    render(TodayView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          AppSnackbar: { template: '<div />' },
          CompassStrip: { template: '<div>CompassStrip</div>' },
          ModeSwitcher: { template: '<div>ModeSwitcher</div>' },
          DailyIntentionCard: { template: '<div>DailyIntentionCard</div>' },
          ExecutionBoard: { template: '<div>ExecutionBoard</div>' },
          ContextualNudgesCard: { template: '<div>ContextualNudgesCard</div>' },
          EmotionProgressCard: { template: '<div>EmotionProgressCard</div>' },
          WeekSummaryCard: { template: '<div>WeekSummaryCard</div>' },
          IFSCheckInCard: { template: '<div>IFSCheckInCard</div>' },
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByText('ExecutionBoard')).toBeInTheDocument()
    })
  })
})
