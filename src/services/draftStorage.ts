/**
 * Draft Storage Service
 *
 * Provides async key-value storage for in-progress editor and wizard drafts
 * using the IndexedDB `drafts` table. This replaces sessionStorage
 * so that in-progress drafts survive browser refresh and tab close.
 */

import { isUserDatabaseConnected } from './userDatabaseService'
import { userDatabaseOperation } from '@/repositories/userDatabaseOperation'
import { captureUserSession } from './userSessionScope'

/**
 * Load a draft blob from IndexedDB by key.
 * Returns the JSON string or null if not found / DB not connected.
 */
export async function loadDraftFromDB(key: string): Promise<string | null> {
  if (!isUserDatabaseConnected()) return null
  try {
    const record = await userDatabaseOperation('r', ['drafts'], db => db.drafts.get(key))
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
  const session = captureUserSession()
  try {
    await userDatabaseOperation('rw', ['drafts'], async db => {
      await db.drafts.put({
        key,
        data,
        updatedAt: new Date().toISOString(),
      })
    })
  } catch (error) {
    if (!session.isCurrent()) return
    console.warn('Failed to save draft to IndexedDB:', error)
  }
}

/**
 * Remove a draft from IndexedDB by key.
 * Fire-and-forget — callers don't need to await.
 */
export async function clearDraftFromDB(key: string): Promise<void> {
  if (!isUserDatabaseConnected()) return
  const session = captureUserSession()
  try {
    await userDatabaseOperation('rw', ['drafts'], db => db.drafts.delete(key))
  } catch (error) {
    if (!session.isCurrent()) return
    console.warn('Failed to clear draft from IndexedDB:', error)
  }
}
