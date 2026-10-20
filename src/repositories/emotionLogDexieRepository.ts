import { userDatabaseOperation } from './userDatabaseOperation'
import type { EmotionLog } from '@/domain/emotionLog'
import type { EmotionLogRepository } from './emotionLogRepository'
import { reportError } from '@/utils/reportError'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export class EmotionLogDexieRepository implements EmotionLogRepository {
  async getAll(): Promise<EmotionLog[]> {
    return userDatabaseOperation('r', ['emotionLogs'], async db => {
      try {
        return await db.emotionLogs.toArray()
      } catch (error) {
        reportError('emotionLogs.getAll', error)
        throw new Error('Failed to retrieve emotion logs from database', { cause: error })
      }
    })
  }

  async getById(id: string): Promise<EmotionLog | undefined> {
    return userDatabaseOperation('r', ['emotionLogs'], async db => {
      try {
        return await db.emotionLogs.get(id)
      } catch (error) {
        reportError('emotionLogs.getById', error)
        throw new Error(`Failed to retrieve emotion log with id ${id}`, { cause: error })
      }
    })
  }

  async create(
    data: Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<EmotionLog> {
    return userDatabaseOperation('rw', ['emotionLogs'], async db => {
      try {
        const now = new Date().toISOString()
        const { createdAt: customCreatedAt, ...rest } = data

        // Validate createdAt if provided, fallback to now if invalid
        let createdAt = now
        if (customCreatedAt) {
          const parsedDate = new Date(customCreatedAt)
          if (!isNaN(parsedDate.getTime())) {
            createdAt = customCreatedAt
          } else {
            console.warn('Invalid createdAt provided, using current timestamp:', customCreatedAt)
          }
        }

        const log: EmotionLog = {
          ...rest,
          id: crypto.randomUUID(),
          createdAt,
          updatedAt: now,
        }
        await db.emotionLogs.add(toPlain(log))
        return log
      } catch (error) {
        reportError('emotionLogs.create', error)
        throw new Error('Failed to create emotion log in database', { cause: error })
      }
    })
  }

  async update(log: EmotionLog): Promise<EmotionLog> {
    return userDatabaseOperation('rw', ['emotionLogs'], async db => {
      try {
        const previousUpdatedAt = new Date(log.updatedAt ?? '').getTime()
        let nextTimestamp = Date.now()
        if (!Number.isNaN(previousUpdatedAt) && nextTimestamp <= previousUpdatedAt) {
          nextTimestamp = previousUpdatedAt + 1
        }
        const updatedLog: EmotionLog = {
          ...log,
          updatedAt: new Date(nextTimestamp).toISOString(),
        }
        await db.emotionLogs.put(toPlain(updatedLog))
        return updatedLog
      } catch (error) {
        reportError('emotionLogs.update', error)
        throw new Error(`Failed to update emotion log with id ${log.id}`, { cause: error })
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['emotionLogs'], async db => {
      try {
        await db.emotionLogs.delete(id)
      } catch (error) {
        reportError('emotionLogs.delete', error)
        throw new Error(`Failed to delete emotion log with id ${id}`, { cause: error })
      }
    })
  }
}

export const emotionLogDexieRepository = new EmotionLogDexieRepository()
