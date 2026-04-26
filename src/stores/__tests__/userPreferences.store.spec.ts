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
    expect(store.locale).toBe('pl')
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

  describe('includeProfileInChatContext preference', () => {
    it('defaults to false when nothing is stored', async () => {
      const store = useUserPreferencesStore()

      await store.loadPreferences()

      expect(store.includeProfileInChatContext).toBe(false)
    })

    it("loads the stored 'true' value as the boolean true", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'true'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.includeProfileInChatContext).toBe(true)
    })

    it("loads the stored 'false' value as the boolean false", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'false'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.includeProfileInChatContext).toBe(false)
    })

    it('falls back to the default when the stored value is an unexpected string', async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'maybe'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.includeProfileInChatContext).toBe(false)
    })

    it("persists a true value as the string 'true' and updates the ref", async () => {
      const store = useUserPreferencesStore()

      await store.setIncludeProfileInChatContext(true)

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
        'true',
      )
      expect(store.includeProfileInChatContext).toBe(true)
    })

    it("persists a false value as the string 'false' and updates the ref", async () => {
      const store = useUserPreferencesStore()

      await store.setIncludeProfileInChatContext(false)

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
        'false',
      )
      expect(store.includeProfileInChatContext).toBe(false)
    })

    it('coerces truthy/falsy inputs to strict booleans before storing', async () => {
      const store = useUserPreferencesStore()

      // TS-allowed path: the setter is typed to accept boolean only, but the
      // underlying `!!value` guard handles odd inputs from external callers.
      await store.setIncludeProfileInChatContext(
         
        1 as any,
      )

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
        'true',
      )
      expect(store.includeProfileInChatContext).toBe(true)
    })
  })
})
