import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Emotion, Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import emotionsMeta from '@/data/emotions-meta.json'
import enEmotions from '@/locales/en/emotions.json'
import plEmotions from '@/locales/pl/emotions.json'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

type EmotionTranslation = { name: string; description?: string }
const emotionTranslations: Record<string, Record<string, EmotionTranslation>> = {
  en: enEmotions as Record<string, EmotionTranslation>,
  pl: plEmotions as Record<string, EmotionTranslation>,
}

export const useEmotionStore = defineStore('emotion', () => {
  const prefsStore = useUserPreferencesStore()

  // State
  const isLoaded = ref(false)

  // Emotions are reactive to locale changes via computed
  const emotions = computed<Emotion[]>(() => {
    const locale = prefsStore.locale ?? 'en'
    const translations = emotionTranslations[locale] ?? emotionTranslations['en']
    const fallback = emotionTranslations['en']

    return emotionsMeta.map((meta) => {
      const trans = translations[meta.id] ?? fallback[meta.id]
      return {
        id: meta.id,
        pleasantness: meta.pleasantness,
        energy: meta.energy,
        name: trans?.name ?? meta.id,
        description: trans?.description,
      }
    })
  })

  // Actions
  async function loadEmotions(): Promise<void> {
    // Data is statically imported; just mark as loaded
    isLoaded.value = true
  }

  // Getters
  const getAllEmotions = computed(() => {
    return emotions.value
  })

  function getEmotionsByQuadrant(quadrant: Quadrant): Emotion[] {
    return emotions.value.filter((emotion) => getQuadrant(emotion) === quadrant)
  }

  function getEmotionById(id: string): Emotion | undefined {
    return emotions.value.find((emotion) => emotion.id === id)
  }

  return {
    // State
    emotions,
    isLoaded,
    // Actions
    loadEmotions,
    // Getters
    getAllEmotions,
    getEmotionsByQuadrant,
    getEmotionById,
  }
})
