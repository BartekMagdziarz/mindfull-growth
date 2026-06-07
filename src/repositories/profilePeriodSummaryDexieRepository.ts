import type {
  ProfilePeriodSummary,
  ProfilePeriodSummaryKind,
  CreateProfilePeriodSummaryPayload,
} from '@/domain/profilePeriodSummary'
import { getUserDatabase } from '@/services/userDatabase.service'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export interface ProfilePeriodSummaryRepository {
  getByPeriod(
    periodRef: string,
    kind: ProfilePeriodSummaryKind,
  ): Promise<ProfilePeriodSummary | undefined>
  upsert(
    payload: CreateProfilePeriodSummaryPayload,
  ): Promise<ProfilePeriodSummary>
  list(): Promise<ProfilePeriodSummary[]>
  clearAll(): Promise<void>
}

class ProfilePeriodSummaryDexieRepository
  implements ProfilePeriodSummaryRepository
{
  private get table() {
    return getUserDatabase().profilePeriodSummaries
  }

  async getByPeriod(
    periodRef: string,
    kind: ProfilePeriodSummaryKind,
  ): Promise<ProfilePeriodSummary | undefined> {
    try {
      return await this.table
        .where('[periodRef+kind]')
        .equals([periodRef, kind])
        .first()
    } catch (error) {
      console.error(
        `Failed to get profile period summary ${periodRef}/${kind}:`,
        error,
      )
      throw new Error('Failed to retrieve profile period summary from database')
    }
  }

  /** Insert or replace the single summary for a (periodRef, kind). */
  async upsert(
    payload: CreateProfilePeriodSummaryPayload,
  ): Promise<ProfilePeriodSummary> {
    try {
      const existing = await this.table
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
      await this.table.put(toPlain(record))
      return record
    } catch (error) {
      console.error('Failed to upsert profile period summary:', error)
      throw new Error('Failed to upsert profile period summary to database')
    }
  }

  async list(): Promise<ProfilePeriodSummary[]> {
    try {
      return await this.table.toArray()
    } catch (error) {
      console.error('Failed to list profile period summaries:', error)
      throw new Error('Failed to retrieve profile period summaries from database')
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.table.clear()
    } catch (error) {
      console.error('Failed to clear profile period summaries:', error)
      throw new Error('Failed to clear profile period summaries from database')
    }
  }
}

export const profilePeriodSummaryDexieRepository: ProfilePeriodSummaryRepository =
  new ProfilePeriodSummaryDexieRepository()
