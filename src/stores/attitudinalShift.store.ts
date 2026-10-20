/**
 * Attitudinal Shift Store
 *
 * Manages AttitudinalShift exercises — transform "because..." into
 * "although..." statements (Viktor Frankl's freedom of response).
 */

import { defineStore } from 'pinia'
import type {
  AttitudinalShift,
  CreateAttitudinalShiftPayload,
  UpdateAttitudinalShiftPayload,
} from '@/domain/exercises'
import { attitudinalShiftDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useAttitudinalShiftStore = defineStore('attitudinalShift', () => {
  const shifts = useExerciseCollection<
    AttitudinalShift,
    CreateAttitudinalShiftPayload,
    UpdateAttitudinalShiftPayload
  >({
    repository: attitudinalShiftDexieRepository,
    label: 'attitudinal shift',
    scope: 'attitudinalShiftStore',
    completionSlug: 'attitudinal-shift',
  })

  return {
    shifts: shifts.items,
    isLoading: shifts.isLoading,
    error: shifts.error,
    sortedShifts: shifts.sorted,
    latestShift: shifts.latest,
    getShiftById: shifts.getById,
    loadShifts: shifts.loadAll,
    createShift: shifts.create,
    updateShift: shifts.update,
    deleteShift: shifts.remove,
    reset: shifts.reset,
  }
})
