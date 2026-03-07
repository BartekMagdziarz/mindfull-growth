import type { JournalEntry } from '@/domain/journal'
import type { JournalRepository } from './journalRepository'
import { getUserDatabase } from '@/services/userDatabase.service'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

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

      // Validate createdAt if provided, fallback to now if invalid
      let createdAt = now
      if (data.createdAt) {
        const parsedDate = new Date(data.createdAt)
        if (!isNaN(parsedDate.getTime())) {
          createdAt = data.createdAt
        } else {
          console.warn('Invalid createdAt provided, using current timestamp:', data.createdAt)
        }
      }

      const { createdAt: _, ...restData } = data
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        createdAt,
        updatedAt: now,
        ...restData,
      }
      await this.db.journalEntries.add(toPlain(entry))
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
      await this.db.journalEntries.put(toPlain(updatedEntry))
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

