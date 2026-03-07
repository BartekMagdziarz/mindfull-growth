/**
 * Habit Occurrence Store
 *
 * Tracks generated occurrences for habits across periods.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  HabitOccurrence,
  CreateHabitOccurrencePayload,
  UpdateHabitOccurrencePayload,
} from '@/domain/habit'
import { habitOccurrenceDexieRepository } from '@/repositories/planningDexieRepository'

export const useHabitOccurrenceStore = defineStore('habitOccurrence', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  const occurrences = ref<HabitOccurrence[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================================================
  // Getters
  // ==========================================================================

  const getByHabitId = computed(() => {
    return (habitId: string): HabitOccurrence[] =>
      occurrences.value.filter((occurrence) => occurrence.habitId === habitId)
  })

  const getByHabitIdAndPeriod = computed(() => {
    return (habitId: string, periodStartDate: string): HabitOccurrence | undefined =>
      occurrences.value.find(
        (occurrence) =>
          occurrence.habitId === habitId && occurrence.periodStartDate === periodStartDate
      )
  })

  // ==========================================================================
  // Actions
  // ==========================================================================

  async function loadOccurrences(filters?: { habitId?: string }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loaded: HabitOccurrence[] = []
      if (filters?.habitId) {
        loaded = await habitOccurrenceDexieRepository.getByHabitId(filters.habitId)
      } else {
        loaded = await habitOccurrenceDexieRepository.getAll()
      }
      occurrences.value = loaded
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load habit occurrences'
      error.value = message
      console.error('Error loading habit occurrences:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createOccurrence(
    data: CreateHabitOccurrencePayload
  ): Promise<HabitOccurrence> {
    error.value = null
    try {
      const created = await habitOccurrenceDexieRepository.create(data)
      occurrences.value.push(created)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create habit occurrence'
      error.value = message
      console.error('Error creating habit occurrence:', err)
      throw err
    }
  }

  async function updateOccurrence(
    id: string,
    data: UpdateHabitOccurrencePayload
  ): Promise<HabitOccurrence> {
    error.value = null
    try {
      const updated = await habitOccurrenceDexieRepository.update(id, data)
      const index = occurrences.value.findIndex((occurrence) => occurrence.id === id)
      if (index !== -1) {
        occurrences.value[index] = updated
      } else {
        occurrences.value.push(updated)
      }
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update habit occurrence'
      error.value = message
      console.error('Error updating habit occurrence:', err)
      throw err
    }
  }

  async function upsertOccurrence(params: {
    habitId: string
    periodType: HabitOccurrence['periodType']
    periodStartDate: string
    status: HabitOccurrence['status']
  }): Promise<HabitOccurrence> {
    const existing =
      getByHabitIdAndPeriod.value(params.habitId, params.periodStartDate) ||
      (await habitOccurrenceDexieRepository.getByHabitIdAndPeriod(
        params.habitId,
        params.periodStartDate
      ))

    if (existing) {
      const updated = await updateOccurrence(existing.id, {
        status: params.status,
      })
      return updated
    }

    return createOccurrence({
      habitId: params.habitId,
      periodType: params.periodType,
      periodStartDate: params.periodStartDate,
      status: params.status,
    })
  }

  async function markSkipped(
    habitId: string,
    periodType: HabitOccurrence['periodType'],
    periodStartDate: string
  ): Promise<void> {
    await upsertOccurrence({ habitId, periodType, periodStartDate, status: 'skipped' })
  }

  async function markCustom(
    habitId: string,
    periodType: HabitOccurrence['periodType'],
    periodStartDate: string
  ): Promise<void> {
    await upsertOccurrence({ habitId, periodType, periodStartDate, status: 'custom' })
  }

  async function markGenerated(
    habitId: string,
    periodType: HabitOccurrence['periodType'],
    periodStartDate: string
  ): Promise<void> {
    await upsertOccurrence({
      habitId,
      periodType,
      periodStartDate,
      status: 'generated',
    })
  }

  return {
    occurrences,
    isLoading,
    error,
    getByHabitId,
    getByHabitIdAndPeriod,
    loadOccurrences,
    createOccurrence,
    updateOccurrence,
    upsertOccurrence,
    markSkipped,
    markCustom,
    markGenerated,
  }
})
