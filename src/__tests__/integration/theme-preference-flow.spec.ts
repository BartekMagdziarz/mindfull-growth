import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
} from '@/services/userDatabase.service'

const TEST_USER_ID = 'theme-flow-test-user'
const TEST_DB_NAME = `MindfullGrowthDB_${TEST_USER_ID}`

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${name}`))
    request.onblocked = () => resolve()
  })
}

describe('Theme Preference Integration', () => {
  beforeEach(async () => {
    await disconnectUserDatabase()
    await deleteDatabase(TEST_DB_NAME)
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  it('persists theme preference across user database reconnect (reload/login equivalent)', async () => {
    setActivePinia(createPinia())
    await connectUserDatabase(TEST_USER_ID)

    const firstSessionStore = useUserPreferencesStore()
    await firstSessionStore.loadPreferences()
    expect(firstSessionStore.themePreference).toBe('current')

    await firstSessionStore.setThemePreference('sunrise-cloud')
    await disconnectUserDatabase()

    setActivePinia(createPinia())
    await connectUserDatabase(TEST_USER_ID)

    const secondSessionStore = useUserPreferencesStore()
    await secondSessionStore.loadPreferences()

    expect(secondSessionStore.themePreference).toBe('sunrise-cloud')
  })
})
