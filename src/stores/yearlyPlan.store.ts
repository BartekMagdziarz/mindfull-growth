/**
 * Yearly Plan Store
 *
 * Pinia store for managing YearlyPlans in the Planning & Reflection System.
 * YearlyPlans capture the output of yearly planning sessions, including
 * the year theme and linked focus areas.
 *
 * This store provides:
 * - State management for YearlyPlans
 * - CRUD operations via the Dexie repository
 * - Flexible date range support for user-defined periods
 * - Current period detection based on date overlap
 *
 * Note: Reflections are now managed by yearlyReflection.store.ts
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  YearlyPlan,
  CreateYearlyPlanPayload,
  UpdateYearlyPlanPayload,
} from '@/domain/planning'
import { yearlyPlanDexieRepository } from '@/repositories/planningDexieRepository'

export const useYearlyPlanStore = defineStore('yearlyPlan', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded YearlyPlans */
  const yearlyPlans = ref<YearlyPlan[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Sort yearly plans by startDate descending (most recent first)
   */
  function sortYearlyPlans(plans: YearlyPlan[]): YearlyPlan[] {
    return [...plans].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  /**
   * Check if a date falls within a plan's date range
   */
  function isDateInPlan(date: string, plan: YearlyPlan): boolean {
    return plan.startDate <= date && plan.endDate >= date
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns YearlyPlans sorted by startDate descending
   */
  const sortedYearlyPlans = computed(() => {
    return sortYearlyPlans(yearlyPlans.value)
  })

  /**
   * Returns a function to find a YearlyPlan by its ID
   * Usage: store.getYearlyPlanById('plan-id')
   */
  const getYearlyPlanById = computed(() => {
    return (id: string): YearlyPlan | undefined => {
      return yearlyPlans.value.find((p) => p.id === id)
    }
  })

  /**
   * Returns a function to find YearlyPlans by year (for grouping)
   * Usage: store.getYearlyPlansByYear(2026)
   */
  const getYearlyPlansByYear = computed(() => {
    return (year: number): YearlyPlan[] => {
      return sortYearlyPlans(yearlyPlans.value.filter((p) => p.year === year))
    }
  })

  /**
   * Returns YearlyPlans that overlap with a given date
   * Usage: store.getYearlyPlansByDate('2026-01-15')
   */
  const getYearlyPlansByDate = computed(() => {
    return (date: string): YearlyPlan[] => {
      return yearlyPlans.value.filter((p) => isDateInPlan(date, p))
    }
  })

  /**
   * Returns the current YearlyPlan(s) - plans where today falls within the date range
   * May return multiple plans if date ranges overlap
   */
  const getCurrentYearPlans = computed((): YearlyPlan[] => {
    const today = new Date().toISOString().split('T')[0]
    return yearlyPlans.value.filter((p) => isDateInPlan(today, p))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load YearlyPlans from the database
   * @param filters - Optional filters to apply
   *   - year: Load all plans for a specific year (by year field)
   */
  async function loadYearlyPlans(filters?: { year?: number }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loadedPlans: YearlyPlan[]

      if (filters?.year) {
        // Load all plans for a specific year
        loadedPlans = await yearlyPlanDexieRepository.getByYear(filters.year)
      } else {
        // Load all plans
        loadedPlans = await yearlyPlanDexieRepository.getAll()
      }

      yearlyPlans.value = loadedPlans
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load yearly plans'
      error.value = errorMessage
      console.error('Error loading yearly plans:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new YearlyPlan
   *
   * @param data - YearlyPlan data (without id, createdAt, updatedAt)
   * @returns The created YearlyPlan
   */
  async function createYearlyPlan(data: CreateYearlyPlanPayload): Promise<YearlyPlan> {
    error.value = null

    try {
      const newPlan = await yearlyPlanDexieRepository.create(data)
      yearlyPlans.value.push(newPlan)
      return newPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create yearly plan'
      error.value = errorMessage
      console.error('Error creating yearly plan:', err)
      throw err
    }
  }

  /**
   * Update an existing YearlyPlan
   * @param id - The YearlyPlan ID
   * @param data - Partial YearlyPlan data to update
   * @returns The updated YearlyPlan
   */
  async function updateYearlyPlan(
    id: string,
    data: UpdateYearlyPlanPayload
  ): Promise<YearlyPlan> {
    error.value = null

    try {
      const updatedPlan = await yearlyPlanDexieRepository.update(id, data)

      // Update local state
      const index = yearlyPlans.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        yearlyPlans.value[index] = updatedPlan
      }

      return updatedPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update yearly plan'
      error.value = errorMessage
      console.error('Error updating yearly plan:', err)
      throw err
    }
  }

  /**
   * Delete a YearlyPlan
   * @param id - The YearlyPlan ID
   */
  async function deleteYearlyPlan(id: string): Promise<void> {
    error.value = null

    try {
      await yearlyPlanDexieRepository.delete(id)

      // Update local state
      yearlyPlans.value = yearlyPlans.value.filter((p) => p.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete yearly plan'
      error.value = errorMessage
      console.error('Error deleting yearly plan:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    yearlyPlans,
    isLoading,
    error,

    // Getters
    sortedYearlyPlans,
    getYearlyPlanById,
    getYearlyPlansByYear,
    getYearlyPlansByDate,
    getCurrentYearPlans,

    // Actions
    loadYearlyPlans,
    createYearlyPlan,
    updateYearlyPlan,
    deleteYearlyPlan,
  }
})
