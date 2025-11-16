import { db } from '@/repositories/journalDexieRepository'
import type { ContextTag, PeopleTag } from '@/domain/tag'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'

/**
 * Ensures we start each integration-style test with a pristine Dexie database.
 * Dexie reuses the same IndexedDB instance (`MindfullGrowthDB`), so we need to
 * close, delete, and reopen it between tests to avoid data coupling.
 */
export async function resetDatabase(): Promise<void> {
  db.close()
  await db.delete()
  await db.open()

  await Promise.all([
    db.journalEntries.clear(),
    db.peopleTags.clear(),
    db.contextTags.clear(),
    db.emotionLogs.clear(),
  ])
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  return db.journalEntries.toArray()
}

export async function getAllEmotionLogs(): Promise<EmotionLog[]> {
  return db.emotionLogs.toArray()
}

export async function getAllPeopleTags(): Promise<PeopleTag[]> {
  return db.peopleTags.toArray()
}

export async function getAllContextTags(): Promise<ContextTag[]> {
  return db.contextTags.toArray()
}


