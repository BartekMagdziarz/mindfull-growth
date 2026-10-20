/**
 * Positive Data Log Store
 *
 * Manages PositiveDataLogs — ongoing evidence logging against
 * negative core beliefs (Christine Padesky, 1994; Mooney & Padesky, 2000).
 */

import { defineStore } from 'pinia'
import type {
  PositiveDataLog,
  CreatePositiveDataLogPayload,
  UpdatePositiveDataLogPayload,
} from '@/domain/exercises'
import { positiveDataLogDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const usePositiveDataLogStore = defineStore('positiveDataLog', () => {
  const logs = useExerciseCollection<
    PositiveDataLog,
    CreatePositiveDataLogPayload,
    UpdatePositiveDataLogPayload
  >({
    repository: positiveDataLogDexieRepository,
    label: 'positive data log',
    scope: 'positiveDataLogStore',
    completionSlug: 'positive-data-log',
  })

  async function updateLog(
    id: string,
    data: UpdatePositiveDataLogPayload
  ): Promise<PositiveDataLog> {
    const previousEntryCount = logs.getById.value(id)?.entries.length ?? 0
    const updated = await logs.update(id, data)
    // Adding an entry to an ongoing log IS the exercise ("add one piece of
    // evidence") — edits/removals are not completions.
    if (updated.entries.length > previousEntryCount) {
      logs.recordCompletion(updated.id)
    }
    return updated
  }

  return {
    logs: logs.items,
    isLoading: logs.isLoading,
    error: logs.error,
    sortedLogs: logs.sorted,
    activeLogs: logs.sorted,
    latestLog: logs.latest,
    getLogById: logs.getById,
    loadLogs: logs.loadAll,
    createLog: logs.create,
    updateLog,
    deleteLog: logs.remove,
    reset: logs.reset,
  }
})
