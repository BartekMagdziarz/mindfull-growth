import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { PeopleTag, ContextTag } from '@/domain/tag'
import type { EmotionLog } from '@/domain/emotionLog'

class VersionOneDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      journalEntries: 'id',
    })
  }
}

class MigrationTestDatabase extends Dexie {
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
        try {
          const entries = await trans.table('journalEntries').toArray()
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
            }
          }
        } catch (error) {
          console.error('[Migration v2→v3] Error during migration:', error)
        }
      })
  }
}

class FailingMigrationDatabase extends Dexie {
  journalEntries!: Table<JournalEntry, string>

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
        const entries = await trans.table('journalEntries').toArray()
        if (entries.length > 0) {
          const entry = entries[0]
          await trans.table('journalEntries').put({
            ...entry,
            emotionIds: [],
            peopleTagIds: [],
            contextTagIds: [],
          })
          throw new Error('Forced migration failure')
        }
      })
  }
}

describe('Migration edge cases', () => {
let dbName: string
const openDatabases: Dexie[] = []

function trackDb<T extends Dexie>(db: T): T {
  openDatabases.push(db)
  return db
}

  beforeEach(() => {
    dbName = `MigrationEdge_${Date.now()}_${Math.random()}`
  })

afterEach(async () => {
  for (const instance of openDatabases) {
    try {
      instance.close()
    } catch {
      // ignore
    }
  }
  openDatabases.length = 0
  await Dexie.delete(dbName)
  })

  it('migrates directly from version 1 to version 3 without data loss', async () => {
    const v1 = trackDb(new VersionOneDatabase(dbName))
    await v1.open()
    await v1.journalEntries.bulkAdd([
      {
        id: 'legacy-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Legacy body',
      } as JournalEntry,
      {
        id: 'legacy-2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Legacy two',
      } as JournalEntry,
    ])
    await v1.close()

    const migratedDb = trackDb(new MigrationTestDatabase(dbName))
    await migratedDb.open()

    const entries = await migratedDb.journalEntries.toArray()
    expect(entries).toHaveLength(2)
    entries.forEach((entry) => {
      expect(entry.emotionIds).toEqual([])
      expect(entry.peopleTagIds).toEqual([])
      expect(entry.contextTagIds).toEqual([])
    })

    await migratedDb.close()
  })

  it('normalizes corrupted tagging arrays during migration', async () => {
    const v1 = trackDb(new VersionOneDatabase(dbName))
    await v1.open()
    await v1.journalEntries.add({
      id: 'corrupted-entry',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
      body: 'Corrupted data',
      // @ts-expect-error intentionally invalid to simulate legacy corruption
      peopleTagIds: 'invalid',
    })
    await v1.close()

    const migratedDb = trackDb(new MigrationTestDatabase(dbName))
    await migratedDb.open()

    const entry = await migratedDb.journalEntries.get('corrupted-entry')
    expect(entry?.peopleTagIds).toEqual([])
    expect(entry?.contextTagIds).toEqual([])
    expect(entry?.emotionIds).toEqual([])

    await migratedDb.close()
  })

  it('rolls back cleanly if migration fails mid-way and can be retried', async () => {
    const v1 = trackDb(new VersionOneDatabase(dbName))
    await v1.open()
    await v1.journalEntries.add({
      id: 'rollback-entry',
      createdAt: '2024-01-04T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z',
      body: 'Rollback test',
    })
    await v1.close()

    const failingDb = trackDb(new FailingMigrationDatabase(dbName))
    await expect(async () => {
      await failingDb.open()
    }).rejects.toThrow('Forced migration failure')

    // After failure the database should still be usable and migration retried successfully
    const retryDb = trackDb(new MigrationTestDatabase(dbName))
    await retryDb.open()

    const entry = await retryDb.journalEntries.get('rollback-entry')
    expect(entry?.body).toBe('Rollback test')
    expect(entry?.emotionIds).toEqual([])
    expect(entry?.peopleTagIds).toEqual([])
    expect(entry?.contextTagIds).toEqual([])

    await retryDb.close()
  })

  it('migrates large datasets (100+ entries) without losing data', async () => {
    const v1 = trackDb(new VersionOneDatabase(dbName))
    await v1.open()
    const bulkEntries: JournalEntry[] = []
    for (let i = 0; i < 120; i++) {
      bulkEntries.push({
        id: `legacy-${i}`,
        createdAt: `2024-02-${(i % 28) + 1}T00:00:00.000Z`,
        updatedAt: `2024-02-${(i % 28) + 1}T00:00:00.000Z`,
        body: `Body ${i}`,
      } as JournalEntry)
    }
    await v1.journalEntries.bulkAdd(bulkEntries)
    await v1.close()

    const migratedDb = trackDb(new MigrationTestDatabase(dbName))
    await migratedDb.open()

    const entries = await migratedDb.journalEntries.toArray()
    expect(entries).toHaveLength(120)
    entries.forEach((entry) => {
      expect(entry.emotionIds).toEqual([])
      expect(entry.peopleTagIds).toEqual([])
      expect(entry.contextTagIds).toEqual([])
    })

    await migratedDb.close()
  })

  it('remains idempotent when opened multiple times after migration', async () => {
    const v1 = trackDb(new VersionOneDatabase(dbName))
    await v1.open()
    await v1.journalEntries.add({
      id: 'idempotent-entry',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
      body: 'Idempotent body',
    })
    await v1.close()

    const dbFirstOpen = trackDb(new MigrationTestDatabase(dbName))
    await dbFirstOpen.open()
    await dbFirstOpen.close()

    const dbSecondOpen = trackDb(new MigrationTestDatabase(dbName))
    await dbSecondOpen.open()
    const entry = await dbSecondOpen.journalEntries.get('idempotent-entry')
    expect(entry?.emotionIds).toEqual([])
    expect(entry?.peopleTagIds).toEqual([])
    expect(entry?.contextTagIds).toEqual([])
    await dbSecondOpen.close()
  })
})


