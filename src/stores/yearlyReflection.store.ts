/**
 * Yearly Reflection Store
 *
 * Pinia store for managing YearlyReflections in the Planning & Reflection System.
 * YearlyReflections capture end-of-year reflections separately from YearlyPlans.
 *
 * This store provides:
 * - State management for YearlyReflections
 * - CRUD operations via the Dexie repository
 * - Lookup by associated YearlyPlan
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  YearlyReflection,
  CreateYearlyReflectionPayload,
  UpdateYearlyReflectionPayload,
} from '@/domain/reflection'
import { yearlyReflectionDexieRepository } from '@/repositories/planningDexieRepository'

export const useYearlyReflectionStore = defineStore('yearlyReflection', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded YearlyReflections */
  const yearlyReflections = ref<YearlyReflection[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns a function to find a YearlyReflection by its ID
   */
  const getReflectionById = computed(() => {
    return (id: string): YearlyReflection | undefined => {
      return yearlyReflections.value.find((r) => r.id === id)
    }
  })

  /**
   * Returns a function to find a YearlyReflection by its associated YearlyPlan ID
   */
  const getReflectionByPlanId = computed(() => {
    return (yearlyPlanId: string): YearlyReflection | undefined => {
      return yearlyReflections.value.find((r) => r.yearlyPlanId === yearlyPlanId)
    }
  })

  /**
   * Returns completed reflections sorted by completedAt descending
   */
  const completedReflections = computed(() => {
    return yearlyReflections.value
      .filter((r) => r.completedAt)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load YearlyReflections from the database
   */
  async function loadYearlyReflections(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      yearlyReflections.value = await yearlyReflectionDexieRepository.getAll()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load yearly reflections'
      error.value = errorMessage
      console.error('Error loading yearly reflections:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a specific reflection by plan ID
   */
  async function loadReflectionByPlanId(yearlyPlanId: string): Promise<YearlyReflection | undefined> {
    error.value = null

    try {
      const reflection = await yearlyReflectionDexieRepository.getByYearlyPlanId(yearlyPlanId)
      if (reflection) {
        // Update local state if not already present
        const index = yearlyReflections.value.findIndex((r) => r.id === reflection.id)
        if (index === -1) {
          yearlyReflections.value.push(reflection)
        } else {
          yearlyReflections.value[index] = reflection
        }
      }
      return reflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load yearly reflection'
      error.value = errorMessage
      console.error('Error loading yearly reflection:', err)
      return undefined
    }
  }

  /**
   * Create a new YearlyReflection
   */
  async function createReflection(data: CreateYearlyReflectionPayload): Promise<YearlyReflection> {
    error.value = null

    try {
      const newReflection = await yearlyReflectionDexieRepository.create(data)
      yearlyReflections.value.push(newReflection)
      return newReflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create yearly reflection'
      error.value = errorMessage
      console.error('Error creating yearly reflection:', err)
      throw err
    }
  }

  /**
   * Update an existing YearlyReflection
   */
  async function updateReflection(
    id: string,
    data: UpdateYearlyReflectionPayload
  ): Promise<YearlyReflection> {
    error.value = null

    try {
      const updatedReflection = await yearlyReflectionDexieRepository.update(id, data)

      const index = yearlyReflections.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        yearlyReflections.value[index] = updatedReflection
      }

      return updatedReflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update yearly reflection'
      error.value = errorMessage
      console.error('Error updating yearly reflection:', err)
      throw err
    }
  }

  /**
   * Complete a YearlyReflection (set completedAt timestamp)
   */
  async function completeReflection(
    id: string,
    data: Omit<UpdateYearlyReflectionPayload, 'completedAt'>
  ): Promise<YearlyReflection> {
    return updateReflection(id, {
      ...data,
      completedAt: new Date().toISOString(),
    })
  }

  /**
   * Delete a YearlyReflection
   */
  async function deleteReflection(id: string): Promise<void> {
    error.value = null

    try {
      await yearlyReflectionDexieRepository.delete(id)
      yearlyReflections.value = yearlyReflections.value.filter((r) => r.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete yearly reflection'
      error.value = errorMessage
      console.error('Error deleting yearly reflection:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    yearlyReflections,
    isLoading,
    error,

    // Getters
    getReflectionById,
    getReflectionByPlanId,
    completedReflections,

    // Actions
    loadYearlyReflections,
    loadReflectionByPlanId,
    createReflection,
    updateReflection,
    completeReflection,
    deleteReflection,
  }
})
