import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementRhythm } from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  linkGoalToMonth,
  skipMeasurementWeek,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
} from '@/services/planningMutations'
import {
  ensureRhythmPlacements,
  restoreWeekRhythm,
  rhythmFloorWeek,
  rhythmHorizonWeek,
} from '@/services/rhythmSchedulerService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const MARCH = parsePeriodRef('2026-03') as MonthRef
const APRIL = parsePeriodRef('2026-04') as MonthRef
const W10 = parsePeriodRef('2026-W10') as WeekRef // 9–15 Mar
const W11 = parsePeriodRef('2026-W11') as WeekRef // 16–22 Mar
const W12 = parsePeriodRef('2026-W12') as WeekRef // 23–29 Mar
const W13 = parsePeriodRef('2026-W13') as WeekRef // 30 Mar – 5 Apr (boundary)
const W14 = parsePeriodRef('2026-W14') as WeekRef // 6–12 Apr
const TODAY = '2026-03-24' as DayRef // Tuesday of W12 → horizon W13

const TUE_THU: MeasurementRhythm = {
  kind: 'weekdays',
  weekdays: ['tue', 'thu'],
  scope: 'placed-weeks',
  since: W10,
}

async function createHabit(
  rhythm: MeasurementRhythm,
  cadence: 'weekly' | 'monthly' = 'weekly'
): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: 'Rozciąganie',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence,
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 2 },
    status: 'open',
    rhythm,
  })
  return habit.id
}

async function placeWholeMonth(habitId: string, monthRef: MonthRef, paused = false) {
  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef,
    subjectType: 'habit',
    subjectId: habitId,
    activityState: paused ? 'paused' : 'active',
    scheduleScope: 'whole-month',
  })
}

async function daysOf(habitId: string, subjectType: 'habit' | 'keyResult' = 'habit') {
  const assignments = await planningStateDexieRepository.listMeasurementDayAssignments()
  return assignments
    .filter(a => a.subjectType === subjectType && a.subjectId === habitId)
    .map(a => a.dayRef)
    .sort()
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await resetPlanningTestData()
})

describe('rhythmHorizonWeek', () => {
  it('reaches the week after today', () => {
    expect(rhythmHorizonWeek(TODAY)).toBe(W13)
  })
})

describe('rhythmFloorWeek', () => {
  it("is today's week", () => {
    expect(rhythmFloorWeek(TODAY)).toBe(W12)
  })
})

describe('ensureRhythmPlacements — weekly cadence', () => {
  it("fills every placed week from today's week through the horizon, once", async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH)

    const first = await ensureRhythmPlacements({ today: TODAY })
    expect(first.placements.map(p => p.weekRef)).toEqual([W12, W13])
    expect(await daysOf(habitId)).toEqual(['2026-03-24', '2026-03-26', '2026-03-31', '2026-04-02'])
    const w12 = await planningStateDexieRepository.getMeasurementWeekState(W12, 'habit', habitId)
    expect(w12).toMatchObject({ scheduleScope: 'specific-days', daysMode: 'rhythm' })
    // The horizon ends at W13; W14 stays a template.
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W14, 'habit', habitId)
    ).toBeUndefined()

    const second = await ensureRhythmPlacements({ today: TODAY })
    expect(second.placements).toEqual([])
  })

  it('does nothing before `since` or without a placement (placed-weeks scope)', async () => {
    const habitId = await createHabit({ ...TUE_THU, since: W13 })
    await placeWholeMonth(habitId, MARCH)
    const result = await ensureRhythmPlacements({ today: TODAY })
    expect(result.placements.map(p => p.weekRef)).toEqual([W13])

    const unplaced = await createHabit(TUE_THU)
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(unplaced)).toEqual([])
  })

  it('every-week scope places and activates the month on its own', async () => {
    const habitId = await createHabit({ ...TUE_THU, scope: 'every-week', since: W12 })
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(habitId)).toEqual(['2026-03-24', '2026-03-26', '2026-03-31', '2026-04-02'])
    const march = await planningStateDexieRepository.getMeasurementMonthState(
      MARCH,
      'habit',
      habitId
    )
    const april = await planningStateDexieRepository.getMeasurementMonthState(
      APRIL,
      'habit',
      habitId
    )
    expect(march?.activityState).toBe('active')
    expect(april?.activityState).toBe('active')
  })

  it('skips a paused month', async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH, true)
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(habitId)).toEqual([])
  })

  it('leaves weeks the user decided alone: a clicked day, „Bez terminu”, a skip', async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH)
    // W10: the user picked Monday before the scheduler ran.
    await toggleMeasurementDayAssignment({
      dayRef: '2026-03-09' as DayRef,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    // W11: „Bez terminu” from the weekly ritual.
    await toggleMeasurementWeekAssignment({
      weekRef: W11,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
      daysMode: 'custom',
    })
    // W12: „Pomiń w tym tygodniu”.
    await skipMeasurementWeek({
      weekRef: W12,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })

    const result = await ensureRhythmPlacements({ today: TODAY })
    expect(result.placements.map(p => p.weekRef)).toEqual([W13])
    expect(await daysOf(habitId)).toEqual(['2026-03-09', '2026-03-31', '2026-04-02'])

    const w10 = await planningStateDexieRepository.getMeasurementWeekState(W10, 'habit', habitId)
    expect(w10?.daysMode).toBe('custom')
    const w12 = await planningStateDexieRepository.getMeasurementWeekState(W12, 'habit', habitId)
    expect(w12).toMatchObject({
      activityState: 'paused',
      scheduleScope: 'unassigned',
      daysMode: 'custom',
    })
  })

  it('a month-matrix whole-week placement (no daysMode) is exactly what the rhythm fills', async () => {
    const habitId = await createHabit(TUE_THU)
    await toggleMeasurementWeekAssignment({
      weekRef: W13,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(habitId)).toEqual(['2026-03-31', '2026-04-02'])
    const w13 = await planningStateDexieRepository.getMeasurementWeekState(W13, 'habit', habitId)
    expect(w13).toMatchObject({ scheduleScope: 'specific-days', daysMode: 'rhythm' })
  })

  it('leaves undecided weeks before today alone: after a break they stay unplanned (D2)', async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH)
    // Nobody opened the app in W10–W11; the run on return must not fill them in hindsight.
    const result = await ensureRhythmPlacements({ today: TODAY })
    expect(result.placements.map(p => p.weekRef)).toEqual([W12, W13])
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W10, 'habit', habitId)
    ).toBeUndefined()
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W11, 'habit', habitId)
    ).toBeUndefined()
    // A restricted run on a past week is a no-op as well.
    const past = await ensureRhythmPlacements({ today: TODAY, weekRef: W11 })
    expect(past.placements).toEqual([])
    expect(await daysOf(habitId)).toEqual(['2026-03-24', '2026-03-26', '2026-03-31', '2026-04-02'])
  })

  it('removing one rhythm day makes the week custom so a rerun does not refill it', async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH)
    await ensureRhythmPlacements({ today: TODAY })
    await toggleMeasurementDayAssignment({
      dayRef: '2026-03-26' as DayRef,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    const w12 = await planningStateDexieRepository.getMeasurementWeekState(W12, 'habit', habitId)
    expect(w12?.daysMode).toBe('custom')
    await ensureRhythmPlacements({ today: TODAY })
    expect((await daysOf(habitId)).includes('2026-03-26' as DayRef)).toBe(false)
  })

  it('restoreWeekRhythm lifts the tombstone and refills the week', async () => {
    const habitId = await createHabit(TUE_THU)
    await placeWholeMonth(habitId, MARCH)
    await skipMeasurementWeek({
      weekRef: W12,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    expect(
      await restoreWeekRhythm({
        subjectType: 'habit',
        subjectId: habitId,
        cadence: 'weekly',
        weekRef: W12,
        today: TODAY,
      })
    ).toEqual(['2026-03-24', '2026-03-26'])
  })
})

describe('ensureRhythmPlacements — monthly cadence and key results', () => {
  it('clips a boundary week to the placed month', async () => {
    const habitId = await createHabit(
      { kind: 'weekdays', weekdays: ['mon', 'tue', 'sat'], scope: 'placed-weeks', since: W13 },
      'monthly'
    )
    await placeWholeMonth(habitId, MARCH)
    await ensureRhythmPlacements({ today: TODAY })
    // Mon 30 Mar and Tue 31 Mar are March; Sat 4 Apr is April (not placed).
    expect(await daysOf(habitId)).toEqual(['2026-03-30', '2026-03-31'])
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W13, 'habit', habitId, MARCH)
    ).toMatchObject({ scheduleScope: 'specific-days', daysMode: 'rhythm' })
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W13, 'habit', habitId, APRIL)
    ).toBeUndefined()
  })

  it('places a key result only inside its goal window', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Cel',
      isActive: true,
      status: 'open',
      priorityIds: [],
      lifeAreaIds: [],
      targetDate: '2026-03-25',
    })
    await linkGoalToMonth(goal.id, MARCH)
    const keyResult = await keyResultDexieRepository.create({
      title: 'KR',
      goalId: goal.id,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 2 },
      rhythm: { ...TUE_THU, since: W12 },
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MARCH,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })

    await ensureRhythmPlacements({ today: TODAY })
    // Tue 24 Mar is inside the window, Thu 26 Mar and all of W13 are past the deadline.
    expect(await daysOf(keyResult.id, 'keyResult')).toEqual(['2026-03-24'])
  })
})

describe('skipMeasurementWeek bookkeeping', () => {
  it('monthly cadence: the tombstone is keyed by the source month and leaves the other month alone', async () => {
    const habitId = await createHabit(
      { kind: 'weekdays', weekdays: ['mon', 'sat'], scope: 'placed-weeks', since: W13 },
      'monthly'
    )
    await placeWholeMonth(habitId, MARCH)
    await placeWholeMonth(habitId, APRIL)
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(habitId)).toEqual(['2026-03-30', '2026-04-04'])

    await skipMeasurementWeek({
      weekRef: W13,
      cadence: 'monthly',
      monthRef: MARCH,
      subjectType: 'habit',
      subjectId: habitId,
    })
    expect(await daysOf(habitId)).toEqual(['2026-04-04'])
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W13, 'habit', habitId, MARCH)
    ).toMatchObject({ activityState: 'paused', daysMode: 'custom' })
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W13, 'habit', habitId, APRIL)
    ).toMatchObject({ activityState: 'active', daysMode: 'rhythm' })
    // Whole-month placements survive the skip.
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MARCH, 'habit', habitId))
        ?.scheduleScope
    ).toBe('whole-month')
    // The week is now the user's: a rerun does not bring March back.
    await ensureRhythmPlacements({ today: TODAY })
    expect(await daysOf(habitId)).toEqual(['2026-04-04'])
  })

  it('does not keep a month alive through the tombstone', async () => {
    const habitId = await createHabit(TUE_THU)
    // A bare week placement activates March with an 'unassigned' month state.
    await toggleMeasurementWeekAssignment({
      weekRef: W11,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MARCH, 'habit', habitId))
        ?.activityState
    ).toBe('active')

    await skipMeasurementWeek({
      weekRef: W11,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
    })
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MARCH, 'habit', habitId)
    ).toBeUndefined()
    const tombstone = await planningStateDexieRepository.getMeasurementWeekState(
      W11,
      'habit',
      habitId
    )
    expect(tombstone?.activityState).toBe('paused')
  })
})
