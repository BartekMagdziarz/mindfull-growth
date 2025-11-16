import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { EmotionLog } from '@/domain/emotionLog'
import { EmotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'

type EmotionLogTableMock = {
  toArray: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function createTableMock(): EmotionLogTableMock {
  return {
    toArray: vi.fn(),
    get: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}

describe('emotionLogDexieRepository', () => {
  let table: EmotionLogTableMock
  let repository: EmotionLogDexieRepository

  beforeEach(() => {
    table = createTableMock()
    repository = new EmotionLogDexieRepository(table as never)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('getAll', () => {
    it('returns all emotion logs from the database', async () => {
      const logs: EmotionLog[] = [
        {
          id: 'log-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          emotionIds: ['emotion-1'],
        },
        {
          id: 'log-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          emotionIds: ['emotion-2'],
        },
      ]

      table.toArray.mockResolvedValue(logs)

      const result = await repository.getAll()

      expect(result).toHaveLength(2)
      expect(result).toEqual(logs)
    })

    it('throws a descriptive error when retrieval fails', async () => {
      table.toArray.mockRejectedValue(new Error('IndexedDB failure'))

      await expect(repository.getAll()).rejects.toThrow(
        'Failed to retrieve emotion logs from database'
      )
    })
  })

  describe('getById', () => {
    it('returns a specific log when it exists', async () => {
      const log: EmotionLog = {
        id: 'log-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: ['emotion-1'],
      }
      table.get.mockResolvedValue(log)

      const result = await repository.getById('log-1')

      expect(result).toEqual(log)
    })

    it('throws a descriptive error when lookup fails', async () => {
      table.get.mockRejectedValue(new Error('Read failure'))

      await expect(repository.getById('missing')).rejects.toThrow(
        'Failed to retrieve emotion log with id missing'
      )
    })
  })

  describe('create', () => {
    it('generates identifiers and timestamps before persisting', async () => {
      const now = new Date('2024-02-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const uuidSpy = vi
        .spyOn(globalThis.crypto, 'randomUUID')
        .mockReturnValue('generated-id')

      const payload = {
        emotionIds: ['emotion-1'],
        note: 'Feeling good',
      }

      table.add.mockResolvedValue(undefined)

      const created = await repository.create(payload)

      expect(uuidSpy).toHaveBeenCalled()
      expect(created).toEqual({
        id: 'generated-id',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...payload,
      })

      expect(table.add).toHaveBeenCalledWith({
        id: 'generated-id',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...payload,
      })
    })

    it('throws a descriptive error when creation fails', async () => {
      table.add.mockRejectedValue(new Error('Write failure'))

      await expect(
        repository.create({
          emotionIds: ['emotion-1'],
        })
      ).rejects.toThrow('Failed to create emotion log in database')
    })
  })

  describe('update', () => {
    it('updates timestamps and persists changes', async () => {
      const original: EmotionLog = {
        id: 'log-1',
        createdAt: '2024-02-28T00:00:00.000Z',
        updatedAt: '2024-02-28T00:00:00.000Z',
        emotionIds: ['emotion-1'],
      }
      const now = new Date('2024-03-01T00:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)

      table.put.mockResolvedValue(undefined)

      const updated = await repository.update(original)

      expect(updated).toEqual({
        ...original,
        updatedAt: now.toISOString(),
      })
      expect(table.put).toHaveBeenCalledWith({
        ...original,
        updatedAt: now.toISOString(),
      })
    })

    it('throws a descriptive error when update fails', async () => {
      table.put.mockRejectedValue(new Error('Update failure'))

      await expect(
        repository.update({
          id: 'log-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          emotionIds: ['emotion-1'],
        })
      ).rejects.toThrow('Failed to update emotion log with id log-1')
    })
  })

  describe('delete', () => {
    it('removes the log from the database', async () => {
      table.delete.mockResolvedValue(undefined)

      await repository.delete('log-1')

      expect(table.delete).toHaveBeenCalledWith('log-1')
    })

    it('throws a descriptive error when deletion fails', async () => {
      table.delete.mockRejectedValue(new Error('Delete failure'))

      await expect(repository.delete('log-1')).rejects.toThrow(
        'Failed to delete emotion log with id log-1'
      )
    })
  })
})



