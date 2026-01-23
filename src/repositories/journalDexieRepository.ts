import type { JournalEntry } from '@/domain/journal'
import type { JournalRepository } from './journalRepository'
import { getUserDatabase } from '@/services/userDatabase.service'

// Implementation of JournalRepository using IndexedDB via Dexie
class JournalDexieRepository implements JournalRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<JournalEntry[]> {
    try {
      return await this.db.journalEntries.toArray()
    } catch (error) {
      console.error('Failed to get all journal entries:', error)
      throw new Error('Failed to retrieve journal entries from database')
    }
  }

  async getById(id: string): Promise<JournalEntry | undefined> {
    try {
      return await this.db.journalEntries.get(id)
    } catch (error) {
      console.error(`Failed to get journal entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve journal entry with id ${id}`)
    }
  }

  async create(
    data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<JournalEntry> {
    try {
      const now = new Date().toISOString()
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        createdAt: data.createdAt || now,
        updatedAt: now,
        ...data,
      }
      await this.db.journalEntries.add(entry)
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
      await this.db.journalEntries.put(updatedEntry)
      return updatedEntry
    } catch (error) {
      console.error(`Failed to update journal entry with id ${entry.id}:`, error)
      throw new Error(`Failed to update journal entry with id ${entry.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.journalEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete journal entry with id ${id}:`, error)
      throw new Error(`Failed to delete journal entry with id ${id}`)
    }
  }
}

// Export a singleton instance
export const journalDexieRepository = new JournalDexieRepository()

