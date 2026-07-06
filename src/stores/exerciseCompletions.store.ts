/**
 * Exercise Completions Store
 *
 * In-memory view of the unified completion log (`exerciseCompletions`
 * table). Read by ExercisesView ("last completed" badges), the Today
 * exercise card and the stream calendar; written via `record()` from
 * every exercise-completion call site so consumers stay reactive
 * without reloading.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { recordCompletion } from '@/services/exerciseCompletionService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'

export const useExerciseCompletionsStore = defineStore('exerciseCompletions', () => {
  const completions = ref<ExerciseCompletion[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Latest `completedAt` per exercise slug. */
  const latestBySlug = computed(() => {
    const map = new Map<string, string>()
    for (const completion of completions.value) {
      const previous = map.get(completion.exerciseSlug)
      if (!previous || completion.completedAt > previous) {
        map.set(completion.exerciseSlug, completion.completedAt)
      }
    }
    return map
  })

  const completionsForDay = computed(() => {
    return (dayRef: DayRef): ExerciseCompletion[] =>
      completions.value.filter((c) => c.dayRef === dayRef)
  })

  async function loadCompletions(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      completions.value = await exerciseCompletionDexieRepository.listAll()
      isLoaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load exercise completions'
      console.error('Error loading exercise completions:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Hydrates the store from Dexie at most once. After a failed load
   * `isLoaded` stays false, so the next caller retries.
   */
  async function ensureLoaded(): Promise<void> {
    if (isLoaded.value || isLoading.value) return
    await loadCompletions()
  }

  /**
   * Persists a completion and mirrors it into state. Call sites treat
   * the log as auxiliary: fire-and-forget with a `.catch`, so a log
   * failure never breaks the exercise save itself.
   */
  async function record(slug: string, recordId?: string): Promise<ExerciseCompletion> {
    const { completion, completedPlan, programAdvancement } = await recordCompletion(
      slug,
      recordId,
    )
    completions.value.push(completion)
    // Mirror an auto-completed plan into its store so the Today tile
    // reacts without a reload (design §4.4).
    if (completedPlan) useExercisePlanStore().applyUpdate(completedPlan)
    // Same for a program advancement: the enrollment and the next
    // step's materialized plan item (design §4.5).
    if (programAdvancement) {
      useProgramEnrollmentStore().applyUpdate(programAdvancement.enrollment)
      if (programAdvancement.nextPlanItem) {
        useExercisePlanStore().applyUpdate(programAdvancement.nextPlanItem)
      }
    }
    return completion
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    completions.value = []
    isLoaded.value = false
    isLoading.value = false
    error.value = null
  }

  return {
    completions,
    isLoaded,
    isLoading,
    error,
    latestBySlug,
    completionsForDay,
    loadCompletions,
    ensureLoaded,
    record,
    reset,
  }
})
