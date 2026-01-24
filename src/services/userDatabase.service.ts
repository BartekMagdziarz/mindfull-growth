import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'
import type { PeriodicEntry } from '@/domain/periodicEntry'
import type {
  CascadingGoal,
  GoalTracker,
  TrackerEntry,
  PeriodTemplate,
} from '@/domain/lifeSeasons'

/**
 * Per-user database schema
 * Each user gets their own database: MindfullGrowthDB_<userId>
 */
export class UserDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>
  periodicEntries!: Table<PeriodicEntry, string>
  // Journey feature tables
  cascadingGoals!: Table<CascadingGoal, string>
  goalTrackers!: Table<GoalTracker, string>
  trackerEntries!: Table<TrackerEntry, string>
  periodTemplates!: Table<PeriodTemplate, string>

  constructor(databaseName: string) {
    super(databaseName)

    // Schema versions - same as original MindfullGrowthDatabase
    this.version(1).stores({
      journalEntries: 'id',
    })
    this.version(2).stores({
      peopleTags: 'id',
      contextTags: 'id',
    })
    this.version(3)
      .stores({
        emotionLogs: 'id',
      })
      .upgrade(async (trans) => {
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            const needsMigration =
              !Array.isArray(entry.emotionIds) ||
              !Array.isArray(entry.peopleTagIds) ||
              !Array.isArray(entry.contextTagIds)

            if (needsMigration) {
              const migratedEntry = {
                ...entry,
                emotionIds: Array.isArray(entry.emotionIds) ? entry.emotionIds : [],
                peopleTagIds: Array.isArray(entry.peopleTagIds) ? entry.peopleTagIds : [],
                contextTagIds: Array.isArray(entry.contextTagIds) ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          if (migratedCount > 0) {
            console.log(`[Migration v2→v3] Migrated ${migratedCount} journal entries`)
          }
        } catch (error) {
          console.error('[Migration v2→v3] Error:', error)
        }
      })
    this.version(4).stores({
      userSettings: 'key',
    })
    this.version(5).upgrade(async (trans) => {
      try {
        const entries = await trans.table('journalEntries').toArray()
        let migratedCount = 0

        for (const entry of entries) {
          if (!Array.isArray(entry.chatSessions)) {
            const migratedEntry = {
              ...entry,
              chatSessions: [],
            }
            await trans.table('journalEntries').put(migratedEntry)
            migratedCount++
          }
        }

        if (migratedCount > 0) {
          console.log(`[Migration v4→v5] Migrated ${migratedCount} journal entries`)
        }
      } catch (error) {
        console.error('[Migration v4→v5] Error:', error)
      }
    })
    this.version(6).stores({
      periodicEntries: 'id, type, periodStartDate, [type+periodStartDate]',
    })

    // Version 7: Journey feature - cascading goals, trackers, and templates
    this.version(7).stores({
      cascadingGoals: 'id, sourceEntryId, sourcePeriodType, status, parentGoalId',
      goalTrackers: 'id, goalId, frequency',
      trackerEntries: 'id, trackerId, date, [trackerId+date]',
      periodTemplates: 'id, periodType',
    })
  }
}

let currentDb: UserDatabase | null = null
let currentUserId: string | null = null

/**
 * Get the current user's database
 * Throws if no user is logged in
 */
export function getUserDatabase(): UserDatabase {
  if (!currentDb) {
    throw new Error('No user database connected. User must be logged in.')
  }
  return currentDb
}

/**
 * Check if a user database is currently connected
 */
export function isUserDatabaseConnected(): boolean {
  return currentDb !== null
}

/**
 * Connect to a user's database
 * Creates the database if it doesn't exist
 */
export async function connectUserDatabase(userId: string): Promise<UserDatabase> {
  // Already connected to this user's database
  if (currentUserId === userId && currentDb) {
    return currentDb
  }

  // Close existing connection
  if (currentDb) {
    await currentDb.close()
  }

  // Create database with user-specific name
  const dbName = `MindfullGrowthDB_${userId}`
  currentDb = new UserDatabase(dbName)
  currentUserId = userId

  await currentDb.open()
  return currentDb
}

/**
 * Disconnect from the current user's database
 */
export async function disconnectUserDatabase(): Promise<void> {
  if (currentDb) {
    await currentDb.close()
    currentDb = null
    currentUserId = null
  }
}

/**
 * Get the current connected user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId
}
