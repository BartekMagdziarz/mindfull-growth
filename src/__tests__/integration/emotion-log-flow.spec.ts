import { describe, it, beforeEach, expect } from 'vitest'
import {
  resetDatabase,
  getAllEmotionLogs,
  getAllPeopleTags,
  getAllContextTags,
} from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import type { Emotion } from '@/domain/emotion'

const getAll = (emotionStore: ReturnType<typeof initializeStores>['emotionStore']) =>
  emotionStore.emotions as Emotion[]

describe('Emotion Log Flow Integration', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('creates a full emotion log and persists it to IndexedDB', async () => {
    const { emotionStore, tagStore, emotionLogStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await emotionLogStore.loadLogs()

    const emotionIds = getAll(emotionStore)
      .slice(0, 3)
      .map((emotion) => emotion.id)
    const momTag = await tagStore.createPeopleTag('Mom')
    const commuteTag = await tagStore.createContextTag('Commute')

    const createdLog = await emotionLogStore.createLog({
      emotionIds,
      note: 'Felt a mix of emotions during commute',
      peopleTagIds: [momTag.id],
      contextTagIds: [commuteTag.id],
    })

    const logsInDb = await getAllEmotionLogs()
    expect(logsInDb).toHaveLength(1)
    expect(logsInDb[0]).toMatchObject({
      id: createdLog.id,
      note: 'Felt a mix of emotions during commute',
      emotionIds,
      peopleTagIds: [momTag.id],
      contextTagIds: [commuteTag.id],
    })

    expect(emotionLogStore.logs).toHaveLength(1)

    // Emotions resolve through emotion store for display
    const resolvedNames = createdLog.emotionIds.map((id) => emotionStore.getEmotionById(id)?.name)
    expect(resolvedNames.filter(Boolean).length).toBe(createdLog.emotionIds.length)
  })

  it('edits an existing emotion log, preserving createdAt but updating updatedAt', async () => {
    const { emotionStore, tagStore, emotionLogStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await emotionLogStore.loadLogs()

    const emotionIds = getAll(emotionStore)
      .slice(0, 2)
      .map((emotion) => emotion.id)
    const log = await emotionLogStore.createLog({
      emotionIds,
      note: 'Original note',
      peopleTagIds: [],
      contextTagIds: [],
    })

    const newEmotionIds = getAll(emotionStore)
      .slice(2, 4)
      .map((emotion) => emotion.id)
    const officeTag = await tagStore.createContextTag('Office')
    const updated = await emotionLogStore.updateLog({
      ...log,
      emotionIds: newEmotionIds,
      note: 'Updated note after reflection',
      contextTagIds: [officeTag.id],
    })

    expect(updated.createdAt).toBe(log.createdAt)
    expect(updated.updatedAt).not.toBe(log.updatedAt)
    expect(updated.emotionIds).toEqual(newEmotionIds)
    expect(updated.contextTagIds).toEqual([officeTag.id])

    const logsInDb = await getAllEmotionLogs()
    expect(logsInDb[0].note).toBe('Updated note after reflection')
  })

  it('deletes a log without removing shared tag data', async () => {
    const { emotionStore, tagStore, emotionLogStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await emotionLogStore.loadLogs()

    const emotionIds = [getAll(emotionStore)[0].id]
    const momTag = await tagStore.createPeopleTag('Mom')
    const commuteTag = await tagStore.createContextTag('Commute')

    const log = await emotionLogStore.createLog({
      emotionIds,
      note: 'Temporary log',
      peopleTagIds: [momTag.id],
      contextTagIds: [commuteTag.id],
    })

    await emotionLogStore.deleteLog(log.id)
    expect(emotionLogStore.logs).toHaveLength(0)

    const logsInDb = await getAllEmotionLogs()
    expect(logsInDb).toHaveLength(0)

    const [peopleTagsInDb, contextTagsInDb] = await Promise.all([
      getAllPeopleTags(),
      getAllContextTags(),
    ])
    expect(peopleTagsInDb).toHaveLength(1)
    expect(contextTagsInDb).toHaveLength(1)
  })
})


