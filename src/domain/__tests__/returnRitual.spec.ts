import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Goal, WeeklyIntention } from '@/domain/planning'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { ProgramEnrollment } from '@/domain/program'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementWeekState,
} from '@/domain/planningState'
import {
  breakWeeks,
  buildReturnBreak,
  gentleTarget,
  isReturnBreakHandled,
  parseReturnRitualSettings,
  placementInWeek,
  selectActiveEnrollments,
  selectOverdueGoals,
  selectOverduePlanItems,
  selectStaleIntentions,
  selectWeeksWithoutEntries,
  serializeReturnRitualSettings,
  summarizeSubjectBeforeBreak,
  type ReturnBreak,
  type ReturnSubjectRef,
} from '@/domain/returnRitual'
import { parsePeriodRef } from '@/utils/periods'

// App weeks start on the first Monday of the year (2026-01-05 → W01):
// W39 = 28 Sep – 4 Oct, W40 = 5–11 Oct, W41 = 12–18 Oct, W42 = 19–25 Oct.
const W39 = parsePeriodRef('2026-W39') as WeekRef
const W40 = parsePeriodRef('2026-W40') as WeekRef
const W41 = parsePeriodRef('2026-W41') as WeekRef
const W42 = parsePeriodRef('2026-W42') as WeekRef
const SEPTEMBER = parsePeriodRef('2026-09') as MonthRef
const OCTOBER = parsePeriodRef('2026-10') as MonthRef
const SUNDAY = '2026-10-25' as DayRef
const WEDNESDAY = '2026-10-21' as DayRef

const stamps = { createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z' }

describe('buildReturnBreak', () => {
  it('is undefined without a signal or below the threshold', () => {
    expect(buildReturnBreak(undefined, SUNDAY)).toBeUndefined()
    expect(buildReturnBreak('2026-10-12T12:00:00Z', SUNDAY)).toBeUndefined() // 13 days
  })

  it('starts at the threshold and describes the gap', () => {
    const brk = buildReturnBreak('2026-10-11T12:00:00Z', SUNDAY)
    expect(brk).toMatchObject({
      lastSignalDay: '2026-10-11',
      breakStart: '2026-10-12',
      days: 14,
      weeks: [W41],
      crossedMonth: false,
      crossedYear: false,
      currentWeekMostlyBehind: true,
    })
  })

  it('lists full break weeks, excludes the current one and notices a month boundary', () => {
    const brk = buildReturnBreak('2026-09-30T12:00:00Z', WEDNESDAY)
    expect(brk).toMatchObject({
      breakStart: '2026-10-01',
      days: 21,
      weeks: [W39, W40, W41],
      crossedMonth: true,
      currentWeekMostlyBehind: false,
    })
    expect(buildReturnBreak('2025-12-20T12:00:00Z', '2026-01-10' as DayRef)?.crossedYear).toBe(true)
  })

  it('breakWeeks is empty when the break started this week', () => {
    expect(breakWeeks('2026-10-20' as DayRef, SUNDAY)).toEqual([])
    expect(breakWeeks('2026-10-18' as DayRef, SUNDAY)).toEqual([W41])
  })
})

describe('return ritual settings', () => {
  const brk = buildReturnBreak('2026-09-30T12:00:00Z', SUNDAY) as ReturnBreak

  it('round-trips and rejects garbage', () => {
    const settings = {
      breakStart: brk.breakStart,
      state: 'done' as const,
      at: '2026-10-25T09:00:00Z',
    }
    expect(parseReturnRitualSettings(serializeReturnRitualSettings(settings))).toEqual(settings)
    expect(parseReturnRitualSettings(undefined)).toBeUndefined()
    expect(parseReturnRitualSettings('nope')).toBeUndefined()
    expect(
      parseReturnRitualSettings('{"breakStart":"x","state":"done","at":"now"}')
    ).toBeUndefined()
    expect(
      parseReturnRitualSettings(
        '{"breakStart":"2026-10-01","state":"later","at":"2026-10-25T09:00:00Z"}'
      )
    ).toBeUndefined()
  })

  it('done silences the same break for good, dismissed only for the day', () => {
    expect(isReturnBreakHandled(undefined, brk)).toBe(false)
    expect(
      isReturnBreakHandled(
        { breakStart: brk.breakStart, state: 'done', at: '2026-10-20T09:00:00Z' },
        brk
      )
    ).toBe(true)
    expect(
      isReturnBreakHandled(
        { breakStart: brk.breakStart, state: 'dismissed', at: '2026-10-25T09:00:00Z' },
        brk
      )
    ).toBe(true)
    expect(
      isReturnBreakHandled(
        { breakStart: brk.breakStart, state: 'dismissed', at: '2026-10-24T09:00:00Z' },
        brk
      )
    ).toBe(false)
    expect(
      isReturnBreakHandled(
        { breakStart: '2026-08-01' as DayRef, state: 'done', at: '2026-10-25T09:00:00Z' },
        brk
      )
    ).toBe(false)
  })
})

describe('selectors', () => {
  it('stale intentions are open ones from weeks before today, oldest first', () => {
    const intention = (id: string, weekRef: WeekRef, status: WeeklyIntention['status']) =>
      ({ id, weekRef, status, ...stamps }) as unknown as WeeklyIntention
    const picked = selectStaleIntentions(
      [
        intention('current', W42, 'open'),
        intention('old', W40, 'open'),
        intention('older', W39, 'open'),
        intention('retired', W39, 'retired'),
      ],
      SUNDAY
    )
    expect(picked.map(i => i.id)).toEqual(['older', 'old'])
  })

  it('overdue plan items are pending ones before today', () => {
    const item = (id: string, dayRef: string, status: ExercisePlanItem['status']) =>
      ({ id, dayRef, status, ...stamps }) as unknown as ExercisePlanItem
    const picked = selectOverduePlanItems(
      [
        item('today', '2026-10-25', 'pending'),
        item('yesterday', '2026-10-24', 'pending'),
        item('old', '2026-10-02', 'pending'),
        item('done', '2026-10-02', 'done'),
      ],
      SUNDAY
    )
    expect(picked.map(i => i.id)).toEqual(['old', 'yesterday'])
  })

  it('active enrollments and overdue open goals', () => {
    const enrollment = (id: string, status: ProgramEnrollment['status']) =>
      ({ id, status }) as unknown as ProgramEnrollment
    expect(
      selectActiveEnrollments([enrollment('a', 'active'), enrollment('p', 'paused')]).map(e => e.id)
    ).toEqual(['a'])
    const goal = (id: string, status: Goal['status'], targetDate?: string) =>
      ({ id, status, targetDate }) as unknown as Goal
    expect(
      selectOverdueGoals(
        [
          goal('open-late', 'open', '2026-10-10'),
          goal('open-today', 'open', '2026-10-25'),
          goal('open-no-date', 'open'),
          goal('closed', 'completed', '2026-10-01'),
          goal('open-later', 'open', '2026-10-02'),
        ],
        SUNDAY
      ).map(g => g.id)
    ).toEqual(['open-later', 'open-late'])
  })
})

describe('placement and weeks without entries', () => {
  const habit: ReturnSubjectRef = { subjectType: 'habit', subjectId: 'h1', cadence: 'weekly' }
  const monthly: ReturnSubjectRef = { subjectType: 'tracker', subjectId: 't1', cadence: 'monthly' }
  const monthState = (
    ref: ReturnSubjectRef,
    monthRef: MonthRef,
    activityState: 'active' | 'paused' = 'active'
  ) =>
    ({
      id: `${ref.subjectId}-${monthRef}`,
      monthRef,
      subjectType: ref.subjectType,
      subjectId: ref.subjectId,
      activityState,
      scheduleScope: 'whole-month',
      ...stamps,
    }) as MeasurementMonthState
  const weekState = (
    ref: ReturnSubjectRef,
    weekRef: WeekRef,
    overrides: Partial<MeasurementWeekState> = {}
  ) =>
    ({
      id: `${ref.subjectId}-${weekRef}`,
      weekRef,
      subjectType: ref.subjectType,
      subjectId: ref.subjectId,
      activityState: 'active',
      scheduleScope: 'whole-week',
      ...stamps,
      ...overrides,
    }) as MeasurementWeekState
  const assignment = (ref: ReturnSubjectRef, dayRef: string) =>
    ({
      id: `${ref.subjectId}-${dayRef}`,
      dayRef,
      subjectType: ref.subjectType,
      subjectId: ref.subjectId,
      ...stamps,
    }) as MeasurementDayAssignment
  const entry = (ref: ReturnSubjectRef, dayRef: string) =>
    ({
      id: `${ref.subjectId}-${dayRef}-e`,
      dayRef,
      subjectType: ref.subjectType,
      subjectId: ref.subjectId,
      value: 1,
      ...stamps,
    }) as DailyMeasurementEntry

  it('a whole-month placement, a week placement or a day assignment all place; a tombstone does not', () => {
    const empty = { weekStates: [], monthStates: [], dayAssignments: [] }
    expect(placementInWeek(habit, W40, empty)).toEqual({ placed: false })
    expect(
      placementInWeek(habit, W40, { ...empty, monthStates: [monthState(habit, OCTOBER)] }).placed
    ).toBe(true)
    expect(
      placementInWeek(habit, W40, { ...empty, weekStates: [weekState(habit, W40)] }).placed
    ).toBe(true)
    expect(
      placementInWeek(habit, W40, { ...empty, dayAssignments: [assignment(habit, '2026-10-06')] })
        .placed
    ).toBe(true)
    expect(
      placementInWeek(habit, W40, {
        ...empty,
        monthStates: [monthState(habit, OCTOBER)],
        weekStates: [
          weekState(habit, W40, {
            activityState: 'paused',
            scheduleScope: 'unassigned',
            daysMode: 'custom',
          }),
        ],
      })
    ).toEqual({ placed: false })
  })

  it('names the placing month for monthly cadence, also on a boundary week', () => {
    // W39 spans September and October; only October places the tracker.
    const placement = placementInWeek(monthly, W39, {
      weekStates: [],
      monthStates: [monthState(monthly, OCTOBER)],
      dayAssignments: [],
    })
    expect(placement).toEqual({ placed: true, monthRef: OCTOBER })
    const september = placementInWeek(monthly, W39, {
      weekStates: [],
      monthStates: [monthState(monthly, SEPTEMBER)],
      dayAssignments: [],
    })
    expect(september).toEqual({ placed: true, monthRef: SEPTEMBER })
    expect(
      placementInWeek(habit, W39, {
        weekStates: [],
        monthStates: [monthState(habit, OCTOBER)],
        dayAssignments: [],
      }).monthRef
    ).toBeUndefined()
  })

  it('lists only placed subjects without any entry, per week', () => {
    const picked = selectWeeksWithoutEntries([W39, W40, W41], [habit, monthly], {
      weekStates: [],
      monthStates: [monthState(habit, OCTOBER), monthState(monthly, OCTOBER)],
      dayAssignments: [],
      entries: [entry(habit, '2026-10-07')], // W40
    })
    expect(picked).toEqual([
      {
        weekRef: W39,
        subjects: [
          { ...habit, monthRef: undefined },
          { ...monthly, monthRef: OCTOBER },
        ],
      },
      { weekRef: W40, subjects: [{ ...monthly, monthRef: OCTOBER }] },
      {
        weekRef: W41,
        subjects: [
          { ...habit, monthRef: undefined },
          { ...monthly, monthRef: OCTOBER },
        ],
      },
    ])
    expect(
      selectWeeksWithoutEntries([W39], [habit], {
        weekStates: [],
        monthStates: [],
        dayAssignments: [],
        entries: [],
      })
    ).toEqual([])
  })

  it('a subject is alive when its last entry falls in the window before the break', () => {
    const breakStart = '2026-10-01' as DayRef
    expect(summarizeSubjectBeforeBreak(habit, [entry(habit, '2026-09-20')], breakStart)).toEqual({
      aliveBeforeBreak: true,
      lastEntryDay: '2026-09-20',
    })
    expect(summarizeSubjectBeforeBreak(habit, [entry(habit, '2026-08-20')], breakStart)).toEqual({
      aliveBeforeBreak: false,
      lastEntryDay: '2026-08-20',
    })
    expect(summarizeSubjectBeforeBreak(habit, [], breakStart)).toEqual({ aliveBeforeBreak: false })
    // A backfilled entry inside the break is not "before the break".
    expect(
      summarizeSubjectBeforeBreak(habit, [entry(habit, '2026-10-10')], breakStart).aliveBeforeBreak
    ).toBe(false)
  })
})

describe('gentleTarget', () => {
  it('halves counts (never below 1) and summed values, leaves qualities alone', () => {
    expect(gentleTarget({ kind: 'count', operator: 'min', value: 5 }, 'completion')).toEqual({
      kind: 'count',
      operator: 'min',
      value: 3,
    })
    expect(gentleTarget({ kind: 'count', operator: 'min', value: 1 }, 'counter')?.value).toBe(1)
    expect(gentleTarget({ kind: 'count', operator: 'max', value: 4 }, 'counter')).toBeUndefined()
    expect(
      gentleTarget({ kind: 'value', aggregation: 'sum', operator: 'gte', value: 100 }, 'value')
    ).toMatchObject({ value: 50 })
    expect(
      gentleTarget({ kind: 'value', aggregation: 'average', operator: 'gte', value: 7 }, 'value')
    ).toBeUndefined()
    expect(
      gentleTarget({ kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 }, 'rating')
    ).toBeUndefined()
    expect(
      gentleTarget({ kind: 'count', operator: 'min', value: 5 }, 'multi-completion')
    ).toBeUndefined()
  })
})
