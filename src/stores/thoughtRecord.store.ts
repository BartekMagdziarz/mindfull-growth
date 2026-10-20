/**
 * Thought Record Store
 *
 * Manages ThoughtRecords — 7-column cognitive restructuring exercises.
 * Each completion creates a new record, forming a time-series.
 */

import { defineStore } from 'pinia'
import type {
  ThoughtRecord,
  CreateThoughtRecordPayload,
  UpdateThoughtRecordPayload,
} from '@/domain/exercises'
import { thoughtRecordDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useThoughtRecordStore = defineStore('thoughtRecord', () => {
  const records = useExerciseCollection<
    ThoughtRecord,
    CreateThoughtRecordPayload,
    UpdateThoughtRecordPayload
  >({
    repository: thoughtRecordDexieRepository,
    label: 'thought record',
    scope: 'thoughtRecordStore',
    completionSlug: 'thought-record',
  })

  return {
    records: records.items,
    isLoading: records.isLoading,
    error: records.error,
    sortedRecords: records.sorted,
    latestRecord: records.latest,
    getRecordById: records.getById,
    loadRecords: records.loadAll,
    createRecord: records.create,
    updateRecord: records.update,
    deleteRecord: records.remove,
    reset: records.reset,
  }
})
