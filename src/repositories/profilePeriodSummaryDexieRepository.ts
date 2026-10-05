import { userDatabaseOperation } from './userDatabaseOperation'
import type {
  ProfilePeriodSummary,
  ProfilePeriodSummaryKind,
  CreateProfilePeriodSummaryPayload,
} from '@/domain/profilePeriodSummary'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface ProfilePeriodSummaryRepository {
  getByPeriod(
    periodRef: string,
    kind: ProfilePeriodSummaryKind
  ): Promise<ProfilePeriodSummary | undefined>
  upsert(payload: CreateProfilePeriodSummaryPayload): Promise<ProfilePeriodSummary>
  list(): Promise<ProfilePeriodSummary[]>
  clearAll(): Promise<void>
}

class ProfilePeriodSummaryDexieRepository implements ProfilePeriodSummaryRepository {
  async getByPeriod(
    periodRef: string,
    kind: ProfilePeriodSummaryKind
  ): Promise<ProfilePeriodSummary | undefined> {
    return userDatabaseOperation('r', ['profilePeriodSummaries'], async db => {
      try {
        return await db.profilePeriodSummaries
          .where('[periodRef+kind]')
          .equals([periodRef, kind])
          .first()
      } catch (error) {
        console.error(`Failed to get profile period summary ${periodRef}/${kind}:`, error)
        throw new Error('Failed to retrieve profile period summary from database')
      }
    })
  }

  /** Insert or replace the single summary for a (periodRef, kind). */
  async upsert(payload: CreateProfilePeriodSummaryPayload): Promise<ProfilePeriodSummary> {
    return userDatabaseOperation('rw', ['profilePeriodSummaries'], async db => {
      try {
        const existing = await db.profilePeriodSummaries
          .where('[periodRef+kind]')
          .equals([payload.periodRef, payload.kind])
          .first()
        const record: ProfilePeriodSummary = existing
          ? { ...existing, ...payload, id: existing.id, createdAt: existing.createdAt }
          : {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              ...payload,
            }
        await db.profilePeriodSummaries.put(toPlain(record))
        return record
      } catch (error) {
        console.error('Failed to upsert profile period summary:', error)
        throw new Error('Failed to upsert profile period summary to database')
      }
    })
  }

  async list(): Promise<ProfilePeriodSummary[]> {
    return userDatabaseOperation('r', ['profilePeriodSummaries'], async db => {
      try {
        return await db.profilePeriodSummaries.toArray()
      } catch (error) {
        console.error('Failed to list profile period summaries:', error)
        throw new Error('Failed to retrieve profile period summaries from database')
      }
    })
  }

  async clearAll(): Promise<void> {
    return userDatabaseOperation('rw', ['profilePeriodSummaries'], async db => {
      try {
        await db.profilePeriodSummaries.clear()
      } catch (error) {
        console.error('Failed to clear profile period summaries:', error)
        throw new Error('Failed to clear profile period summaries from database')
      }
    })
  }
}

export const profilePeriodSummaryDexieRepository: ProfilePeriodSummaryRepository =
  new ProfilePeriodSummaryDexieRepository()
