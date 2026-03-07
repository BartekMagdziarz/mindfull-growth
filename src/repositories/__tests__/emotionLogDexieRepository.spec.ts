import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { EmotionLog } from '@/domain/emotionLog'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { UserDatabase } from '@/services/userDatabase.service'

describe('emotionLogDexieRepository', () => {
  let db: UserDatabase

  beforeEach(async () => {
    db = await connectTestDatabase()
    await db.emotionLogs.clear()
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
      await db.emotionLogs.bulkAdd(logs)
      const result = await emotionLogDexieRepository.getAll()

      expect(result).toHaveLength(2)
      expect(result).toEqual(logs)
    })

    it('throws a descriptive error when retrieval fails', async () => {
      vi.spyOn(db.emotionLogs, 'toArray').mockRejectedValue(new Error('IndexedDB failure'))

      await expect(emotionLogDexieRepository.getAll()).rejects.toThrow(
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
      await db.emotionLogs.add(log)

      const result = await emotionLogDexieRepository.getById('log-1')

      expect(result).toEqual(log)
    })

    it('throws a descriptive error when lookup fails', async () => {
      vi.spyOn(db.emotionLogs, 'get').mockRejectedValue(new Error('Read failure'))

      await expect(emotionLogDexieRepository.getById('missing')).rejects.toThrow(
        'Failed to retrieve emotion log with id missing'
      )
    })
  })

  describe('create', () => {
    it('generates identifiers and timestamps before persisting', async () => {
      const uuidSpy = vi
        .spyOn(globalThis.crypto, 'randomUUID')
        .mockReturnValue('00000000-0000-4000-8000-000000000000')

      const payload = {
        emotionIds: ['emotion-1'],
        note: 'Feeling good',
      }

      const created = await emotionLogDexieRepository.create(payload)

      expect(uuidSpy).toHaveBeenCalled()
      expect(created.id).toBe('00000000-0000-4000-8000-000000000000')
      expect(new Date(created.createdAt).toString()).not.toBe('Invalid Date')
      expect(new Date(created.updatedAt).toString()).not.toBe('Invalid Date')
      expect(created).toMatchObject({
        id: '00000000-0000-4000-8000-000000000000',
        emotionIds: ['emotion-1'],
        note: 'Feeling good',
      })

      const persisted = await db.emotionLogs.get(created.id)
      expect(persisted).toMatchObject(created)
    })

    it('throws a descriptive error when creation fails', async () => {
      vi.spyOn(db.emotionLogs, 'add').mockRejectedValue(new Error('Write failure'))

      await expect(
        emotionLogDexieRepository.create({
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
      await db.emotionLogs.add(original)
      const now = new Date('2024-03-01T00:00:00.000Z')
      vi.spyOn(Date, 'now').mockReturnValue(now.getTime())

      const updated = await emotionLogDexieRepository.update(original)

      expect(updated).toEqual({
        ...original,
        updatedAt: now.toISOString(),
      })

      const persisted = await db.emotionLogs.get(original.id)
      expect(persisted).toMatchObject(updated)
    })

    it('throws a descriptive error when update fails', async () => {
      vi.spyOn(db.emotionLogs, 'put').mockRejectedValue(new Error('Update failure'))

      await expect(
        emotionLogDexieRepository.update({
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
      const log: EmotionLog = {
        id: 'log-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emotionIds: ['emotion-1'],
      }
      await db.emotionLogs.add(log)

      await emotionLogDexieRepository.delete('log-1')

      const persisted = await db.emotionLogs.get('log-1')
      expect(persisted).toBeUndefined()
    })

    it('throws a descriptive error when deletion fails', async () => {
      vi.spyOn(db.emotionLogs, 'delete').mockRejectedValue(new Error('Delete failure'))

      await expect(emotionLogDexieRepository.delete('log-1')).rejects.toThrow(
        'Failed to delete emotion log with id log-1'
      )
    })
  })
})

