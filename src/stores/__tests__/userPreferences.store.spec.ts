import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserPreferencesStore } from '../userPreferences.store'

vi.mock('@/repositories/userSettingsDexieRepository', () => {
  return {
    userSettingsDexieRepository: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
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
    vi.mocked(userSettingsDexieRepository.delete).mockResolvedValue(undefined)
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

  describe('profileContextDefault preference', () => {
    it('defaults to true when nothing is stored', async () => {
      const store = useUserPreferencesStore()

      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(true)
    })

    it("loads the stored 'true' value as the boolean true", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.profileContext.default') return 'true'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(true)
    })

    it("loads the stored 'false' value as the boolean false", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.profileContext.default') return 'false'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(false)
    })

    it('falls back to the default when the stored value is an unexpected string', async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.profileContext.default') return 'maybe'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(true)
    })

    it("persists a true value as the string 'true' and updates the ref", async () => {
      const store = useUserPreferencesStore()

      await store.setProfileContextDefault(true)

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.default',
        'true',
      )
      expect(store.profileContextDefault).toBe(true)
    })

    it("persists a false value as the string 'false' and updates the ref", async () => {
      const store = useUserPreferencesStore()

      await store.setProfileContextDefault(false)

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.default',
        'false',
      )
      expect(store.profileContextDefault).toBe(false)
    })

    it('coerces truthy/falsy inputs to strict booleans before storing', async () => {
      const store = useUserPreferencesStore()

      await store.setProfileContextDefault(
        1 as unknown as boolean,
      )

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.default',
        'true',
      )
      expect(store.profileContextDefault).toBe(true)
    })
  })

  describe('profileContextDefaultJournal preference', () => {
    it('defaults to true when nothing is stored', async () => {
      const store = useUserPreferencesStore()

      await store.loadPreferences()

      expect(store.profileContextDefaultJournal).toBe(true)
    })

    it("loads the stored 'false' value as the boolean false", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.profileContext.defaultJournal') return 'false'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefaultJournal).toBe(false)
    })

    it("persists value changes via setProfileContextDefaultJournal", async () => {
      const store = useUserPreferencesStore()

      await store.setProfileContextDefaultJournal(false)

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.defaultJournal',
        'false',
      )
      expect(store.profileContextDefaultJournal).toBe(false)
    })

    it('does not migrate the legacy chat preference into the journal default', async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'false'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      // legacy preference was chat-only — journal default keeps its module default.
      expect(store.profileContextDefaultJournal).toBe(true)
    })
  })

  describe('legacy preference migration', () => {
    it("migrates 'true' from legacy chat preference into profileContextDefault and deletes the old key", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'true'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(true)
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.default',
        'true',
      )
      expect(userSettingsDexieRepository.delete).toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
      )
    })

    it("migrates 'false' from legacy chat preference and preserves user's prior off-choice", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.chat.includeProfile') return 'false'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.profileContextDefault).toBe(false)
      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'preferences.profileContext.default',
        'false',
      )
      expect(userSettingsDexieRepository.delete).toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
      )
    })

    it("does not migrate when the new key already has a value", async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'preferences.profileContext.default') return 'false'
          if (key === 'preferences.chat.includeProfile') return 'true'
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      // New key wins — legacy value is ignored.
      expect(store.profileContextDefault).toBe(false)
      expect(userSettingsDexieRepository.delete).not.toHaveBeenCalledWith(
        'preferences.chat.includeProfile',
      )
    })
  })

  describe('reset', () => {
    it('resets profileContextDefault and profileContextDefaultJournal to defaults', async () => {
      const store = useUserPreferencesStore()

      await store.setProfileContextDefault(false)
      await store.setProfileContextDefaultJournal(false)
      store.reset()

      expect(store.profileContextDefault).toBe(true)
      expect(store.profileContextDefaultJournal).toBe(true)
    })
  })

  describe('foundation refresh dismissal preference', () => {
    it('defaults to undefined when nothing is stored', async () => {
      const store = useUserPreferencesStore()

      await store.loadPreferences()

      expect(store.foundationRefreshDismissedAt).toBeUndefined()
    })

    it('loads a stored dismissal timestamp', async () => {
      vi.mocked(userSettingsDexieRepository.get).mockImplementation(
        async (key) => {
          if (key === 'profile.foundationRefreshDismissedAt') {
            return '2026-05-01T12:00:00.000Z'
          }
          return undefined
        },
      )

      const store = useUserPreferencesStore()
      await store.loadPreferences()

      expect(store.foundationRefreshDismissedAt).toBe(
        '2026-05-01T12:00:00.000Z',
      )
    })

    it('persists a dismissal timestamp and updates the ref', async () => {
      const store = useUserPreferencesStore()

      await store.setFoundationRefreshDismissedAt('2026-05-01T12:00:00.000Z')

      expect(userSettingsDexieRepository.set).toHaveBeenCalledWith(
        'profile.foundationRefreshDismissedAt',
        '2026-05-01T12:00:00.000Z',
      )
      expect(store.foundationRefreshDismissedAt).toBe(
        '2026-05-01T12:00:00.000Z',
      )
    })

    it('removes the dismissal timestamp when set to undefined', async () => {
      const store = useUserPreferencesStore()

      await store.setFoundationRefreshDismissedAt('2026-05-01T12:00:00.000Z')
      await store.setFoundationRefreshDismissedAt(undefined)

      expect(userSettingsDexieRepository.delete).toHaveBeenCalledWith(
        'profile.foundationRefreshDismissedAt',
      )
      expect(store.foundationRefreshDismissedAt).toBeUndefined()
    })

    it('clears the dismissal timestamp via the explicit clear action', async () => {
      const store = useUserPreferencesStore()

      await store.setFoundationRefreshDismissedAt('2026-05-01T12:00:00.000Z')
      await store.clearFoundationRefreshDismissedAt()

      expect(userSettingsDexieRepository.delete).toHaveBeenCalledWith(
        'profile.foundationRefreshDismissedAt',
      )
      expect(store.foundationRefreshDismissedAt).toBeUndefined()
    })

    it('resets the in-memory dismissal timestamp', async () => {
      const store = useUserPreferencesStore()

      await store.setFoundationRefreshDismissedAt('2026-05-01T12:00:00.000Z')
      store.reset()

      expect(store.foundationRefreshDismissedAt).toBeUndefined()
    })
  })
})
