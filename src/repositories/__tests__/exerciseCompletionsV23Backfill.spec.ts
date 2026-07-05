import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { UserDatabase, V23_BACKFILL_SOURCES } from '@/services/userDatabase.service'
import { EXERCISE_CATALOG } from '@/data/exerciseCatalog'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'

/**
 * A v22-stamped database containing only the tables the v23 backfill
 * reads. Opening it with `UserDatabase` runs exactly the v23 upgrade.
 */
class ExercisesDatabaseV22 extends Dexie {
  worryTreeEntries!: Table<Record<string, unknown>, string>
  positiveDataLogs!: Table<Record<string, unknown>, string>
  ifsParts!: Table<Record<string, unknown>, string>
  lifeAreaAssessments!: Table<Record<string, unknown>, string>
  assessmentAttempts!: Table<Record<string, unknown>, string>

  constructor(name: string) {
    super(name)
    const stores: Record<string, string> = {
      ifsParts: 'id',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
      assessmentAttempts: 'id, assessmentId',
    }
    for (const source of V23_BACKFILL_SOURCES) {
      stores[source.table] = 'id'
    }
    this.version(22).stores(stores)
  }
}

describe('exercise completions v23 backfill', () => {
  let dbName: string

  beforeEach(() => {
    dbName = `ExerciseCompletionsV23_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    await Dexie.delete(dbName)
  })

  it('backfills completions from legacy tables with the documented special cases', async () => {
    const v22 = new ExercisesDatabaseV22(dbName)
    await v22.open()

    await v22.worryTreeEntries.bulkAdd([
      {
        id: 'wt-1',
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
        worry: 'first',
      },
      {
        id: 'wt-2',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:00.000Z',
        worry: 'second',
      },
      // Malformed record: must be skipped, not crash the upgrade.
      { id: 'wt-broken', worry: 'no timestamps' },
    ])
    await v22.positiveDataLogs.add({
      id: 'pdl-1',
      createdAt: '2026-02-01T12:00:00.000Z',
      updatedAt: '2026-02-20T12:00:00.000Z',
      entries: [],
    })
    // Shared parts registry — deliberately NOT a backfill source.
    await v22.ifsParts.add({
      id: 'part-1',
      createdAt: '2026-01-05T12:00:00.000Z',
      updatedAt: '2026-01-05T12:00:00.000Z',
      name: 'Inner critic',
    })
    await v22.lifeAreaAssessments.bulkAdd([
      {
        id: 'laa-full',
        createdAt: '2026-01-15T12:00:00.000Z',
        updatedAt: '2026-01-15T12:00:00.000Z',
        scope: 'full',
        lifeAreaIds: ['area-1'],
        items: [],
      },
      {
        id: 'laa-partial',
        createdAt: '2026-01-20T12:00:00.000Z',
        updatedAt: '2026-01-20T12:00:00.000Z',
        scope: 'partial',
        lifeAreaIds: ['area-1'],
        items: [],
      },
    ])
    await v22.assessmentAttempts.bulkAdd([
      {
        id: 'attempt-done',
        assessmentId: 'erq',
        status: 'completed',
        createdAt: '2026-02-10T12:00:00.000Z',
        updatedAt: '2026-02-10T12:30:00.000Z',
        completedAt: '2026-02-10T12:30:00.000Z',
      },
      {
        id: 'attempt-open',
        assessmentId: 'vlq',
        status: 'in-progress',
        createdAt: '2026-02-11T12:00:00.000Z',
        updatedAt: '2026-02-11T12:00:00.000Z',
      },
    ])
    await v22.close()

    const v23 = new UserDatabase(dbName)
    await v23.open()

    const completions = (await v23.exerciseCompletions.toArray()) as ExerciseCompletion[]
    expect(completions).toHaveLength(5)

    const bySlug = new Map<string, ExerciseCompletion[]>()
    for (const completion of completions) {
      bySlug.set(completion.exerciseSlug, [
        ...(bySlug.get(completion.exerciseSlug) ?? []),
        completion,
      ])
    }

    expect(bySlug.get('worry-tree')).toHaveLength(2)
    expect(bySlug.get('worry-tree')?.map((c) => c.dayRef).sort()).toEqual([
      '2026-03-10',
      '2026-03-12',
    ])

    // positive-data-log uses updatedAt (entries accumulate via updates).
    const pdl = bySlug.get('positive-data-log')
    expect(pdl).toHaveLength(1)
    expect(pdl?.[0]).toMatchObject({
      completedAt: '2026-02-20T12:00:00.000Z',
      dayRef: '2026-02-20',
      recordId: 'pdl-1',
      source: 'standalone',
    })

    // Wheel of Life: full assessments only.
    const wheel = bySlug.get('wheel-of-life')
    expect(wheel).toHaveLength(1)
    expect(wheel?.[0]?.recordId).toBe('laa-full')

    // Assessments: completed attempts only, slug = assessmentId.
    const erq = bySlug.get('erq')
    expect(erq).toHaveLength(1)
    expect(erq?.[0]).toMatchObject({
      completedAt: '2026-02-10T12:30:00.000Z',
      recordId: 'attempt-done',
    })
    expect(bySlug.has('vlq')).toBe(false)

    // Nothing from the shared parts registry.
    expect(completions.some((c) => c.recordId === 'part-1')).toBe(false)

    await v23.close()
  })
})

describe('V23_BACKFILL_SOURCES stays in sync with the catalog', () => {
  const wizardEntries = EXERCISE_CATALOG.filter(
    // wheel-of-life is special-cased in the upgrade body (scope === 'full'),
    // so it is deliberately absent from the plain source list.
    (entry) => entry.kind === 'wizard' && entry.slug !== 'wheel-of-life',
  )

  it('covers every wizard catalog entry exactly once', () => {
    for (const entry of wizardEntries) {
      const matches = V23_BACKFILL_SOURCES.filter((s) => s.slug === entry.slug)
      expect(matches, `missing/duplicated source for ${entry.slug}`).toHaveLength(1)
      expect(matches[0]?.table).toBe(entry.legacyTable)
    }
  })

  it('contains no sources beyond the wizard catalog entries', () => {
    expect(V23_BACKFILL_SOURCES).toHaveLength(wizardEntries.length)
    for (const source of V23_BACKFILL_SOURCES) {
      const entry = wizardEntries.find((e) => e.slug === source.slug)
      expect(entry, `catalog entry missing for source ${source.slug}`).toBeDefined()
    }
    expect(V23_BACKFILL_SOURCES.some((s) => s.table === 'ifsParts')).toBe(false)
  })
})
