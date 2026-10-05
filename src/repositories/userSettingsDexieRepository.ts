import { userDatabaseOperation } from './userDatabaseOperation'
import type { UserSettingsRepository } from './userSettingsRepository'

// Implementation of UserSettingsRepository using IndexedDB via Dexie
class UserSettingsDexieRepository implements UserSettingsRepository {
  async get(key: string): Promise<string | undefined> {
    return userDatabaseOperation('r', ['userSettings'], async db => {
      try {
        const setting = await db.userSettings.get(key)
        return setting?.value
      } catch (error) {
        console.error(`Failed to get setting with key ${key}:`, error)
        throw new Error(`Failed to retrieve setting with key ${key}`)
      }
    })
  }

  async set(key: string, value: string): Promise<void> {
    return userDatabaseOperation('rw', ['userSettings'], async db => {
      try {
        await db.userSettings.put({ key, value })
      } catch (error) {
        console.error(`Failed to set setting with key ${key}:`, error)
        throw new Error(`Failed to save setting with key ${key}`)
      }
    })
  }

  async delete(key: string): Promise<void> {
    return userDatabaseOperation('rw', ['userSettings'], async db => {
      try {
        await db.userSettings.delete(key)
      } catch (error) {
        console.error(`Failed to delete setting with key ${key}:`, error)
        throw new Error(`Failed to delete setting with key ${key}`)
      }
    })
  }
}

// Export singleton instance
export const userSettingsDexieRepository = new UserSettingsDexieRepository()
