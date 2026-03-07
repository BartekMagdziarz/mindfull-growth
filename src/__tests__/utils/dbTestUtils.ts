import type { ContextTag, PeopleTag } from '@/domain/tag'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import { connectTestDatabase, getTestDatabase } from '@/test/testDatabase'

/**
 * Ensures we start each integration-style test with a pristine Dexie database.
 * Dexie reuses the same IndexedDB instance (`MindfullGrowthDB`), so we need to
 * close, delete, and reopen it between tests to avoid data coupling.
 */
export async function resetDatabase(): Promise<void> {
  const db = await connectTestDatabase()

  await db.close()
  await db.delete()
  await db.open()

  await Promise.all(db.tables.map((table) => table.clear()))
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await connectTestDatabase()
  return db.journalEntries.toArray()
}

export async function getAllEmotionLogs(): Promise<EmotionLog[]> {
  const db = await connectTestDatabase()
  return db.emotionLogs.toArray()
}

export async function getAllPeopleTags(): Promise<PeopleTag[]> {
  const db = await connectTestDatabase()
  return db.peopleTags.toArray()
}

export async function getAllContextTags(): Promise<ContextTag[]> {
  const db = await connectTestDatabase()
  return db.contextTags.toArray()
}

export function getDatabase() {
  return getTestDatabase()
}

