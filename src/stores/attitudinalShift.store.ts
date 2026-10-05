import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Attitudinal Shift Store
 *
 * Manages AttitudinalShift exercises — transform "because..." into
 * "although..." statements (Viktor Frankl's freedom of response).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AttitudinalShift,
  CreateAttitudinalShiftPayload,
  UpdateAttitudinalShiftPayload,
} from '@/domain/exercises'
import { attitudinalShiftDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useAttitudinalShiftStore = defineStore('attitudinalShift', () => {
  const sessionScope = createStoreSessionScope()
  const shifts = ref<AttitudinalShift[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedShifts = computed(() => {
    return [...shifts.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestShift = computed(() => {
    return sortedShifts.value[0] ?? null
  })

  const getShiftById = computed(() => {
    return (id: string): AttitudinalShift | undefined => {
      return shifts.value.find(s => s.id === id)
    }
  })

  async function loadShifts(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        shifts.value = await operation.wait(attitudinalShiftDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load attitudinal shifts'
        console.error('Error loading attitudinal shifts:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createShift(data: CreateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const shift = await operation.wait(attitudinalShiftDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('attitudinal-shift', shift.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      shifts.value.push(shift)
      return shift
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create attitudinal shift'
      console.error('Error creating attitudinal shift:', err)
      throw err
    }
  }

  async function updateShift(
    id: string,
    data: UpdateAttitudinalShiftPayload
  ): Promise<AttitudinalShift> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(attitudinalShiftDexieRepository.update(id, data))
      const index = shifts.value.findIndex(s => s.id === id)
      if (index !== -1) {
        shifts.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update attitudinal shift'
      console.error('Error updating attitudinal shift:', err)
      throw err
    }
  }

  async function deleteShift(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(attitudinalShiftDexieRepository.delete(id))
        shifts.value = shifts.value.filter(s => s.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete attitudinal shift'
        console.error('Error deleting attitudinal shift:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    sessionScope.reset()
    shifts.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    shifts,
    isLoading,
    error,
    sortedShifts,
    latestShift,
    getShiftById,
    loadShifts,
    createShift,
    updateShift,
    deleteShift,
    reset,
  }
})
