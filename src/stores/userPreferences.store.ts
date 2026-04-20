import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { DEFAULT_THEME_ID, normalizeThemeId, type ThemeId } from '@/services/theme.service'
import {
  DEFAULT_LOCALE_ID, normalizeLocaleId, type LocaleId,
  DEFAULT_GENDER, normalizeGender, type GrammaticalGender,
} from '@/services/locale.service'

// Storage keys
const KEYS = {
  THEME: 'preferences.theme',
  LOCALE: 'preferences.locale',
  GENDER: 'preferences.grammaticalGender',
  // `userSettingsDexieRepository` only stores strings, so boolean preferences
  // are serialised as `'true'` / `'false'` and parsed on load.
  INCLUDE_PROFILE_IN_CHAT_CONTEXT: 'preferences.chat.includeProfile',
}

// Defaults
const DEFAULTS = {
  THEME: DEFAULT_THEME_ID as ThemeId,
  LOCALE: DEFAULT_LOCALE_ID as LocaleId,
  GENDER: DEFAULT_GENDER as GrammaticalGender,
  INCLUDE_PROFILE_IN_CHAT_CONTEXT: false,
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // State
  const themePreference = ref<ThemeId>(DEFAULTS.THEME)
  const locale = ref<LocaleId>(DEFAULTS.LOCALE)
  const grammaticalGender = ref<GrammaticalGender>(DEFAULTS.GENDER)
  const includeProfileInChatContext = ref<boolean>(
    DEFAULTS.INCLUDE_PROFILE_IN_CHAT_CONTEXT,
  )
  const isLoaded = ref(false)

  // Actions
  async function loadPreferences(): Promise<void> {
    if (isLoaded.value) return

    try {
      const storedTheme = await userSettingsDexieRepository.get(KEYS.THEME)
      themePreference.value = normalizeThemeId(storedTheme)

      const storedLocale = await userSettingsDexieRepository.get(KEYS.LOCALE)
      locale.value = normalizeLocaleId(storedLocale)

      const storedGender = await userSettingsDexieRepository.get(KEYS.GENDER)
      grammaticalGender.value = normalizeGender(storedGender)

      // Boolean preference is serialised as the literal string `'true'` or
      // `'false'`. Anything else (missing, legacy values) falls back to the
      // default.
      const storedIncludeProfile = await userSettingsDexieRepository.get(
        KEYS.INCLUDE_PROFILE_IN_CHAT_CONTEXT,
      )
      includeProfileInChatContext.value =
        storedIncludeProfile === 'true'
          ? true
          : storedIncludeProfile === 'false'
            ? false
            : DEFAULTS.INCLUDE_PROFILE_IN_CHAT_CONTEXT

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Use defaults on error
      themePreference.value = DEFAULTS.THEME
      isLoaded.value = true
    }
  }

  async function setThemePreference(theme: ThemeId): Promise<void> {
    const normalizedTheme = normalizeThemeId(theme)
    await userSettingsDexieRepository.set(KEYS.THEME, normalizedTheme)
    themePreference.value = normalizedTheme
  }

  async function setLocale(newLocale: LocaleId): Promise<void> {
    const normalized = normalizeLocaleId(newLocale)
    locale.value = normalized
    await userSettingsDexieRepository.set(KEYS.LOCALE, normalized)
  }

  async function setGrammaticalGender(gender: GrammaticalGender): Promise<void> {
    const normalized = normalizeGender(gender)
    grammaticalGender.value = normalized
    await userSettingsDexieRepository.set(KEYS.GENDER, normalized)
  }

  async function setIncludeProfileInChatContext(
    value: boolean,
  ): Promise<void> {
    const normalized = !!value
    includeProfileInChatContext.value = normalized
    await userSettingsDexieRepository.set(
      KEYS.INCLUDE_PROFILE_IN_CHAT_CONTEXT,
      normalized ? 'true' : 'false',
    )
  }

  return {
    // State
    themePreference,
    locale,
    grammaticalGender,
    includeProfileInChatContext,
    isLoaded,
    // Actions
    loadPreferences,
    setThemePreference,
    setLocale,
    setGrammaticalGender,
    setIncludeProfileInChatContext,
  }
})
