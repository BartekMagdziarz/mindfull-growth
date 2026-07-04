import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
  updateMeasurementWeekTargetOverride,
} from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-03') as MonthRef
const WEEK = parsePeriodRef('2026-W11') as WeekRef
// 2026-W13 spans 2026-03-30 – 2026-04-05, overlapping both months.
const BOUNDARY_WEEK = parsePeriodRef('2026-W13') as WeekRef
const NEXT_MONTH = parsePeriodRef('2026-04') as MonthRef

async function createWeeklyHabit(): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: 'Meditation',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
  })
  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef: MONTH,
    subjectType: 'habit',
    subjectId: habit.id,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
  return habit.id
}

async function createMonthlyHabit(monthRefs: MonthRef[]): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: 'Strength training',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'monthly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 12 },
    status: 'open',
  })
  for (const monthRef of monthRefs) {
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
  }
  return habit.id
}

describe('updateMeasurementWeekTargetOverride', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('creates an unassigned week state carrying the override for weekly cadence', async () => {
    const habitId = await createWeeklyHabit()

    await updateMeasurementWeekTargetOverride({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
      targetOverride: { kind: 'count', operator: 'min', value: 2 },
    })

    const state = await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId)
    expect(state?.scheduleScope).toBe('unassigned')
    expect(state?.activityState).toBe('active')
    expect(state?.sourceMonthRef).toBeUndefined()
    expect(state?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 2 })
  })

  it('preserves existing placement when updating and clears with explicit undefined', async () => {
    const habitId = await createWeeklyHabit()
    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })

    await updateMeasurementWeekTargetOverride({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
      targetOverride: { kind: 'count', operator: 'min', value: 4 },
    })

    let state = await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId)
    expect(state?.scheduleScope).toBe('whole-week')
    expect(state?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 4 })

    await updateMeasurementWeekTargetOverride({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
      targetOverride: undefined,
    })

    state = await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId)
    expect(state?.scheduleScope).toBe('whole-week')
    expect(state?.targetOverride).toBeUndefined()
  })

  it('survives a week toggle and is removed when the week is unchecked', async () => {
    const habitId = await createWeeklyHabit()

    await updateMeasurementWeekTargetOverride({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
      targetOverride: { kind: 'count', operator: 'min', value: 2 },
    })

    // Toggle on: upsert without the targetOverride key must preserve the override.
    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })
    const toggled = await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId)
    expect(toggled?.scheduleScope).toBe('whole-week')
    expect(toggled?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 2 })

    // Toggle off: unchecking the week deletes the state, and the sub-target with it.
    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })
    const removed = await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId)
    expect(removed?.targetOverride).toBeUndefined()
  })

  it('keeps the month target override intact across week and day toggles', async () => {
    const habitId = await createWeeklyHabit()
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'active',
      scheduleScope: 'unassigned',
      targetOverride: { kind: 'count', operator: 'min', value: 5 },
    })

    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })
    await toggleMeasurementDayAssignment({
      dayRef: parsePeriodRef('2026-03-17') as DayRef,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'weekly',
    })

    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      MONTH,
      'habit',
      habitId,
    )
    expect(monthState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 5 })
  })

  it('un-toggling the last monthly-cadence week placement deactivates the month (active ⇔ placed)', async () => {
    const habitId = await createMonthlyHabit([MONTH])

    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })
    expect(
      (await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId, MONTH))
        ?.scheduleScope
    ).toBe('whole-week')

    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })

    expect(
      await planningStateDexieRepository.getMeasurementWeekState(WEEK, 'habit', habitId, MONTH)
    ).toBeUndefined()
    // Last placement removed → the 'unassigned' month state is cleaned up too.
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })

  it('un-toggling one of several monthly-cadence week placements keeps the month active', async () => {
    const habitId = await createMonthlyHabit([MONTH])
    const otherWeek = parsePeriodRef('2026-W12') as WeekRef

    for (const weekRef of [WEEK, otherWeek]) {
      await toggleMeasurementWeekAssignment({
        weekRef,
        subjectType: 'habit',
        subjectId: habitId,
        cadence: 'monthly',
        monthRef: MONTH,
      })
    }

    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })

    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.activityState
    ).toBe('active')
  })

  it('whole-month scope survives un-toggling a week placement (it is a placement itself)', async () => {
    const habitId = await createMonthlyHabit([MONTH])
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })

    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })
    await toggleMeasurementWeekAssignment({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
    })

    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.scheduleScope
    ).toBe('whole-month')
  })

  it('requires monthRef for monthly cadence subjects', async () => {
    const habitId = await createMonthlyHabit([MONTH])

    await expect(
      updateMeasurementWeekTargetOverride({
        weekRef: WEEK,
        subjectType: 'habit',
        subjectId: habitId,
        cadence: 'monthly',
        targetOverride: { kind: 'count', operator: 'min', value: 3 },
      }),
    ).rejects.toThrow('Monthly cadence week target overrides require monthRef')
  })

  it('keeps per-month sub-targets independent on a boundary week', async () => {
    const habitId = await createMonthlyHabit([MONTH, NEXT_MONTH])

    await updateMeasurementWeekTargetOverride({
      weekRef: BOUNDARY_WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: MONTH,
      targetOverride: { kind: 'count', operator: 'min', value: 2 },
    })
    await updateMeasurementWeekTargetOverride({
      weekRef: BOUNDARY_WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      cadence: 'monthly',
      monthRef: NEXT_MONTH,
      targetOverride: { kind: 'count', operator: 'min', value: 5 },
    })

    const marchState = await planningStateDexieRepository.getMeasurementWeekState(
      BOUNDARY_WEEK,
      'habit',
      habitId,
      MONTH,
    )
    const aprilState = await planningStateDexieRepository.getMeasurementWeekState(
      BOUNDARY_WEEK,
      'habit',
      habitId,
      NEXT_MONTH,
    )

    expect(marchState?.sourceMonthRef).toBe(MONTH)
    expect(marchState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 2 })
    expect(aprilState?.sourceMonthRef).toBe(NEXT_MONTH)
    expect(aprilState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 5 })
    expect(marchState?.id).not.toBe(aprilState?.id)
  })
})
