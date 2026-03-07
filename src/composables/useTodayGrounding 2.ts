import { computed, ref } from 'vue'
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
import {
  getTodayJournalEntries,
  getTodayEmotionLogs,
  getWeekSummary,
} from '@/utils/todayUtils'
import { getCurrentYear, getDefaultPeriodName } from '@/utils/periodUtils'
import {
  generateTodayRecommendations,
  type TodayRecommendationContext,
} from '@/services/todayRecommendation.service'
import type { TodayMode } from '@/types/today'

export function resolveAutoTodayMode(date: Date): TodayMode {
  const hour = date.getHours()
  if (hour >= 4 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'midday'
  return 'evening'
}

export function useTodayGrounding() {
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

  const isLoading = ref(true)
  const loadError = ref<string | null>(null)

  const todayDate = computed(() => new Date())
  const todayIsoDate = computed(() => todayDate.value.toISOString().slice(0, 10))

  const todayJournalEntries = computed(() => getTodayJournalEntries(journalStore.entries))
  const todayEmotionLogs = computed(() => getTodayEmotionLogs(emotionLogStore.logs))

  const todayJournalCount = computed(() => todayJournalEntries.value.length)
  const todayEmotionCount = computed(() => todayEmotionLogs.value.length)
  const hasTodayJournal = computed(() => todayJournalCount.value > 0)

  const weekSummary = computed(() => getWeekSummary(journalStore.entries, emotionLogStore.logs))

  const currentYearPlan = computed(() => {
    const plans = yearlyPlanStore.getCurrentYearPlans
    return plans.length > 0 ? plans[0] : undefined
  })

  const currentMonthPlan = computed(() => {
    const plans = monthlyPlanStore.getCurrentMonthPlans
    return plans.length > 0 ? plans[0] : undefined
  })

  const currentWeekPlan = computed(() => {
    const plans = weeklyPlanStore.getCurrentWeekPlans
    return plans.length > 0 ? plans[0] : undefined
  })

  const currentWeekCommitments = computed(() => {
    if (!currentWeekPlan.value) return []
    return commitmentStore.getCommitmentsByWeeklyPlanId(currentWeekPlan.value.id)
  })

  const commitmentProgress = computed(() => ({
    done: currentWeekCommitments.value.filter((item) => item.status === 'done').length,
    total: currentWeekCommitments.value.length,
  }))

  const topActivePriorities = computed(() => {
    const currentYear = currentYearPlan.value?.year ?? getCurrentYear()
    return priorityStore.getActivePriorities(currentYear).slice(0, 4)
  })

  const monthLabel = computed(() => {
    if (!currentMonthPlan.value) return ''
    return getDefaultPeriodName(
      currentMonthPlan.value.startDate,
      currentMonthPlan.value.endDate,
      'monthly',
    )
  })

  const weekLabel = computed(() => {
    if (!currentWeekPlan.value) return ''
    return getDefaultPeriodName(
      currentWeekPlan.value.startDate,
      currentWeekPlan.value.endDate,
      'weekly',
    )
  })

  const yearLabel = computed(() => {
    if (!currentYearPlan.value) return ''
    return currentYearPlan.value.name || String(currentYearPlan.value.year)
  })

  const mode = computed<TodayMode>(() => {
    const override = userPreferencesStore.todayModeOverride
    if (override !== 'auto') return override
    return resolveAutoTodayMode(todayDate.value)
  })

  const recentActivatedEmotionName = computed(() => {
    const oneDayAgo = new Date(todayDate.value.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const recentLogs = emotionLogStore.logs.filter((log) => log.createdAt >= oneDayAgo)

    for (const log of recentLogs) {
      for (const emotionId of log.emotionIds) {
        const emotion = emotionStore.getEmotionById(emotionId)
        if (emotion && emotion.energy > 6 && emotion.pleasantness <= 6) {
          return emotion.name
        }
      }
    }

    return null
  })

  const recommendations = computed(() => {
    const context: TodayRecommendationContext = {
      mode: mode.value,
      now: todayDate.value,
      todayEmotionCount: todayEmotionCount.value,
      emotionTarget: userPreferencesStore.dailyEmotionTarget,
      hasJournalToday: hasTodayJournal.value,
      unfinishedCommitmentCount: currentWeekCommitments.value.filter((item) => item.status !== 'done').length,
      recentActivatedEmotionName: recentActivatedEmotionName.value,
      ifsPartCount: ifsPartStore.parts.length,
      feedbackMap: userPreferencesStore.todayExerciseFeedback,
    }

    return generateTodayRecommendations(context)
  })

  const weeklyReflectionDue = computed(() => {
    if (!currentWeekPlan.value) return false
    if (currentWeekPlan.value.endDate > todayIsoDate.value) return false
    return !weeklyReflectionStore.getReflectionByPlanId(currentWeekPlan.value.id)
  })

  const monthlyReflectionDue = computed(() => {
    if (!currentMonthPlan.value) return false
    if (currentMonthPlan.value.endDate > todayIsoDate.value) return false
    return !monthlyReflectionStore.getReflectionByPlanId(currentMonthPlan.value.id)
  })

  const yearlyReflectionDue = computed(() => {
    if (!currentYearPlan.value) return false
    if (currentYearPlan.value.endDate > todayIsoDate.value) return false
    return !yearlyReflectionStore.getReflectionByPlanId(currentYearPlan.value.id)
  })

  const morningPromptSeed = computed(() => {
    const focus = currentWeekPlan.value?.focusSentence?.trim()
    const intention = currentMonthPlan.value?.monthIntention?.trim()

    if (focus) {
      return `Morning intention\n\nToday I want to remember: ${focus}\n\nThe one thing I want to prioritize is...`
    }

    if (intention) {
      return `Morning intention\n\nThis month I am orienting toward: ${intention}\n\nToday that means...`
    }

    return 'Morning intention\n\nWhat matters most today, and how do I want to show up?'
  })

  const eveningPromptSeed = computed(() => {
    if (recentActivatedEmotionName.value) {
      return `Evening reflection\n\nToday I felt ${recentActivatedEmotionName.value} at times.\n\nWhat happened, what did I need, and what did I learn?`
    }

    return 'Evening reflection\n\nWhat mattered today? What did I learn about myself? What do I want to carry into tomorrow?'
  })

  async function loadData() {
    isLoading.value = true
    loadError.value = null

    try {
      const currentYear = getCurrentYear()

      await Promise.all([
        userPreferencesStore.loadPreferences(),
        journalStore.loadEntries(),
        emotionLogStore.loadLogs(),
        emotionStore.loadEmotions(),
        yearlyPlanStore.loadYearlyPlans({ year: currentYear }),
        monthlyPlanStore.loadMonthlyPlans(),
        weeklyPlanStore.loadWeeklyPlans(),
        commitmentStore.loadCommitments(),
        lifeAreaStore.loadLifeAreas(),
        priorityStore.loadPriorities(currentYear),
        projectStore.loadProjects(),
        trackerStore.loadTrackers(),
        habitStore.loadHabits(),
        weeklyReflectionStore.loadWeeklyReflections(),
        monthlyReflectionStore.loadMonthlyReflections(),
        yearlyReflectionStore.loadYearlyReflections(),
        ifsPartStore.loadParts(),
      ])
    } catch (error) {
      console.error('Failed to load grounding data for Today view:', error)
      loadError.value =
        error instanceof Error ? error.message : 'Failed to load Today grounding data.'
    } finally {
      isLoading.value = false
    }
  }

  async function setTodayModeOverride(override: 'auto' | TodayMode) {
    await userPreferencesStore.setTodayModeOverride(override)
  }

  return {
    isLoading,
    loadError,
    loadData,
    mode,
    todayDate,
    todayIsoDate,
    todayJournalEntries,
    todayEmotionLogs,
    todayJournalCount,
    todayEmotionCount,
    hasTodayJournal,
    weekSummary,
    currentYearPlan,
    currentMonthPlan,
    currentWeekPlan,
    currentWeekCommitments,
    commitmentProgress,
    topActivePriorities,
    monthLabel,
    weekLabel,
    yearLabel,
    recommendations,
    weeklyReflectionDue,
    monthlyReflectionDue,
    yearlyReflectionDue,
    morningPromptSeed,
    eveningPromptSeed,
    setTodayModeOverride,
    stores: {
      userPreferencesStore,
      lifeAreaStore,
      priorityStore,
      projectStore,
      trackerStore,
      habitStore,
      commitmentStore,
      monthlyReflectionStore,
      weeklyReflectionStore,
      yearlyReflectionStore,
    },
  }
}
