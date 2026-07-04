import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  materializeMeasurementDayAssignments,
  materializeMeasurementWeekPlacements,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getChildPeriods, parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-03') as MonthRef
const NEXT_MONTH = parsePeriodRef('2026-04') as MonthRef
// 2026-W13 spans 2026-03-30 – 2026-04-05, overlapping both months.
const BOUNDARY_WEEK = parsePeriodRef('2026-W13') as WeekRef

const MONTH_WEEKS = getChildPeriods(MONTH) as WeekRef[]

async function createHabit(cadence: 'weekly' | 'monthly'): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: cadence === 'weekly' ? 'Meditation' : 'Strength training',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence,
    entryMode: cadence === 'weekly' ? 'completion' : 'counter',
    target: { kind: 'count', operator: 'min', value: cadence === 'weekly' ? 3 : 12 },
    status: 'open',
  })
  return habit.id
}

async function upsertMonthState(
  habitId: string,
  monthRef: MonthRef,
  scheduleScope: 'unassigned' | 'whole-month',
  targetOverride?: { kind: 'count'; operator: 'min'; value: number }
): Promise<void> {
  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef,
    subjectType: 'habit',
    subjectId: habitId,
    activityState: 'active',
    scheduleScope,
    targetOverride,
  })
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await resetPlanningTestData()
})

describe('materializeMeasurementWeekPlacements', () => {
  it('converts a whole-month row to explicit whole-week placements, preserving the month override', async () => {
    const habitId = await createHabit('monthly')
    await upsertMonthState(habitId, MONTH, 'whole-month', { kind: 'count', operator: 'min', value: 10 })

    const kept = [MONTH_WEEKS[0]!, MONTH_WEEKS[2]!]
    await materializeMeasurementWeekPlacements({
      monthRef: MONTH,
      cadence: 'monthly',
      subjectType: 'habit',
      subjectId: habitId,
      weekRefs: kept,
    })

    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      MONTH,
      'habit',
      habitId
    )
    expect(monthState?.scheduleScope).toBe('unassigned')
    expect(monthState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 10 })

    for (const weekRef of MONTH_WEEKS) {
      const state = await planningStateDexieRepository.getMeasurementWeekState(
        weekRef,
        'habit',
        habitId,
        MONTH
      )
      if (kept.includes(weekRef)) {
        expect(state?.scheduleScope).toBe('whole-week')
      } else {
        expect(state).toBeUndefined()
      }
    }
  })

  it('preserves week sub-targets on kept weeks', async () => {
    const habitId = await createHabit('monthly')
    await upsertMonthState(habitId, MONTH, 'whole-month')
    await updateMeasurementWeekTargetOverride({
      weekRef: MONTH_WEEKS[1]!,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
      targetOverride: { kind: 'count', operator: 'min', value: 4 },
    })

    await materializeMeasurementWeekPlacements({
      monthRef: MONTH,
      cadence: 'monthly',
      subjectType: 'habit',
      subjectId: habitId,
      weekRefs: [MONTH_WEEKS[1]!],
    })

    const state = await planningStateDexieRepository.getMeasurementWeekState(
      MONTH_WEEKS[1]!,
      'habit',
      habitId,
      MONTH
    )
    expect(state?.scheduleScope).toBe('whole-week')
    expect(state?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 4 })
  })

  it('deactivates the month entirely when the kept set is empty (monthly cadence)', async () => {
    const habitId = await createHabit('monthly')
    await upsertMonthState(habitId, MONTH, 'whole-month')

    await materializeMeasurementWeekPlacements({
      monthRef: MONTH,
      cadence: 'monthly',
      subjectType: 'habit',
      subjectId: habitId,
      weekRefs: [],
    })

    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })

  it('materializes a residual unassigned weekly-cadence month state into explicit week placements', async () => {
    const habitId = await createHabit('weekly')
    await upsertMonthState(habitId, MONTH, 'unassigned')

    await materializeMeasurementWeekPlacements({
      monthRef: MONTH,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
      weekRefs: [MONTH_WEEKS[0]!],
    })

    const state = await planningStateDexieRepository.getMeasurementWeekState(
      MONTH_WEEKS[0]!,
      'habit',
      habitId
    )
    expect(state?.scheduleScope).toBe('whole-week')
    expect(state?.sourceMonthRef).toBeUndefined()

    // Now clear everything: week states and month states go away (active ⇔ placed).
    await materializeMeasurementWeekPlacements({
      monthRef: MONTH,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
      weekRefs: [],
    })

    expect(
      await planningStateDexieRepository.getMeasurementWeekState(MONTH_WEEKS[0]!, 'habit', habitId)
    ).toBeUndefined()
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })

  it('rejects weeks outside the month', async () => {
    const habitId = await createHabit('monthly')

    await expect(
      materializeMeasurementWeekPlacements({
        monthRef: MONTH,
        cadence: 'monthly',
        subjectType: 'habit',
        subjectId: habitId,
        weekRefs: [parsePeriodRef('2026-W30') as WeekRef],
      })
    ).rejects.toThrow('weekRefs must be weeks of monthRef')
  })
})

describe('materializeMeasurementDayAssignments', () => {
  it('converts a whole-week row to specific days, preserving the week target override', async () => {
    const habitId = await createHabit('weekly')
    const weekRef = MONTH_WEEKS[1]!
    const weekDays = getChildPeriods(weekRef) as DayRef[]

    await toggleMeasurementWeekAssignment({
      weekRef,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })
    await updateMeasurementWeekTargetOverride({
      weekRef,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
      targetOverride: { kind: 'count', operator: 'min', value: 2 },
    })

    const kept = weekDays.slice(0, 6)
    await materializeMeasurementDayAssignments({
      weekRef,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
      dayRefs: kept,
    })

    const state = await planningStateDexieRepository.getMeasurementWeekState(
      weekRef,
      'habit',
      habitId
    )
    expect(state?.scheduleScope).toBe('specific-days')
    expect(state?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 2 })

    const assignments = await planningStateDexieRepository.listMeasurementDayAssignments()
    const habitAssignments = assignments.filter(a => a.subjectId === habitId)
    expect(habitAssignments.map(a => a.dayRef).sort()).toEqual([...kept].sort())
  })

  it('removes the week placement and cleans up month states on an empty set (weekly cadence)', async () => {
    const habitId = await createHabit('weekly')
    const weekRef = MONTH_WEEKS[1]!
    const weekDays = getChildPeriods(weekRef) as DayRef[]

    await toggleMeasurementDayAssignment({
      dayRef: weekDays[0]!,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })

    await materializeMeasurementDayAssignments({
      weekRef,
      cadence: 'weekly',
      subjectType: 'habit',
      subjectId: habitId,
      dayRefs: [],
    })

    expect(
      await planningStateDexieRepository.getMeasurementWeekState(weekRef, 'habit', habitId)
    ).toBeUndefined()
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })

  it('keys monthly-cadence week states by each day month on a boundary week', async () => {
    const habitId = await createHabit('monthly')
    await upsertMonthState(habitId, MONTH, 'unassigned')
    await upsertMonthState(habitId, NEXT_MONTH, 'unassigned')

    const weekDays = getChildPeriods(BOUNDARY_WEEK) as DayRef[]
    const marchDays = weekDays.filter(day => day.startsWith('2026-03'))
    const aprilDays = weekDays.filter(day => day.startsWith('2026-04'))
    expect(marchDays.length).toBeGreaterThan(0)
    expect(aprilDays.length).toBeGreaterThan(0)

    await materializeMeasurementDayAssignments({
      weekRef: BOUNDARY_WEEK,
      cadence: 'monthly',
      subjectType: 'habit',
      subjectId: habitId,
      dayRefs: [marchDays[0]!, aprilDays[0]!],
    })

    expect(
      (
        await planningStateDexieRepository.getMeasurementWeekState(
          BOUNDARY_WEEK,
          'habit',
          habitId,
          MONTH
        )
      )?.scheduleScope
    ).toBe('specific-days')
    expect(
      (
        await planningStateDexieRepository.getMeasurementWeekState(
          BOUNDARY_WEEK,
          'habit',
          habitId,
          NEXT_MONTH
        )
      )?.scheduleScope
    ).toBe('specific-days')

    // Drop the April day: April's week state and its now-empty month state go away.
    await materializeMeasurementDayAssignments({
      weekRef: BOUNDARY_WEEK,
      cadence: 'monthly',
      subjectType: 'habit',
      subjectId: habitId,
      dayRefs: [marchDays[0]!],
    })

    expect(
      await planningStateDexieRepository.getMeasurementWeekState(
        BOUNDARY_WEEK,
        'habit',
        habitId,
        NEXT_MONTH
      )
    ).toBeUndefined()
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(NEXT_MONTH, 'habit', habitId)
    ).toBeUndefined()
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.activityState
    ).toBe('active')
  })

  it('rejects days outside the week', async () => {
    const habitId = await createHabit('weekly')

    await expect(
      materializeMeasurementDayAssignments({
        weekRef: MONTH_WEEKS[1]!,
        cadence: 'weekly',
        subjectType: 'habit',
        subjectId: habitId,
        dayRefs: [parsePeriodRef('2026-07-01') as DayRef],
      })
    ).rejects.toThrow('dayRefs must be days of weekRef')
  })
})

describe('active ⇔ placed cleanup on day toggles (monthly cadence)', () => {
  it('removing the last scheduled day deactivates the month', async () => {
    const habitId = await createHabit('monthly')
    await upsertMonthState(habitId, MONTH, 'unassigned')
    const dayRef = parsePeriodRef('2026-03-17') as DayRef

    await toggleMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.activityState
    ).toBe('active')

    await toggleMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })

    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })
})
