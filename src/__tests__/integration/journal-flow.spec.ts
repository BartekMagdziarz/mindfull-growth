import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDatabase,
  getAllJournalEntries,
  getAllPeopleTags,
  getAllContextTags,
} from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import type { Emotion } from '@/domain/emotion'

function getEmotionIds(
  emotionStore: ReturnType<typeof initializeStores>['emotionStore'],
  start: number,
  count: number
) {
  const allEmotions = emotionStore.emotions as Emotion[]
  return allEmotions.slice(start, start + count).map((emotion) => emotion.id)
}

describe('Journal Flow Integration', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('creates a journal entry with tags and emotions and persists everything to IndexedDB', async () => {
    const { emotionStore, tagStore, journalStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await journalStore.loadEntries()

    const emotionIds = getEmotionIds(emotionStore, 0, 2)
    const momTag = await tagStore.createPeopleTag('Mom')
    const workTag = await tagStore.createContextTag('Work')

    const createdEntry = await journalStore.createEntry({
      title: 'Integration Test Entry',
      body: 'Created via integration test',
      emotionIds,
      peopleTagIds: [momTag.id],
      contextTagIds: [workTag.id],
    })

    // Verify entry persisted to Dexie
    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb).toHaveLength(1)
    expect(entriesInDb[0]).toMatchObject({
      id: createdEntry.id,
      title: 'Integration Test Entry',
      body: 'Created via integration test',
      emotionIds,
      peopleTagIds: [momTag.id],
      contextTagIds: [workTag.id],
    })

    // Verify entry exists in store
    expect(journalStore.entries).toHaveLength(1)
    expect(journalStore.entries[0].id).toBe(createdEntry.id)

    // Verify tags are deduplicated (case-insensitive)
    const duplicateMom = await tagStore.createPeopleTag('mom')
    expect(duplicateMom.id).toBe(momTag.id)

    // Verify emotion IDs resolve correctly
    const resolvedEmotions = createdEntry.emotionIds.map((id) => emotionStore.getEmotionById(id))
    expect(resolvedEmotions.every((emotion) => emotion?.name)).toBe(true)
  })

  it('edits an existing entry and keeps tag records intact', async () => {
    const { emotionStore, tagStore, journalStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await journalStore.loadEntries()

    const initialEmotionIds = getEmotionIds(emotionStore, 0, 2)
    const momTag = await tagStore.createPeopleTag('Mom')
    const workTag = await tagStore.createContextTag('Work')

    const entry = await journalStore.createEntry({
      title: 'Original Title',
      body: 'Original body',
      emotionIds: initialEmotionIds,
      peopleTagIds: [momTag.id],
      contextTagIds: [workTag.id],
    })

    const newEmotionIds = getEmotionIds(emotionStore, 2, 2)
    const dadTag = await tagStore.createPeopleTag('Dad')

    const updated = await journalStore.updateEntry({
      ...entry,
      title: 'Updated Title',
      body: 'Updated body',
      emotionIds: newEmotionIds,
      peopleTagIds: [dadTag.id],
      contextTagIds: [],
    })

    expect(updated.title).toBe('Updated Title')
    expect(updated.emotionIds).toEqual(newEmotionIds)
    expect(updated.peopleTagIds).toEqual([dadTag.id])
    expect(updated.contextTagIds).toEqual([])

    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb).toHaveLength(1)
    expect(entriesInDb[0].title).toBe('Updated Title')

    // Original tags should still exist even if not referenced anymore
    const peopleTagsInDb = await getAllPeopleTags()
    expect(peopleTagsInDb.map((tag) => tag.name).sort()).toEqual(['Dad', 'Mom'])
    const contextTagsInDb = await getAllContextTags()
    expect(contextTagsInDb.map((tag) => tag.name)).toEqual(['Work'])
  })

  it('deletes an entry but leaves tag records untouched', async () => {
    const { emotionStore, tagStore, journalStore } = initializeStores()

    await emotionStore.loadEmotions()
    await tagStore.loadPeopleTags()
    await tagStore.loadContextTags()
    await journalStore.loadEntries()

    const emotionIds = getEmotionIds(emotionStore, 0, 1)
    const momTag = await tagStore.createPeopleTag('Mom')
    const workTag = await tagStore.createContextTag('Work')

    const entry = await journalStore.createEntry({
      body: 'To be deleted',
      emotionIds,
      peopleTagIds: [momTag.id],
      contextTagIds: [workTag.id],
    })

    await journalStore.deleteEntry(entry.id)

    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb).toHaveLength(0)
    expect(journalStore.entries).toHaveLength(0)

    // Tags still exist
    const [peopleTagsInDb, contextTagsInDb] = await Promise.all([
      getAllPeopleTags(),
      getAllContextTags(),
    ])
    expect(peopleTagsInDb).toHaveLength(1)
    expect(contextTagsInDb).toHaveLength(1)
  })
})


