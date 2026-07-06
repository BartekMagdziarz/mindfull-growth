/**
 * Exercise Plan Store
 *
 * In-memory view of the `exercisePlanItems` table (planned repeats,
 * Phase 3 program steps). Read by the Today "Powtórki" tile and the
 * repeat prompt; every write goes through `exercisePlanService` and
 * patches the cache in place. Auto-completed items arrive via
 * `applyUpdate()` from the completions store.
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ExercisePlanItem, ExercisePlanSource } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import {
  cancelPlan as cancelPlanService,
  createPlan as createPlanService,
  listPlans,
  movePlan as movePlanService,
  selectDueItems,
  skipPlan as skipPlanService,
} from '@/services/exercisePlanService'

export const useExercisePlanStore = defineStore('exercisePlan', () => {
  const items = ref<ExercisePlanItem[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const pendingItems = computed(() => items.value.filter((item) => item.status === 'pending'))

  /** Due + overdue for the visible day (D3), oldest first. */
  const dueItems = computed(() => {
    return (todayRef: DayRef): ExercisePlanItem[] => selectDueItems(items.value, todayRef)
  })

  /** The repeat prompt's cross-session dedupe target. */
  const oldestPendingForSlug = computed(() => {
    return (slug: string): ExercisePlanItem | undefined =>
      pendingItems.value
        .filter((item) => item.exerciseSlug === slug)
        .sort((a, b) =>
          a.dayRef === b.dayRef
            ? a.createdAt.localeCompare(b.createdAt)
            : a.dayRef.localeCompare(b.dayRef),
        )[0]
  })

  async function loadItems(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      items.value = await listPlans()
      isLoaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load exercise plans'
      console.error('Error loading exercise plans:', err)
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
    await loadItems()
  }

  /**
   * Replace-by-id or append — used by our own actions and by the
   * completions store after an auto-complete. No-op before the first
   * load: the eventual `loadItems()` fetches fresh rows anyway.
   */
  function applyUpdate(item: ExercisePlanItem): void {
    if (!isLoaded.value) return
    const index = items.value.findIndex((existing) => existing.id === item.id)
    if (index === -1) {
      items.value.push(item)
    } else {
      items.value[index] = item
    }
  }

  /**
   * Cache eviction for items hard-deleted elsewhere (program pause /
   * abandon in `programSchedulerService`) — `cancelPlan` would try to
   * delete them from Dexie a second time.
   */
  function applyRemoval(id: string): void {
    if (!isLoaded.value) return
    items.value = items.value.filter((item) => item.id !== id)
  }

  async function createPlan(
    slug: string,
    dayRef: DayRef,
    source: ExercisePlanSource = 'repeat',
  ): Promise<ExercisePlanItem> {
    const item = await createPlanService(slug, dayRef, source)
    if (isLoaded.value) items.value.push(item)
    return item
  }

  async function movePlan(id: string, dayRef: DayRef): Promise<ExercisePlanItem> {
    const item = await movePlanService(id, dayRef)
    applyUpdate(item)
    return item
  }

  async function skipPlan(id: string): Promise<ExercisePlanItem> {
    const item = await skipPlanService(id)
    applyUpdate(item)
    return item
  }

  async function cancelPlan(id: string): Promise<void> {
    await cancelPlanService(id)
    items.value = items.value.filter((item) => item.id !== id)
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    items.value = []
    isLoaded.value = false
    isLoading.value = false
    error.value = null
  }

  return {
    items,
    isLoaded,
    isLoading,
    error,
    pendingItems,
    dueItems,
    oldestPendingForSlug,
    loadItems,
    ensureLoaded,
    applyUpdate,
    applyRemoval,
    createPlan,
    movePlan,
    skipPlan,
    cancelPlan,
    reset,
  }
})
