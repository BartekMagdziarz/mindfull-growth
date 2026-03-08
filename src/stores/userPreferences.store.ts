import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { DEFAULT_THEME_ID, normalizeThemeId, type ThemeId } from '@/services/theme.service'
import { DEFAULT_LOCALE_ID, normalizeLocaleId, type LocaleId } from '@/services/locale.service'
import type {
  TodayModuleDensity,
  TodayRecommendationFeedback,
  TodayRecommendationFeedbackType,
} from '@/types/today'
import {
  applyRecommendationFeedback,
  TODAY_RECOMMENDATION_FEEDBACK_KEY,
} from '@/services/todayRecommendation.service'

// Storage keys
const KEYS = {
  WEEKLY_REVIEW_DAY: 'preferences.weeklyReviewDay',
  DAILY_EMOTION_TARGET: 'preferences.dailyEmotionTarget',
  THEME: 'preferences.theme',
  LOCALE: 'preferences.locale',
  TODAY_EXERCISE_FEEDBACK: TODAY_RECOMMENDATION_FEEDBACK_KEY,
  TODAY_MODULE_DENSITY: 'preferences.todayModuleDensity',
}

// Defaults
const DEFAULTS = {
  WEEKLY_REVIEW_DAY: 0, // Sunday
  DAILY_EMOTION_TARGET: 3,
  THEME: DEFAULT_THEME_ID as ThemeId,
  LOCALE: DEFAULT_LOCALE_ID as LocaleId,
  TODAY_MODULE_DENSITY: 'comfortable' as TodayModuleDensity,
}

function normalizeTodayModuleDensity(value: string | undefined): TodayModuleDensity {
  if (value === 'compact' || value === 'comfortable') return value
  return DEFAULTS.TODAY_MODULE_DENSITY
}

function parseFeedbackMap(
  raw: string | undefined,
): Record<string, TodayRecommendationFeedback> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, TodayRecommendationFeedback>
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // State
  const weeklyReviewDay = ref<number>(DEFAULTS.WEEKLY_REVIEW_DAY)
  const dailyEmotionTarget = ref<number>(DEFAULTS.DAILY_EMOTION_TARGET)
  const themePreference = ref<ThemeId>(DEFAULTS.THEME)
  const locale = ref<LocaleId>(DEFAULTS.LOCALE)
  const todayExerciseFeedback = ref<Record<string, TodayRecommendationFeedback>>({})
  const todayModuleDensity = ref<TodayModuleDensity>(DEFAULTS.TODAY_MODULE_DENSITY)
  const isLoaded = ref(false)

  // Actions
  async function loadPreferences(): Promise<void> {
    if (isLoaded.value) return

    try {
      const storedReviewDay = await userSettingsDexieRepository.get(KEYS.WEEKLY_REVIEW_DAY)
      if (storedReviewDay !== undefined) {
        const parsed = parseInt(storedReviewDay, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
          weeklyReviewDay.value = parsed
        }
      }

      const storedEmotionTarget = await userSettingsDexieRepository.get(
        KEYS.DAILY_EMOTION_TARGET
      )
      if (storedEmotionTarget !== undefined) {
        const parsed = parseInt(storedEmotionTarget, 10)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
          dailyEmotionTarget.value = parsed
        }
      }

      const storedTheme = await userSettingsDexieRepository.get(KEYS.THEME)
      themePreference.value = normalizeThemeId(storedTheme)

      const storedLocale = await userSettingsDexieRepository.get(KEYS.LOCALE)
      locale.value = normalizeLocaleId(storedLocale)

      const storedTodayExerciseFeedback = await userSettingsDexieRepository.get(KEYS.TODAY_EXERCISE_FEEDBACK)
      todayExerciseFeedback.value = parseFeedbackMap(storedTodayExerciseFeedback)

      const storedTodayModuleDensity = await userSettingsDexieRepository.get(KEYS.TODAY_MODULE_DENSITY)
      todayModuleDensity.value = normalizeTodayModuleDensity(storedTodayModuleDensity)

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Use defaults on error
      themePreference.value = DEFAULTS.THEME
      todayExerciseFeedback.value = {}
      todayModuleDensity.value = DEFAULTS.TODAY_MODULE_DENSITY
      isLoaded.value = true
    }
  }

  async function setWeeklyReviewDay(day: number): Promise<void> {
    if (day < 0 || day > 6) {
      throw new Error('Weekly review day must be between 0 (Sunday) and 6 (Saturday)')
    }

    weeklyReviewDay.value = day
    await userSettingsDexieRepository.set(KEYS.WEEKLY_REVIEW_DAY, day.toString())
  }

  async function setDailyEmotionTarget(target: number): Promise<void> {
    if (target < 1 || target > 10) {
      throw new Error('Daily emotion target must be between 1 and 10')
    }

    dailyEmotionTarget.value = target
    await userSettingsDexieRepository.set(KEYS.DAILY_EMOTION_TARGET, target.toString())
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

  async function setTodayModuleDensity(value: TodayModuleDensity): Promise<void> {
    if (value !== 'comfortable' && value !== 'compact') {
      throw new Error('Today module density must be comfortable or compact')
    }

    todayModuleDensity.value = value
    await userSettingsDexieRepository.set(KEYS.TODAY_MODULE_DENSITY, value)
  }

  async function setTodayExerciseFeedbackMap(
    map: Record<string, TodayRecommendationFeedback>,
  ): Promise<void> {
    todayExerciseFeedback.value = map
    await userSettingsDexieRepository.set(KEYS.TODAY_EXERCISE_FEEDBACK, JSON.stringify(map))
  }

  async function recordTodayExerciseFeedback(
    recommendationId: string,
    feedbackType: TodayRecommendationFeedbackType,
  ): Promise<void> {
    const next = applyRecommendationFeedback(
      todayExerciseFeedback.value,
      recommendationId,
      feedbackType,
    )
    await setTodayExerciseFeedbackMap(next)
  }

  return {
    // State
    weeklyReviewDay,
    dailyEmotionTarget,
    themePreference,
    locale,
    todayExerciseFeedback,
    todayModuleDensity,
    isLoaded,
    // Actions
    loadPreferences,
    setWeeklyReviewDay,
    setDailyEmotionTarget,
    setThemePreference,
    setLocale,
    setTodayExerciseFeedbackMap,
    recordTodayExerciseFeedback,
    setTodayModuleDensity,
  }
})
