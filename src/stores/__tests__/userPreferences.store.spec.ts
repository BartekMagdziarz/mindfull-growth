import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserPreferencesStore } from '../userPreferences.store'

vi.mock('@/repositories/userSettingsDexieRepository', () => {
  return {
    userSettingsDexieRepository: {
      get: vi.fn(),
      set: vi.fn(),
    },
  }
})

import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

describe('useUserPreferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(undefined)
    vi.mocked(userSettingsDexieRepository.set).mockResolvedValue(undefined)
  })

  it('uses defaults when no settings are stored', async () => {
    const store = useUserPreferencesStore()

    await store.loadPreferences()

    expect(store.themePreference).toBe('current')
    expect(store.locale).toBe('en')
  })

  it('loads a valid theme preference from storage', async () => {
    vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
      if (key === 'preferences.theme') return 'sky-mist'
      return undefined
    })

    const store = useUserPreferencesStore()
    await store.loadPreferences()

    expect(store.themePreference).toBe('sky-mist')
  })

  it('falls back to current when stored theme is invalid', async () => {
    vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
      if (key === 'preferences.theme') return 'midnight'
      return undefined
    })

    const store = useUserPreferencesStore()
    await store.loadPreferences()

    expect(store.themePreference).toBe('current')
  })

  it('persists theme preference when updated', async () => {
    const store = useUserPreferencesStore()

    await store.setThemePreference('sunrise-cloud')

    expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
      'preferences.theme',
      'sunrise-cloud',
    )
    expect(store.themePreference).toBe('sunrise-cloud')
  })

  it('persists locale changes', async () => {
    const store = useUserPreferencesStore()

    await store.setLocale('pl')

    expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
      'preferences.locale',
      'pl',
    )
    expect(store.locale).toBe('pl')
  })
})
