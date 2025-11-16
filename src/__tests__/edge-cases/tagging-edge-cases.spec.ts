import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initializeStores } from '../integration/testUtils'
import { resetDatabase } from '../utils/dbTestUtils'
import { db } from '@/repositories/journalDexieRepository'
import {
  peopleTagDexieRepository,
  contextTagDexieRepository,
} from '@/repositories/tagDexieRepository'
import type { Emotion } from '@/domain/emotion'

async function getFirstEmotionId(
  emotionStore: ReturnType<typeof initializeStores>['emotionStore']
): Promise<string> {
  await emotionStore.loadEmotions()
  const emotions = emotionStore.emotions as Emotion[]
  return emotions[0].id
}

describe('Tagging Edge Cases', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe('Empty state behavior', () => {
    it('creates journal entries without tags and defaults arrays', async () => {
      const { journalStore } = initializeStores()
      await journalStore.loadEntries()

      const entry = await journalStore.createEntry({
        title: 'No tags entry',
        body: 'Body only',
      })

      expect(entry.emotionIds).toEqual([])
      expect(entry.peopleTagIds).toEqual([])
      expect(entry.contextTagIds).toEqual([])
    })

    it('creates emotion logs without optional tags and defaults arrays', async () => {
      const { emotionStore, emotionLogStore } = initializeStores()
      await emotionLogStore.loadLogs()

      const emotionId = await getFirstEmotionId(emotionStore)
      const log = await emotionLogStore.createLog({
        emotionIds: [emotionId],
        note: 'No tags log',
      })

      expect(log.peopleTagIds).toEqual([])
      expect(log.contextTagIds).toEqual([])
    })

    it('loads legacy journal entries that are missing tagging fields', async () => {
      const legacyEntry = {
        id: 'legacy-entry',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Legacy entry',
        body: 'Legacy body',
      }
      await db.journalEntries.add(legacyEntry as any)

      const { journalStore } = initializeStores()
      await journalStore.loadEntries()

      expect(journalStore.entries[0].peopleTagIds).toEqual([])
      expect(journalStore.entries[0].contextTagIds).toEqual([])
      expect(journalStore.entries[0].emotionIds).toEqual([])
    })

    it('loads legacy emotion logs missing optional fields without crashing', async () => {
      const legacyLog = {
        id: 'legacy-log',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emotionIds: ['emotion-1'],
      }
      await db.emotionLogs.add(legacyLog as any)

      const { emotionLogStore } = initializeStores()
      await emotionLogStore.loadLogs()

      expect(emotionLogStore.logs[0].peopleTagIds).toEqual([])
      expect(emotionLogStore.logs[0].contextTagIds).toEqual([])
    })
  })

  describe('Tag validation and duplication', () => {
    it('deduplicates people tags regardless of casing or whitespace', async () => {
      const { tagStore } = initializeStores()
      await tagStore.loadPeopleTags()

      const first = await tagStore.createPeopleTag('  Work   Meeting ')
      const duplicate = await tagStore.createPeopleTag('work meeting')

      expect(duplicate.id).toBe(first.id)
      expect(first.name).toBe('Work Meeting')
    })

    it('deduplicates context tags with whitespace variations', async () => {
      const { tagStore } = initializeStores()
      await tagStore.loadContextTags()

      const first = await tagStore.createContextTag('Weekend  Retreat')
      const duplicate = await tagStore.createContextTag('  weekend retreat  ')

      expect(duplicate.id).toBe(first.id)
      expect(first.name).toBe('Weekend Retreat')
    })

    it('rejects empty tag names', async () => {
      const { tagStore } = initializeStores()

      await expect(tagStore.createPeopleTag('   ')).rejects.toThrow('Tag name cannot be empty')
      expect(tagStore.error).toBe('Tag name cannot be empty')
    })

    it('stores very long tag names without truncation', async () => {
      const { tagStore } = initializeStores()
      const longName = 'A'.repeat(150)

      const tag = await tagStore.createContextTag(longName)
      expect(tag.name).toBe(longName)
    })
  })

  describe('Emotion log validation', () => {
    it('prevents creating emotion logs without emotion IDs', async () => {
      const { emotionLogStore } = initializeStores()

      await expect(
        emotionLogStore.createLog({
          emotionIds: [],
          note: 'Invalid log',
        })
      ).rejects.toThrow('At least one emotion must be selected')
      expect(emotionLogStore.error).toBe('At least one emotion must be selected')
    })

    it('prevents updating logs to remove all emotion IDs', async () => {
      const { emotionStore, emotionLogStore } = initializeStores()
      await emotionLogStore.loadLogs()

      const emotionId = await getFirstEmotionId(emotionStore)
      const log = await emotionLogStore.createLog({
        emotionIds: [emotionId],
        note: 'Valid log',
      })

      await expect(
        emotionLogStore.updateLog({
          ...log,
          emotionIds: [],
        })
      ).rejects.toThrow('At least one emotion must be selected')
      expect(emotionLogStore.error).toBe('At least one emotion must be selected')
    })
  })

  describe('Data integrity with tag deletion', () => {
    it('keeps journal entries intact when tags are deleted separately', async () => {
      const { journalStore, tagStore, emotionStore } = initializeStores()
      await journalStore.loadEntries()
      await tagStore.loadPeopleTags()

      const mom = await tagStore.createPeopleTag('Mom')
      const emotionId = await getFirstEmotionId(emotionStore)
      const entry = await journalStore.createEntry({
        body: 'Entry linked to Mom tag',
        emotionIds: [emotionId],
        peopleTagIds: [mom.id],
      })

      await expect(tagStore.deletePeopleTag(mom.id)).resolves.not.toThrow()
      expect(journalStore.entries[0].peopleTagIds).toEqual([mom.id])
      expect(tagStore.getPeopleTagById(mom.id)).toBeUndefined()
    })

    it('keeps emotion logs intact when tags referenced by them are deleted', async () => {
      const { emotionStore, emotionLogStore, tagStore } = initializeStores()
      await emotionLogStore.loadLogs()
      await tagStore.loadContextTags()

      const commute = await tagStore.createContextTag('Commute')
      const emotionId = await getFirstEmotionId(emotionStore)
      const log = await emotionLogStore.createLog({
        emotionIds: [emotionId],
        note: 'Log linked to context tag',
        contextTagIds: [commute.id],
      })

      await tagStore.deleteContextTag(commute.id)
      expect(emotionLogStore.logs[0].contextTagIds).toEqual([commute.id])
      expect(tagStore.getContextTagById(commute.id)).toBeUndefined()
    })
  })

  describe('Repository error handling', () => {
    it('surfaces repository failures when creating people tags', async () => {
      const { tagStore } = initializeStores()
      const createSpy = vi
        .spyOn(peopleTagDexieRepository, 'create')
        .mockRejectedValue(new Error('Quota exceeded'))

      await expect(tagStore.createPeopleTag('Helper')).rejects.toThrow('Quota exceeded')
      expect(tagStore.error).toBe('Quota exceeded')

      createSpy.mockRestore()
    })

    it('surfaces repository failures when creating context tags', async () => {
      const { tagStore } = initializeStores()
      const createSpy = vi
        .spyOn(contextTagDexieRepository, 'create')
        .mockRejectedValue(new Error('DB offline'))

      await expect(tagStore.createContextTag('Office')).rejects.toThrow('DB offline')
      expect(tagStore.error).toBe('DB offline')

      createSpy.mockRestore()
    })
  })
})


