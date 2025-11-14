import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEmotionStore } from '../emotion.store'
import type { Emotion, Quadrant } from '@/domain/emotion'

// Mock the emotions data - defined here so it can be used in tests
const mockEmotions: Emotion[] = [
  // High Energy / High Pleasantness
  {
    id: 'emotion-1',
    name: 'Ecstatic',
    pleasantness: 10,
    energy: 10,
    description: 'Overwhelmed by extreme joy and delight',
  },
  {
    id: 'emotion-2',
    name: 'Elated',
    pleasantness: 10,
    energy: 9,
    description: 'Very happy and lifted in spirit',
  },
  {
    id: 'emotion-3',
    name: 'Excited',
    pleasantness: 10,
    energy: 8,
    description: 'Highly aroused in a positive anticipatory way',
  },
  {
    id: 'emotion-4',
    name: 'Thrilled',
    pleasantness: 10,
    energy: 7,
    description: 'Strongly delighted by good news or events',
  },
  // High Energy / Low Pleasantness
  {
    id: 'emotion-5',
    name: 'Enraged',
    pleasantness: 1,
    energy: 10,
    description: 'Overwhelmed by intense uncontrollable anger',
  },
  {
    id: 'emotion-6',
    name: 'Furious',
    pleasantness: 2,
    energy: 9,
    description: 'Burning with rage and hostility',
  },
  {
    id: 'emotion-7',
    name: 'Angry',
    pleasantness: 3,
    energy: 8,
    description: 'Feeling hostile and upset about something',
  },
  {
    id: 'emotion-8',
    name: 'Anxious',
    pleasantness: 1,
    energy: 7,
    description: 'Worried and uneasy about potential problems',
  },
  // Low Energy / High Pleasantness
  {
    id: 'emotion-9',
    name: 'Serene',
    pleasantness: 10,
    energy: 1,
    description: 'Stable unshakable inner calm and clarity',
  },
  {
    id: 'emotion-10',
    name: 'Tranquil',
    pleasantness: 8,
    energy: 1,
    description: 'Deeply calm quiet and undisturbed',
  },
  {
    id: 'emotion-11',
    name: 'Peaceful',
    pleasantness: 8,
    energy: 2,
    description: 'Free from disturbance or inner conflict',
  },
  {
    id: 'emotion-12',
    name: 'Calm',
    pleasantness: 6,
    energy: 4,
    description: 'Quiet mind and relaxed body',
  },
  // Low Energy / Low Pleasantness
  {
    id: 'emotion-13',
    name: 'Despair',
    pleasantness: 1,
    energy: 1,
    description: 'Feeling hopeless with no way out',
  },
  {
    id: 'emotion-14',
    name: 'Hopeless',
    pleasantness: 2,
    energy: 1,
    description: 'Seeing no realistic possibility of improvement',
  },
  {
    id: 'emotion-15',
    name: 'Depressed',
    pleasantness: 2,
    energy: 2,
    description: 'Persistently low mood and loss of interest',
  },
  {
    id: 'emotion-16',
    name: 'Sad',
    pleasantness: 4,
    energy: 4,
    description: 'Hurting emotionally or grieving loss',
  },
  // Edge cases: exactly 5
  {
    id: 'emotion-17',
    name: 'Shocked',
    pleasantness: 5,
    energy: 10,
    description: 'Suddenly stunned by something unexpected or upsetting',
  },
  {
    id: 'emotion-18',
    name: 'Apathetic',
    pleasantness: 5,
    energy: 5,
    description: 'Lacking interest energy or motivation',
  },
  {
    id: 'emotion-19',
    name: 'At ease',
    pleasantness: 6,
    energy: 5,
    description: 'Comfortable relaxed and unthreatened',
  },
  {
    id: 'emotion-20',
    name: 'Bored',
    pleasantness: 5,
    energy: 4,
    description: 'Unstimulated and uninterested in the moment',
  },
]

// Mock the emotions data import - define mock data inline in factory to avoid hoisting issues
vi.mock('@/data/emotions.json', () => ({
  default: [
    // High Energy / High Pleasantness
    {
      id: 'emotion-1',
      name: 'Ecstatic',
      pleasantness: 10,
      energy: 10,
      description: 'Overwhelmed by extreme joy and delight',
    },
    {
      id: 'emotion-2',
      name: 'Elated',
      pleasantness: 10,
      energy: 9,
      description: 'Very happy and lifted in spirit',
    },
    {
      id: 'emotion-3',
      name: 'Excited',
      pleasantness: 10,
      energy: 8,
      description: 'Highly aroused in a positive anticipatory way',
    },
    {
      id: 'emotion-4',
      name: 'Thrilled',
      pleasantness: 10,
      energy: 7,
      description: 'Strongly delighted by good news or events',
    },
    // High Energy / Low Pleasantness
    {
      id: 'emotion-5',
      name: 'Enraged',
      pleasantness: 1,
      energy: 10,
      description: 'Overwhelmed by intense uncontrollable anger',
    },
    {
      id: 'emotion-6',
      name: 'Furious',
      pleasantness: 2,
      energy: 9,
      description: 'Burning with rage and hostility',
    },
    {
      id: 'emotion-7',
      name: 'Angry',
      pleasantness: 3,
      energy: 8,
      description: 'Feeling hostile and upset about something',
    },
    {
      id: 'emotion-8',
      name: 'Anxious',
      pleasantness: 1,
      energy: 7,
      description: 'Worried and uneasy about potential problems',
    },
    // Low Energy / High Pleasantness
    {
      id: 'emotion-9',
      name: 'Serene',
      pleasantness: 10,
      energy: 1,
      description: 'Stable unshakable inner calm and clarity',
    },
    {
      id: 'emotion-10',
      name: 'Tranquil',
      pleasantness: 8,
      energy: 1,
      description: 'Deeply calm quiet and undisturbed',
    },
    {
      id: 'emotion-11',
      name: 'Peaceful',
      pleasantness: 8,
      energy: 2,
      description: 'Free from disturbance or inner conflict',
    },
    {
      id: 'emotion-12',
      name: 'Calm',
      pleasantness: 6,
      energy: 4,
      description: 'Quiet mind and relaxed body',
    },
    // Low Energy / Low Pleasantness
    {
      id: 'emotion-13',
      name: 'Despair',
      pleasantness: 1,
      energy: 1,
      description: 'Feeling hopeless with no way out',
    },
    {
      id: 'emotion-14',
      name: 'Hopeless',
      pleasantness: 2,
      energy: 1,
      description: 'Seeing no realistic possibility of improvement',
    },
    {
      id: 'emotion-15',
      name: 'Depressed',
      pleasantness: 2,
      energy: 2,
      description: 'Persistently low mood and loss of interest',
    },
    {
      id: 'emotion-16',
      name: 'Sad',
      pleasantness: 4,
      energy: 4,
      description: 'Hurting emotionally or grieving loss',
    },
    // Edge cases: exactly 5
    {
      id: 'emotion-17',
      name: 'Shocked',
      pleasantness: 5,
      energy: 10,
      description: 'Suddenly stunned by something unexpected or upsetting',
    },
    {
      id: 'emotion-18',
      name: 'Apathetic',
      pleasantness: 5,
      energy: 5,
      description: 'Lacking interest energy or motivation',
    },
    {
      id: 'emotion-19',
      name: 'At ease',
      pleasantness: 6,
      energy: 5,
      description: 'Comfortable relaxed and unthreatened',
    },
    {
      id: 'emotion-20',
      name: 'Bored',
      pleasantness: 5,
      energy: 4,
      description: 'Unstimulated and uninterested in the moment',
    },
  ],
}))

describe('useEmotionStore', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
  })

  describe('loadEmotions', () => {
    it('populates emotions array correctly', async () => {
      const store = useEmotionStore()

      expect(store.emotions).toHaveLength(0)
      expect(store.isLoaded).toBe(false)

      await store.loadEmotions()

      expect(store.emotions).toHaveLength(20)
      expect(store.isLoaded).toBe(true)
      expect(store.emotions[0]).toEqual(mockEmotions[0])
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

    it('loads emotions with all required fields', async () => {
      const store = useEmotionStore()

      await store.loadEmotions()

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
    it('returns all emotions after loading', async () => {
      const store = useEmotionStore()

      await store.loadEmotions()

      const allEmotions = store.getAllEmotions
      expect(allEmotions).toHaveLength(20)
      expect(allEmotions).toEqual(mockEmotions)
    })

    it('returns empty array if emotions have not been loaded', () => {
      const store = useEmotionStore()

      const allEmotions = store.getAllEmotions
      expect(allEmotions).toHaveLength(0)
    })
  })

  describe('getEmotionsByQuadrant', () => {
    beforeEach(async () => {
      const store = useEmotionStore()
      await store.loadEmotions()
    })

    it('returns correct emotions for high-energy-high-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'high-energy-high-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeGreaterThan(5)
        expect(emotion.pleasantness).toBeGreaterThan(5)
      })

      // Verify specific emotions are included
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
        expect(emotion.energy).toBeGreaterThan(5)
        expect(emotion.pleasantness).toBeLessThanOrEqual(5)
      })

      // Verify specific emotions are included
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
        expect(emotion.energy).toBeLessThanOrEqual(5)
        expect(emotion.pleasantness).toBeGreaterThan(5)
      })

      // Verify specific emotions are included
      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Serene')
      expect(emotionNames).toContain('Tranquil')
      expect(emotionNames).toContain('Peaceful')
      expect(emotionNames).toContain('Calm')
    })

    it('returns correct emotions for low-energy-low-pleasantness quadrant', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      expect(emotions.length).toBeGreaterThan(0)
      emotions.forEach((emotion) => {
        expect(emotion.energy).toBeLessThanOrEqual(5)
        expect(emotion.pleasantness).toBeLessThanOrEqual(5)
      })

      // Verify specific emotions are included
      const emotionNames = emotions.map((e) => e.name)
      expect(emotionNames).toContain('Despair')
      expect(emotionNames).toContain('Hopeless')
      expect(emotionNames).toContain('Depressed')
      expect(emotionNames).toContain('Sad')
    })

    it('ensures each emotion appears in exactly one quadrant', async () => {
      const store = useEmotionStore()
      await store.loadEmotions()

      const quadrants: Quadrant[] = [
        'high-energy-high-pleasantness',
        'high-energy-low-pleasantness',
        'low-energy-high-pleasantness',
        'low-energy-low-pleasantness',
      ]

      const allQuadrantEmotions = quadrants.flatMap((q) =>
        store.getEmotionsByQuadrant(q)
      )

      // All emotions should be accounted for
      expect(allQuadrantEmotions.length).toBe(store.emotions.length)

      // Check for duplicates by ID
      const emotionIds = allQuadrantEmotions.map((e) => e.id)
      const uniqueIds = new Set(emotionIds)
      expect(uniqueIds.size).toBe(emotionIds.length)
    })

    it('ensures sum of all quadrants equals total emotions', async () => {
      const store = useEmotionStore()
      await store.loadEmotions()

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

    it('handles edge case: energy=5 is treated as low energy', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-high-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      // "At ease" has energy=5, pleasantness=6, so should be in low-energy-high-pleasantness
      const atEase = emotions.find((e) => e.name === 'At ease')
      expect(atEase).toBeDefined()
      expect(atEase?.energy).toBe(5)
      expect(atEase?.pleasantness).toBe(6)
    })

    it('handles edge case: pleasantness=5 is treated as low pleasantness', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'high-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      // "Shocked" has energy=10, pleasantness=5, so should be in high-energy-low-pleasantness
      const shocked = emotions.find((e) => e.name === 'Shocked')
      expect(shocked).toBeDefined()
      expect(shocked?.energy).toBe(10)
      expect(shocked?.pleasantness).toBe(5)
    })

    it('handles edge case: both energy=5 and pleasantness=5 is treated as low-energy-low-pleasantness', () => {
      const store = useEmotionStore()
      const quadrant: Quadrant = 'low-energy-low-pleasantness'
      const emotions = store.getEmotionsByQuadrant(quadrant)

      // "Apathetic" has energy=5, pleasantness=5, so should be in low-energy-low-pleasantness
      const apathetic = emotions.find((e) => e.name === 'Apathetic')
      expect(apathetic).toBeDefined()
      expect(apathetic?.energy).toBe(5)
      expect(apathetic?.pleasantness).toBe(5)
    })
  })

  describe('getEmotionById', () => {
    beforeEach(async () => {
      const store = useEmotionStore()
      await store.loadEmotions()
    })

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

