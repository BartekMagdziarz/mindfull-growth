/**
 * Draft Storage Service
 *
 * Provides async key-value storage for planning/reflection draft data
 * using the IndexedDB `drafts` table. This replaces sessionStorage
 * so that in-progress drafts survive browser refresh and tab close.
 */

import { getUserDatabase, isUserDatabaseConnected } from './userDatabase.service'

/**
 * Load a draft blob from IndexedDB by key.
 * Returns the JSON string or null if not found / DB not connected.
 */
export async function loadDraftFromDB(key: string): Promise<string | null> {
  if (!isUserDatabaseConnected()) return null
  try {
    const record = await getUserDatabase().drafts.get(key)
    return record?.data ?? null
  } catch {
    return null
  }
}

/**
 * Save a draft blob to IndexedDB (upsert by key).
 * Fire-and-forget — callers don't need to await.
 */
export async function saveDraftToDB(key: string, data: string): Promise<void> {
  if (!isUserDatabaseConnected()) return
  try {
    await getUserDatabase().drafts.put({
      key,
      data,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('Failed to save draft to IndexedDB:', error)
  }
}

/**
 * Remove a draft from IndexedDB by key.
 * Fire-and-forget — callers don't need to await.
 */
export async function clearDraftFromDB(key: string): Promise<void> {
  if (!isUserDatabaseConnected()) return
  try {
    await getUserDatabase().drafts.delete(key)
  } catch (error) {
    console.warn('Failed to clear draft from IndexedDB:', error)
  }
}
