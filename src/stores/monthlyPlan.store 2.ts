/**
 * Monthly Plan Store
 *
 * Pinia store for managing MonthlyPlans in the Planning & Reflection System.
 * MonthlyPlans capture the output of monthly planning sessions, including
 * focus area selection, month intentions, and linked projects.
 *
 * This store provides:
 * - State management for MonthlyPlans
 * - CRUD operations via the Dexie repository
 * - Flexible date range support for user-defined periods
 * - Current period detection based on date overlap
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MonthlyPlan,
  CreateMonthlyPlanPayload,
  UpdateMonthlyPlanPayload,
} from '@/domain/planning'
import { monthlyPlanDexieRepository } from '@/repositories/planningDexieRepository'

export const useMonthlyPlanStore = defineStore('monthlyPlan', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded MonthlyPlans */
  const monthlyPlans = ref<MonthlyPlan[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Sort monthly plans by startDate descending (most recent first)
   */
  function sortMonthlyPlans(plans: MonthlyPlan[]): MonthlyPlan[] {
    return [...plans].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  /**
   * Check if a date falls within a plan's date range
   */
  function isDateInPlan(date: string, plan: MonthlyPlan): boolean {
    return plan.startDate <= date && plan.endDate >= date
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns MonthlyPlans sorted by startDate descending
   */
  const sortedMonthlyPlans = computed(() => {
    return sortMonthlyPlans(monthlyPlans.value)
  })

  /**
   * Returns a function to find a MonthlyPlan by its ID
   * Usage: store.getMonthlyPlanById('plan-id')
   */
  const getMonthlyPlanById = computed(() => {
    return (id: string): MonthlyPlan | undefined => {
      return monthlyPlans.value.find((p) => p.id === id)
    }
  })

  /**
   * Returns MonthlyPlans that overlap with a given date
   * Usage: store.getMonthlyPlansByDate('2026-01-15')
   */
  const getMonthlyPlansByDate = computed(() => {
    return (date: string): MonthlyPlan[] => {
      return monthlyPlans.value.filter((p) => isDateInPlan(date, p))
    }
  })

  /**
   * Returns the current MonthlyPlan(s) - plans where today falls within the date range
   * May return multiple plans if date ranges overlap
   */
  const getCurrentMonthPlans = computed((): MonthlyPlan[] => {
    const today = new Date().toISOString().split('T')[0]
    return monthlyPlans.value.filter((p) => isDateInPlan(today, p))
  })

  /**
   * Returns MonthlyPlans for a specific year
   */
  const getMonthlyPlansByYear = computed(() => {
    return (year: number): MonthlyPlan[] => {
      return sortMonthlyPlans(monthlyPlans.value.filter((p) => p.year === year))
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load MonthlyPlans from the database
   * @param filters - Optional filters to apply
   *   - year: Load all plans for a specific year
   *   - dateRange: Load plans overlapping with a date range
   */
  async function loadMonthlyPlans(filters?: {
    year?: number
    startDate?: string
    endDate?: string
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loadedPlans: MonthlyPlan[]

      if (filters?.year) {
        // Load all plans for a specific year
        loadedPlans = await monthlyPlanDexieRepository.getByYear(filters.year)
      } else if (filters?.startDate && filters?.endDate) {
        // Load plans overlapping with date range
        loadedPlans = await monthlyPlanDexieRepository.getByDateRange(
          filters.startDate,
          filters.endDate
        )
      } else {
        // Load all plans
        loadedPlans = await monthlyPlanDexieRepository.getAll()
      }

      monthlyPlans.value = loadedPlans
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load monthly plans'
      error.value = errorMessage
      console.error('Error loading monthly plans:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new MonthlyPlan
   *
   * @param data - MonthlyPlan data (without id, createdAt, updatedAt)
   * @returns The created MonthlyPlan
   */
  async function createMonthlyPlan(data: CreateMonthlyPlanPayload): Promise<MonthlyPlan> {
    error.value = null

    try {
      const newPlan = await monthlyPlanDexieRepository.create(data)
      monthlyPlans.value.push(newPlan)
      return newPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create monthly plan'
      error.value = errorMessage
      console.error('Error creating monthly plan:', err)
      throw err
    }
  }

  /**
   * Update an existing MonthlyPlan
   * @param id - The MonthlyPlan ID
   * @param data - Partial MonthlyPlan data to update
   * @returns The updated MonthlyPlan
   */
  async function updateMonthlyPlan(
    id: string,
    data: UpdateMonthlyPlanPayload
  ): Promise<MonthlyPlan> {
    error.value = null

    try {
      const updatedPlan = await monthlyPlanDexieRepository.update(id, data)

      // Update local state
      const index = monthlyPlans.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        monthlyPlans.value[index] = updatedPlan
      }

      return updatedPlan
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update monthly plan'
      error.value = errorMessage
      console.error('Error updating monthly plan:', err)
      throw err
    }
  }

  /**
   * Delete a MonthlyPlan
   * @param id - The MonthlyPlan ID
   */
  async function deleteMonthlyPlan(id: string): Promise<void> {
    error.value = null

    try {
      await monthlyPlanDexieRepository.delete(id)

      // Update local state
      monthlyPlans.value = monthlyPlans.value.filter((p) => p.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete monthly plan'
      error.value = errorMessage
      console.error('Error deleting monthly plan:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    monthlyPlans,
    isLoading,
    error,

    // Getters
    sortedMonthlyPlans,
    getMonthlyPlanById,
    getMonthlyPlansByDate,
    getCurrentMonthPlans,
    getMonthlyPlansByYear,

    // Actions
    loadMonthlyPlans,
    createMonthlyPlan,
    updateMonthlyPlan,
    deleteMonthlyPlan,
  }
})
