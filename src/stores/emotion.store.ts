import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Emotion, Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import emotionsData from '@/data/emotions.json'

export const useEmotionStore = defineStore('emotion', () => {
  // State
  const emotions = ref<Emotion[]>([])
  const isLoaded = ref(false)

  // Actions
  async function loadEmotions(): Promise<void> {
    // Idempotent: only load if not already loaded
    if (isLoaded.value) {
      return
    }

    // Load emotions from seed data
    emotions.value = emotionsData as Emotion[]
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

