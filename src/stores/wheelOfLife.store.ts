/**
 * Wheel of Life Store
 *
 * @deprecated Legacy store retained only for clean-break compatibility.
 * Active Wheel of Life flows use useLifeAreaAssessmentStore instead.
 *
 * Manages WheelOfLifeSnapshots — timestamped assessments of user-defined life areas.
 * Each exercise completion creates a new snapshot, forming a time-series.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WheelOfLifeSnapshot,
  CreateWheelOfLifeSnapshotPayload,
  UpdateWheelOfLifeSnapshotPayload,
} from '@/domain/exercises'
import { wheelOfLifeSnapshotDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useWheelOfLifeStore = defineStore('wheelOfLife', () => {
  const snapshots = ref<WheelOfLifeSnapshot[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedSnapshots = computed(() => {
    return [...snapshots.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestSnapshot = computed(() => {
    return sortedSnapshots.value[0] ?? null
  })

  const getSnapshotById = computed(() => {
    return (id: string): WheelOfLifeSnapshot | undefined => {
      return snapshots.value.find((s) => s.id === id)
    }
  })

  const getSnapshotsByDateRange = computed(() => {
    return (startDate: string, endDate: string): WheelOfLifeSnapshot[] => {
      return snapshots.value
        .filter((s) => s.createdAt >= startDate && s.createdAt <= endDate + '\uffff')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }
  })

  async function loadSnapshots(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      snapshots.value = await wheelOfLifeSnapshotDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load wheel of life snapshots'
      console.error('Error loading wheel of life snapshots:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createSnapshot(
    data: CreateWheelOfLifeSnapshotPayload,
  ): Promise<WheelOfLifeSnapshot> {
    error.value = null
    try {
      const snapshot = await wheelOfLifeSnapshotDexieRepository.create(data)
      snapshots.value.push(snapshot)
      return snapshot
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to create wheel of life snapshot'
      console.error('Error creating wheel of life snapshot:', err)
      throw err
    }
  }

  async function updateSnapshot(
    id: string,
    data: UpdateWheelOfLifeSnapshotPayload,
  ): Promise<WheelOfLifeSnapshot> {
    error.value = null
    try {
      const updated = await wheelOfLifeSnapshotDexieRepository.update(id, data)
      const index = snapshots.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        snapshots.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to update wheel of life snapshot'
      console.error('Error updating wheel of life snapshot:', err)
      throw err
    }
  }

  async function deleteSnapshot(id: string): Promise<void> {
    error.value = null
    try {
      await wheelOfLifeSnapshotDexieRepository.delete(id)
      snapshots.value = snapshots.value.filter((s) => s.id !== id)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete wheel of life snapshot'
      console.error('Error deleting wheel of life snapshot:', err)
      throw err
    }
  }

  return {
    snapshots,
    isLoading,
    error,
    sortedSnapshots,
    latestSnapshot,
    getSnapshotById,
    getSnapshotsByDateRange,
    loadSnapshots,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
  }
})
