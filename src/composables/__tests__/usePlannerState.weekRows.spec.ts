import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePlannerState } from '@/composables/usePlannerState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { toggleMeasurementDayAssignment } from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, getWeekOverlappingMonths, parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-03') as MonthRef

async function createMonthlyHabit(): Promise<string> {
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
  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef: MONTH,
    subjectType: 'habit',
    subjectId: habit.id,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
  return habit.id
}

function setupPlanner() {
  return usePlannerState(ref(MONTH), ref('pl'), () => {})
}

describe('usePlannerState week rows', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('exposes one row per month week and no day-toggle API', async () => {
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const monthWeeks = getChildPeriods(MONTH) as WeekRef[]
    expect(planner.weekRows.value.map(row => row.weekRef)).toEqual(monthWeeks)
    expect(planner.weekRows.value.map(row => row.isBoundary)).toEqual(
      monthWeeks.map(weekRef => getWeekOverlappingMonths(weekRef).length > 1)
    )
    expect('handleDayToggle' in planner).toBe(false)
    expect('canToggleDay' in planner).toBe(false)
  })

  it('marks placed weeks for the active assignment and gates target pills to them', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    const row = planner.habitRows.value.find(item => item.id === habitId)
    expect(row).toBeDefined()
    planner.startAssigning(row!)

    const [firstWeek, secondWeek] = getChildPeriods(MONTH) as WeekRef[]
    await planner.handleWeekToggle(firstWeek)

    const rows = planner.weekRows.value
    const placed = rows.find(item => item.weekRef === firstWeek)
    const unplaced = rows.find(item => item.weekRef === secondWeek)

    expect(placed?.assignmentScope).toBe('whole-week')
    expect(placed?.isAssignedInWeek).toBe(true)
    expect(placed?.canEditTarget).toBe(true)
    expect(placed?.effectiveTarget).toEqual({ kind: 'count', operator: 'min', value: 12 })
    expect(unplaced?.isAssignedInWeek).toBe(false)
    expect(unplaced?.canEditTarget).toBe(false)
  })

  it('stores week sub-targets and reports the soft sum summary', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    planner.startAssigning(planner.habitRows.value.find(item => item.id === habitId)!)
    const weeks = (getChildPeriods(MONTH) as WeekRef[]).slice(0, 2)
    for (const weekRef of weeks) {
      await planner.handleWeekToggle(weekRef)
    }

    expect(planner.weekTargetSummary.value).toBeNull()

    await planner.handleWeekTargetChange(weeks[0], 5)

    const updated = planner.weekRows.value.find(item => item.weekRef === weeks[0])
    expect(updated?.weekTargetOverride).toEqual({ kind: 'count', operator: 'min', value: 5 })
    expect(updated?.effectiveTarget).toEqual({ kind: 'count', operator: 'min', value: 5 })
    expect(planner.weekTargetSummary.value).toEqual({ assigned: 5, total: 12 })

    await planner.handleWeekTargetClear(weeks[0])
    expect(planner.weekTargetSummary.value).toBeNull()
  })

  it('distributes the month target evenly across placed weeks', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    planner.startAssigning(planner.habitRows.value.find(item => item.id === habitId)!)
    const weeks = (getChildPeriods(MONTH) as WeekRef[]).slice(0, 3)
    for (const weekRef of weeks) {
      await planner.handleWeekToggle(weekRef)
    }

    expect(planner.canDistributeWeekTargets.value).toBe(true)
    await planner.handleDistributeEvenly()

    const values = weeks.map(
      weekRef => planner.weekRows.value.find(item => item.weekRef === weekRef)?.weekTargetOverride?.value
    )
    expect(values).toEqual([4, 4, 4])
    expect(planner.weekTargetSummary.value).toEqual({ assigned: 12, total: 12 })
  })

  it('summarizes existing day assignments as a read-only badge', async () => {
    const habitId = await createMonthlyHabit()
    // Day assignments come from the weekly flow; the month planner only displays them.
    for (const dayRef of ['2026-03-10', '2026-03-12']) {
      await toggleMeasurementDayAssignment({
        dayRef: parsePeriodRef(dayRef) as Parameters<typeof toggleMeasurementDayAssignment>[0]['dayRef'],
        subjectType: 'habit',
        subjectId: habitId,
        cadence: 'monthly',
        monthRef: MONTH,
      })
    }

    const planner = setupPlanner()
    await planner.loadPlannerData()
    planner.startAssigning(planner.habitRows.value.find(item => item.id === habitId)!)

    // 2026-03-10 and 2026-03-12 both fall into 2026-W10 (Mar 9–15).
    const week = planner.weekRows.value.find(item => item.weekRef === ('2026-W10' as WeekRef))
    expect(week?.dayBadge?.count).toBe(2)
    expect(week?.dayBadge?.days.length).toBeGreaterThan(0)
    expect(week?.isAssignedInWeek).toBe(true)
  })

  it('lists placed objects as idle chips when no assignment is active', async () => {
    const habitId = await createMonthlyHabit()
    const planner = setupPlanner()
    await planner.loadPlannerData()

    planner.startAssigning(planner.habitRows.value.find(item => item.id === habitId)!)
    const [firstWeek] = getChildPeriods(MONTH) as WeekRef[]
    await planner.handleWeekToggle(firstWeek)
    planner.stopAssigning()

    const placedRow = planner.weekRows.value.find(item => item.weekRef === firstWeek)
    expect(placedRow?.chips.map(chip => chip.key)).toContain(`habit:${habitId}`)
  })
})
