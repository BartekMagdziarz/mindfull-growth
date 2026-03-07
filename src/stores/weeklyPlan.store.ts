/**
 * Weekly Plan Store
 *
 * Pinia store for managing WeeklyPlans in the Planning & Reflection System.
 * WeeklyPlans capture the output of weekly planning sessions, including
 * capacity notes, focus sentences, and linked commitments.
 *
 * This store provides:
 * - State management for WeeklyPlans
 * - CRUD operations via the Dexie repository
 * - Flexible date range support for user-defined periods
 * - Current period detection based on date overlap
 *
 * Note: Reflections are now managed by weeklyReflection.store.ts
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WeeklyPlan,
  CreateWeeklyPlanPayload,
  UpdateWeeklyPlanPayload,
} from '@/domain/planning'
import { weeklyPlanDexieRepository } from '@/repositories/planningDexieRepository'
import { isDateInPeriod } from '@/utils/periodUtils'

export const useWeeklyPlanStore = defineStore('weeklyPlan', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded WeeklyPlans */
  const weeklyPlans = ref<WeeklyPlan[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Sort weekly plans by startDate descending (most recent first)
   */
  function sortWeeklyPlans(plans: WeeklyPlan[]): WeeklyPlan[] {
    return [...plans].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns WeeklyPlans sorted by startDate descending
   */
  const sortedWeeklyPlans = computed(() => {
    return sortWeeklyPlans(weeklyPlans.value)
  })

  /**
   * Returns a function to find a WeeklyPlan by its ID
   * Usage: store.getWeeklyPlanById('plan-id')
   */
  const getWeeklyPlanById = computed(() => {
    return (id: string): WeeklyPlan | undefined => {
      return weeklyPlans.value.find((p) => p.id === id)
    }
  })

  /**
   * Returns WeeklyPlans where today falls within the date range
   * May return multiple plans if date ranges overlap
   */
  const getCurrentWeekPlans = computed((): WeeklyPlan[] => {
    const today = new Date()
    return weeklyPlans.value.filter((p) => isDateInPeriod(today, p.startDate, p.endDate))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load WeeklyPlans from the database
   * @param filters - Optional filters to apply
   *   - year: Load all plans for a specific year
   */
  async function loadWeeklyPlans(filters?: {
    year?: number
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loadedPlans: WeeklyPlan[]

      // Load all plans
      loadedPlans = await weeklyPlanDexieRepository.getAll()

      // Filter by year if specified
      if (filters?.year) {
        loadedPlans = loadedPlans.filter((p) => {
          const startYear = parseInt(p.startDate.substring(0, 4), 10)
          return startYear === filters.year
        })
      }

      weeklyPlans.value = loadedPlans
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weekly plans'
      error.value = errorMessage
      console.error('Error loading weekly plans:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new WeeklyPlan
   *
   * @param data - WeeklyPlan data (without id, createdAt, updatedAt)
   * @returns The created WeeklyPlan
   */
  async function createWeeklyPlan(data: CreateWeeklyPlanPayload): Promise<WeeklyPlan> {
    error.value = null

    try {
      const newPlan = await weeklyPlanDexieRepository.create(data)
      weeklyPlans.value.push(newPlan)
      return newPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create weekly plan'
      error.value = errorMessage
      console.error('Error creating weekly plan:', err)
      throw err
    }
  }

  /**
   * Update an existing WeeklyPlan
   * @param id - The WeeklyPlan ID
   * @param data - Partial WeeklyPlan data to update
   * @returns The updated WeeklyPlan
   */
  async function updateWeeklyPlan(
    id: string,
    data: UpdateWeeklyPlanPayload
  ): Promise<WeeklyPlan> {
    error.value = null

    try {
      const updatedPlan = await weeklyPlanDexieRepository.update(id, data)

      // Update local state
      const index = weeklyPlans.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        weeklyPlans.value[index] = updatedPlan
      }

      return updatedPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update weekly plan'
      error.value = errorMessage
      console.error('Error updating weekly plan:', err)
      throw err
    }
  }

  /**
   * Delete a WeeklyPlan
   * @param id - The WeeklyPlan ID
   */
  async function deleteWeeklyPlan(id: string): Promise<void> {
    error.value = null

    try {
      await weeklyPlanDexieRepository.delete(id)

      // Update local state
      weeklyPlans.value = weeklyPlans.value.filter((p) => p.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete weekly plan'
      error.value = errorMessage
      console.error('Error deleting weekly plan:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    weeklyPlans,
    isLoading,
    error,

    // Getters
    sortedWeeklyPlans,
    getWeeklyPlanById,
    getCurrentWeekPlans,

    // Actions
    loadWeeklyPlans,
    createWeeklyPlan,
    updateWeeklyPlan,
    deleteWeeklyPlan,
  }
})
