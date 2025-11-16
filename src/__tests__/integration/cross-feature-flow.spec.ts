import { describe, it, beforeEach, expect } from 'vitest'
import {
  resetDatabase,
  getAllPeopleTags,
  getAllContextTags,
} from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import type { Emotion } from '@/domain/emotion'

const getAllEmotions = (emotionStore: ReturnType<typeof initializeStores>['emotionStore']) =>
  emotionStore.emotions as Emotion[]

describe('Cross Feature Integrations', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('shares tags between journal entries and emotion logs without duplication', async () => {
    const { emotionStore, tagStore, journalStore, emotionLogStore } = initializeStores()

    await emotionStore.loadEmotions()
    await Promise.all([tagStore.loadPeopleTags(), tagStore.loadContextTags()])
    await Promise.all([journalStore.loadEntries(), emotionLogStore.loadLogs()])

    const baseEmotionId = getAllEmotions(emotionStore)[0].id

    // Create tag via journal entry flow
    const momTag = await tagStore.createPeopleTag('Mom')
    await journalStore.createEntry({
      body: 'Entry referencing Mom',
      emotionIds: [baseEmotionId],
      peopleTagIds: [momTag.id],
      contextTagIds: [],
    })

    // Attempt to create the same tag (different casing) via emotion log flow
    const duplicateMomTag = await tagStore.createPeopleTag('mom')
    expect(duplicateMomTag.id).toBe(momTag.id)

    await emotionLogStore.createLog({
      emotionIds: [baseEmotionId],
      note: 'Log referencing Mom tag',
      peopleTagIds: [duplicateMomTag.id],
      contextTagIds: [],
    })

    // Create context tag while logging emotions and reuse it in journal entry
    const commuteTag = await tagStore.createContextTag('Commute')
    await emotionLogStore.createLog({
      emotionIds: [baseEmotionId],
      note: 'Commute reflections',
      peopleTagIds: [],
      contextTagIds: [commuteTag.id],
    })

    const duplicateCommute = await tagStore.createContextTag('COMMUTE')
    expect(duplicateCommute.id).toBe(commuteTag.id)

    await journalStore.createEntry({
      body: 'Entry referencing commute context',
      emotionIds: [baseEmotionId],
      contextTagIds: [duplicateCommute.id],
    })

    const [peopleTagsInDb, contextTagsInDb] = await Promise.all([
      getAllPeopleTags(),
      getAllContextTags(),
    ])

    expect(peopleTagsInDb).toHaveLength(1)
    expect(contextTagsInDb).toHaveLength(1)
  })

  it('reuses the same emotion definitions across features', async () => {
    const { emotionStore, journalStore, emotionLogStore } = initializeStores()

    await emotionStore.loadEmotions()
    await journalStore.loadEntries()
    await emotionLogStore.loadLogs()

    const happyEmotion =
      getAllEmotions(emotionStore).find((emotion) => emotion.name === 'Happy') ??
      getAllEmotions(emotionStore)[0]

    const entry = await journalStore.createEntry({
      body: 'Happy journal entry',
      emotionIds: [happyEmotion.id],
    })

    const log = await emotionLogStore.createLog({
      emotionIds: [happyEmotion.id],
      note: 'Happy log',
    })

    expect(entry.emotionIds[0]).toBe(happyEmotion.id)
    expect(log.emotionIds[0]).toBe(happyEmotion.id)
    expect(emotionStore.getEmotionById(entry.emotionIds[0])?.name).toBe('Happy')
  })
})


