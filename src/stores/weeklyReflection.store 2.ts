/**
 * Weekly Reflection Store
 *
 * Pinia store for managing WeeklyReflections in the Planning & Reflection System.
 * WeeklyReflections capture end-of-week reflections separately from WeeklyPlans.
 *
 * This store provides:
 * - State management for WeeklyReflections
 * - CRUD operations via the Dexie repository
 * - Lookup by associated WeeklyPlan
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WeeklyReflection,
  CreateWeeklyReflectionPayload,
  UpdateWeeklyReflectionPayload,
} from '@/domain/reflection'
import { weeklyReflectionDexieRepository } from '@/repositories/planningDexieRepository'

export const useWeeklyReflectionStore = defineStore('weeklyReflection', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded WeeklyReflections */
  const weeklyReflections = ref<WeeklyReflection[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns a function to find a WeeklyReflection by its ID
   */
  const getReflectionById = computed(() => {
    return (id: string): WeeklyReflection | undefined => {
      return weeklyReflections.value.find((r) => r.id === id)
    }
  })

  /**
   * Returns a function to find a WeeklyReflection by its associated WeeklyPlan ID
   */
  const getReflectionByPlanId = computed(() => {
    return (weeklyPlanId: string): WeeklyReflection | undefined => {
      return weeklyReflections.value.find((r) => r.weeklyPlanId === weeklyPlanId)
    }
  })

  /**
   * Returns completed reflections sorted by completedAt descending
   */
  const completedReflections = computed(() => {
    return weeklyReflections.value
      .filter((r) => r.completedAt)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load WeeklyReflections from the database
   */
  async function loadWeeklyReflections(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      weeklyReflections.value = await weeklyReflectionDexieRepository.getAll()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weekly reflections'
      error.value = errorMessage
      console.error('Error loading weekly reflections:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a specific reflection by plan ID
   */
  async function loadReflectionByPlanId(
    weeklyPlanId: string
  ): Promise<WeeklyReflection | undefined> {
    error.value = null

    try {
      const reflection = await weeklyReflectionDexieRepository.getByWeeklyPlanId(weeklyPlanId)
      if (reflection) {
        // Update local state if not already present
        const index = weeklyReflections.value.findIndex((r) => r.id === reflection.id)
        if (index === -1) {
          weeklyReflections.value.push(reflection)
        } else {
          weeklyReflections.value[index] = reflection
        }
      }
      return reflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weekly reflection'
      error.value = errorMessage
      console.error('Error loading weekly reflection:', err)
      return undefined
    }
  }

  /**
   * Create a new WeeklyReflection
   */
  async function createReflection(data: CreateWeeklyReflectionPayload): Promise<WeeklyReflection> {
    error.value = null

    try {
      const newReflection = await weeklyReflectionDexieRepository.create(data)
      weeklyReflections.value.push(newReflection)
      return newReflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create weekly reflection'
      error.value = errorMessage
      console.error('Error creating weekly reflection:', err)
      throw err
    }
  }

  /**
   * Update an existing WeeklyReflection
   */
  async function updateReflection(
    id: string,
    data: UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection> {
    error.value = null

    try {
      const updatedReflection = await weeklyReflectionDexieRepository.update(id, data)

      const index = weeklyReflections.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        weeklyReflections.value[index] = updatedReflection
      }

      return updatedReflection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update weekly reflection'
      error.value = errorMessage
      console.error('Error updating weekly reflection:', err)
      throw err
    }
  }

  /**
   * Complete a WeeklyReflection (set completedAt timestamp)
   */
  async function completeReflection(
    id: string,
    data: Omit<UpdateWeeklyReflectionPayload, 'completedAt'>
  ): Promise<WeeklyReflection> {
    return updateReflection(id, {
      ...data,
      completedAt: new Date().toISOString(),
    })
  }

  /**
   * Delete a WeeklyReflection
   */
  async function deleteReflection(id: string): Promise<void> {
    error.value = null

    try {
      await weeklyReflectionDexieRepository.delete(id)
      weeklyReflections.value = weeklyReflections.value.filter((r) => r.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete weekly reflection'
      error.value = errorMessage
      console.error('Error deleting weekly reflection:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    weeklyReflections,
    isLoading,
    error,

    // Getters
    getReflectionById,
    getReflectionByPlanId,
    completedReflections,

    // Actions
    loadWeeklyReflections,
    loadReflectionByPlanId,
    createReflection,
    updateReflection,
    completeReflection,
    deleteReflection,
  }
})
