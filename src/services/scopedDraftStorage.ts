import * as storage from './draftStorage'
import { captureUserSession } from './userSessionScope'

/** Bind wizard timers and unmount flushes to the session that created them. */
export function createScopedDraftStorage() {
  const session = captureUserSession()
  return {
    async loadDraftFromDB(key: string): Promise<string | null> {
      if (!session.isCurrent()) return null
      const raw = await storage.loadDraftFromDB(key)
      return session.isCurrent() ? raw : null
    },
    saveDraftToDB(key: string, data: string): Promise<void> {
      return session.isCurrent() ? storage.saveDraftToDB(key, data) : Promise.resolve()
    },
    clearDraftFromDB(key: string): Promise<void> {
      return session.isCurrent() ? storage.clearDraftFromDB(key) : Promise.resolve()
    },
  }
}
