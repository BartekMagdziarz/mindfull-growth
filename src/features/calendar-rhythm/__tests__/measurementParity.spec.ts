import { describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  MeasurementEntryMode,
  MeasurementTarget,
  MultiCompletionItem,
} from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import {
  buildMeasurementSummary,
  multiCompletionDayMet,
  type MeasureableSubject,
} from '@/services/measurementProgress'
import {
  multiDayMet,
  objectCompletion,
  seriesFor,
  unitsFor,
} from '@/features/calendar-rhythm/rhythmProjections'
import {
  emptyRhythmScenario,
  type RhythmObject,
  type RhythmScenario,
} from '@/features/calendar-rhythm/rhythmScenario'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { buildRhythmScenario } from '@/features/calendar-rhythm/rhythmScenarioLoader'
import { loadObjectsLibraryBundle } from '@/services/objectsLibraryQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'

const WEEK = '2026-W45' as WeekRef // App week numbering: Nov 9–15.
const MONTH = '2026-11' as MonthRef
const CLOCK = '2026-11-16' as DayRef
const DAY = '2026-11-09' as DayRef
const families = ['habit', 'keyResult', 'tracker', 'weeklyIntention'] as const
const cadences = ['weekly', 'monthly'] as const
const items: MultiCompletionItem[] = [
  ...['a', 'b', 'c', 'd'].map(id => ({ id, label: id, weight: 1 })),
  { id: 'old', label: 'Archived', weight: 1, archived: true },
]

function subject(
  type: MeasurementSubjectType = 'habit',
  mode: MeasurementEntryMode = 'multi-completion',
  cadence: 'weekly' | 'monthly' = 'weekly',
  target: MeasurementTarget = { kind: 'count', operator: 'min', value: 1 }
): MeasureableSubject {
  const base = {
    id: 's1',
    title: 'Synthetic morning routine',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-14T08:00:00Z',
    isActive: true,
    status: 'open' as const,
    entryMode: mode,
    cadence,
    multiItems: items,
    priorityIds: [],
    lifeAreaIds: [],
  }
  if (type === 'tracker') return base
  if (type === 'keyResult') return { ...base, goalId: 'g1', target }
  if (type === 'weeklyIntention') return { ...base, cadence: 'weekly', weekRef: WEEK, target }
  return { ...base, target }
}

function object(s: MeasureableSubject, type: MeasurementSubjectType = 'habit'): RhythmObject {
  return {
    key: `${type}:${s.id}`,
    title: s.title,
    family: type === 'weeklyIntention' ? 'intention' : type,
    priorityKeys: [],
    entryMode: s.entryMode,
    cadence: s.cadence,
    target: 'target' in s ? s.target : undefined,
    evidenceRole: type === 'tracker' ? 'observation' : 'action',
    multiItems: s.multiItems,
    multiThreshold: s.multiDailyThreshold,
  }
}

function entry(value: number | null = null, dayRef = DAY): DailyMeasurementEntry {
  return {
    id: `e-${dayRef}`,
    subjectType: 'habit',
    subjectId: 's1',
    dayRef,
    value,
    createdAt: `${dayRef}T08:00:00Z`,
    updatedAt: `${dayRef}T08:00:00Z`,
    checkedItemIds: value === null ? ['a', 'b', 'c', 'd'] : undefined,
  }
}

function scenario(o: RhythmObject, entries: DailyMeasurementEntry[]): RhythmScenario {
  return {
    ...emptyRhythmScenario(CLOCK),
    objects: [o],
    entries: entries.map(e => ({
      id: e.id,
      objectKey: o.key,
      dayRef: e.dayRef,
      value: e.value ?? undefined,
      checkedItemIds: e.checkedItemIds,
    })),
  }
}

describe('calendar and domain evaluation parity', () => {
  it('stored habit: archiving an item leaves library met but calendar partial', async () => {
    await resetPlanningTestData()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'))
    try {
      const habit = await habitDexieRepository.create({
        title: 'Synthetic morning routine',
        priorityIds: [],
        lifeAreaIds: [],
        isActive: true,
        status: 'open',
        cadence: 'weekly',
        entryMode: 'multi-completion',
        target: { kind: 'count', operator: 'min', value: 2 },
        multiItems: items.map(({ archived: _archived, ...item }) => item),
      })
      await planningStateDexieRepository.upsertMeasurementMonthState({
        subjectType: 'habit',
        subjectId: habit.id,
        monthRef: MONTH,
        activityState: 'active',
        scheduleScope: 'specific-days',
      })
      await planningStateDexieRepository.upsertMeasurementWeekState({
        subjectType: 'habit',
        subjectId: habit.id,
        weekRef: WEEK,
        activityState: 'active',
        scheduleScope: 'specific-days',
      })
      for (const dayRef of [DAY, '2026-11-10' as DayRef]) {
        await planningStateDexieRepository.upsertDailyMeasurementEntry({
          subjectType: 'habit',
          subjectId: habit.id,
          dayRef,
          value: null,
          checkedItemIds: ['a', 'b', 'c', 'd'],
        })
      }
      await habitDexieRepository.update(habit.id, {
        multiItems: items,
        criteriaChange: { scope: 'all-history' },
      })
      const library = await loadObjectsLibraryBundle({
        family: 'habits',
        q: '',
        lifeAreaIds: [],
        priorityIds: [],
        showClosed: false,
      })
      expect(library.items.find(i => i.id === habit.id)?.chartData).toEqual([
        expect.objectContaining({ actualValue: 2, status: 'met' }),
      ])
      const state = await buildRhythmScenario('week', WEEK, '2026-11-14' as DayRef)
      const o = state.objects.find(i => i.key === `habit:${habit.id}`)!
      expect(state.entries.filter(e => e.objectKey === o.key)).toHaveLength(2)
      const series = seriesFor(state, o, unitsFor('week', WEEK, state.clock), 'week', WEEK)
      expect(series.points.slice(0, 2).map(p => p.dayWells)).toEqual([['done'], ['done']])
    } finally {
      vi.useRealTimers()
    }
  })

  for (const family of families) {
    // Intentions only have weekly cadence in the domain.
    for (const cadence of family === 'weeklyIntention' ? (['weekly'] as const) : cadences) {
      it(`${family}/${cadence}: archived items must not increase the daily threshold`, () => {
        const s = subject(family, 'multi-completion', cadence)
        const o = object(s, family)
        const e = { ...entry(), subjectType: family }
        expect(multiCompletionDayMet(s, e)).toBe(true)
        expect(
          multiDayMet(o, {
            id: e.id,
            objectKey: o.key,
            dayRef: e.dayRef,
            checkedItemIds: e.checkedItemIds,
          })
        ).toBe(true)
      })
    }
  }

  it('weekly day wells must show the four checked active items as done', () => {
    const s = subject()
    const o = object(s)
    const state = scenario(o, [entry()])
    const series = seriesFor(state, o, unitsFor('week', WEEK, CLOCK), 'week', WEEK)
    expect(series.points[0].dayWells).toEqual(['done'])
  })

  it('explicit stale threshold must be clamped to active weight sum', () => {
    const s = { ...subject(), multiDailyThreshold: 5 }
    const o = object(s)
    const e = entry()
    expect(multiCompletionDayMet(s, e)).toBe(true)
    expect(
      multiDayMet(o, {
        id: e.id,
        objectKey: o.key,
        dayRef: e.dayRef,
        checkedItemIds: e.checkedItemIds,
      })
    ).toBe(true)
  })

  for (const mode of ['counter', 'value', 'rating', 'multi-completion'] as const) {
    it(`${mode}: period completion must include entryDays conjunction`, () => {
      const target: MeasurementTarget =
        mode === 'value'
          ? { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
          : mode === 'rating'
            ? { kind: 'rating', aggregation: 'average', operator: 'gte', value: 1 }
            : { kind: 'count', operator: 'min', value: 1 }
      target.entryDays = { operator: 'min', value: 2 }
      const s = { ...subject('habit', mode, 'weekly', target), multiItems: items.slice(0, 4) }
      const entries = [entry(mode === 'multi-completion' ? null : 1)]
      expect(buildMeasurementSummary(s, entries, WEEK).evaluationStatus).toBe('missed')
      const o = object(s)
      const result = objectCompletion(
        scenario(o, entries),
        o,
        'month',
        MONTH,
        unitsFor('month', MONTH, CLOCK)
      )
      expect(result.ratio).toEqual({ done: 0, total: 1 })
    })
  }

  for (const mode of ['completion', 'counter', 'value', 'rating'] as const) {
    it(`${mode}: month override operator must override base operator`, () => {
      const base: MeasurementTarget =
        mode === 'value'
          ? { kind: 'value', aggregation: 'sum', operator: 'gte', value: 2 }
          : mode === 'rating'
            ? { kind: 'rating', aggregation: 'average', operator: 'gte', value: 2 }
            : { kind: 'count', operator: 'min', value: 2 }
      const override: MeasurementTarget =
        base.kind === 'count' ? { ...base, operator: 'max' } : { ...base, operator: 'lte' }
      const s = subject('habit', mode, 'weekly', base)
      const entries = [entry(mode === 'completion' ? null : 1)]
      expect(
        buildMeasurementSummary({ ...s, target: override }, entries, WEEK).evaluationStatus
      ).toBe('met')
      const o = object(s)
      const state = scenario(o, entries)
      state.overrides.push({
        objectKey: o.key,
        scope: { kind: 'month', ref: MONTH },
        target: override,
      })
      const result = objectCompletion(state, o, 'month', MONTH, unitsFor('month', MONTH, CLOCK))
      expect(result.ratio).toEqual({ done: 1, total: 1 })
    })
  }

  it('value: aggregation must follow the effective period target', () => {
    const s = subject('habit', 'value', 'weekly', {
      kind: 'value',
      aggregation: 'sum',
      operator: 'gte',
      value: 5,
    })
    const override: MeasurementTarget = {
      kind: 'value',
      aggregation: 'average',
      operator: 'gte',
      value: 5,
    }
    const entries = [entry(6), entry(2, '2026-11-10' as DayRef)]
    expect(buildMeasurementSummary({ ...s, target: override }, entries, WEEK).actualValue).toBe(4)
    const o = object(s)
    const state = scenario(o, entries)
    state.overrides.push({
      objectKey: o.key,
      scope: { kind: 'month', ref: MONTH },
      target: override,
    })
    const series = seriesFor(state, o, unitsFor('month', MONTH, CLOCK), 'month', MONTH)
    expect(series.points.find(p => p.unitRef === WEEK)?.value).toBe(4)
  })

  it('counter: explicit zero must not qualify as an entry day', () => {
    const s = subject('habit', 'counter', 'weekly', {
      kind: 'count',
      operator: 'min',
      value: 1,
      entryDays: { operator: 'min', value: 2 },
    })
    const entries = [entry(1), entry(0, '2026-11-10' as DayRef)]
    expect(buildMeasurementSummary(s, entries, WEEK).qualifiedEntryDays).toBe(1)
    const o = object(s)
    const state = scenario(o, entries)
    const series = seriesFor(state, o, unitsFor('month', MONTH, CLOCK), 'month', MONTH)
    expect(series.points.find(p => p.unitRef === WEEK)?.entryDays).toBe(1)
  })
})

describe('basic arithmetic control cases', () => {
  for (const mode of ['completion', 'counter', 'value', 'rating', 'multi-completion'] as const) {
    it(`${mode}: matches shared summary without archives or overrides`, () => {
      const target: MeasurementTarget =
        mode === 'value'
          ? { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
          : mode === 'rating'
            ? { kind: 'rating', aggregation: 'average', operator: 'gte', value: 1 }
            : { kind: 'count', operator: 'min', value: 1 }
      const s = { ...subject('habit', mode, 'weekly', target), multiItems: items.slice(0, 4) }
      const entries = [entry(mode === 'completion' || mode === 'multi-completion' ? null : 2)]
      const o = object(s)
      const state = scenario(o, entries)
      const series = seriesFor(state, o, unitsFor('month', MONTH, CLOCK), 'month', MONTH)
      expect(series.points.find(p => p.unitRef === WEEK)?.value).toBe(
        buildMeasurementSummary(s, entries, WEEK).actualValue
      )
    })
  }
})

describe('protecting recorded history', () => {
  it('rejects changing entry mode after a checklist execution was recorded', async () => {
    await resetPlanningTestData()
    const habit = await habitDexieRepository.create({
      title: 'Synthetic round trip',
      priorityIds: [],
      lifeAreaIds: [],
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'multi-completion',
      multiItems: items,
      target: { kind: 'count', operator: 'min', value: 1 },
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: DAY,
      value: null,
      checkedItemIds: ['a', 'b', 'c', 'd'],
    })
    await expect(
      habitDexieRepository.update(habit.id, { entryMode: 'completion' })
    ).rejects.toThrow()
    expect((await habitDexieRepository.getById(habit.id))?.multiItems).toEqual(items)
  })
})
