import type { UserSettingsRepository } from './userSettingsRepository'
import { getUserDatabase } from '@/services/userDatabase.service'

// Implementation of UserSettingsRepository using IndexedDB via Dexie
class UserSettingsDexieRepository implements UserSettingsRepository {
  private get db() {
    return getUserDatabase()
  }

  async get(key: string): Promise<string | undefined> {
    try {
      const setting = await this.db.userSettings.get(key)
      return setting?.value
    } catch (error) {
      console.error(`Failed to get setting with key ${key}:`, error)
      throw new Error(`Failed to retrieve setting with key ${key}`)
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.db.userSettings.put({ key, value })
    } catch (error) {
      console.error(`Failed to set setting with key ${key}:`, error)
      throw new Error(`Failed to save setting with key ${key}`)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.db.userSettings.delete(key)
    } catch (error) {
      console.error(`Failed to delete setting with key ${key}:`, error)
      throw new Error(`Failed to delete setting with key ${key}`)
    }
  }
}

// Export singleton instance
export const userSettingsDexieRepository = new UserSettingsDexieRepository()

