import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'
import type { PeriodicEntry } from '@/domain/periodicEntry'
import type {
  FocusArea,
  Priority,
  Project,
  Commitment,
  WeeklyPlan,
  QuarterlyPlan,
  YearlyPlan,
} from '@/domain/planning'

/**
 * Per-user database schema
 * Each user gets their own database: MindfullGrowthDB_<userId>
 */
export class UserDatabase extends Dexie {
  // Existing tables
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>
  periodicEntries!: Table<PeriodicEntry, string>

  // Planning system tables (Epic 4)
  focusAreas!: Table<FocusArea, string>
  priorities!: Table<Priority, string>
  projects!: Table<Project, string>
  commitments!: Table<Commitment, string>
  weeklyPlans!: Table<WeeklyPlan, string>
  quarterlyPlans!: Table<QuarterlyPlan, string>
  yearlyPlans!: Table<YearlyPlan, string>

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

    // Version 7: Planning system tables (Epic 4)
    // These tables support the new Planning & Reflection System
    this.version(7).stores({
      // Focus Areas: yearly high-level life areas
      // Indexed by year for "get all focus areas for 2026" queries
      // Indexed by isActive for filtering active/inactive
      focusAreas: 'id, year, isActive',

      // Priorities: directions within focus areas
      // Indexed by focusAreaId for "get priorities for this focus area" queries
      // Indexed by year for yearly queries
      priorities: 'id, focusAreaId, year',

      // Projects: quarterly initiatives
      // Indexed by focusAreaId for "get projects for this focus area" queries
      // Indexed by quarterStart for "get projects for Q1 2026" queries
      // Indexed by status for filtering active/completed projects
      projects: 'id, focusAreaId, quarterStart, status',

      // Commitments: weekly actionable items
      // Indexed by weekStartDate for "get commitments for this week" queries
      // Indexed by projectId for "get commitments for this project" queries
      commitments: 'id, weekStartDate, projectId',

      // Weekly Plans: one per week (weekStartDate is unique)
      // & prefix makes weekStartDate unique - only one plan per week
      weeklyPlans: 'id, &weekStartDate',

      // Quarterly Plans: one per quarter (year+quarter compound is unique)
      // Compound index for efficient "get plan for Q1 2026" queries
      quarterlyPlans: 'id, [year+quarter]',

      // Yearly Plans: one per year (year is unique)
      // & prefix makes year unique - only one plan per year
      yearlyPlans: 'id, &year',
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
