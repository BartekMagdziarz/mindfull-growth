/**
 * Priority Store
 *
 * Pinia store for managing Priorities in the Planning & Reflection System.
 * Priorities represent directions of change within linked Life Areas.
 *
 * This store provides:
 * - State management for Priorities
 * - CRUD operations via the Dexie repository
 * - LifeAreaIds validation on create/update
 * - Active state toggling
 * - Cross-store dependency to check linked Life Areas' active state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Priority, CreatePriorityPayload, UpdatePriorityPayload } from '@/domain/planning'
import { priorityDexieRepository } from '@/repositories/planningDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { useLifeAreaStore } from './lifeArea.store'

export const usePriorityStore = defineStore('priority', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded Priorities */
  const priorities = ref<Priority[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns Priorities sorted by sortOrder (ascending)
   * This ensures consistent ordering in the UI
   */
  const sortedPriorities = computed(() => {
    return [...priorities.value].sort((a, b) => a.sortOrder - b.sortOrder)
  })

  /**
   * Returns a function to find a Priority by ID
   * Usage: store.getPriorityById('some-id')
   */
  const getPriorityById = computed(() => {
    return (id: string): Priority | undefined => {
      return priorities.value.find((p) => p.id === id)
    }
  })

  /**
   * Returns a function to filter Priorities by Life Area, sorted by sortOrder
   * Usage: store.getPrioritiesByLifeArea('life-area-id')
   */
  const getPrioritiesByLifeArea = computed(() => {
    return (lifeAreaId: string): Priority[] => {
      return priorities.value
        .filter((p) => p.lifeAreaIds?.includes(lifeAreaId))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
  })

  /**
   * Returns a function to filter Priorities by year
   * Usage: store.getPrioritiesByYear(2026)
   */
  const getPrioritiesByYear = computed(() => {
    return (year: number): Priority[] => {
      return priorities.value
        .filter((p) => p.year === year)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
  })

  /**
   * Returns a function to get active Priorities, optionally filtered by year
   * This getter checks the Priority's isActive flag and linked Life Areas' active state
   * Usage: store.getActivePriorities() or store.getActivePriorities(2026)
   */
  const getActivePriorities = computed(() => {
    return (year?: number): Priority[] => {
      // Access the Life Area store to check linked active states
      const lifeAreaStore = useLifeAreaStore()

      return priorities.value
        .filter((p) => {
          // First check the priority's own active state
          if (!p.isActive) return false

          // Then check if filtering by year
          if (year !== undefined && p.year !== year) return false

          // If no linked life areas, treat as active
          if (!p.lifeAreaIds || p.lifeAreaIds.length === 0) return true

          // Otherwise, at least one linked life area must be active
          return p.lifeAreaIds.some((id) => lifeAreaStore.getLifeAreaById(id)?.isActive)
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Validate that linked Life Areas exist
   * @param lifeAreaIds - Life Area IDs to validate
   * @throws Error if any Life Area does not exist
   */
  async function validateLifeAreaIds(lifeAreaIds: string[]): Promise<void> {
    for (const lifeAreaId of lifeAreaIds) {
      const lifeArea = await lifeAreaDexieRepository.getById(lifeAreaId)
      if (!lifeArea) {
        throw new Error(`Life Area with id ${lifeAreaId} not found`)
      }
    }
  }

  /**
   * Load Priorities from the database
   * @param year - Optional year to filter by
   * @param lifeAreaId - Optional Life Area ID to filter by
   */
  async function loadPriorities(year?: number, lifeAreaId?: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      if (lifeAreaId !== undefined) {
        // Filter by Life Area
        priorities.value = await priorityDexieRepository.getByLifeAreaId(lifeAreaId)
      } else if (year !== undefined) {
        // Filter by year
        priorities.value = await priorityDexieRepository.getByYear(year)
      } else {
        // Load all
        priorities.value = await priorityDexieRepository.getAll()
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load priorities'
      error.value = errorMessage
      console.error('Error loading priorities:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new Priority
   * Validates that linked Life Areas exist before creating
   * @param data - Priority data (without id, createdAt, updatedAt)
   * @returns The created Priority
   */
  async function createPriority(data: CreatePriorityPayload): Promise<Priority> {
    error.value = null

    try {
      // Validate linked Life Areas (if any)
      if (data.lifeAreaIds?.length) {
        await validateLifeAreaIds(data.lifeAreaIds)
      }

      const newPriority = await priorityDexieRepository.create({
        ...data,
        lifeAreaIds: data.lifeAreaIds ?? [],
      })
      priorities.value.push(newPriority)
      return newPriority
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create priority'
      error.value = errorMessage
      console.error('Error creating priority:', err)
      throw err
    }
  }

  /**
   * Update an existing Priority
   * If lifeAreaIds are being changed, validates the new Life Areas exist
   * @param id - The Priority ID
   * @param data - Partial Priority data to update
   * @returns The updated Priority
   */
  async function updatePriority(
    id: string,
    data: UpdatePriorityPayload
  ): Promise<Priority> {
    error.value = null

    try {
      // If lifeAreaIds are being updated, validate them
      if (data.lifeAreaIds !== undefined) {
        await validateLifeAreaIds(data.lifeAreaIds)
      }

      const updatedPriority = await priorityDexieRepository.update(id, data)

      // Update local state
      const index = priorities.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        priorities.value[index] = updatedPriority
      }

      return updatedPriority
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update priority'
      error.value = errorMessage
      console.error('Error updating priority:', err)
      throw err
    }
  }

  /**
   * Delete a Priority
   * @param id - The Priority ID
   */
  async function deletePriority(id: string): Promise<void> {
    error.value = null

    try {
      await priorityDexieRepository.delete(id)

      // Update local state
      priorities.value = priorities.value.filter((p) => p.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete priority'
      error.value = errorMessage
      console.error('Error deleting priority:', err)
      throw err
    }
  }

  /**
   * Delete all Priorities linked to a Life Area
   * @param lifeAreaId - The Life Area ID
   */
  async function deletePrioritiesByLifeAreaId(lifeAreaId: string): Promise<void> {
    error.value = null

    try {
      await priorityDexieRepository.deleteByLifeAreaId(lifeAreaId)

      // Update local state
      priorities.value = priorities.value.filter((p) => !p.lifeAreaIds?.includes(lifeAreaId))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete priorities for life area'
      error.value = errorMessage
      console.error('Error deleting priorities for life area:', err)
      throw err
    }
  }

  /**
   * Toggle the active state of a Priority
   * @param id - The Priority ID
   * @param isActive - The new active state
   * @returns The updated Priority
   */
  async function setPriorityActive(id: string, isActive: boolean): Promise<Priority> {
    return updatePriority(id, { isActive })
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    priorities,
    isLoading,
    error,

    // Getters
    sortedPriorities,
    getPriorityById,
    getPrioritiesByLifeArea,
    getPrioritiesByYear,
    getActivePriorities,

    // Actions
    loadPriorities,
    createPriority,
    updatePriority,
    deletePriority,
    deletePrioritiesByLifeAreaId,
    setPriorityActive,
  }
})
