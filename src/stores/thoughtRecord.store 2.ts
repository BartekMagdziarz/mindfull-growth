/**
 * Thought Record Store
 *
 * Manages ThoughtRecords — 7-column cognitive restructuring exercises.
 * Each completion creates a new record, forming a time-series.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ThoughtRecord,
  CreateThoughtRecordPayload,
  UpdateThoughtRecordPayload,
} from '@/domain/exercises'
import { thoughtRecordDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useThoughtRecordStore = defineStore('thoughtRecord', () => {
  const records = ref<ThoughtRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestRecord = computed(() => {
    return sortedRecords.value[0] ?? null
  })

  const getRecordById = computed(() => {
    return (id: string): ThoughtRecord | undefined => {
      return records.value.find((r) => r.id === id)
    }
  })

  async function loadRecords(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      records.value = await thoughtRecordDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load thought records'
      console.error('Error loading thought records:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createRecord(data: CreateThoughtRecordPayload): Promise<ThoughtRecord> {
    error.value = null
    try {
      const record = await thoughtRecordDexieRepository.create(data)
      records.value.push(record)
      return record
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create thought record'
      console.error('Error creating thought record:', err)
      throw err
    }
  }

  async function updateRecord(
    id: string,
    data: UpdateThoughtRecordPayload,
  ): Promise<ThoughtRecord> {
    error.value = null
    try {
      const updated = await thoughtRecordDexieRepository.update(id, data)
      const index = records.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        records.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update thought record'
      console.error('Error updating thought record:', err)
      throw err
    }
  }

  async function deleteRecord(id: string): Promise<void> {
    error.value = null
    try {
      await thoughtRecordDexieRepository.delete(id)
      records.value = records.value.filter((r) => r.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete thought record'
      console.error('Error deleting thought record:', err)
      throw err
    }
  }

  return {
    records,
    isLoading,
    error,
    sortedRecords,
    latestRecord,
    getRecordById,
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  }
})
