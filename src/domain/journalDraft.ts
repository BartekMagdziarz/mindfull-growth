import type { JournalEntry } from './journal'
/** A local unsaved editor; never part of searchable AI history. */
export interface JournalDraft {
  id: string
  content: Pick<JournalEntry, 'title' | 'body' | 'emotions' | 'peopleTagIds' | 'contextTagIds'>
  entryDate?: string
  updatedAt: string
}
