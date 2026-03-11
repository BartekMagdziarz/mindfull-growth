import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEmotionStore } from '../emotion.store'
import { useUserPreferencesStore } from '../userPreferences.store'
import type { Quadrant } from '@/domain/emotion'
import emotionsMeta from '@/data/emotions-meta.json'
import enEmotions from '@/locales/en/emotions.json'
import plEmotions from '@/locales/pl/emotions.json'

describe('useEmotionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exposes the full English emotion catalog and marks itself loaded on demand', async () => {
    const store = useEmotionStore()

    expect(store.isLoaded).toBe(false)
    expect(store.emotions).toHaveLength(emotionsMeta.length)
    expect(store.emotions[0]).toEqual({
      id: emotionsMeta[0].id,
      pleasantness: emotionsMeta[0].pleasantness,
      energy: emotionsMeta[0].energy,
      name: enEmotions[emotionsMeta[0].id as keyof typeof enEmotions].name,
      description: enEmotions[emotionsMeta[0].id as keyof typeof enEmotions].description,
    })

    await store.loadEmotions()

    expect(store.isLoaded).toBe(true)
    expect(store.emotions).toHaveLength(emotionsMeta.length)
  })

  it('reacts to locale changes when resolving translated emotion names', async () => {
    const preferences = useUserPreferencesStore()
    const store = useEmotionStore()

    preferences.$patch({ locale: 'pl', isLoaded: true })

    const ecstatic = store.getEmotionById('e1m12-ecstatic-001')
    expect(ecstatic?.name).toBe(
      plEmotions['e1m12-ecstatic-001' as keyof typeof plEmotions].name
    )
  })

  it('returns all emotions from the current locale catalog', () => {
    const store = useEmotionStore()

    expect(store.getAllEmotions).toEqual(store.emotions)
  })

  it('partitions the full catalog into quadrants without duplicates', () => {
    const store = useEmotionStore()
    const quadrants: Quadrant[] = [
      'high-energy-high-pleasantness',
      'high-energy-low-pleasantness',
      'low-energy-high-pleasantness',
      'low-energy-low-pleasantness',
    ]

    const allQuadrantEmotions = quadrants.flatMap((quadrant) =>
      store.getEmotionsByQuadrant(quadrant)
    )

    expect(allQuadrantEmotions).toHaveLength(store.emotions.length)
    expect(new Set(allQuadrantEmotions.map((emotion) => emotion.id)).size).toBe(
      store.emotions.length
    )
  })

  it('uses the current threshold rules for representative edge cases', () => {
    const store = useEmotionStore()

    const lowEnergyHighPleasantness = store.getEmotionsByQuadrant(
      'low-energy-high-pleasantness'
    )
    const highEnergyLowPleasantness = store.getEmotionsByQuadrant(
      'high-energy-low-pleasantness'
    )
    const lowEnergyLowPleasantness = store.getEmotionsByQuadrant(
      'low-energy-low-pleasantness'
    )

    expect(
      lowEnergyHighPleasantness.find((emotion) => emotion.id === 'e8m8-thoughtful-056')
    ).toMatchObject({
      pleasantness: 8,
      energy: 5,
      name: 'Thoughtful',
    })
    expect(
      highEnergyLowPleasantness.find((emotion) => emotion.id === 'e1m4-shocked-097')
    ).toMatchObject({
      pleasantness: 4,
      energy: 12,
      name: 'Shocked',
    })
    expect(
      lowEnergyLowPleasantness.find((emotion) => emotion.id === 'e7m6-bored-079')
    ).toMatchObject({
      pleasantness: 6,
      energy: 6,
      name: 'Bored',
    })
  })

  it('finds emotions by id and returns undefined for missing ids', () => {
    const store = useEmotionStore()

    expect(store.getEmotionById('e1m12-ecstatic-001')).toMatchObject({
      id: 'e1m12-ecstatic-001',
      name: 'Ecstatic',
    })
    expect(store.getEmotionById('non-existent-id')).toBeUndefined()
    expect(store.getEmotionById('')).toBeUndefined()
  })
})
