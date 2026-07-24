import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { UserDatabase } from '@/services/userDatabase.service'
import type { PriorityLink } from '@/domain/planning'

/**
 * A v25-stamped database containing only the tables the v26 backfill reads.
 * Opening it with `UserDatabase` runs exactly the v26 upgrade.
 */
class PlanningDatabaseV25 extends Dexie {
  priorities!: Table<Record<string, unknown>, string>
  goals!: Table<Record<string, unknown>, string>
  habits!: Table<Record<string, unknown>, string>
  trackers!: Table<Record<string, unknown>, string>
  weeklyIntentions!: Table<Record<string, unknown>, string>
  initiatives!: Table<Record<string, unknown>, string>

  constructor(name: string) {
    super(name)
    this.version(25).stores({
      priorities: 'id, status, *years, order, *lifeAreaIds',
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      habits: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      weeklyIntentions: 'id, weekRef, status, isActive, entryMode',
      initiatives: 'id, status, isActive, *priorityIds, *lifeAreaIds',
    })
  }
}

describe('priority links v26 backfill', () => {
  let dbName: string

  beforeEach(() => {
    dbName = `PriorityLinksV26_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    await Dexie.delete(dbName)
  })

  it('backfills one active link per (object, priority) pair and marks it for enrichment', async () => {
    const v25 = new PlanningDatabaseV25(dbName)
    await v25.open()

    const stamp = { createdAt: '2026-01-05T08:00:00.000Z', updatedAt: '2026-01-05T08:00:00.000Z' }
    await v25.priorities.bulkAdd([
      { id: 'prio-1', title: 'Równowaga', status: 'active', years: ['2026'], lifeAreaIds: [], progressSignals: [], riskSignals: [], ...stamp },
      { id: 'prio-2', title: 'Rozwój', status: 'paused', years: ['2026'], lifeAreaIds: [], progressSignals: [], riskSignals: [], ...stamp },
    ])
    await v25.goals.add({ id: 'goal-1', title: 'Cel', priorityIds: ['prio-1', 'prio-2'], lifeAreaIds: [], status: 'open', isActive: true, ...stamp })
    await v25.habits.bulkAdd([
      { id: 'habit-1', title: 'Nawyk', priorityIds: ['prio-1'], lifeAreaIds: [], status: 'open', isActive: true, ...stamp },
      // Duplicated ids inside one array must yield one link.
      { id: 'habit-2', title: 'Nawyk 2', priorityIds: ['prio-1', 'prio-1'], lifeAreaIds: [], status: 'open', isActive: true, ...stamp },
      // No links at all.
      { id: 'habit-3', title: 'Nawyk 3', priorityIds: [], lifeAreaIds: [], status: 'open', isActive: true, ...stamp },
    ])
    // Stale id (priority deleted long ago, weekly intentions were never unlinked).
    await v25.weeklyIntentions.add({ id: 'wi-1', title: 'Intencja', weekRef: '2026-W03', priorityIds: ['prio-deleted', 'prio-2'], lifeAreaIds: [], status: 'open', isActive: true, entryMode: 'completion', ...stamp })
    // Malformed record: must be skipped, not crash the upgrade.
    await v25.trackers.add({ id: 'tr-broken', title: 'Bez tablicy', priorityIds: 'not-an-array', status: 'open', isActive: true, ...stamp })
    v25.close()

    const upgraded = new UserDatabase(dbName)
    await upgraded.open()
    const links = await upgraded.priorityLinks.toArray()
    upgraded.close()

    const byPair = (link: PriorityLink) =>
      `${link.priorityId}:${link.subjectRef?.subjectType}:${link.subjectRef?.subjectId}`
    expect(links.map(byPair).sort()).toEqual([
      'prio-1:goal:goal-1',
      'prio-1:habit:habit-1',
      'prio-1:habit:habit-2',
      'prio-2:goal:goal-1',
      'prio-2:weeklyIntention:wi-1',
    ])

    for (const link of links) {
      expect(link.status).toBe('active')
      expect(link.needsEnrichment).toBe(true)
      expect(link.contribution).toBe('')
      expect(link.expectedSignal).toBe('')
      expect(link.validFrom).toBe('2026-01-05T08:00:00.000Z')
      expect(link.proposal).toBeUndefined()
      expect(link.validTo).toBeUndefined()
    }
  })

  it('leaves a fresh database empty (no upgrade rows, table exists)', async () => {
    const fresh = new UserDatabase(dbName)
    await fresh.open()
    expect(await fresh.priorityLinks.count()).toBe(0)
    fresh.close()
  })
})
