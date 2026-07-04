import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { MonthRef, WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-03') as MonthRef
const WEEK = parsePeriodRef('2026-W11') as WeekRef
// 2026-W13 spans 2026-03-30 – 2026-04-05; its parent month (by week start) is March.
const BOUNDARY_WEEK = parsePeriodRef('2026-W13') as WeekRef
const APRIL = parsePeriodRef('2026-04') as MonthRef

async function createHabit(cadence: 'weekly' | 'monthly', monthRefs: MonthRef[]): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: cadence === 'weekly' ? 'Meditation' : 'Strength training',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence,
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
  })
  for (const monthRef of monthRefs) {
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
      targetOverride: { kind: 'count', operator: 'min', value: 5 },
    })
  }
  return habit.id
}

async function setupPlanner(weekRef: WeekRef) {
  const planner = useWeeklyPlannerState(ref(weekRef), ref('pl'), () => {})
  await planner.loadPlannerData()
  return planner
}

describe('useWeeklyPlannerState week target overrides', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('writes the week state override and leaves the month override untouched', async () => {
    const habitId = await createHabit('weekly', [MONTH])
    const planner = await setupPlanner(WEEK)

    const row = planner.habitRows.value.find(item => item.id === habitId)
    expect(row).toBeDefined()
    // Editable target starts from the month override (week-effective, no week override yet).
    expect(planner.editableTarget(row!)).toEqual({ kind: 'count', operator: 'min', value: 5 })

    await planner.handleTargetValueChange(row!, 2)

    const weekState = await planningStateDexieRepository.getMeasurementWeekState(
      WEEK,
      'habit',
      habitId
    )
    expect(weekState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 2 })

    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      MONTH,
      'habit',
      habitId
    )
    expect(monthState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 5 })

    // Row becomes week-effective after reload; clearing restores the month override view.
    const updatedRow = planner.habitRows.value.find(item => item.id === habitId)
    expect(planner.editableTarget(updatedRow!)).toEqual({ kind: 'count', operator: 'min', value: 2 })
    expect(updatedRow?.weekTargetOverrideByRef[WEEK]).toEqual({
      kind: 'count',
      operator: 'min',
      value: 2,
    })

    await planner.handleClearOverride(updatedRow!)
    const clearedRow = planner.habitRows.value.find(item => item.id === habitId)
    expect(planner.editableTarget(clearedRow!)).toEqual({ kind: 'count', operator: 'min', value: 5 })
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(MONTH, 'habit', habitId))
        ?.targetOverride
    ).toEqual({ kind: 'count', operator: 'min', value: 5 })
  })

  it('attributes monthly-cadence overrides to the parent month on a boundary week', async () => {
    const habitId = await createHabit('monthly', [MONTH, APRIL])
    const planner = await setupPlanner(BOUNDARY_WEEK)

    const row = planner.habitRows.value.find(item => item.id === habitId)
    expect(row).toBeDefined()

    await planner.handleTargetValueChange(row!, 4)

    // The override lands on the WEEK state keyed by the week's parent month
    // (March — the month containing the week start, same attribution as the
    // month-to-date footer), instead of mutating any month override.
    const marchState = await planningStateDexieRepository.getMeasurementWeekState(
      BOUNDARY_WEEK,
      'habit',
      habitId,
      MONTH
    )
    expect(marchState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 4 })

    const aprilState = await planningStateDexieRepository.getMeasurementWeekState(
      BOUNDARY_WEEK,
      'habit',
      habitId,
      APRIL
    )
    expect(aprilState?.targetOverride).toBeUndefined()

    // Neither month override was modified.
    for (const monthRef of [MONTH, APRIL]) {
      expect(
        (await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'habit', habitId))
          ?.targetOverride
      ).toEqual({ kind: 'count', operator: 'min', value: 5 })
    }
  })
})
