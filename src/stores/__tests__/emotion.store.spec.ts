import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Quadrant } from '@/domain/emotion'

const { mockEmotionsMeta, mockEmotionTranslations } = vi.hoisted(() => {
  const mockEmotionsMeta = [
    { id: 'emotion-1', pleasantness: 10, energy: 10 },
    { id: 'emotion-2', pleasantness: 10, energy: 9 },
    { id: 'emotion-3', pleasantness: 10, energy: 8 },
    { id: 'emotion-4', pleasantness: 10, energy: 7 },
    { id: 'emotion-5', pleasantness: 1, energy: 10 },
    { id: 'emotion-6', pleasantness: 2, energy: 9 },
    { id: 'emotion-7', pleasantness: 3, energy: 8 },
    { id: 'emotion-8', pleasantness: 1, energy: 7 },
    { id: 'emotion-9', pleasantness: 10, energy: 1 },
    { id: 'emotion-10', pleasantness: 8, energy: 1 },
    { id: 'emotion-11', pleasantness: 8, energy: 2 },
    { id: 'emotion-12', pleasantness: 6, energy: 4 },
    { id: 'emotion-13', pleasantness: 1, energy: 1 },
    { id: 'emotion-14', pleasantness: 2, energy: 1 },
    { id: 'emotion-15', pleasantness: 2, energy: 2 },
    { id: 'emotion-16', pleasantness: 4, energy: 4 },
    { id: 'emotion-17', pleasantness: 5, energy: 10 },
    { id: 'emotion-18', pleasantness: 6, energy: 6 },
    { id: 'emotion-19', pleasantness: 7, energy: 6 },
    { id: 'emotion-20', pleasantness: 5, energy: 4 },
  ]

  const mockEmotionTranslations: Record<string, { name: string; description: string }> = {
    'emotion-1': { name: 'Ecstatic', description: 'Overwhelmed by extreme joy and delight' },
    'emotion-2': { name: 'Elated', description: 'Very happy and lifted in spirit' },
    'emotion-3': { name: 'Excited', description: 'Highly aroused in a positive anticipatory way' },
    'emotion-4': { name: 'Thrilled', description: 'Strongly delighted by good news or events' },
    'emotion-5': { name: 'Enraged', description: 'Overwhelmed by intense uncontrollable anger' },
    'emotion-6': { name: 'Furious', description: 'Burning with rage and hostility' },
    'emotion-7': { name: 'Angry', description: 'Feeling hostile and upset about something' },
    'emotion-8': { name: 'Anxious', description: 'Worried and uneasy about potential problems' },
    'emotion-9': { name: 'Serene', description: 'Stable unshakable inner calm and clarity' },
    'emotion-10': { name: 'Tranquil', description: 'Deeply calm quiet and undisturbed' },
    'emotion-11': { name: 'Peaceful', description: 'Free from disturbance or inner conflict' },
    'emotion-12': { name: 'Calm', description: 'Quiet mind and relaxed body' },
    'emotion-13': { name: 'Despair', description: 'Feeling hopeless with no way out' },
    'emotion-14': { name: 'Hopeless', description: 'Seeing no realistic possibility of improvement' },
    'emotion-15': { name: 'Depressed', description: 'Persistently low mood and loss of interest' },
    'emotion-16': { name: 'Sad', description: 'Hurting emotionally or grieving loss' },
    'emotion-17': { name: 'Shocked', description: 'Suddenly stunned by something unexpected or upsetting' },
    'emotion-18': { name: 'Apathetic', description: 'Lacking interest energy or motivation' },
    'emotion-19': { name: 'At ease', description: 'Comfortable relaxed and unthreatened' },
    'emotion-20': { name: 'Bored', description: 'Unstimulated and uninterested in the moment' },
  }

  return { mockEmotionsMeta, mockEmotionTranslations }
})

vi.mock('@/data/emotions-meta.json', () => ({
  default: mockEmotionsMeta,
}))

vi.mock('@/locales/en/emotions.json', () => ({
  default: mockEmotionTranslations,
}))

vi.mock('@/locales/pl/emotions.json', () => ({
  default: mockEmotionTranslations,
}))

import { useEmotionStore } from '../emotion.store'

describe('useEmotionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('loadEmotions', () => {
    it('emotions are available immediately from static imports', () => {
      const store = useEmotionStore()

      // Emotions are computed from static imports, always available
      expect(store.emotions).toHaveLength(20)
      expect(store.emotions[0].id).toBe('emotion-1')
      expect(store.emotions[0].name).toBe('Ecstatic')
    })

    it('loadEmotions sets isLoaded flag', async () => {
      const store = useEmotionStore()

      expect(store.isLoaded).toBe(false)
      await store.loadEmotions()
      expect(store.isLoaded).toBe(true)
    })

    it('is idempotent (safe to call multiple times)', async () => {
      const store = useEmotionStore()

      await store.loadEmotions()
      const firstLoad = [...store.emotions]

      await store.loadEmotions()
      const secondLoad = [...store.emotions]

      expect(store.emotions).toHaveLength(20)
      expect(firstLoad).toEqual(secondLoad)
      expect(store.isLoaded).toBe(true)
    })

    it('loads emotions with all required fields', () => {
      const store = useEmotionStore()

      store.emotions.forEach((emotion) => {
        expect(emotion).toHaveProperty('id')
        expect(emotion).toHaveProperty('name')
        expect(emotion).toHaveProperty('pleasantness')
        expect(emotion).toHaveProperty('energy')
        expect(typeof emotion.id).toBe('string')
        expect(typeof emotion.name).toBe('string')
        expect(typeof emotion.pleasantness).toBe('number')
        expect(typeof emotion.energy).toBe('number')
        expect(emotion.pleasantness).toBeGreaterThanOrEqual(1)
        expect(emotion.pleasantness).toBeLessThanOrEqual(10)
        expect(emotion.energy).toBeGreaterThanOrEqual(1)
        expect(emotion.energy).toBeLessThanOrEqual(10)
      })
    })
  })

  describe('getAllEmotions', () => {
    it('returns all emotions', () => {
      const store = useEmotionStore()

      const allEmotions = store.getAllEmotions
      expect(allEmotions).toHaveLength(20)
    })
  })

  describe('getEmotionsByQuadrant', () => {
    it('returns correct emotions for high-energy-high-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'high-energy-high-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeGreaterThan(6)
        expect(emotion.pleasantness).toBeGreaterThan(6)
      })

      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Ecstatic')
      expect(emotionNames).toContain('Elated')
      expect(emotionNames).toContain('Excited')
      expect(emotionNames).toContain('Thrilled')
    })

    it('returns correct emotions for high-energy-low-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'high-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeGreaterThan(6)
        expect(emotion.pleasantness).toBeLessThanOrEqual(6)
      })

      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Enraged')
      expect(emotionNames).toContain('Furious')
      expect(emotionNames).toContain('Angry')
      expect(emotionNames).toContain('Anxious')
    })

    it('returns correct emotions for low-energy-high-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-high-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeLessThanOrEqual(6)
        expect(emotion.pleasantness).toBeGreaterThan(6)
      })

      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Serene')
      expect(emotionNames).toContain('Tranquil')
      expect(emotionNames).toContain('Peaceful')
      expect(emotionNames).toContain('At ease')
    })

    it('returns correct emotions for low-energy-low-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeLessThanOrEqual(6)
        expect(emotion.pleasantness).toBeLessThanOrEqual(6)
      })

      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Despair')
      expect(emotionNames).toContain('Hopeless')
      expect(emotionNames).toContain('Depressed')
      expect(emotionNames).toContain('Sad')
      expect(emotionNames).toContain('Calm')
      expect(emotionNames).toContain('Apathetic')
    })

    it('ensures each emotion appears in exactly one quadrant', () => {
      const store = useEmotionStore()

      const quadrants: Quadrant[] = [
        'high-energy-high-pleasantness',
        'high-energy-low-pleasantness',
        'low-energy-high-pleasantness',
        'low-energy-low-pleasantness',
      ]

      const allQuadrantEmotions = quadrants.flatMap((q) =>
        store.getEmotionsByQuadrant(q)
      )

      expect(allQuadrantEmotions.length).toBe(store.emotions.length)

      const emotionIds = allQuadrantEmotions.map((e) => e.id)
      const uniqueIds = new Set(emotionIds)
      expect(uniqueIds.size).toBe(emotionIds.length)
    })

    it('ensures sum of all quadrants equals total emotions', () => {
      const store = useEmotionStore()

      const quadrants: Quadrant[] = [
        'high-energy-high-pleasantness',
        'high-energy-low-pleasantness',
        'low-energy-high-pleasantness',
        'low-energy-low-pleasantness',
      ]

      const quadrantCounts = quadrants.map(
        (q) => store.getEmotionsByQuadrant(q).length
      )
      const totalFromQuadrants = quadrantCounts.reduce((a, b) => a + b, 0)

      expect(totalFromQuadrants).toBe(store.emotions.length)
    })

    it('handles edge case: energy=6 is treated as low energy', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-high-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      const atEase = emotions.find((e) => e.name === 'At ease')
      expect(atEase).toBeDefined()
      expect(atEase?.energy).toBe(6)
      expect(atEase?.pleasantness).toBe(7)
    })

    it('handles edge case: pleasantness=6 is treated as low pleasantness', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      const calm = emotions.find((e) => e.name === 'Calm')
      expect(calm).toBeDefined()
      expect(calm?.energy).toBe(4)
      expect(calm?.pleasantness).toBe(6)
    })

    it('handles edge case: both energy=6 and pleasantness=6 are treated as low-energy-low-pleasantness', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      const apathetic = emotions.find((e) => e.name === 'Apathetic')
      expect(apathetic).toBeDefined()
      expect(apathetic?.energy).toBe(6)
      expect(apathetic?.pleasantness).toBe(6)
    })
  })

  describe('getEmotionById', () => {
    it('finds correct emotion by ID', () => {
      const store = useEmotionStore()
      const emotion = store.getEmotionById('emotion-1')

      expect(emotion).toBeDefined()
      expect(emotion?.id).toBe('emotion-1')
      expect(emotion?.name).toBe('Ecstatic')
    })

    it('returns undefined for invalid ID', () => {
      const store = useEmotionStore()
      const emotion = store.getEmotionById('non-existent-id')

      expect(emotion).toBeUndefined()
    })

    it('returns undefined for empty string', () => {
      const store = useEmotionStore()
      const emotion = store.getEmotionById('')

      expect(emotion).toBeUndefined()
    })

    it('returns correct emotion for different IDs', () => {
      const store = useEmotionStore()
      const emotion1 = store.getEmotionById('emotion-1')
      const emotion10 = store.getEmotionById('emotion-10')
      const emotion20 = store.getEmotionById('emotion-20')

      expect(emotion1?.name).toBe('Ecstatic')
      expect(emotion10?.name).toBe('Tranquil')
      expect(emotion20?.name).toBe('Bored')
    })
  })
})
