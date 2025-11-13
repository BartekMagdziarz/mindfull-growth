import type { JournalEntry } from '@/domain/journal'

export interface JournalRepository {
  getAll(): Promise<JournalEntry[]>
  getById(id: string): Promise<JournalEntry | undefined>
  create(
    data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry>
  update(entry: JournalEntry): Promise<JournalEntry>
  delete(id: string): Promise<void>
}

