import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEmotionLogStore } from '../emotionLog.store'
import type { EmotionLog } from '@/domain/emotionLog'
import type { EmotionLogRepository } from '@/repositories/emotionLogRepository'

const VALIDATION_ERROR_MESSAGE = 'At least one emotion must be selected'

vi.mock('@/repositories/emotionLogDexieRepository', () => {
  const mockRepository: EmotionLogRepository = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  return {
    emotionLogDexieRepository: mockRepository,
  }
})

import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'

function buildLog(overrides: Partial<EmotionLog>): EmotionLog {
  return {
    id: 'log-id',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    emotionIds: [],
    peopleTagIds: [],
    contextTagIds: [],
    ...overrides,
  }
}

describe('useEmotionLogStore', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('loadLogs', () => {
    it('loads logs successfully and updates state', async () => {
      const store = useEmotionLogStore()
      const logs: EmotionLog[] = [
        buildLog({
          id: 'log-1',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
          emotionIds: ['emotion-1'],
        }),
        buildLog({
          id: 'log-2',
          createdAt: '2024-01-02T12:00:00.000Z',
          updatedAt: '2024-01-02T12:00:00.000Z',
          emotionIds: ['emotion-2'],
        }),
      ]

      vi.mocked(emotionLogDexieRepository.getAll).mockResolvedValue(logs)

      await store.loadLogs()

      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.logs).toHaveLength(2)
      expect(store.logs).toEqual(logs)
    })

    it('sets loading state during request and clears after completion', async () => {
      const store = useEmotionLogStore()
      let resolvePromise: (value: EmotionLog[]) => void
      const pendingPromise = new Promise<EmotionLog[]>((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(emotionLogDexieRepository.getAll).mockReturnValue(pendingPromise)

      const loadPromise = store.loadLogs()
      expect(store.isLoading).toBe(true)

      resolvePromise!([])
      await loadPromise

      expect(store.isLoading).toBe(false)
    })

    it('captures errors when loading fails', async () => {
      const store = useEmotionLogStore()
      const error = new Error('Database failure')

      vi.mocked(emotionLogDexieRepository.getAll).mockRejectedValue(error)

      await store.loadLogs()

      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(error.message)
      expect(store.logs).toHaveLength(0)
    })
  })

  describe('createLog', () => {
    it('validates emotion ids and creates a log', async () => {
      const store = useEmotionLogStore()
      const payload = {
        emotionIds: ['emotion-1', 'emotion-2'],
        note: 'Felt multiple emotions',
      }
      const createdLog: EmotionLog = buildLog({
        id: 'log-created',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        ...payload,
      })

      vi.mocked(emotionLogDexieRepository.create).mockResolvedValue(createdLog)

      const result = await store.createLog(payload)

      expect(emotionLogDexieRepository.create).toHaveBeenCalledWith(payload)
      expect(store.logs).toContainEqual(createdLog)
      expect(result).toEqual(createdLog)
      expect(store.error).toBeNull()
    })

    it('throws validation error when emotion ids are empty', async () => {
      const store = useEmotionLogStore()
      const payload = {
        emotionIds: [],
      }

      await expect(
        store.createLog(payload as Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'>)
      ).rejects.toThrow(VALIDATION_ERROR_MESSAGE)
      expect(store.logs).toHaveLength(0)
      expect(store.error).toBe(VALIDATION_ERROR_MESSAGE)
      expect(emotionLogDexieRepository.create).not.toHaveBeenCalled()
    })

    it('throws validation error when emotion ids are missing', async () => {
      const store = useEmotionLogStore()
      const payload = {}

      await expect(
        store.createLog(
          payload as Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'>
        )
      ).rejects.toThrow(VALIDATION_ERROR_MESSAGE)
      expect(store.logs).toHaveLength(0)
      expect(store.error).toBe(VALIDATION_ERROR_MESSAGE)
      expect(emotionLogDexieRepository.create).not.toHaveBeenCalled()
    })

    it('propagates repository errors', async () => {
      const store = useEmotionLogStore()
      const payload = {
        emotionIds: ['emotion-1'],
      }
      const error = new Error('Write failed')

      vi.mocked(emotionLogDexieRepository.create).mockRejectedValue(error)

      await expect(
        store.createLog(payload)
      ).rejects.toThrow('Write failed')

      expect(store.error).toBe(error.message)
      expect(store.logs).toHaveLength(0)
    })
  })

  describe('updateLog', () => {
    it('updates an existing log and replaces it in state', async () => {
      const store = useEmotionLogStore()
      const original: EmotionLog = buildLog({
        id: 'log-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: ['emotion-1'],
        note: 'Original note',
      })
      const updated: EmotionLog = buildLog({
        ...original,
        updatedAt: '2024-01-02T00:00:00.000Z',
        emotionIds: ['emotion-2'],
        note: 'Updated note',
      })
      store.logs = [original]

      vi.mocked(emotionLogDexieRepository.update).mockResolvedValue(updated)

      const result = await store.updateLog(updated)

      expect(emotionLogDexieRepository.update).toHaveBeenCalledWith(updated)
      expect(store.logs[0]).toEqual(updated)
      expect(result).toEqual(updated)
      expect(store.error).toBeNull()
    })

    it('throws validation error when emotion ids are empty', async () => {
      const store = useEmotionLogStore()
      const log = {
        id: 'log-invalid',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: [],
      }

      await expect(store.updateLog(log as EmotionLog)).rejects.toThrow(
        VALIDATION_ERROR_MESSAGE
      )
      expect(store.error).toBe(VALIDATION_ERROR_MESSAGE)
      expect(emotionLogDexieRepository.update).not.toHaveBeenCalled()
    })

    it('throws validation error when emotion ids are missing', async () => {
      const store = useEmotionLogStore()
      const log = {
        id: 'log-invalid',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      await expect(store.updateLog(log as unknown as EmotionLog)).rejects.toThrow(
        VALIDATION_ERROR_MESSAGE
      )
      expect(store.error).toBe(VALIDATION_ERROR_MESSAGE)
      expect(emotionLogDexieRepository.update).not.toHaveBeenCalled()
    })

    it('propagates repository errors', async () => {
      const store = useEmotionLogStore()
      const log: EmotionLog = {
        id: 'log-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: ['emotion-1'],
      }
      store.logs = [log]
      const error = new Error('Update failure')

      vi.mocked(emotionLogDexieRepository.update).mockRejectedValue(error)

      await expect(store.updateLog(log)).rejects.toThrow('Update failure')
      expect(store.error).toBe(error.message)
      expect(store.logs[0]).toEqual(log)
    })
  })

  describe('deleteLog', () => {
    it('removes the log from state when deletion succeeds', async () => {
      const store = useEmotionLogStore()
      const logs: EmotionLog[] = [
        buildLog({
          id: 'log-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          emotionIds: ['emotion-1'],
        }),
        buildLog({
          id: 'log-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          emotionIds: ['emotion-2'],
        }),
      ]
      store.logs = logs

      vi.mocked(emotionLogDexieRepository.delete).mockResolvedValue()

      await store.deleteLog('log-1')

      expect(emotionLogDexieRepository.delete).toHaveBeenCalledWith('log-1')
      expect(store.logs).toHaveLength(1)
      expect(store.logs[0].id).toBe('log-2')
      expect(store.error).toBeNull()
    })

    it('propagates repository errors during deletion', async () => {
      const store = useEmotionLogStore()
      const log: EmotionLog = buildLog({
        id: 'log-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: ['emotion-1'],
      })
      store.logs = [log]
      const error = new Error('Delete failure')

      vi.mocked(emotionLogDexieRepository.delete).mockRejectedValue(error)

      await expect(store.deleteLog('log-1')).rejects.toThrow('Delete failure')
      expect(store.error).toBe(error.message)
      expect(store.logs).toHaveLength(1)
    })
  })

  describe('sortedLogs', () => {
    it('sorts logs by createdAt in descending order', () => {
      const store = useEmotionLogStore()
      const logs: EmotionLog[] = [
        {
          id: 'oldest',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          emotionIds: ['emotion-1'],
        },
        {
          id: 'newest',
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
          emotionIds: ['emotion-3'],
        },
        {
          id: 'middle',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          emotionIds: ['emotion-2'],
        },
      ]

      store.logs = logs

      const sorted = store.sortedLogs
      expect(sorted.map((log) => log.id)).toEqual(['newest', 'middle', 'oldest'])
    })
  })
})


