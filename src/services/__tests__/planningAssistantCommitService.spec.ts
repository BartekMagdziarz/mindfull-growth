import { beforeEach, describe, it, expect, vi } from 'vitest'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getTestDatabase } from '@/test/testDatabase'
import { plannerFixture as obj } from '@/domain/__tests__/planningAssistant.fixture'
import { planningAssistantDraftRepository as drafts } from '@/repositories/planningAssistantDraftRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import type { YearRef } from '@/domain/period'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { commitPlanningAssistantDraft } from '../planningAssistantCommitService'
import { getPeriodRefsForDate } from '@/utils/periods'
beforeEach(async () => {
  const db = await resetPlanningTestData()
  await db.priorityLinks.clear()
})
async function prepare(objects: ReturnType<typeof obj>[]) {
  const draft = await drafts.open()
  draft.objects = objects
  draft.revision = await drafts.save(draft, draft.revision)
  return draft
}
describe('planning assistant atomic commit', () => {
  it('creates selected objects and custom days across a month boundary, then reads them back', async () => {
    const draft = await prepare([
      obj({ days: [0, 2, 4] }),
      obj({ id: 'focus', kind: 'tracker', entryMode: 'rating', selected: false }),
    ])
    const receipt = await commitPlanningAssistantDraft(draft.id, draft.revision),
      db = getTestDatabase()
    expect(receipt.objects).toHaveLength(1)
    const habit = await db.habits.get(receipt.objects[0].id)
    expect(habit).toMatchObject({
      title: 'Czytanie przez 20 minut',
      target: { kind: 'count', operator: 'min', value: 3 },
      cadence: 'weekly',
    })
    expect(await db.trackers.count()).toBe(0)
    expect(await db.measurementMonthStates.count()).toBe(2)
    expect(await db.measurementWeekStates.count()).toBe(2)
    const days = await db.measurementDayAssignments.toArray()
    expect(days).toHaveLength(6)
    expect(days.map(d => d.dayRef).sort()).toEqual([
      '2026-10-26',
      '2026-10-28',
      '2026-10-30',
      '2026-11-02',
      '2026-11-04',
      '2026-11-06',
    ])
    expect((await drafts.open()).receipt).toEqual(receipt)
  })
  it('makes concurrent retry idempotent and prevents stale draft writes after commit', async () => {
    const draft = await prepare([obj()])
    const [a, b] = await Promise.all([
      commitPlanningAssistantDraft(draft.id, draft.revision),
      commitPlanningAssistantDraft(draft.id, draft.revision),
    ])
    expect(a).toEqual(b)
    expect(await getTestDatabase().habits.count()).toBe(1)
    await expect(drafts.save(draft, draft.revision)).rejects.toThrow('innym oknie')
  })
  it('rolls back every record and placement when a later creation fails', async () => {
    const draft = await prepare([obj(), obj({ id: 'focus', kind: 'tracker' })])
    const spy = vi
      .spyOn(trackerDexieRepository, 'create')
      .mockRejectedValueOnce(new Error('write-failed'))
    try {
      await expect(commitPlanningAssistantDraft(draft.id, draft.revision)).rejects.toThrow(
        'write-failed'
      )
    } finally {
      spy.mockRestore()
    }
    const db = getTestDatabase()
    expect(await db.habits.count()).toBe(0)
    expect(await db.measurementMonthStates.count()).toBe(0)
    expect((await drafts.open()).receipt).toBeNull()
    await commitPlanningAssistantDraft(draft.id, draft.revision)
    expect(await db.habits.count()).toBe(1)
    expect(await db.trackers.count()).toBe(1)
  })
  it('links a new goal to new results and preserves SMART details', async () => {
    const draft = await prepare([
      obj({
        id: 'g',
        kind: 'goal',
        successDefinition: 'Dwa opisane projekty.',
        whyMatters: 'Chcę zmienić pracę.',
        confidenceRating: 7,
      }),
      obj({ id: 'kr', kind: 'keyResult', parentId: 'g', entryMode: 'counter', target: 2 }),
    ])
    const receipt = await commitPlanningAssistantDraft(draft.id, draft.revision),
      db = getTestDatabase()
    const goal = await db.goals.get(receipt.objects[0].id),
      kr = await db.keyResults.get(receipt.objects[1].id)
    expect(goal).toMatchObject({
      successDefinition: 'Dwa opisane projekty.',
      confidenceRating: 7,
      startDate: '2026-10-26',
      targetDate: '2026-11-08',
    })
    expect(kr).toMatchObject({
      goalId: goal!.id,
      target: { kind: 'count', value: 2 },
      periodAssignmentMode: 'custom',
    })
    expect(await db.goalMonthStates.count()).toBe(2)
  })
  it('creates an intention in exactly its week and a tracker without a target', async () => {
    const draft = await prepare([
      obj({ id: 'try', kind: 'weeklyIntention', endDate: '2026-11-01' }),
      obj({ id: 'focus', kind: 'tracker', entryMode: 'rating' }),
    ])
    await commitPlanningAssistantDraft(draft.id, draft.revision)
    const db = getTestDatabase(),
      intent = (await db.weeklyIntentions.toArray())[0],
      tracker = (await db.trackers.toArray())[0]
    expect(intent.weekRef).toBe(getPeriodRefsForDate('2026-10-26').week)
    expect(tracker).not.toHaveProperty('target')
    expect(tracker.ratingScale).toBe(5)
  })
  it('preserves weighted lists, numeric aggregation and optional entry-day conditions', async () => {
    const draft = await prepare([
      obj({
        id: 'list',
        entryMode: 'multi-completion',
        multiItems: [
          { id: 'a', label: 'Spacer', weight: 2 },
          { id: 'b', label: 'Oddech', weight: 1 },
        ],
        dailyThreshold: 2,
        target: 3,
      }),
      obj({
        id: 'value',
        entryMode: 'value',
        cadence: 'monthly',
        target: 60,
        aggregation: 'average',
        operator: 'max',
        entryDays: { operator: 'min', value: 4 },
      }),
    ])
    const receipt = await commitPlanningAssistantDraft(draft.id, draft.revision),
      db = getTestDatabase()
    const a = await db.habits.get(receipt.objects[0].id),
      b = await db.habits.get(receipt.objects[1].id)
    expect(a).toMatchObject({
      multiItems: [
        { label: 'Spacer', weight: 2 },
        { label: 'Oddech', weight: 1 },
      ],
      multiDailyThreshold: 2,
      target: { kind: 'count', value: 3 },
    })
    expect(b!.target).toEqual({
      kind: 'value',
      aggregation: 'average',
      operator: 'lte',
      value: 60,
      entryDays: { operator: 'min', value: 4 },
    })
  })
  it('creates real priority links alongside object membership', async () => {
    const area = await lifeAreaDexieRepository.create({
      name: 'Rozwój',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })
    const priority = await priorityDexieRepository.create({
      title: 'Spokojne tempo',
      years: ['2026'] as YearRef[],
      status: 'active',
      lifeAreaIds: [area.id],
      progressSignals: [],
      riskSignals: [],
    })
    const draft = await prepare([
      obj({ priorityIds: [priority.id], lifeAreaIds: [area.id], whyMatters: 'Czas dla siebie.' }),
    ])
    const receipt = await commitPlanningAssistantDraft(draft.id, draft.revision),
      db = getTestDatabase()
    expect(await db.habits.get(receipt.objects[0].id)).toMatchObject({
      priorityIds: [priority.id],
      lifeAreaIds: [area.id],
    })
    expect((await db.priorityLinks.toArray())[0]).toMatchObject({
      priorityId: priority.id,
      subjectRef: { subjectType: 'habit', subjectId: receipt.objects[0].id },
      contribution: 'Czas dla siebie.',
      status: 'active',
    })
  })
  it('rejects invalid selection, stale revisions and retired links before writes', async () => {
    const draft = await prepare([obj({ priorityIds: ['missing'] })])
    await expect(commitPlanningAssistantDraft(draft.id, draft.revision - 1)).rejects.toThrow(
      'innym oknie'
    )
    await expect(commitPlanningAssistantDraft(draft.id, draft.revision)).rejects.toThrow(
      'priorytet'
    )
    expect(await getTestDatabase().habits.count()).toBe(0)
  })
  it('keeps a receipt until an explicit new draft and protects another tab', async () => {
    const draft = await prepare([obj()])
    await expect(drafts.reset(draft.id, 0)).rejects.toThrow('innym oknie')
    await commitPlanningAssistantDraft(draft.id, draft.revision)
    const saved = await drafts.open(),
      next = await drafts.reset(saved.id, saved.revision)
    expect(next.objects).toEqual([])
    expect(next.id).not.toBe(saved.id)
    await expect(commitPlanningAssistantDraft(saved.id, saved.revision)).rejects.toThrow(
      'innym oknie'
    )
    expect(await getTestDatabase().habits.count()).toBe(1)
  })
})
