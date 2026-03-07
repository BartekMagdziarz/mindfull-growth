import type { EmotionLog } from '@/domain/emotionLog'
import type { EmotionLogRepository } from './emotionLogRepository'
import { getUserDatabase } from '@/services/userDatabase.service'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export class EmotionLogDexieRepository implements EmotionLogRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<EmotionLog[]> {
    try {
      return await this.db.emotionLogs.toArray()
    } catch (error) {
      console.error('Failed to get all emotion logs:', error)
      throw new Error('Failed to retrieve emotion logs from database')
    }
  }

  async getById(id: string): Promise<EmotionLog | undefined> {
    try {
      return await this.db.emotionLogs.get(id)
    } catch (error) {
      console.error(`Failed to get emotion log with id ${id}:`, error)
      throw new Error(`Failed to retrieve emotion log with id ${id}`)
    }
  }

  async create(
    data: Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<EmotionLog> {
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
      await this.db.emotionLogs.add(toPlain(log))
      return log
    } catch (error) {
      console.error('Failed to create emotion log:', error)
      throw new Error('Failed to create emotion log in database')
    }
  }

  async update(log: EmotionLog): Promise<EmotionLog> {
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
      await this.db.emotionLogs.put(toPlain(updatedLog))
      return updatedLog
    } catch (error) {
      console.error(`Failed to update emotion log with id ${log.id}:`, error)
      throw new Error(`Failed to update emotion log with id ${log.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.emotionLogs.delete(id)
    } catch (error) {
      console.error(`Failed to delete emotion log with id ${id}:`, error)
      throw new Error(`Failed to delete emotion log with id ${id}`)
    }
  }
}

export const emotionLogDexieRepository = new EmotionLogDexieRepository()

