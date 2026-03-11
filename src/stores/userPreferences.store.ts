import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { DEFAULT_THEME_ID, normalizeThemeId, type ThemeId } from '@/services/theme.service'
import { DEFAULT_LOCALE_ID, normalizeLocaleId, type LocaleId } from '@/services/locale.service'

// Storage keys
const KEYS = {
  THEME: 'preferences.theme',
  LOCALE: 'preferences.locale',
}

// Defaults
const DEFAULTS = {
  THEME: DEFAULT_THEME_ID as ThemeId,
  LOCALE: DEFAULT_LOCALE_ID as LocaleId,
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // State
  const themePreference = ref<ThemeId>(DEFAULTS.THEME)
  const locale = ref<LocaleId>(DEFAULTS.LOCALE)
  const isLoaded = ref(false)

  // Actions
  async function loadPreferences(): Promise<void> {
    if (isLoaded.value) return

    try {
      const storedTheme = await userSettingsDexieRepository.get(KEYS.THEME)
      themePreference.value = normalizeThemeId(storedTheme)

      const storedLocale = await userSettingsDexieRepository.get(KEYS.LOCALE)
      locale.value = normalizeLocaleId(storedLocale)

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

  return {
    // State
    themePreference,
    locale,
    isLoaded,
    // Actions
    loadPreferences,
    setThemePreference,
    setLocale,
  }
})
