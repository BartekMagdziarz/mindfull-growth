/**
 * Habit Store
 *
 * Manages Habits — standalone recurring trackers.
 * Each Habit owns a Tracker (parentType: 'habit', parentId: habitId).
 * Creating a habit atomically creates both the Habit and its owned Tracker.
 * Deleting a habit cascade-deletes its Tracker and TrackerPeriods.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from '@/domain/habit'
import type { CreateTrackerPayload, UpdateTrackerPayload, TrackerCadence } from '@/domain/planning'
import { habitDexieRepository } from '@/repositories/planningDexieRepository'
import { useTrackerStore } from '@/stores/tracker.store'

export const useHabitStore = defineStore('habit', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  const habits = ref<Habit[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================================================
  // Getters
  // ==========================================================================

  const sortedHabits = computed(() => {
    return [...habits.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const getHabitById = computed(() => {
    return (id: string): Habit | undefined => habits.value.find((h) => h.id === id)
  })

  const getActiveHabits = computed(() => {
    return habits.value.filter((h) => h.isActive && !h.isPaused)
  })

  const getHabitsByCadence = computed(() => {
    return (cadence: TrackerCadence): Habit[] =>
      habits.value.filter((h) => h.cadence === cadence)
  })

  const getActiveHabitsByCadence = computed(() => {
    return (cadence: TrackerCadence): Habit[] =>
      habits.value.filter((h) => h.isActive && !h.isPaused && h.cadence === cadence)
  })

  // ==========================================================================
  // Actions
  // ==========================================================================

  async function loadHabits(filters?: {
    activeOnly?: boolean
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loaded: Habit[] = []
      if (filters?.activeOnly) {
        loaded = await habitDexieRepository.getActive()
      } else {
        loaded = await habitDexieRepository.getAll()
      }

      habits.value = loaded
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load habits'
      error.value = message
      console.error('Error loading habits:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a habit and its owned tracker atomically.
   * The tracker is created with parentType: 'habit' and parentId: habit.id.
   */
  async function createHabitWithTracker(
    habitData: CreateHabitPayload,
    trackerData: Omit<CreateTrackerPayload, 'parentType' | 'parentId' | 'lifeAreaIds' | 'priorityIds'>
  ): Promise<Habit> {
    error.value = null
    try {
      // Create habit first to get its ID
      const created = await habitDexieRepository.create(habitData)

      // Create the owned tracker
      const trackerStore = useTrackerStore()
      await trackerStore.createTracker({
        ...trackerData,
        parentType: 'habit',
        parentId: created.id,
        lifeAreaIds: habitData.lifeAreaIds,
        priorityIds: habitData.priorityIds,
      })

      habits.value.push(created)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create habit'
      error.value = message
      console.error('Error creating habit:', err)
      throw err
    }
  }

  /**
   * @deprecated Use createHabitWithTracker instead
   */
  async function createHabit(data: CreateHabitPayload): Promise<Habit> {
    error.value = null
    try {
      const created = await habitDexieRepository.create(data)
      habits.value.push(created)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create habit'
      error.value = message
      console.error('Error creating habit:', err)
      throw err
    }
  }

  async function updateHabit(id: string, data: UpdateHabitPayload): Promise<Habit> {
    error.value = null
    try {
      const updated = await habitDexieRepository.update(id, data)
      const index = habits.value.findIndex((h) => h.id === id)
      if (index !== -1) habits.value[index] = updated
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update habit'
      error.value = message
      console.error('Error updating habit:', err)
      throw err
    }
  }

  /**
   * Update both a habit and its owned tracker.
   */
  async function updateHabitWithTracker(
    id: string,
    habitData: UpdateHabitPayload,
    trackerData: UpdateTrackerPayload
  ): Promise<Habit> {
    error.value = null
    try {
      const updated = await habitDexieRepository.update(id, habitData)
      const index = habits.value.findIndex((h) => h.id === id)
      if (index !== -1) habits.value[index] = updated

      // Update the owned tracker
      const trackerStore = useTrackerStore()
      const trackers = trackerStore.getTrackersByHabit(id)
      if (trackers.length > 0) {
        await trackerStore.updateTracker(trackers[0].id, trackerData)
      }

      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update habit'
      error.value = message
      console.error('Error updating habit:', err)
      throw err
    }
  }

  /**
   * Delete a habit and cascade-delete its owned tracker and tracker periods.
   */
  async function deleteHabit(id: string): Promise<void> {
    error.value = null
    try {
      // Cascade delete owned tracker and its periods
      const trackerStore = useTrackerStore()
      await trackerStore.deleteTrackersByParent('habit', id)

      // Delete the habit
      await habitDexieRepository.delete(id)
      habits.value = habits.value.filter((h) => h.id !== id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete habit'
      error.value = message
      console.error('Error deleting habit:', err)
      throw err
    }
  }

  async function toggleHabitPaused(id: string, isPaused: boolean): Promise<void> {
    await updateHabit(id, { isPaused })
  }

  async function toggleHabitActive(id: string, isActive: boolean): Promise<void> {
    await updateHabit(id, { isActive })
  }

  return {
    habits,
    isLoading,
    error,
    sortedHabits,
    getHabitById,
    getActiveHabits,
    getHabitsByCadence,
    getActiveHabitsByCadence,
    loadHabits,
    createHabit,
    createHabitWithTracker,
    updateHabit,
    updateHabitWithTracker,
    deleteHabit,
    toggleHabitPaused,
    toggleHabitActive,
  }
})
