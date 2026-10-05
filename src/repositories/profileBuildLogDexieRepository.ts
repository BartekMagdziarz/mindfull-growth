import { userDatabaseOperation } from './userDatabaseOperation'
import type { ProfileBuildLogEntry, CreateProfileBuildLogPayload } from '@/domain/userProfile'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface ProfileBuildLogRepository {
  list(limit?: number): Promise<ProfileBuildLogEntry[]>
  getById(id: string): Promise<ProfileBuildLogEntry | undefined>
  add(payload: CreateProfileBuildLogPayload): Promise<ProfileBuildLogEntry>
  update(id: string, patch: Partial<ProfileBuildLogEntry>): Promise<ProfileBuildLogEntry>
  clearAll(): Promise<void>
}

class ProfileBuildLogDexieRepository implements ProfileBuildLogRepository {
  async list(limit = 100): Promise<ProfileBuildLogEntry[]> {
    return userDatabaseOperation('r', ['profileBuildLogs'], async db => {
      try {
        return await db.profileBuildLogs.orderBy('timestamp').reverse().limit(limit).toArray()
      } catch (error) {
        console.error('Failed to list profile build logs:', error)
        throw new Error('Failed to retrieve profile build logs from database')
      }
    })
  }

  async getById(id: string): Promise<ProfileBuildLogEntry | undefined> {
    return userDatabaseOperation('r', ['profileBuildLogs'], async db => {
      try {
        return await db.profileBuildLogs.get(id)
      } catch (error) {
        console.error(`Failed to get profile build log with id ${id}:`, error)
        throw new Error(`Failed to retrieve profile build log with id ${id}`)
      }
    })
  }

  async add(payload: CreateProfileBuildLogPayload): Promise<ProfileBuildLogEntry> {
    return userDatabaseOperation('rw', ['profileBuildLogs'], async db => {
      try {
        const record: ProfileBuildLogEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ...payload,
        }
        await db.profileBuildLogs.add(toPlain(record))
        return record
      } catch (error) {
        console.error('Failed to add profile build log entry:', error)
        throw new Error('Failed to add profile build log entry to database')
      }
    })
  }

  async update(id: string, patch: Partial<ProfileBuildLogEntry>): Promise<ProfileBuildLogEntry> {
    return userDatabaseOperation('rw', ['profileBuildLogs'], async db => {
      try {
        const existing = await db.profileBuildLogs.get(id)
        if (!existing) {
          throw new Error(`Build log ${id} not found`)
        }
        // Preserve the immutable id; merge everything else from the patch.
        const updated: ProfileBuildLogEntry = {
          ...existing,
          ...patch,
          id: existing.id,
        }
        await db.profileBuildLogs.put(toPlain(updated))
        return updated
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Build log ')) {
          throw error
        }
        console.error(`Failed to update profile build log with id ${id}:`, error)
        throw new Error(`Failed to update profile build log with id ${id}`)
      }
    })
  }

  async clearAll(): Promise<void> {
    return userDatabaseOperation('rw', ['profileBuildLogs'], async db => {
      try {
        await db.profileBuildLogs.clear()
      } catch (error) {
        console.error('Failed to clear profile build logs:', error)
        throw new Error('Failed to clear profile build logs from database')
      }
    })
  }
}

export const profileBuildLogDexieRepository: ProfileBuildLogRepository =
  new ProfileBuildLogDexieRepository()
