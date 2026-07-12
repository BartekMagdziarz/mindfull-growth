import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePlannerState } from '@/composables/usePlannerState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import * as planningMutations from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-03') as MonthRef

async function createPlannedHabit(): Promise<string> {
  const habit = await habitDexieRepository.create({
    title: 'Morning walk',
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
    scheduleScope: 'whole-month',
  })
  return habit.id
}

async function loadedPlanner() {
  const planner = usePlannerState(ref(MONTH), ref('pl'), () => {})
  await planner.loadPlannerData()
  return planner
}

describe('usePlannerState mutation hardening', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('captures a failed mutation in mutationError instead of rejecting, and clears savingKey', async () => {
    const habitId = await createPlannedHabit()
    const planner = await loadedPlanner()
    const row = planner.habitRows.value.find((item) => item.id === habitId)!

    vi.spyOn(planningMutations, 'updateMeasurementTargetOverride').mockRejectedValueOnce(
      new Error('boom')
    )

    await expect(planner.handleTargetValueChange(row, 5)).resolves.toBeUndefined()
    expect(planner.mutationError.value).toBe('boom')
    expect(planner.savingKey.value).toBe('')
    // The matrix was reloaded back to the persisted truth (rows still present).
    expect(planner.habitRows.value.some((item) => item.id === habitId)).toBe(true)
  })

  it('drops clicks that land while a save is already in flight', async () => {
    const habitId = await createPlannedHabit()
    const planner = await loadedPlanner()
    const row = planner.habitRows.value.find((item) => item.id === habitId)!
    const weekRefs = getChildPeriods(MONTH) as WeekRef[]

    let resolveFirst: () => void = () => {}
    const firstCall = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    // A whole-month row's first cell click goes through the materialize path.
    const spy = vi
      .spyOn(planningMutations, 'materializeMeasurementWeekPlacements')
      .mockImplementation(() => firstCall)

    const first = planner.handleMatrixCellToggle(row, weekRefs[0]!)
    const second = planner.handleMatrixCellToggle(row, weekRefs[1]!)
    resolveFirst()
    await Promise.all([first, second])

    // Only the first mutation ran; the concurrent click was ignored.
    expect(spy).toHaveBeenCalledTimes(1)
    expect(planner.savingKey.value).toBe('')
  })
})
