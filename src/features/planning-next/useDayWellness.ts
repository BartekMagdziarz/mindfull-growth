import { computed, type Ref } from 'vue'
import type { EmotionDonutLog } from '@/components/today/EmotionCard.vue'
import type { DayRef } from '@/domain/period'
import { getQuadrant, type Quadrant } from '@/domain/emotion'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useJournalStore } from '@/stores/journal.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { getPeriodRefsForDate } from '@/utils/periods'
import { toLocalDateKey } from '@/utils/streaks'

export const DAILY_EMOTION_TARGET = 3

/**
 * Day-scoped wellness signals (journal, emotions, exercises, programs) shared by
 * the day surfaces. Reads the direct stores, like the Today cards always did;
 * programs and due repeats are actions of the current day only.
 */
export function useDayWellness(dayRef: Ref<DayRef>) {
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const exerciseCompletionsStore = useExerciseCompletionsStore()
  const exercisePlanStore = useExercisePlanStore()
  const programEnrollmentStore = useProgramEnrollmentStore()

  const isToday = computed(() => dayRef.value === getPeriodRefsForDate(new Date()).day)
  const referenceDate = computed(() => new Date(`${dayRef.value}T12:00:00`))
  const journalState = computed<'empty' | 'done'>(() =>
    journalStore.entries.some(entry => entry.createdAt.slice(0, 10) === toLocalDateKey(referenceDate.value)) ? 'done' : 'empty',
  )
  const exerciseDayCompletions = computed(() => exerciseCompletionsStore.completionsForDay(dayRef.value))
  const duePlanItems = computed(() => (isToday.value ? exercisePlanStore.dueItems(dayRef.value) : []))
  const activeEnrollments = computed(() => (isToday.value ? programEnrollmentStore.activeEnrollments : []))
  const todayEmotionLogs = computed<EmotionDonutLog[]>(() =>
    emotionLogStore.logs
      .filter(log => log.createdAt.slice(0, 10) === dayRef.value)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(log => {
        const counts: Record<Quadrant, number> = {
          'high-energy-high-pleasantness': 0,
          'high-energy-low-pleasantness': 0,
          'low-energy-high-pleasantness': 0,
          'low-energy-low-pleasantness': 0,
        }
        for (const emotionId of log.emotionIds) {
          const emotion = emotionStore.getEmotionById(emotionId)
          if (emotion) counts[getQuadrant(emotion)] += 1
        }
        const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
        return total
          ? { quadrants: Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, count / total])) as EmotionDonutLog['quadrants'] }
          : { quadrants: {} }
      }),
  )

  async function ensureLoaded(): Promise<void> {
    await Promise.all([
      journalStore.loadEntries(),
      emotionLogStore.loadLogs(),
      emotionStore.loadEmotions(),
      exerciseCompletionsStore.ensureLoaded(),
      exercisePlanStore.ensureLoaded(),
      programEnrollmentStore.ensureLoaded(),
    ])
    await programEnrollmentStore.runScheduler()
  }

  return {
    isToday,
    referenceDate,
    journalState,
    exerciseDayCompletions,
    duePlanItems,
    activeEnrollments,
    todayEmotionLogs,
    ensureLoaded,
  }
}
