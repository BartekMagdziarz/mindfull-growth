import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Habit } from '@/domain/planning'
import { normalizeHabitPayload } from '@/domain/planning'
import { criteriaSignature, resolveMeasurementCriteria } from '@/domain/measurementCriteria'
import { habitDexieRepository as habits } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { planningStateDexieRepository as state } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import {
  buildMeasurementSummary,
  applyMeasurementTargetCascade,
  multiCompletionDayMet,
} from '@/services/measurementProgress'
import { buildWeekDailyChartPoints } from '@/services/calendarChartData'
import { buildRhythmScenario } from '@/features/calendar-rhythm/rhythmScenarioLoader'
import { seriesFor, unitsFor } from '@/features/calendar-rhythm/rhythmProjections'
import { createUserBackup, parseUserBackup, restoreUserBackup } from '@/services/userBackupService'
import { getMonthPlanningBundle, getWeekPlanningBundle } from '@/services/planningStateQueries'
import { loadObjectsLibraryBundle } from '@/services/objectsLibraryQueries'
import { getPeriodRefsForDate } from '@/utils/periods'

const WEEK = '2026-W45' as WeekRef
const NEXT_WEEK = '2026-W46' as WeekRef
const NEXT = '2026-11-16' as DayRef
const TODAY = '2026-11-14' as DayRef
const items = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, label: id, weight: 1 }))
beforeEach(resetPlanningTestData)

async function create(patch: Partial<Habit> = {}) {
  return habits.create({
    title: 'Training',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'completion',
    cadence: 'weekly',
    status: 'open',
    target: { kind: 'count', operator: 'min', value: 6 },
    ...patch,
  })
}
async function record(habit: Habit, day: string, checkedItemIds?: string[]) {
  return state.upsertDailyMeasurementEntry({
    subjectType: 'habit',
    subjectId: habit.id,
    dayRef: day as DayRef,
    value: null,
    ...(checkedItemIds ? { checkedItemIds } : {}),
  })
}
async function fiveExecutions(habit: Habit) {
  for (const date of ['09', '10', '11', '12', '13']) await record(habit, `2026-11-${date}`)
}

describe('versioned measurement criteria', () => {
  it('resolves a boundary week under the same monthly override in every view', async () => {
    const habit = await create({ target: { kind: 'count', operator: 'min', value: 6 } })
    const week = getPeriodRefsForDate('2026-09-01' as DayRef).week
    // Deliberately insert the later month's state first.
    for (const month of ['2026-09', '2026-08'] as const)
      await state.upsertMeasurementMonthState({
        subjectType: 'habit',
        subjectId: habit.id,
        monthRef: month as import('@/domain/period').MonthRef,
        activityState: 'active',
        scheduleScope: 'specific-days',
        targetOverride: { kind: 'count', operator: 'min', value: month === '2026-08' ? 1 : 2 },
      })
    await state.upsertMeasurementWeekState({
      subjectType: 'habit',
      subjectId: habit.id,
      weekRef: week,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await state.upsertMeasurementDayAssignment({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: '2026-09-01' as DayRef,
    })
    await record(habit, '2026-09-01')
    const weekly = await getWeekPlanningBundle(week)
    expect(
      weekly.relevant.measurementItems.find(i => i.subject.id === habit.id)?.measurement.target
        ?.value
    ).toBe(1)
    const monthly = await getMonthPlanningBundle('2026-09' as import('@/domain/period').MonthRef)
    expect(
      monthly.measurementItems
        .find(i => i.subject.id === habit.id)
        ?.weekEvaluations?.find(w => w.weekRef === week)?.measurement.target?.value
    ).toBe(1)
    const library = await loadObjectsLibraryBundle({
      family: 'habits',
      q: 'Training',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })
    expect(library.items[0].chartData?.find(p => p.periodRef === week)?.targetValue).toBe(1)
    const calendar = await buildRhythmScenario('month', '2026-09', TODAY)
    const object = calendar.objects.find(o => o.key === `habit:${habit.id}`)!
    // Use a full week for evaluation even though the visible month clips it.
    const projected = seriesFor(
      calendar,
      object,
      unitsFor('month', '2026-09', TODAY),
      'month',
      '2026-09'
    )
    expect(projected.points.find(p => p.unitRef === week)?.evaluationStatus).toBe('met')
  })

  for (const type of ['habit', 'keyResult', 'tracker', 'weeklyIntention'] as const) {
    it(`${type}: stores and uses an explicit retrospective checklist version`, async () => {
      const common = {
        title: 'Checklist',
        isActive: true,
        status: 'open' as const,
        entryMode: 'multi-completion' as const,
        cadence: 'weekly' as const,
        multiItems: items,
      }
      const target = { kind: 'count', operator: 'min', value: 1 } as const
      const goal = await goalDexieRepository.create({
        title: 'Goal',
        isActive: true,
        status: 'open',
        priorityIds: [],
        lifeAreaIds: [],
      })
      const subject =
        type === 'habit'
          ? await habits.create({ ...common, target, priorityIds: [], lifeAreaIds: [] })
          : type === 'keyResult'
            ? await keyResultDexieRepository.create({ ...common, target, goalId: goal.id })
            : type === 'tracker'
              ? await trackerDexieRepository.create({ ...common, priorityIds: [], lifeAreaIds: [] })
              : await weeklyIntentionDexieRepository.create({
                  ...common,
                  target,
                  weekRef: WEEK,
                  priorityIds: [],
                })
      const entry = await state.upsertDailyMeasurementEntry({
        subjectType: type,
        subjectId: subject.id,
        dayRef: '2026-11-09' as DayRef,
        value: null,
        checkedItemIds: ['a', 'b', 'c', 'd'],
      })
      expect(multiCompletionDayMet(subject, entry)).toBe(false)
      const repo =
        type === 'habit'
          ? habits
          : type === 'keyResult'
            ? keyResultDexieRepository
            : type === 'tracker'
              ? trackerDexieRepository
              : weeklyIntentionDexieRepository
      const updated = await repo.update(subject.id, {
        multiItems: items.map(i => (i.id === 'e' ? { ...i, archived: true } : i)),
        criteriaChange: { scope: 'all-history' },
      })
      expect(updated.criteriaVersions).toHaveLength(1)
      expect(multiCompletionDayMet(updated, entry)).toBe(true)
      if (type === 'tracker')
        expect('target' in resolveMeasurementCriteria(updated, TODAY)).toBe(false)
    })
  }

  it('preserves the old month and applies the new target at the selected month boundary', async () => {
    const habit = await create({ cadence: 'monthly' })
    await fiveExecutions(habit)
    const updated = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'from-date', effectiveFrom: '2026-12-01' as DayRef },
    })
    const entries = await state.listDailyMeasurementEntries()
    expect(
      buildMeasurementSummary(updated, entries, '2026-11' as import('@/domain/period').MonthRef)
        .target?.value
    ).toBe(6)
    expect(
      buildMeasurementSummary(updated, entries, '2026-12' as import('@/domain/period').MonthRef)
        .target?.value
    ).toBe(5)
  })

  it('corrects the whole history from six trainings to five without rewriting executions', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const before = await state.listDailyMeasurementEntries()
    expect(buildMeasurementSummary(habit, before, WEEK).evaluationStatus).toBe('missed')
    const updated = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'all-history' },
    })
    expect(buildMeasurementSummary(updated, before, WEEK).evaluationStatus).toBe('met')
    expect(updated.criteriaVersions).toHaveLength(1)
    expect(await state.listDailyMeasurementEntries()).toEqual(before)
  })

  it('keeps old weekly criteria and uses the new target from the next week', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const updated = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    for (const day of ['16', '17', '18', '19', '20']) await record(updated, `2026-11-${day}`)
    const entries = await state.listDailyMeasurementEntries()
    const old = buildMeasurementSummary(updated, entries, WEEK)
    const next = buildMeasurementSummary(updated, entries, NEXT_WEEK)
    expect([old.target?.value, old.evaluationStatus]).toEqual([6, 'missed'])
    expect([next.target?.value, next.evaluationStatus]).toEqual([5, 'met'])
    expect(updated.criteriaVersions?.[0].origin).toBe('legacy')
    expect(resolveMeasurementCriteria(updated, TODAY).target.value).toBe(6)
    expect(resolveMeasurementCriteria(updated, NEXT).target.value).toBe(5)
  })

  it('preserves per-period manual targets during a retrospective correction', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const updated = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'all-history' },
    })
    const effective = applyMeasurementTargetCascade(updated, WEEK, {
      monthOverride: { kind: 'count', operator: 'min', value: 7 },
      weekOverride: { kind: 'count', operator: 'min', value: 6 },
    })
    const summary = buildMeasurementSummary(
      effective,
      await state.listDailyMeasurementEntries(),
      WEEK
    )
    expect(summary.target?.value).toBe(6)
    expect(summary.evaluationStatus).toBe('missed')
  })

  it('all daily, calendar and weekly summaries use the checklist version of each date', async () => {
    const habit = await create({
      entryMode: 'multi-completion',
      multiItems: items,
      target: { kind: 'count', operator: 'min', value: 1 },
    })
    await record(habit, '2026-11-09', ['a', 'b', 'c', 'd'])
    const updated = await habits.update(habit.id, {
      multiItems: items.map(i => (i.id === 'e' ? { ...i, archived: true } : i)),
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    await record(updated, NEXT, ['a', 'b', 'c', 'd'])
    const entries = await state.listDailyMeasurementEntries()
    expect(buildMeasurementSummary(updated, entries, WEEK).actualValue).toBe(0)
    expect(buildMeasurementSummary(updated, entries, NEXT_WEEK).actualValue).toBe(1)
    expect(buildWeekDailyChartPoints(updated, 'habit', entries, WEEK)[0]).toMatchObject({
      actualValue: 4,
      targetValue: 5,
    })
    expect(buildWeekDailyChartPoints(updated, 'habit', entries, NEXT_WEEK)[0]).toMatchObject({
      actualValue: 4,
      targetValue: 4,
    })
    const calendar = await buildRhythmScenario('month', '2026-11', '2026-11-21' as DayRef)
    const object = calendar.objects.find(o => o.key === `habit:${habit.id}`)!
    const series = seriesFor(
      calendar,
      object,
      unitsFor('month', '2026-11', calendar.clock),
      'month',
      '2026-11'
    )
    expect(series.points.find(p => p.unitRef === WEEK)?.dayWells?.[0]).toBe('partial')
    expect(series.points.find(p => p.unitRef === NEXT_WEEK)?.dayWells?.[0]).toBe('done')
  })

  it('keeps a formerly archived checklist item available when editing an older day', async () => {
    const habit = await create({ entryMode: 'multi-completion', multiItems: items })
    await record(habit, '2026-11-09', ['a'])
    const updated = await habits.update(habit.id, {
      multiItems: items.filter(i => i.id !== 'e'),
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    const oldEntry = await record(updated, '2026-11-09', ['a', 'b', 'c', 'd', 'e'])
    expect(multiCompletionDayMet(updated, oldEntry)).toBe(true)
  })

  it('replaces scheduled definitions from the chosen boundary and preserves older ones', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const scheduled = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    const updated = await habits.update(scheduled.id, {
      target: { kind: 'count', operator: 'min', value: 4 },
      criteriaChange: { scope: 'from-date', effectiveFrom: '2026-11-02' as DayRef },
    })
    expect(updated.criteriaVersions?.map(v => v.effectiveFrom)).toEqual([
      '0001-01-01',
      '2026-11-02',
    ])
    expect(resolveMeasurementCriteria(updated, NEXT).target.value).toBe(4)
  })

  it('requires a choice, validates the boundary and rejects a stale definition atomically', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const target = { kind: 'count', operator: 'min', value: 5 } as const
    await expect(habits.update(habit.id, { target })).rejects.toThrow('Choose when')
    await expect(
      habits.update(habit.id, {
        target,
        criteriaChange: { scope: 'from-date', effectiveFrom: '2026-11-10' as DayRef },
      })
    ).rejects.toThrow()
    await habits.update(habit.id, { target, criteriaChange: { scope: 'all-history' } })
    await expect(
      habits.update(habit.id, {
        target: { ...target, value: 3 },
        criteriaChange: { scope: 'all-history', expectedSignature: criteriaSignature(habit) },
      })
    ).rejects.toThrow('changed while editing')
    expect((await habits.getById(habit.id))?.target.value).toBe(5)
  })

  it('preserves embedded versions on ordinary edits, normalization, backup and restore', async () => {
    const habit = await create()
    await fiveExecutions(habit)
    const updated = await habits.update(habit.id, {
      target: { kind: 'count', operator: 'min', value: 5 },
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    const renamed = await habits.update(habit.id, { title: 'Renamed' })
    expect(renamed.criteriaVersions).toEqual(updated.criteriaVersions)
    expect(normalizeHabitPayload(renamed).criteriaVersions).toEqual(updated.criteriaVersions)
    const backup = parseUserBackup(JSON.stringify(await createUserBackup()))
    await restoreUserBackup(backup)
    expect((await habits.getById(habit.id))?.criteriaVersions).toEqual(updated.criteriaVersions)
  })

  it('rejects malformed criterion history in an imported backup before any write', async () => {
    const habit = await create()
    const backup = await createUserBackup()
    backup.tables.habits.find(h => h.id === habit.id)!.criteriaVersions = [
      {
        effectiveFrom: '2026-11-16',
        origin: 'user',
        criteria: { target: habit.target },
      },
    ]
    expect(() => parseUserBackup(JSON.stringify(backup))).toThrow()
    expect((await habits.getById(habit.id))?.criteriaVersions).toBeUndefined()
  })

  it('applies cosmetic checklist edits immediately without changing scoring history', async () => {
    const habit = await create({ entryMode: 'multi-completion', multiItems: items })
    await record(habit, '2026-11-09', ['a'])
    const versioned = await habits.update(habit.id, {
      multiDailyThreshold: 4,
      criteriaChange: { scope: 'from-date', effectiveFrom: NEXT },
    })
    const updated = await habits.update(habit.id, {
      multiItems: [...items].reverse().map(i => ({ ...i, label: i.id.toUpperCase() })),
      multiDailyThreshold: 4,
    })
    expect(updated.criteriaVersions?.map(v => v.effectiveFrom)).toEqual(
      versioned.criteriaVersions?.map(v => v.effectiveFrom)
    )
    expect(resolveMeasurementCriteria(updated, TODAY).multiItems?.[0].label).toBe('E')
    expect(resolveMeasurementCriteria(updated, TODAY).multiDailyThreshold).toBeUndefined()
    expect(resolveMeasurementCriteria(updated, NEXT).multiDailyThreshold).toBe(4)
  })

  it('archives a deleted referenced item instead of orphaning historical executions', async () => {
    const habit = await create({ entryMode: 'multi-completion', multiItems: items })
    await record(habit, '2026-11-09', ['a', 'b', 'c', 'd', 'e'])
    const updated = await habits.update(habit.id, {
      multiItems: items.filter(i => i.id !== 'e'),
      criteriaChange: { scope: 'all-history' },
    })
    expect(updated.multiItems?.find(i => i.id === 'e')).toMatchObject({ archived: true })
    expect(
      buildMeasurementSummary(updated, await state.listDailyMeasurementEntries(), WEEK).actualValue
    ).toBe(1)
  })
})
