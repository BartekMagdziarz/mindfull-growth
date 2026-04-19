import type {
  UserProfile,
  CreateUserProfilePayload,
  UpdateUserProfilePayload,
} from '@/domain/userProfile'
import { getUserDatabase } from '@/services/userDatabase.service'

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
  private get table() {
    return getUserDatabase().userProfiles
  }

  async list(): Promise<UserProfile[]> {
    try {
      return await this.table.orderBy('createdAt').reverse().toArray()
    } catch (error) {
      console.error('Failed to list user profiles:', error)
      throw new Error('Failed to retrieve user profiles from database')
    }
  }

  async getById(id: string): Promise<UserProfile | undefined> {
    try {
      return await this.table.get(id)
    } catch (error) {
      console.error(`Failed to get user profile with id ${id}:`, error)
      throw new Error(`Failed to retrieve user profile with id ${id}`)
    }
  }

  async create(payload: CreateUserProfilePayload): Promise<UserProfile> {
    try {
      const now = new Date().toISOString()
      const record: UserProfile = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...payload,
      }
      await this.table.add(toPlain(record))
      return record
    } catch (error) {
      console.error('Failed to create user profile:', error)
      throw new Error('Failed to create user profile in database')
    }
  }

  async update(id: string, payload: UpdateUserProfilePayload): Promise<UserProfile> {
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
      await this.table.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update user profile with id ${id}:`, error)
      throw new Error(`Failed to update user profile with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.table.delete(id)
    } catch (error) {
      console.error(`Failed to delete user profile with id ${id}:`, error)
      throw new Error(`Failed to delete user profile with id ${id}`)
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.table.clear()
    } catch (error) {
      console.error('Failed to clear user profiles:', error)
      throw new Error('Failed to clear user profiles from database')
    }
  }
}

export const userProfileDexieRepository: UserProfileRepository = new UserProfileDexieRepository()
