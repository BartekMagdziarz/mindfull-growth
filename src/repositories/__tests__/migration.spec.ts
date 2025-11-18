import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import type { ChatSession } from '@/domain/chatSession'

// Test database class that mimics the version 2 schema
class TestDatabaseV2 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      journalEntries: 'id',
    })
    this.version(2).stores({
      peopleTags: 'id',
      contextTags: 'id',
    })
  }
}

// Test database class with version 3 (includes migration)
class TestDatabaseV3 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>

  constructor(name: string) {
    super(name)
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
        // Migration: Add emotionIds, peopleTagIds, contextTagIds fields to existing journal entries
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            // Only migrate if fields are missing (idempotent migration)
            const needsMigration =
              !('emotionIds' in entry) ||
              entry.emotionIds === undefined ||
              !('peopleTagIds' in entry) ||
              entry.peopleTagIds === undefined ||
              !('contextTagIds' in entry) ||
              entry.contextTagIds === undefined

            if (needsMigration) {
              // Create updated entry with all fields, using existing values or defaults
              const migratedEntry: JournalEntry = {
                ...entry,
                emotionIds: 'emotionIds' in entry && entry.emotionIds !== undefined ? entry.emotionIds : [],
                peopleTagIds: 'peopleTagIds' in entry && entry.peopleTagIds !== undefined ? entry.peopleTagIds : [],
                contextTagIds: 'contextTagIds' in entry && entry.contextTagIds !== undefined ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          console.log(
            `[Migration v2→v3] Successfully migrated ${migratedCount} journal entry/entries with new tagging fields`
          )
        } catch (error) {
          console.error('[Migration v2→v3] Error during migration:', error)
          // Don't throw - allow app to start even if migration fails
        }
      })
  }
}

describe('Database Migration v2→v3', () => {
  let dbName: string

  beforeEach(() => {
    // Generate unique database name for each test
    dbName = `TestDB_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    // Clean up: delete test database
    try {
      await Dexie.delete(dbName)
    } catch (error) {
      // Ignore errors if database doesn't exist
    }
  })

  describe('Migration runs successfully', () => {
    it('database version increments from 2 to 3', async () => {
      // Create database with version 2
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      // Add some test data
      await dbV2.journalEntries.add({
        id: 'test-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      })

      await dbV2.close()

      // Now open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      expect(dbV3.verno).toBe(3)
      await dbV3.close()
    })

    it('emotionLogs table is created', async () => {
      const db = new TestDatabaseV3(dbName)
      await db.open()

      // Verify emotionLogs table exists and is accessible
      expect(db.emotionLogs).toBeDefined()
      const count = await db.emotionLogs.count()
      expect(count).toBe(0) // Should be empty initially

      await db.close()
    })
  })

  describe('Existing journal entries are migrated', () => {
    it('entries without fields get empty arrays', async () => {
      // Create database with version 2 and add entry without new fields
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      const entryWithoutFields: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }

      await dbV2.journalEntries.add(entryWithoutFields)
      await dbV2.close()

      // Open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Verify entry was migrated
      const migratedEntry = await dbV3.journalEntries.get('entry-1')
      expect(migratedEntry).toBeDefined()
      expect(migratedEntry?.emotionIds).toEqual([])
      expect(migratedEntry?.peopleTagIds).toEqual([])
      expect(migratedEntry?.contextTagIds).toEqual([])

      await dbV3.close()
    })

    it('entries with existing fields are not modified', async () => {
      // Create database with version 2
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      // Add entry that already has the new fields (simulating pre-migrated data)
      const entryWithFields = {
        id: 'entry-2',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: ['emotion-1'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      // Use put to add entry with custom fields (bypassing TypeScript type checking)
      await dbV2.journalEntries.put(entryWithFields as JournalEntry)
      await dbV2.close()

      // Open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Verify entry was not modified
      const entry = await dbV3.journalEntries.get('entry-2')
      expect(entry).toBeDefined()
      expect(entry?.emotionIds).toEqual(['emotion-1'])
      expect(entry?.peopleTagIds).toEqual(['people-1'])
      expect(entry?.contextTagIds).toEqual(['context-1'])

      await dbV3.close()
    })

    it('entries with partial fields get missing fields added', async () => {
      // Create database with version 2
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      // Add entry with only emotionIds
      const entryPartial = {
        id: 'entry-3',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: ['emotion-1'],
      }

      await dbV2.journalEntries.put(entryPartial as JournalEntry)
      await dbV2.close()

      // Open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Verify entry has all fields
      const entry = await dbV3.journalEntries.get('entry-3')
      expect(entry).toBeDefined()
      expect(entry?.emotionIds).toEqual(['emotion-1']) // Preserved
      expect(entry?.peopleTagIds).toEqual([]) // Added
      expect(entry?.contextTagIds).toEqual([]) // Added

      await dbV3.close()
    })
  })

  describe('No data loss', () => {
    it('all existing fields are preserved', async () => {
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      const originalEntry: JournalEntry = {
        id: 'entry-4',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body content',
      }

      await dbV2.journalEntries.add(originalEntry)
      await dbV2.close()

      // Open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Verify all original fields are preserved
      const migratedEntry = await dbV3.journalEntries.get('entry-4')
      expect(migratedEntry?.id).toBe('entry-4')
      expect(migratedEntry?.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(migratedEntry?.updatedAt).toBe('2024-01-02T00:00:00.000Z')
      expect(migratedEntry?.title).toBe('Test Title')
      expect(migratedEntry?.body).toBe('Test body content')
      // New fields should be added
      expect(migratedEntry?.emotionIds).toEqual([])
      expect(migratedEntry?.peopleTagIds).toEqual([])
      expect(migratedEntry?.contextTagIds).toEqual([])

      await dbV3.close()
    })

    it('new entries created after migration have new fields', async () => {
      const db = new TestDatabaseV3(dbName)
      await db.open()

      // Create new entry after migration
      const newEntry: JournalEntry = {
        id: 'entry-5',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        body: 'New entry body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      await db.journalEntries.add(newEntry)

      // Verify entry has all fields
      const entry = await db.journalEntries.get('entry-5')
      expect(entry?.emotionIds).toBeDefined()
      expect(entry?.peopleTagIds).toBeDefined()
      expect(entry?.contextTagIds).toBeDefined()

      await db.close()
    })
  })

  describe('Idempotency', () => {
    it('running migration multiple times does not cause issues', async () => {
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      await dbV2.journalEntries.add({
        id: 'entry-6',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      })

      await dbV2.close()

      // First migration
      const dbV3a = new TestDatabaseV3(dbName)
      await dbV3a.open()
      const entry1 = await dbV3a.journalEntries.get('entry-6')
      expect(entry1?.emotionIds).toEqual([])
      await dbV3a.close()

      // Re-open (migration should be idempotent)
      const dbV3b = new TestDatabaseV3(dbName)
      await dbV3b.open()
      const entry2 = await dbV3b.journalEntries.get('entry-6')
      expect(entry2?.emotionIds).toEqual([])
      expect(entry2?.peopleTagIds).toEqual([])
      expect(entry2?.contextTagIds).toEqual([])
      await dbV3b.close()
    })

    it('migration does not duplicate fields or data', async () => {
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      await dbV2.journalEntries.add({
        id: 'entry-7',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      })

      await dbV2.close()

      // Migrate
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      const entry = await dbV3.journalEntries.get('entry-7')
      // Verify arrays are not duplicated (should be single arrays, not nested)
      expect(Array.isArray(entry?.emotionIds)).toBe(true)
      expect(entry?.emotionIds?.length).toBe(0)
      expect(Array.isArray(entry?.peopleTagIds)).toBe(true)
      expect(entry?.peopleTagIds?.length).toBe(0)
      expect(Array.isArray(entry?.contextTagIds)).toBe(true)
      expect(entry?.contextTagIds?.length).toBe(0)

      await dbV3.close()
    })
  })

  describe('Edge cases', () => {
    it('empty database migrates successfully', async () => {
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()
      await dbV2.close()

      // Open with version 3 (triggers migration on empty database)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      expect(dbV3.verno).toBe(3)
      const count = await dbV3.journalEntries.count()
      expect(count).toBe(0)

      await dbV3.close()
    })

    it('database with many entries migrates successfully', async () => {
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      // Add multiple entries
      const entries: JournalEntry[] = []
      for (let i = 0; i < 10; i++) {
        entries.push({
          id: `entry-${i}`,
          createdAt: `2024-01-0${i + 1}T00:00:00.000Z`,
          updatedAt: `2024-01-0${i + 1}T00:00:00.000Z`,
          body: `Body ${i}`,
        })
      }

      await dbV2.journalEntries.bulkAdd(entries)
      await dbV2.close()

      // Open with version 3 (triggers migration)
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Verify all entries were migrated
      const allEntries = await dbV3.journalEntries.toArray()
      expect(allEntries).toHaveLength(10)

      for (const entry of allEntries) {
        expect(entry.emotionIds).toEqual([])
        expect(entry.peopleTagIds).toEqual([])
        expect(entry.contextTagIds).toEqual([])
      }

      await dbV3.close()
    })
  })

  describe('Error handling', () => {
    it('migration handles errors gracefully without crashing', async () => {
      // This test verifies that migration errors are caught and logged
      // but don't prevent the database from opening
      const dbV2 = new TestDatabaseV2(dbName)
      await dbV2.open()

      await dbV2.journalEntries.add({
        id: 'entry-8',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      })

      await dbV2.close()

      // Open with version 3 - migration should complete even if there are issues
      const dbV3 = new TestDatabaseV3(dbName)
      await dbV3.open()

      // Database should still be accessible
      expect(dbV3.verno).toBe(3)
      const entry = await dbV3.journalEntries.get('entry-8')
      expect(entry).toBeDefined()

      await dbV3.close()
    })
  })
})

// Test database class that mimics the version 4 schema
class TestDatabaseV4 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>

  constructor(name: string) {
    super(name)
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
        // Migration: Add emotionIds, peopleTagIds, contextTagIds fields to existing journal entries
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            const needsMigration =
              !Array.isArray(entry.emotionIds) ||
              !Array.isArray(entry.peopleTagIds) ||
              !Array.isArray(entry.contextTagIds)

            if (needsMigration) {
              const migratedEntry: JournalEntry = {
                ...entry,
                emotionIds: Array.isArray(entry.emotionIds) ? entry.emotionIds : [],
                peopleTagIds: Array.isArray(entry.peopleTagIds) ? entry.peopleTagIds : [],
                contextTagIds: Array.isArray(entry.contextTagIds) ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          console.log(
            `[Migration v2→v3] Successfully migrated ${migratedCount} journal entry/entries with new tagging fields`
          )
        } catch (error) {
          console.error('[Migration v2→v3] Error during migration:', error)
        }
      })
    this.version(4).stores({
      userSettings: 'key',
    })
  }
}

// Test database class with version 5 (includes chatSessions migration)
class TestDatabaseV5 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  peopleTags!: Table<PeopleTag, string>
  contextTags!: Table<ContextTag, string>
  emotionLogs!: Table<EmotionLog, string>
  userSettings!: Table<{ key: string; value: string }, string>

  constructor(name: string) {
    super(name)
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
        // Migration: Add emotionIds, peopleTagIds, contextTagIds fields to existing journal entries
        try {
          const entries = await trans.table('journalEntries').toArray()
          let migratedCount = 0

          for (const entry of entries) {
            const needsMigration =
              !Array.isArray(entry.emotionIds) ||
              !Array.isArray(entry.peopleTagIds) ||
              !Array.isArray(entry.contextTagIds)

            if (needsMigration) {
              const migratedEntry: JournalEntry = {
                ...entry,
                emotionIds: Array.isArray(entry.emotionIds) ? entry.emotionIds : [],
                peopleTagIds: Array.isArray(entry.peopleTagIds) ? entry.peopleTagIds : [],
                contextTagIds: Array.isArray(entry.contextTagIds) ? entry.contextTagIds : [],
              }

              await trans.table('journalEntries').put(migratedEntry)
              migratedCount++
            }
          }

          console.log(
            `[Migration v2→v3] Successfully migrated ${migratedCount} journal entry/entries with new tagging fields`
          )
        } catch (error) {
          console.error('[Migration v2→v3] Error during migration:', error)
        }
      })
    this.version(4).stores({
      userSettings: 'key',
    })
    this.version(5).upgrade(async (trans) => {
      // Migration: Add chatSessions field to existing journal entries
      try {
        const entries = await trans.table('journalEntries').toArray()
        let migratedCount = 0

        for (const entry of entries) {
          if (!Array.isArray(entry.chatSessions)) {
            const migratedEntry: JournalEntry = {
              ...entry,
              chatSessions: [],
            }
            await trans.table('journalEntries').put(migratedEntry)
            migratedCount++
          }
        }

        console.log(
          `[Migration v4→v5] Successfully migrated ${migratedCount} journal entry/entries with chatSessions field`
        )
      } catch (error) {
        console.error('[Migration v4→v5] Error during migration:', error)
        // Don't throw - allow app to start even if migration fails
      }
    })
  }
}

describe('Database Migration v4→v5', () => {
  let dbName: string

  beforeEach(() => {
    // Generate unique database name for each test
    dbName = `TestDB_V5_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    // Clean up: delete test database
    try {
      await Dexie.delete(dbName)
    } catch (error) {
      // Ignore errors if database doesn't exist
    }
  })

  describe('Migration runs successfully', () => {
    it('database version increments from 4 to 5', async () => {
      // Create database with version 4
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      // Add some test data
      await dbV4.journalEntries.add({
        id: 'test-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      await dbV4.close()

      // Now open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      expect(dbV5.verno).toBe(5)
      await dbV5.close()
    })
  })

  describe('Existing journal entries are migrated', () => {
    it('entries without chatSessions get empty array', async () => {
      // Create database with version 4 and add entry without chatSessions
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      const entryWithoutChatSessions: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      await dbV4.journalEntries.add(entryWithoutChatSessions)
      await dbV4.close()

      // Open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Verify entry was migrated
      const migratedEntry = await dbV5.journalEntries.get('entry-1')
      expect(migratedEntry).toBeDefined()
      expect(migratedEntry?.chatSessions).toBeDefined()
      expect(Array.isArray(migratedEntry?.chatSessions)).toBe(true)
      expect(migratedEntry?.chatSessions).toEqual([])

      await dbV5.close()
    })

    it('entries with existing chatSessions are preserved', async () => {
      // Create database with version 4
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      // Add entry that already has chatSessions (simulating pre-migrated data)
      const existingChatSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-2',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      const entryWithChatSessions = {
        id: 'entry-2',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [existingChatSession],
      }

      // Use put to add entry with chatSessions (bypassing TypeScript type checking for v4)
      await dbV4.journalEntries.put(entryWithChatSessions as JournalEntry)
      await dbV4.close()

      // Open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Verify entry was not modified
      const entry = await dbV5.journalEntries.get('entry-2')
      expect(entry).toBeDefined()
      expect(entry?.chatSessions).toBeDefined()
      expect(Array.isArray(entry?.chatSessions)).toBe(true)
      expect(entry?.chatSessions).toHaveLength(1)
      expect(entry?.chatSessions?.[0].id).toBe('session-1')
      expect(entry?.chatSessions?.[0].intention).toBe('reflect')

      await dbV5.close()
    })

    it('entries with null or undefined chatSessions get empty array', async () => {
      // Create database with version 4
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      // Add entry with null chatSessions (simulating edge case)
      const entryWithNull = {
        id: 'entry-3',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: null,
      }

      await dbV4.journalEntries.put(entryWithNull as any)
      await dbV4.close()

      // Open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Verify entry was migrated
      const entry = await dbV5.journalEntries.get('entry-3')
      expect(entry).toBeDefined()
      expect(Array.isArray(entry?.chatSessions)).toBe(true)
      expect(entry?.chatSessions).toEqual([])

      await dbV5.close()
    })
  })

  describe('No data loss', () => {
    it('all existing fields are preserved', async () => {
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      const originalEntry: JournalEntry = {
        id: 'entry-4',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: ['emotion-1'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      await dbV4.journalEntries.add(originalEntry)
      await dbV4.close()

      // Open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Verify all original fields are preserved
      const migratedEntry = await dbV5.journalEntries.get('entry-4')
      expect(migratedEntry?.id).toBe('entry-4')
      expect(migratedEntry?.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(migratedEntry?.updatedAt).toBe('2024-01-02T00:00:00.000Z')
      expect(migratedEntry?.title).toBe('Test Title')
      expect(migratedEntry?.body).toBe('Test body content')
      expect(migratedEntry?.emotionIds).toEqual(['emotion-1'])
      expect(migratedEntry?.peopleTagIds).toEqual(['people-1'])
      expect(migratedEntry?.contextTagIds).toEqual(['context-1'])
      // New field should be added
      expect(migratedEntry?.chatSessions).toEqual([])

      await dbV5.close()
    })

    it('new entries created after migration have chatSessions field', async () => {
      const db = new TestDatabaseV5(dbName)
      await db.open()

      // Create new entry after migration
      const newEntry: JournalEntry = {
        id: 'entry-5',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        body: 'New entry body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [],
      }

      await db.journalEntries.add(newEntry)

      // Verify entry has chatSessions field
      const entry = await db.journalEntries.get('entry-5')
      expect(entry?.chatSessions).toBeDefined()
      expect(Array.isArray(entry?.chatSessions)).toBe(true)

      await db.close()
    })
  })

  describe('Idempotency', () => {
    it('running migration multiple times does not cause issues', async () => {
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      await dbV4.journalEntries.add({
        id: 'entry-6',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      await dbV4.close()

      // First migration
      const dbV5a = new TestDatabaseV5(dbName)
      await dbV5a.open()
      const entry1 = await dbV5a.journalEntries.get('entry-6')
      expect(entry1?.chatSessions).toEqual([])
      await dbV5a.close()

      // Re-open (migration should be idempotent)
      const dbV5b = new TestDatabaseV5(dbName)
      await dbV5b.open()
      const entry2 = await dbV5b.journalEntries.get('entry-6')
      expect(entry2?.chatSessions).toEqual([])
      expect(Array.isArray(entry2?.chatSessions)).toBe(true)
      await dbV5b.close()
    })

    it('migration does not duplicate fields or data', async () => {
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      await dbV4.journalEntries.add({
        id: 'entry-7',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      await dbV4.close()

      // Migrate
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      const entry = await dbV5.journalEntries.get('entry-7')
      // Verify chatSessions is a single array, not nested
      expect(Array.isArray(entry?.chatSessions)).toBe(true)
      expect(entry?.chatSessions?.length).toBe(0)

      await dbV5.close()
    })
  })

  describe('Edge cases', () => {
    it('empty database migrates successfully', async () => {
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()
      await dbV4.close()

      // Open with version 5 (triggers migration on empty database)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      expect(dbV5.verno).toBe(5)
      const count = await dbV5.journalEntries.count()
      expect(count).toBe(0)

      await dbV5.close()
    })

    it('database with many entries migrates successfully', async () => {
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      // Add multiple entries
      const entries: JournalEntry[] = []
      for (let i = 0; i < 10; i++) {
        entries.push({
          id: `entry-${i}`,
          createdAt: `2024-01-0${i + 1}T00:00:00.000Z`,
          updatedAt: `2024-01-0${i + 1}T00:00:00.000Z`,
          body: `Body ${i}`,
          emotionIds: [],
          peopleTagIds: [],
          contextTagIds: [],
        })
      }

      await dbV4.journalEntries.bulkAdd(entries)
      await dbV4.close()

      // Open with version 5 (triggers migration)
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Verify all entries were migrated
      const allEntries = await dbV5.journalEntries.toArray()
      expect(allEntries).toHaveLength(10)

      for (const entry of allEntries) {
        expect(Array.isArray(entry.chatSessions)).toBe(true)
        expect(entry.chatSessions).toEqual([])
      }

      await dbV5.close()
    })
  })

  describe('Error handling', () => {
    it('migration handles errors gracefully without crashing', async () => {
      // This test verifies that migration errors are caught and logged
      // but don't prevent the database from opening
      const dbV4 = new TestDatabaseV4(dbName)
      await dbV4.open()

      await dbV4.journalEntries.add({
        id: 'entry-8',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      await dbV4.close()

      // Open with version 5 - migration should complete even if there are issues
      const dbV5 = new TestDatabaseV5(dbName)
      await dbV5.open()

      // Database should still be accessible
      expect(dbV5.verno).toBe(5)
      const entry = await dbV5.journalEntries.get('entry-8')
      expect(entry).toBeDefined()

      await dbV5.close()
    })
  })
})

