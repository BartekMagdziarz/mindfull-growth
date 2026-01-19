import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

// Storage keys
const KEYS = {
  WEEKLY_REVIEW_DAY: 'preferences.weeklyReviewDay',
  DAILY_EMOTION_TARGET: 'preferences.dailyEmotionTarget',
}

// Defaults
const DEFAULTS = {
  WEEKLY_REVIEW_DAY: 0, // Sunday
  DAILY_EMOTION_TARGET: 3,
}

export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // State
  const weeklyReviewDay = ref<number>(DEFAULTS.WEEKLY_REVIEW_DAY)
  const dailyEmotionTarget = ref<number>(DEFAULTS.DAILY_EMOTION_TARGET)
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

      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Use defaults on error
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

  return {
    // State
    weeklyReviewDay,
    dailyEmotionTarget,
    isLoaded,
    // Actions
    loadPreferences,
    setWeeklyReviewDay,
    setDailyEmotionTarget,
  }
})
