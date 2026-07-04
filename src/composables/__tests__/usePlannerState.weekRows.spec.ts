import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePlannerState } from '@/composables/usePlannerState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { toggleMeasurementDayAssignment } from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, getWeekOverlappingMonths, parsePeriodRef } from '@/utils/periods'
import type { PlannerMeasurementRow } from '@/components/calendar/plannerTypes'

const MONTH = parsePeriodRef('2026-03') as MonthRef

/** Without `scheduleScope` the habit starts unplanned — no month state at all
 * (the only state reachable from the new UI for an untouched object). */
async function createMonthlyHabit(
  scheduleScope?: 'unassigned' | 'whole-month'
): Promise<string> {
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
  if (scheduleScope) {
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope,
    })
  }
  return habit.id
}

function setupPlanner() {
  return usePlannerState(ref(MONTH), ref('pl'), () => {})
}

function habitRow(
  planner: ReturnType<typeof setupPlanner>,
  habitId: string
): PlannerMeasurementRow {
  const row = planner.habitRows.value.find(item => item.id === habitId)
  expect(row).toBeDefined()
  return row!
}

describe('usePlannerState month matrix', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('exposes one column per month week with boundary flags', async () => {
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const monthWeeks = getChildPeriods(MONTH) as WeekRef[]
    expect(planner.weekColumns.value.map(column => column.weekRef)).toEqual(monthWeeks)
    expect(planner.weekColumns.value.map(column => column.isBoundary)).toEqual(
      monthWeeks.map(weekRef => getWeekOverlappingMonths(weekRef).length > 1)
    )
  })

  it('toggles week cells and gates sub-target editing to placed weeks', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const [firstWeek, secondWeek] = getChildPeriods(MONTH) as WeekRef[]
    await planner.handleMatrixCellToggle(habitRow(planner, habitId), firstWeek!)

    const row = habitRow(planner, habitId)
    expect(planner.weekCellState(row, firstWeek!)).toBe('checked')
    expect(planner.weekCellState(row, secondWeek!)).toBe('empty')
    expect(planner.explicitlyPlacedWeeks(row)).toEqual([firstWeek])
    expect(planner.canDistribute(row)).toBe(true)
  })

  it('stores week sub-targets and reports the soft sum summary per row', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const weeks = (getChildPeriods(MONTH) as WeekRef[]).slice(0, 2)
    for (const weekRef of weeks) {
      await planner.handleMatrixCellToggle(habitRow(planner, habitId), weekRef)
    }

    expect(planner.rowWeekTargetSummary(habitRow(planner, habitId))).toBeNull()

    await planner.handleWeekTargetChange(habitRow(planner, habitId), weeks[0]!, 5)

    const updated = habitRow(planner, habitId)
    expect(updated.weekTargetOverrideByRef[weeks[0]!]).toEqual({
      kind: 'count',
      operator: 'min',
      value: 5,
    })
    expect(planner.rowWeekTargetSummary(updated)).toEqual({ assigned: 5, total: 12 })

    await planner.handleWeekTargetClear(habitRow(planner, habitId), weeks[0]!)
    expect(planner.rowWeekTargetSummary(habitRow(planner, habitId))).toBeNull()
  })

  it('distributes the month target evenly across placed weeks', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const weeks = (getChildPeriods(MONTH) as WeekRef[]).slice(0, 3)
    for (const weekRef of weeks) {
      await planner.handleMatrixCellToggle(habitRow(planner, habitId), weekRef)
    }

    expect(planner.canDistribute(habitRow(planner, habitId))).toBe(true)
    await planner.handleDistributeEvenly(habitRow(planner, habitId))

    const row = habitRow(planner, habitId)
    const values = weeks.map(weekRef => row.weekTargetOverrideByRef[weekRef]?.value)
    expect(values).toEqual([4, 4, 4])
    expect(planner.rowWeekTargetSummary(row)).toEqual({ assigned: 12, total: 12 })
  })

  it('summarizes ritual day assignments as a cell badge and clears them on cell un-toggle', async () => {
    const habitId = await createMonthlyHabit()
    for (const dayRef of ['2026-03-10', '2026-03-12']) {
      await toggleMeasurementDayAssignment({
        dayRef: parsePeriodRef(dayRef) as DayRef,
        subjectType: 'habit',
        subjectId: habitId,
        cadence: 'monthly',
        monthRef: MONTH,
      })
    }

    const planner = setupPlanner()
    await planner.loadPlannerData()

    // 2026-03-10 and 2026-03-12 both fall into 2026-W10 (Mar 9–15).
    const week = '2026-W10' as WeekRef
    expect(planner.weekDayBadge(habitRow(planner, habitId), week)).toBe(2)
    expect(planner.weekCellState(habitRow(planner, habitId), week)).toBe('checked')

    await planner.handleMatrixCellToggle(habitRow(planner, habitId), week)

    // Un-toggling a day-carrying week removes the days with the placement —
    // and, as the last placement, deactivates the month (active ⇔ placed).
    expect(planner.habitRows.value.find(item => item.id === habitId)?.isActive).not.toBe(true)
  })

  it('renders whole-month coverage as soft cells and materializes on cell toggle', async () => {
    const habitId = await createMonthlyHabit('whole-month')
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const monthWeeks = getChildPeriods(MONTH) as WeekRef[]
    const initial = habitRow(planner, habitId)
    expect(planner.rowSoftKind(initial)).toBe('whole-month')
    expect(planner.isWholePeriodApplied(initial)).toBe(true)
    for (const weekRef of monthWeeks) {
      expect(planner.weekCellState(initial, weekRef)).toBe('soft')
    }

    await planner.handleMatrixCellToggle(initial, monthWeeks[1]!)

    const materialized = habitRow(planner, habitId)
    expect(planner.rowSoftKind(materialized)).toBeNull()
    expect(planner.weekCellState(materialized, monthWeeks[0]!)).toBe('checked')
    expect(planner.weekCellState(materialized, monthWeeks[1]!)).toBe('empty')
    expect(materialized.monthScheduleScope).toBe('unassigned')
  })

  it('treats a residual active-unassigned row as soft whole-month coverage', async () => {
    const habitId = await createMonthlyHabit('unassigned')
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const row = habitRow(planner, habitId)
    expect(planner.rowSoftKind(row)).toBe('whole-month')
    expect(planner.rowHasPlacement(row)).toBe(true)
  })

  it('whole-month toggle applies coverage and clears it when already applied', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    await planner.handleWholeMonthToggle(habitRow(planner, habitId))
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.scheduleScope
    ).toBe('whole-month')
    expect(planner.isWholePeriodApplied(habitRow(planner, habitId))).toBe(true)

    // Toggling again clears the row entirely (active ⇔ placed).
    await planner.handleWholeMonthToggle(habitRow(planner, habitId))
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId)
    ).toBeUndefined()
  })
})
