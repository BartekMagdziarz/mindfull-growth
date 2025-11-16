import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { JournalRepository } from './journalRepository'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'

// Define the database schema
export class MindfullGrowthDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>

  constructor() {
    super('MindfullGrowthDB')
    this.version(1).stores({
      journalEntries: 'id', // id is the primary key
    })
    this.version(2).stores({
      peopleTags: 'id', // id is the primary key
      contextTags: 'id', // id is the primary key
    })
    this.version(3)
      .stores({
        emotionLogs: 'id', // id is the primary key
      })
      .upgrade(async (trans) => {
        // Migration: Add emotionIds, peopleTagIds, contextTagIds fields to existing journal entries
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            const needsMigration =
              !Array.isArray(entry.emotionIds) ||
              !Array.isArray(entry.peopleTagIds) ||
              !Array.isArray(entry.contextTagIds)

            if (needsMigration) {
              const migratedEntry: JournalEntry = {
                ...entry,
                emotionIds: Array.isArray(entry.emotionIds) ? entry.emotionIds : [],
                peopleTagIds: Array.isArray(entry.peopleTagIds) ? entry.peopleTagIds : [],
                contextTagIds: Array.isArray(entry.contextTagIds) ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          console.log(
            `[Migration v2→v3] Successfully migrated ${migratedCount} journal entry/entries with new tagging fields`
          )
        } catch (error) {
          console.error('[Migration v2→v3] Error during migration:', error)
          // Don't throw - allow app to start even if migration fails
          // The migration will be retried on next app start
        }
      })
  }
}

// Create a singleton database instance
export const db = new MindfullGrowthDatabase()

// Implementation of JournalRepository using IndexedDB via Dexie
class JournalDexieRepository implements JournalRepository {
  async getAll(): Promise<JournalEntry[]> {
    try {
      return await db.journalEntries.toArray()
    } catch (error) {
      console.error('Failed to get all journal entries:', error)
      throw new Error('Failed to retrieve journal entries from database')
    }
  }

  async getById(id: string): Promise<JournalEntry | undefined> {
    try {
      return await db.journalEntries.get(id)
    } catch (error) {
      console.error(`Failed to get journal entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve journal entry with id ${id}`)
    }
  }

  async create(
    data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> {
    try {
      const now = new Date().toISOString()
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await db.journalEntries.add(entry)
      return entry
    } catch (error) {
      console.error('Failed to create journal entry:', error)
      throw new Error('Failed to create journal entry in database')
    }
  }

  async update(entry: JournalEntry): Promise<JournalEntry> {
    try {
      const updatedEntry: JournalEntry = {
        ...entry,
        updatedAt: new Date().toISOString(),
      }
      await db.journalEntries.put(updatedEntry)
      return updatedEntry
    } catch (error) {
      console.error(`Failed to update journal entry with id ${entry.id}:`, error)
      throw new Error(`Failed to update journal entry with id ${entry.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.journalEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete journal entry with id ${id}:`, error)
      throw new Error(`Failed to delete journal entry with id ${id}`)
    }
  }
}

// Export a singleton instance
export const journalDexieRepository = new JournalDexieRepository()

