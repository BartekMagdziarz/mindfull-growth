/**
 * Tracker Store
 *
 * Pinia store for managing unified Trackers and TrackerPeriods.
 * Trackers are measurement definitions attached to Projects ("Key Results"),
 * Processes ("Trackers"), or standalone (linked to Priority/Life Area).
 * TrackerPeriods are the per-period instances users interact with.
 *
 * This store provides:
 * - State management for Trackers and TrackerPeriods
 * - CRUD operations via Dexie repositories
 * - Parent-based lookups (by project, habit, or standalone)
 * - Period-based lookups (by date range, tracker, habit)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Tracker,
  TrackerPeriod,
  CreateTrackerPayload,
  UpdateTrackerPayload,
  CreateTrackerPeriodPayload,
  UpdateTrackerPeriodPayload,
} from '@/domain/planning'
import {
  trackerDexieRepository,
  trackerPeriodDexieRepository,
} from '@/repositories/planningDexieRepository'
import { reconcileProjectTrackersAtomically } from '@/services/projectTrackerReconcile.service'

export const useTrackerStore = defineStore('tracker', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded Trackers */
  const trackers = ref<Tracker[]>([])

  /** All loaded TrackerPeriods */
  const trackerPeriods = ref<TrackerPeriod[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  const sortedTrackers = computed(() => {
    return [...trackers.value].sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const getTrackerById = computed(() => {
    return (id: string): Tracker | undefined => trackers.value.find((t) => t.id === id)
  })

  const getTrackersByParent = computed(() => {
    return (parentType: 'project' | 'habit' | 'commitment', parentId: string): Tracker[] =>
      trackers.value
        .filter((t) => t.parentType === parentType && t.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const getTrackersByProject = computed(() => {
    return (projectId: string): Tracker[] => getTrackersByParent.value('project', projectId)
  })

  const getTrackersByHabit = computed(() => {
    return (habitId: string): Tracker[] => getTrackersByParent.value('habit', habitId)
  })

  const getTrackersByCommitment = computed(() => {
    return (commitmentId: string): Tracker[] => getTrackersByParent.value('commitment', commitmentId)
  })

  const getStandaloneTrackers = computed(() => {
    return trackers.value.filter((t) => !t.parentType)
  })

  const getActiveTrackers = computed(() => {
    return trackers.value.filter((t) => t.isActive)
  })

  const getTrackersByLifeAreaId = computed(() => {
    return (lifeAreaId: string): Tracker[] =>
      trackers.value.filter((t) => t.lifeAreaIds?.includes(lifeAreaId))
  })

  const getTrackersByPriorityId = computed(() => {
    return (priorityId: string): Tracker[] =>
      trackers.value.filter((t) => t.priorityIds?.includes(priorityId))
  })

  // TrackerPeriod getters

  const getTrackerPeriodById = computed(() => {
    return (id: string): TrackerPeriod | undefined => trackerPeriods.value.find((p) => p.id === id)
  })

  const getTrackerPeriodsByTrackerId = computed(() => {
    return (trackerId: string): TrackerPeriod[] =>
      trackerPeriods.value
        .filter((p) => p.trackerId === trackerId)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
  })

  const getTrackerPeriodByTrackerAndDate = computed(() => {
    return (trackerId: string, startDate: string): TrackerPeriod | undefined =>
      trackerPeriods.value.find((p) => p.trackerId === trackerId && p.startDate === startDate)
  })

  const getTrackerPeriodsByDateRange = computed(() => {
    return (startDate: string, endDate: string): TrackerPeriod[] =>
      trackerPeriods.value.filter((p) => p.startDate >= startDate && p.startDate <= endDate)
  })

  const getTrackerPeriodsByHabitId = computed(() => {
    return (habitId: string): TrackerPeriod[] =>
      trackerPeriods.value.filter((p) => p.habitId === habitId)
  })

  // ============================================================================
  // Actions — Trackers
  // ============================================================================

  async function loadTrackers(filters?: {
    parentType?: 'project' | 'habit' | 'commitment'
    parentId?: string
    activeOnly?: boolean
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loaded: Tracker[]

      if (filters?.parentType && filters?.parentId) {
        loaded = await trackerDexieRepository.getByParent(filters.parentType, filters.parentId)
      } else if (filters?.activeOnly) {
        loaded = await trackerDexieRepository.getActive()
      } else {
        loaded = await trackerDexieRepository.getAll()
      }

      trackers.value = loaded
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trackers'
      error.value = message
      console.error('Error loading trackers:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createTracker(data: CreateTrackerPayload): Promise<Tracker> {
    error.value = null
    try {
      const created = await trackerDexieRepository.create(data)
      trackers.value.push(created)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tracker'
      error.value = message
      console.error('Error creating tracker:', err)
      throw err
    }
  }

  async function updateTracker(id: string, data: UpdateTrackerPayload): Promise<Tracker> {
    error.value = null
    try {
      const updated = await trackerDexieRepository.update(id, data)
      const index = trackers.value.findIndex((t) => t.id === id)
      if (index !== -1) trackers.value[index] = updated
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tracker'
      error.value = message
      console.error('Error updating tracker:', err)
      throw err
    }
  }

  async function deleteTracker(id: string): Promise<void> {
    error.value = null
    try {
      // Delete all periods for this tracker first
      await trackerPeriodDexieRepository.deleteByTrackerId(id)
      trackerPeriods.value = trackerPeriods.value.filter((p) => p.trackerId !== id)

      // Then delete the tracker
      await trackerDexieRepository.delete(id)
      trackers.value = trackers.value.filter((t) => t.id !== id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tracker'
      error.value = message
      console.error('Error deleting tracker:', err)
      throw err
    }
  }

  async function deleteTrackersByParent(
    parentType: 'project' | 'habit' | 'commitment',
    parentId: string
  ): Promise<void> {
    error.value = null
    try {
      const parentTrackers = trackers.value.filter(
        (t) => t.parentType === parentType && t.parentId === parentId
      )
      for (const tracker of parentTrackers) {
        await trackerPeriodDexieRepository.deleteByTrackerId(tracker.id)
      }
      trackerPeriods.value = trackerPeriods.value.filter(
        (p) => !parentTrackers.some((t) => t.id === p.trackerId)
      )

      await trackerDexieRepository.deleteByParent(parentType, parentId)
      trackers.value = trackers.value.filter(
        (t) => !(t.parentType === parentType && t.parentId === parentId)
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trackers'
      error.value = message
      console.error('Error deleting trackers by parent:', err)
      throw err
    }
  }

  async function reconcileProjectTrackers(
    projectId: string,
    snapshotTrackers: Tracker[],
    draftTrackers: Partial<Tracker>[]
  ): Promise<void> {
    error.value = null

    try {
      const result = await reconcileProjectTrackersAtomically({
        projectId,
        snapshotTrackers,
        draftTrackers,
      })

      const deletedTrackerIdSet = new Set(result.deletedTrackerIds)
      trackerPeriods.value = trackerPeriods.value.filter(
        (period) => !deletedTrackerIdSet.has(period.trackerId)
      )

      const currentProjectTrackers = await trackerDexieRepository.getByParent('project', projectId)
      trackers.value = [
        ...trackers.value.filter(
          (tracker) => !(tracker.parentType === 'project' && tracker.parentId === projectId)
        ),
        ...currentProjectTrackers,
      ]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reconcile project trackers'
      error.value = message
      console.error('Error reconciling project trackers:', err)
      throw err
    }
  }

  // ============================================================================
  // Actions — TrackerPeriods
  // ============================================================================

  async function loadTrackerPeriods(filters?: {
    trackerId?: string
    startDate?: string
    endDate?: string
    habitId?: string
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loaded: TrackerPeriod[]

      if (filters?.trackerId && filters?.startDate && filters?.endDate) {
        loaded = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
          filters.trackerId,
          filters.startDate,
          filters.endDate
        )
      } else if (filters?.trackerId) {
        loaded = await trackerPeriodDexieRepository.getByTrackerId(filters.trackerId)
      } else if (filters?.startDate && filters?.endDate) {
        loaded = await trackerPeriodDexieRepository.getByDateRange(
          filters.startDate,
          filters.endDate
        )
      } else if (filters?.habitId) {
        loaded = await trackerPeriodDexieRepository.getByHabitId(filters.habitId)
      } else {
        loaded = await trackerPeriodDexieRepository.getAll()
      }

      trackerPeriods.value = loaded
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tracker periods'
      error.value = message
      console.error('Error loading tracker periods:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createTrackerPeriod(data: CreateTrackerPeriodPayload): Promise<TrackerPeriod> {
    error.value = null
    try {
      const created = await trackerPeriodDexieRepository.create(data)
      trackerPeriods.value.push(created)
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tracker period'
      error.value = message
      console.error('Error creating tracker period:', err)
      throw err
    }
  }

  async function updateTrackerPeriod(
    id: string,
    data: UpdateTrackerPeriodPayload
  ): Promise<TrackerPeriod> {
    error.value = null
    try {
      const updated = await trackerPeriodDexieRepository.update(id, data)
      const index = trackerPeriods.value.findIndex((p) => p.id === id)
      if (index !== -1) trackerPeriods.value[index] = updated
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tracker period'
      error.value = message
      console.error('Error updating tracker period:', err)
      throw err
    }
  }

  async function deleteTrackerPeriod(id: string): Promise<void> {
    error.value = null
    try {
      await trackerPeriodDexieRepository.delete(id)
      trackerPeriods.value = trackerPeriods.value.filter((p) => p.id !== id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tracker period'
      error.value = message
      console.error('Error deleting tracker period:', err)
      throw err
    }
  }

  /**
   * Clear local state (useful when switching contexts or logging out)
   */
  function clearState(): void {
    trackers.value = []
    trackerPeriods.value = []
    error.value = null
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    trackers,
    trackerPeriods,
    isLoading,
    error,

    // Tracker Getters
    sortedTrackers,
    getTrackerById,
    getTrackersByParent,
    getTrackersByProject,
    getTrackersByHabit,
    getTrackersByCommitment,
    getStandaloneTrackers,
    getActiveTrackers,
    getTrackersByLifeAreaId,
    getTrackersByPriorityId,

    // TrackerPeriod Getters
    getTrackerPeriodById,
    getTrackerPeriodsByTrackerId,
    getTrackerPeriodByTrackerAndDate,
    getTrackerPeriodsByDateRange,
    getTrackerPeriodsByHabitId,

    // Tracker Actions
    loadTrackers,
    createTracker,
    updateTracker,
    deleteTracker,
    deleteTrackersByParent,
    reconcileProjectTrackers,

    // TrackerPeriod Actions
    loadTrackerPeriods,
    createTrackerPeriod,
    updateTrackerPeriod,
    deleteTrackerPeriod,

    clearState,
  }
})
