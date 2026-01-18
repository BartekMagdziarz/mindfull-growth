import type { Table } from 'dexie'
import type { EmotionLog } from '@/domain/emotionLog'
import type { EmotionLogRepository } from './emotionLogRepository'
import { db } from '@/repositories/journalDexieRepository'

type EmotionLogTable = Pick<
  Table<EmotionLog, string>,
  'toArray' | 'get' | 'add' | 'put' | 'delete'
>

export class EmotionLogDexieRepository implements EmotionLogRepository {
  constructor(private readonly table: EmotionLogTable = db.emotionLogs) {}

  async getAll(): Promise<EmotionLog[]> {
    try {
      return await this.table.toArray()
    } catch (error) {
      console.error('Failed to get all emotion logs:', error)
      throw new Error('Failed to retrieve emotion logs from database')
    }
  }

  async getById(id: string): Promise<EmotionLog | undefined> {
    try {
      return await this.table.get(id)
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
      const log: EmotionLog = {
        id: crypto.randomUUID(),
        createdAt: data.createdAt || now,
        updatedAt: now,
        ...data,
      }
      await this.table.add(log)
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
      await this.table.put(updatedLog)
      return updatedLog
    } catch (error) {
      console.error(`Failed to update emotion log with id ${log.id}:`, error)
      throw new Error(`Failed to update emotion log with id ${log.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.table.delete(id)
    } catch (error) {
      console.error(`Failed to delete emotion log with id ${id}:`, error)
      throw new Error(`Failed to delete emotion log with id ${id}`)
    }
  }
}

export const emotionLogDexieRepository = new EmotionLogDexieRepository()

