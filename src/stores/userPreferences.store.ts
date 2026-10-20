import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { DEFAULT_THEME_ID, normalizeThemeId, type ThemeId } from '@/services/themeService'
import {
  DEFAULT_LOCALE_ID,
  normalizeLocaleId,
  type LocaleId,
  DEFAULT_GENDER,
  normalizeGender,
  type GrammaticalGender,
} from '@/services/localeService'

// Storage keys
const KEYS = {
  THEME: 'preferences.theme',
  LOCALE: 'preferences.locale',
  GENDER: 'preferences.grammaticalGender',
  // `userSettingsDexieRepository` only stores strings, so boolean preferences
  // are serialised as `'true'` / `'false'` and parsed on load.
  PROFILE_CONTEXT_DEFAULT: 'preferences.profileContext.default',
  PROFILE_CONTEXT_DEFAULT_JOURNAL: 'preferences.profileContext.defaultJournal',
  TODAY_COLLAPSE_COMPLETED: 'preferences.today.collapseCompleted',
  // Legacy key — read once during loadPreferences() to migrate the value
  // into PROFILE_CONTEXT_DEFAULT, then deleted. Do not introduce new
  // writes against this key.
  LEGACY_INCLUDE_PROFILE_IN_CHAT_CONTEXT: 'preferences.chat.includeProfile',
  PROFILE_FOUNDATION_REFRESH_DISMISSED_AT: 'profile.foundationRefreshDismissedAt',
}

// Defaults
const DEFAULTS = {
  THEME: DEFAULT_THEME_ID as ThemeId,
  LOCALE: DEFAULT_LOCALE_ID as LocaleId,
  GENDER: DEFAULT_GENDER as GrammaticalGender,
  PROFILE_CONTEXT_DEFAULT: true,
  PROFILE_CONTEXT_DEFAULT_JOURNAL: true,
  // Day list shows completed rows by default; collapsing them is a user choice.
  TODAY_COLLAPSE_COMPLETED: false,
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  const sessionScope = createStoreSessionScope()
  // State
  const themePreference = ref<ThemeId>(DEFAULTS.THEME)
  const locale = ref<LocaleId>(DEFAULTS.LOCALE)
  const grammaticalGender = ref<GrammaticalGender>(DEFAULTS.GENDER)
  const profileContextDefault = ref<boolean>(DEFAULTS.PROFILE_CONTEXT_DEFAULT)
  const profileContextDefaultJournal = ref<boolean>(DEFAULTS.PROFILE_CONTEXT_DEFAULT_JOURNAL)
  const todayCollapseCompleted = ref<boolean>(DEFAULTS.TODAY_COLLAPSE_COMPLETED)
  const foundationRefreshDismissedAt = ref<string | undefined>(undefined)
  const isLoaded = ref(false)

  // Actions
  async function loadPreferences(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      if (isLoaded.value) return

      try {
        const storedTheme = await operation.wait(userSettingsDexieRepository.get(KEYS.THEME))
        themePreference.value = normalizeThemeId(storedTheme)

        const storedLocale = await operation.wait(userSettingsDexieRepository.get(KEYS.LOCALE))
        locale.value = normalizeLocaleId(storedLocale)

        const storedGender = await operation.wait(userSettingsDexieRepository.get(KEYS.GENDER))
        grammaticalGender.value = normalizeGender(storedGender)

        // Boolean preferences are serialised as the literal string `'true'`
        // or `'false'`. Anything else (missing, garbage) falls back to the
        // default.
        const storedProfileDefault = await operation.wait(
          userSettingsDexieRepository.get(KEYS.PROFILE_CONTEXT_DEFAULT)
        )
        const storedProfileDefaultJournal = await operation.wait(
          userSettingsDexieRepository.get(KEYS.PROFILE_CONTEXT_DEFAULT_JOURNAL)
        )

        // Soft migration: when no new key is present yet, fall back to the
        // legacy `includeProfileInChatContext` value (chat-only). The
        // journal default keeps its module default — the legacy preference
        // was scoped to general chat and does not speak for journals.
        let migratedDefault: boolean | undefined
        if (storedProfileDefault === undefined) {
          const legacy = await operation.wait(
            userSettingsDexieRepository.get(KEYS.LEGACY_INCLUDE_PROFILE_IN_CHAT_CONTEXT)
          )
          if (legacy === 'true' || legacy === 'false') {
            migratedDefault = legacy === 'true'
            await operation.wait(
              userSettingsDexieRepository.set(
                KEYS.PROFILE_CONTEXT_DEFAULT,
                migratedDefault ? 'true' : 'false'
              )
            )
            await operation.wait(
              userSettingsDexieRepository.delete(KEYS.LEGACY_INCLUDE_PROFILE_IN_CHAT_CONTEXT)
            )
          }
        }

        profileContextDefault.value =
          storedProfileDefault === 'true'
            ? true
            : storedProfileDefault === 'false'
              ? false
              : migratedDefault !== undefined
                ? migratedDefault
                : DEFAULTS.PROFILE_CONTEXT_DEFAULT

        profileContextDefaultJournal.value =
          storedProfileDefaultJournal === 'true'
            ? true
            : storedProfileDefaultJournal === 'false'
              ? false
              : DEFAULTS.PROFILE_CONTEXT_DEFAULT_JOURNAL

        const storedCollapseCompleted = await operation.wait(
          userSettingsDexieRepository.get(KEYS.TODAY_COLLAPSE_COMPLETED)
        )
        todayCollapseCompleted.value =
          storedCollapseCompleted === 'true'
            ? true
            : storedCollapseCompleted === 'false'
              ? false
              : DEFAULTS.TODAY_COLLAPSE_COMPLETED

        foundationRefreshDismissedAt.value = await operation.wait(
          userSettingsDexieRepository.get(KEYS.PROFILE_FOUNDATION_REFRESH_DISMISSED_AT)
        )

        isLoaded.value = true
      } catch (error) {
        if (!operation.isCurrent()) return
        console.error('Failed to load user preferences:', error)
        // Use defaults on error
        themePreference.value = DEFAULTS.THEME
        isLoaded.value = true
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setThemePreference(theme: ThemeId): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalizedTheme = normalizeThemeId(theme)
      await operation.wait(userSettingsDexieRepository.set(KEYS.THEME, normalizedTheme))
      themePreference.value = normalizedTheme
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setLocale(newLocale: LocaleId): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalized = normalizeLocaleId(newLocale)
      locale.value = normalized
      await operation.wait(userSettingsDexieRepository.set(KEYS.LOCALE, normalized))
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setGrammaticalGender(gender: GrammaticalGender): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalized = normalizeGender(gender)
      grammaticalGender.value = normalized
      await operation.wait(userSettingsDexieRepository.set(KEYS.GENDER, normalized))
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setProfileContextDefault(value: boolean): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalized = !!value
      profileContextDefault.value = normalized
      await operation.wait(
        userSettingsDexieRepository.set(KEYS.PROFILE_CONTEXT_DEFAULT, normalized ? 'true' : 'false')
      )
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setProfileContextDefaultJournal(value: boolean): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalized = !!value
      profileContextDefaultJournal.value = normalized
      await operation.wait(
        userSettingsDexieRepository.set(
          KEYS.PROFILE_CONTEXT_DEFAULT_JOURNAL,
          normalized ? 'true' : 'false'
        )
      )
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setTodayCollapseCompleted(value: boolean): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      const normalized = !!value
      todayCollapseCompleted.value = normalized
      await operation.wait(
        userSettingsDexieRepository.set(
          KEYS.TODAY_COLLAPSE_COMPLETED,
          normalized ? 'true' : 'false'
        )
      )
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function setFoundationRefreshDismissedAt(value: string | undefined): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      foundationRefreshDismissedAt.value = value

      if (value) {
        await operation.wait(
          userSettingsDexieRepository.set(KEYS.PROFILE_FOUNDATION_REFRESH_DISMISSED_AT, value)
        )
        return
      }

      await operation.wait(
        userSettingsDexieRepository.delete(KEYS.PROFILE_FOUNDATION_REFRESH_DISMISSED_AT)
      )
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function clearFoundationRefreshDismissedAt(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      await operation.wait(setFoundationRefreshDismissedAt(undefined))
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory preferences to module-level defaults. Called on
   * user logout/login by the watcher in `AppShell.vue` so that user B does
   * not see user A's theme/locale before `loadPreferences()` re-fetches
   * from the newly-connected per-user Dexie database.
   *
   * `isLoaded` MUST be set to `false` — otherwise the early-return guard in
   * `loadPreferences()` would skip the reload entirely.
   */
  function reset(): void {
    sessionScope.reset()
    themePreference.value = DEFAULTS.THEME
    locale.value = DEFAULTS.LOCALE
    grammaticalGender.value = DEFAULTS.GENDER
    profileContextDefault.value = DEFAULTS.PROFILE_CONTEXT_DEFAULT
    profileContextDefaultJournal.value = DEFAULTS.PROFILE_CONTEXT_DEFAULT_JOURNAL
    todayCollapseCompleted.value = DEFAULTS.TODAY_COLLAPSE_COMPLETED
    foundationRefreshDismissedAt.value = undefined
    isLoaded.value = false
  }

  return {
    // State
    themePreference,
    locale,
    grammaticalGender,
    profileContextDefault,
    profileContextDefaultJournal,
    todayCollapseCompleted,
    foundationRefreshDismissedAt,
    isLoaded,
    // Actions
    loadPreferences,
    setThemePreference,
    setLocale,
    setGrammaticalGender,
    setProfileContextDefault,
    setProfileContextDefaultJournal,
    setTodayCollapseCompleted,
    setFoundationRefreshDismissedAt,
    clearFoundationRefreshDismissedAt,
    reset,
  }
})
