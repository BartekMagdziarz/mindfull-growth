import type {
  ProfileBuildLogEntry,
  CreateProfileBuildLogPayload,
} from '@/domain/userProfile'
import { getUserDatabase } from '@/services/userDatabase.service'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface ProfileBuildLogRepository {
  list(limit?: number): Promise<ProfileBuildLogEntry[]>
  getById(id: string): Promise<ProfileBuildLogEntry | undefined>
  add(payload: CreateProfileBuildLogPayload): Promise<ProfileBuildLogEntry>
  clearAll(): Promise<void>
}

class ProfileBuildLogDexieRepository implements ProfileBuildLogRepository {
  private get table() {
    return getUserDatabase().profileBuildLogs
  }

  async list(limit = 100): Promise<ProfileBuildLogEntry[]> {
    try {
      return await this.table.orderBy('timestamp').reverse().limit(limit).toArray()
    } catch (error) {
      console.error('Failed to list profile build logs:', error)
      throw new Error('Failed to retrieve profile build logs from database')
    }
  }

  async getById(id: string): Promise<ProfileBuildLogEntry | undefined> {
    try {
      return await this.table.get(id)
    } catch (error) {
      console.error(`Failed to get profile build log with id ${id}:`, error)
      throw new Error(`Failed to retrieve profile build log with id ${id}`)
    }
  }

  async add(payload: CreateProfileBuildLogPayload): Promise<ProfileBuildLogEntry> {
    try {
      const record: ProfileBuildLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...payload,
      }
      await this.table.add(toPlain(record))
      return record
    } catch (error) {
      console.error('Failed to add profile build log entry:', error)
      throw new Error('Failed to add profile build log entry to database')
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.table.clear()
    } catch (error) {
      console.error('Failed to clear profile build logs:', error)
      throw new Error('Failed to clear profile build logs from database')
    }
  }
}

export const profileBuildLogDexieRepository: ProfileBuildLogRepository =
  new ProfileBuildLogDexieRepository()
