import { userDatabaseOperation } from './userDatabaseOperation'
import type {
  UserProfile,
  CreateUserProfilePayload,
  UpdateUserProfilePayload,
} from '@/domain/userProfile'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface UserProfileRepository {
  list(): Promise<UserProfile[]>
  getById(id: string): Promise<UserProfile | undefined>
  create(payload: CreateUserProfilePayload): Promise<UserProfile>
  update(id: string, payload: UpdateUserProfilePayload): Promise<UserProfile>
  delete(id: string): Promise<void>
  clearAll(): Promise<void>
}

class UserProfileDexieRepository implements UserProfileRepository {
  async list(): Promise<UserProfile[]> {
    return userDatabaseOperation('r', ['userProfiles'], async db => {
      try {
        return await db.userProfiles.orderBy('createdAt').reverse().toArray()
      } catch (error) {
        console.error('Failed to list user profiles:', error)
        throw new Error('Failed to retrieve user profiles from database')
      }
    })
  }

  async getById(id: string): Promise<UserProfile | undefined> {
    return userDatabaseOperation('r', ['userProfiles'], async db => {
      try {
        return await db.userProfiles.get(id)
      } catch (error) {
        console.error(`Failed to get user profile with id ${id}:`, error)
        throw new Error(`Failed to retrieve user profile with id ${id}`)
      }
    })
  }

  async create(payload: CreateUserProfilePayload): Promise<UserProfile> {
    return userDatabaseOperation('rw', ['userProfiles'], async db => {
      try {
        const now = new Date().toISOString()
        const record: UserProfile = {
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...payload,
        }
        await db.userProfiles.add(toPlain(record))
        return record
      } catch (error) {
        console.error('Failed to create user profile:', error)
        throw new Error('Failed to create user profile in database')
      }
    })
  }

  async update(id: string, payload: UpdateUserProfilePayload): Promise<UserProfile> {
    return userDatabaseOperation('rw', ['userProfiles'], async db => {
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`UserProfile ${id} not found`)
      }
      try {
        const updated: UserProfile = {
          ...existing,
          ...payload,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        }
        await db.userProfiles.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update user profile with id ${id}:`, error)
        throw new Error(`Failed to update user profile with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['userProfiles'], async db => {
      try {
        await db.userProfiles.delete(id)
      } catch (error) {
        console.error(`Failed to delete user profile with id ${id}:`, error)
        throw new Error(`Failed to delete user profile with id ${id}`)
      }
    })
  }

  async clearAll(): Promise<void> {
    return userDatabaseOperation('rw', ['userProfiles'], async db => {
      try {
        await db.userProfiles.clear()
      } catch (error) {
        console.error('Failed to clear user profiles:', error)
        throw new Error('Failed to clear user profiles from database')
      }
    })
  }
}

export const userProfileDexieRepository: UserProfileRepository = new UserProfileDexieRepository()
