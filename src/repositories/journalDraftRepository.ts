import { captureUserSession } from '@/services/userSessionScope'
import { getCurrentUserId, getUserDatabase } from '@/services/userDatabaseService'
import type { JournalDraft } from '@/domain/journalDraft'
import { CompanionError } from '@/services/ai/companion/openai'
export function journalDraftRepository() {
  const db = getUserDatabase(),
    user = getCurrentUserId()
  const session = captureUserSession()
  const guard = () => {
    if (!session.isCurrent()) throw new CompanionError('session-changed')
    if (db !== getUserDatabase() || user !== getCurrentUserId())
      throw new CompanionError('session-changed')
  }
  return {
    async load(id: string) {
      guard()
      const row = await db.journalDrafts.get(id)
      guard()
      return row
    },
    async save(row: JournalDraft) {
      guard()
      await db.journalDrafts.put(JSON.parse(JSON.stringify(row)))
      guard()
    },
    async list() {
      guard()
      const rows = await db.journalDrafts.orderBy('updatedAt').reverse().toArray()
      guard()
      return rows
    },
    async remove(id: string) {
      guard()
      await db.journalDrafts.delete(id)
      guard()
    },
  }
}
