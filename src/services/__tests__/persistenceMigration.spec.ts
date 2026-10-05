import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { UserDatabase } from '@/services/userDatabase.service'

describe('persistence repair v33/v34', () => {
  it('archives duplicate answers and program plans before adding unique indexes', async () => {
    const name = `migration-${crypto.randomUUID()}`
    const current = new UserDatabase(name)
    const schema = Object.fromEntries(
      current.tables
        .filter(table => table.name !== 'dataRepairArchives')
        .map(table => [
          table.name,
          [table.schema.primKey.src, ...table.schema.indexes.map(index => index.src)].join(', '),
        ])
    )
    schema.assessmentResponses = 'id, attemptId, itemId, [attemptId+itemId]'
    schema.exercisePlanItems = 'id, exerciseSlug, dayRef, status, source'
    schema.exerciseCompletions = 'id, exerciseSlug, dayRef, completedAt'
    current.close()
    const old = new Dexie(name)
    old.version(32).stores(schema)
    const answer = {
      attemptId: 'attempt',
      itemId: 'item',
      assessmentId: 'ipip-bfm-50',
      responseValue: 1,
      answeredAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const plan = {
      exerciseSlug: 'parts-mapping',
      source: 'program',
      sourceRef: 'enrollment',
      status: 'pending',
      dayRef: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    await old.table('assessmentAttempts').put({ id: 'attempt', responseCount: 2 })
    await old.table('assessmentResponses').bulkAdd([
      { ...answer, id: 'old-answer' },
      { ...answer, id: 'new-answer', responseValue: 4, updatedAt: '2026-01-02T00:00:00Z' },
    ])
    await old.table('programEnrollments').put({ id: 'enrollment', currentStepIndex: 2 })
    await old.table('exercisePlanItems').bulkAdd([
      { ...plan, id: 'plan-a' },
      { ...plan, id: 'plan-b' },
      { ...plan, id: 'done', status: 'done' },
    ])
    old.close()
    const upgraded = new UserDatabase(name)
    try {
      await upgraded.open()
      expect(upgraded.verno).toBe(34)
      expect((await upgraded.assessmentResponses.toArray()).map(row => row.id)).toEqual([
        'new-answer',
      ])
      expect((await upgraded.assessmentAttempts.get('attempt'))?.responseCount).toBe(1)
      expect((await upgraded.exercisePlanItems.get('plan-a'))?.programStepIndex).toBe(2)
      expect(await upgraded.exercisePlanItems.get('done')).toBeDefined()
      const archived = await upgraded.dataRepairArchives.toArray()
      expect(archived.map(row => row.record.id).sort()).toEqual(['old-answer', 'plan-b'])
      expect(archived.find(row => row.record.id === 'old-answer')?.record.responseValue).toBe(1)
      const existing = (await upgraded.assessmentResponses.get('new-answer'))!
      await expect(
        upgraded.assessmentResponses.add({ ...existing, id: 'duplicate' })
      ).rejects.toThrow()
      expect(await upgraded.assessmentResponses.count()).toBe(1)
    } finally {
      await upgraded.delete()
    }
  })
})
