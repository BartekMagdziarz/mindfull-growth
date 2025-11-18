import { describe, it, expect, beforeEach } from 'vitest'
import { journalDexieRepository } from '../journalDexieRepository'
import { resetDatabase } from '@/__tests__/utils/dbTestUtils'
import type { JournalEntry } from '@/domain/journal'
import { createChatSession, CHAT_INTENTIONS } from '@/domain/chatSession'

describe('journalDexieRepository with chatSessions', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe('create', () => {
    it('creates entry without chatSessions', async () => {
      const entryData = {
        body: 'Test body',
      }

      const entry = await journalDexieRepository.create(entryData)

      expect(entry.id).toBeDefined()
      expect(entry.body).toBe('Test body')
      expect(entry.chatSessions).toBeUndefined()
    })

    it('creates entry with empty chatSessions array', async () => {
      const entryData = {
        body: 'Test body',
        chatSessions: [],
      }

      const entry = await journalDexieRepository.create(entryData)

      expect(entry.id).toBeDefined()
      expect(entry.body).toBe('Test body')
      expect(entry.chatSessions).toBeDefined()
      expect(Array.isArray(entry.chatSessions)).toBe(true)
      expect(entry.chatSessions).toHaveLength(0)
    })

    it('creates entry with chatSessions', async () => {
      const chatSession1 = createChatSession('will-be-replaced', CHAT_INTENTIONS.REFLECT)
      const chatSession2 = createChatSession('will-be-replaced', CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)

      const entryData = {
        body: 'Test body',
        chatSessions: [chatSession1, chatSession2],
      }

      const entry = await journalDexieRepository.create(entryData)

      expect(entry.id).toBeDefined()
      expect(entry.body).toBe('Test body')
      expect(entry.chatSessions).toBeDefined()
      expect(Array.isArray(entry.chatSessions)).toBe(true)
      expect(entry.chatSessions).toHaveLength(2)
      expect(entry.chatSessions?.[0].intention).toBe(CHAT_INTENTIONS.REFLECT)
      expect(entry.chatSessions?.[1].intention).toBe(CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)
    })
  })

  describe('update', () => {
    it('preserves chatSessions when updating entry', async () => {
      // Create entry with chatSessions
      const chatSession = createChatSession('entry-1', CHAT_INTENTIONS.REFLECT)
      const entry = await journalDexieRepository.create({
        body: 'Original body',
        chatSessions: [chatSession],
      })

      // Update entry
      const updatedEntry: JournalEntry = {
        ...entry,
        body: 'Updated body',
      }

      const result = await journalDexieRepository.update(updatedEntry)

      expect(result.body).toBe('Updated body')
      expect(result.chatSessions).toBeDefined()
      expect(Array.isArray(result.chatSessions)).toBe(true)
      expect(result.chatSessions).toHaveLength(1)
      expect(result.chatSessions?.[0].id).toBe(chatSession.id)
      expect(result.chatSessions?.[0].intention).toBe(CHAT_INTENTIONS.REFLECT)
    })

    it('updates entry to add chatSessions', async () => {
      // Create entry without chatSessions
      const entry = await journalDexieRepository.create({
        body: 'Original body',
      })

      // Update entry to add chatSessions
      const chatSession = createChatSession(entry.id, CHAT_INTENTIONS.PROACTIVE)
      const updatedEntry: JournalEntry = {
        ...entry,
        chatSessions: [chatSession],
      }

      const result = await journalDexieRepository.update(updatedEntry)

      expect(result.chatSessions).toBeDefined()
      expect(Array.isArray(result.chatSessions)).toBe(true)
      expect(result.chatSessions).toHaveLength(1)
      expect(result.chatSessions?.[0].intention).toBe(CHAT_INTENTIONS.PROACTIVE)
    })

    it('updates entry to modify chatSessions', async () => {
      // Create entry with chatSessions
      const chatSession1 = createChatSession('entry-1', CHAT_INTENTIONS.REFLECT)
      const entry = await journalDexieRepository.create({
        body: 'Original body',
        chatSessions: [chatSession1],
      })

      // Update entry to add more chatSessions
      const chatSession2 = createChatSession(entry.id, CHAT_INTENTIONS.THINKING_TRAPS)
      const updatedEntry: JournalEntry = {
        ...entry,
        chatSessions: [chatSession1, chatSession2],
      }

      const result = await journalDexieRepository.update(updatedEntry)

      expect(result.chatSessions).toHaveLength(2)
      expect(result.chatSessions?.[0].intention).toBe(CHAT_INTENTIONS.REFLECT)
      expect(result.chatSessions?.[1].intention).toBe(CHAT_INTENTIONS.THINKING_TRAPS)
    })
  })

  describe('getById', () => {
    it('retrieves entry with chatSessions', async () => {
      const chatSession = createChatSession('entry-1', CHAT_INTENTIONS.REFLECT)
      const createdEntry = await journalDexieRepository.create({
        body: 'Test body',
        chatSessions: [chatSession],
      })

      const retrievedEntry = await journalDexieRepository.getById(createdEntry.id)

      expect(retrievedEntry).toBeDefined()
      expect(retrievedEntry?.id).toBe(createdEntry.id)
      expect(retrievedEntry?.chatSessions).toBeDefined()
      expect(Array.isArray(retrievedEntry?.chatSessions)).toBe(true)
      expect(retrievedEntry?.chatSessions).toHaveLength(1)
      expect(retrievedEntry?.chatSessions?.[0].id).toBe(chatSession.id)
    })

    it('retrieves entry without chatSessions', async () => {
      const createdEntry = await journalDexieRepository.create({
        body: 'Test body',
      })

      const retrievedEntry = await journalDexieRepository.getById(createdEntry.id)

      expect(retrievedEntry).toBeDefined()
      expect(retrievedEntry?.id).toBe(createdEntry.id)
      expect(retrievedEntry?.chatSessions).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('retrieves all entries including those with chatSessions', async () => {
      // Create entries with and without chatSessions
      const chatSession = createChatSession('entry-1', CHAT_INTENTIONS.REFLECT)
      await journalDexieRepository.create({
        body: 'Entry with chat',
        chatSessions: [chatSession],
      })
      await journalDexieRepository.create({
        body: 'Entry without chat',
      })

      const entries = await journalDexieRepository.getAll()

      expect(entries).toHaveLength(2)
      const entryWithChat = entries.find((e) => e.body === 'Entry with chat')
      const entryWithoutChat = entries.find((e) => e.body === 'Entry without chat')

      expect(entryWithChat?.chatSessions).toBeDefined()
      expect(Array.isArray(entryWithChat?.chatSessions)).toBe(true)
      expect(entryWithChat?.chatSessions).toHaveLength(1)

      expect(entryWithoutChat?.chatSessions).toBeUndefined()
    })
  })
})

