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

export const useAttitudinalShiftStore = defineStore('attitudinalShift', () => {
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
      return shifts.value.find((s) => s.id === id)
    }
  })

  async function loadShifts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      shifts.value = await attitudinalShiftDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load attitudinal shifts'
      console.error('Error loading attitudinal shifts:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createShift(data: CreateAttitudinalShiftPayload): Promise<AttitudinalShift> {
    error.value = null
    try {
      const shift = await attitudinalShiftDexieRepository.create(data)
      shifts.value.push(shift)
      return shift
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create attitudinal shift'
      console.error('Error creating attitudinal shift:', err)
      throw err
    }
  }

  async function updateShift(
    id: string,
    data: UpdateAttitudinalShiftPayload,
  ): Promise<AttitudinalShift> {
    error.value = null
    try {
      const updated = await attitudinalShiftDexieRepository.update(id, data)
      const index = shifts.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        shifts.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update attitudinal shift'
      console.error('Error updating attitudinal shift:', err)
      throw err
    }
  }

  async function deleteShift(id: string): Promise<void> {
    error.value = null
    try {
      await attitudinalShiftDexieRepository.delete(id)
      shifts.value = shifts.value.filter((s) => s.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete attitudinal shift'
      console.error('Error deleting attitudinal shift:', err)
      throw err
    }
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
  }
})
