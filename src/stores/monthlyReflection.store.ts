/**
 * Monthly Reflection Store
 *
 * Pinia store for managing MonthlyReflections in the Planning & Reflection System.
 * MonthlyReflections capture end-of-month reflections separately from MonthlyPlans.
 *
 * This store provides:
 * - State management for MonthlyReflections
 * - CRUD operations via the Dexie repository
 * - Lookup by associated MonthlyPlan
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MonthlyReflection,
  CreateMonthlyReflectionPayload,
  UpdateMonthlyReflectionPayload,
} from '@/domain/reflection'
import { monthlyReflectionDexieRepository } from '@/repositories/planningDexieRepository'

export const useMonthlyReflectionStore = defineStore('monthlyReflection', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded MonthlyReflections */
  const monthlyReflections = ref<MonthlyReflection[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns a function to find a MonthlyReflection by its ID
   */
  const getReflectionById = computed(() => {
    return (id: string): MonthlyReflection | undefined => {
      return monthlyReflections.value.find((r) => r.id === id)
    }
  })

  /**
   * Returns a function to find a MonthlyReflection by its associated MonthlyPlan ID
   */
  const getReflectionByPlanId = computed(() => {
    return (monthlyPlanId: string): MonthlyReflection | undefined => {
      return monthlyReflections.value.find((r) => r.monthlyPlanId === monthlyPlanId)
    }
  })

  /**
   * Returns completed reflections sorted by completedAt descending
   */
  const completedReflections = computed(() => {
    return monthlyReflections.value
      .filter((r) => r.completedAt)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load MonthlyReflections from the database
   */
  async function loadMonthlyReflections(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      monthlyReflections.value = await monthlyReflectionDexieRepository.getAll()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load monthly reflections'
      error.value = errorMessage
      console.error('Error loading monthly reflections:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a specific reflection by plan ID
   */
  async function loadReflectionByPlanId(
    monthlyPlanId: string
  ): Promise<MonthlyReflection | undefined> {
    error.value = null

    try {
      const reflection = await monthlyReflectionDexieRepository.getByMonthlyPlanId(monthlyPlanId)
      if (reflection) {
        // Update local state if not already present
        const index = monthlyReflections.value.findIndex((r) => r.id === reflection.id)
        if (index === -1) {
          monthlyReflections.value.push(reflection)
        } else {
          monthlyReflections.value[index] = reflection
        }
      }
      return reflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load monthly reflection'
      error.value = errorMessage
      console.error('Error loading monthly reflection:', err)
      return undefined
    }
  }

  /**
   * Create a new MonthlyReflection
   */
  async function createReflection(
    data: CreateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    error.value = null

    try {
      const newReflection = await monthlyReflectionDexieRepository.create(data)
      monthlyReflections.value.push(newReflection)
      return newReflection
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create monthly reflection'
      error.value = errorMessage
      console.error('Error creating monthly reflection:', err)
      throw err
    }
  }

  /**
   * Update an existing MonthlyReflection
   */
  async function updateReflection(
    id: string,
    data: UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    error.value = null

    try {
      const updatedReflection = await monthlyReflectionDexieRepository.update(id, data)

      const index = monthlyReflections.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        monthlyReflections.value[index] = updatedReflection
      }

      return updatedReflection
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update monthly reflection'
      error.value = errorMessage
      console.error('Error updating monthly reflection:', err)
      throw err
    }
  }

  /**
   * Complete a MonthlyReflection (set completedAt timestamp)
   */
  async function completeReflection(
    id: string,
    data: Omit<UpdateMonthlyReflectionPayload, 'completedAt'>
  ): Promise<MonthlyReflection> {
    return updateReflection(id, {
      ...data,
      completedAt: new Date().toISOString(),
    })
  }

  /**
   * Delete a MonthlyReflection
   */
  async function deleteReflection(id: string): Promise<void> {
    error.value = null

    try {
      await monthlyReflectionDexieRepository.delete(id)
      monthlyReflections.value = monthlyReflections.value.filter((r) => r.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete monthly reflection'
      error.value = errorMessage
      console.error('Error deleting monthly reflection:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    monthlyReflections,
    isLoading,
    error,

    // Getters
    getReflectionById,
    getReflectionByPlanId,
    completedReflections,

    // Actions
    loadMonthlyReflections,
    loadReflectionByPlanId,
    createReflection,
    updateReflection,
    completeReflection,
    deleteReflection,
  }
})
