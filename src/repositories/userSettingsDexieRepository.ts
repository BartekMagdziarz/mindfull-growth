import type { UserSettingsRepository } from './userSettingsRepository'
import { db } from './journalDexieRepository'

// Use the shared database instance from journalDexieRepository
// The database schema (version 4) is already defined in MindfullGrowthDatabase

// Implementation of UserSettingsRepository using IndexedDB via Dexie
class UserSettingsDexieRepository implements UserSettingsRepository {
  async get(key: string): Promise<string | undefined> {
    try {
      const setting = await db.userSettings.get(key)
      return setting?.value
    } catch (error) {
      console.error(`Failed to get setting with key ${key}:`, error)
      throw new Error(`Failed to retrieve setting with key ${key}`)
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await db.userSettings.put({ key, value })
    } catch (error) {
      console.error(`Failed to set setting with key ${key}:`, error)
      throw new Error(`Failed to save setting with key ${key}`)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await db.userSettings.delete(key)
    } catch (error) {
      console.error(`Failed to delete setting with key ${key}:`, error)
      throw new Error(`Failed to delete setting with key ${key}`)
    }
  }
}

// Export singleton instance
export const userSettingsDexieRepository = new UserSettingsDexieRepository()

