import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { linkGoalToMonth } from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

const SEPTEMBER = parsePeriodRef('2026-09') as MonthRef
const OCTOBER = parsePeriodRef('2026-10') as MonthRef
// 2026-W39 spans 2026-09-28 – 2026-10-04.
const BOUNDARY_WEEK = parsePeriodRef('2026-W39') as WeekRef
const SEP_29 = '2026-09-29' as DayRef
const SEP_30 = '2026-09-30' as DayRef
const OCT_02 = '2026-10-02' as DayRef

async function createGoalWithKeyResult() {
  const goal = await goalDexieRepository.create({
    title: 'Ship the September release',
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    targetDate: SEP_30,
  })
  await linkGoalToMonth(goal.id, SEPTEMBER)
  const keyResult = await keyResultDexieRepository.create({
    title: 'Fix release blockers',
    goalId: goal.id,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
  })
  return { goalId: goal.id, keyResultId: keyResult.id }
}

async function setupPlanner(weekRef: WeekRef) {
  const planner = useWeeklyPlannerState(ref(weekRef), ref('pl'), () => {})
  await planner.loadPlannerData()
  return planner
}

describe('useWeeklyPlannerState goal deadline handling', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('assigns a day inside the goal window on a boundary week without any proposal', async () => {
    const { keyResultId } = await createGoalWithKeyResult()
    const planner = await setupPlanner(BOUNDARY_WEEK)
    const row = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    expect(planner.isDayBeyondGoalEnd(row, SEP_29)).toBe(false)
    expect(planner.isDayBeyondGoalEnd(row, OCT_02)).toBe(true)

    await planner.handleMatrixCellToggle(row, SEP_29)

    expect(planner.deadlineProposal.value).toBeNull()
    expect(planner.mutationError.value).toBeNull()
    const updated = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    expect(updated.scheduledDayRefs).toEqual([SEP_29])
  })

  it('proposes a deadline move instead of writing when the day is past the goal target date', async () => {
    const { goalId, keyResultId } = await createGoalWithKeyResult()
    const planner = await setupPlanner(BOUNDARY_WEEK)
    const row = planner.keyResultRows.value.find(item => item.id === keyResultId)!

    await planner.handleMatrixCellToggle(row, OCT_02)

    expect(planner.deadlineProposal.value).toMatchObject({
      rowKey: `keyResult:${keyResultId}`,
      dayRef: OCT_02,
      goalId,
      goalTitle: 'Ship the September release',
      currentTargetDate: SEP_30,
    })
    expect(
      await planningStateDexieRepository.getMeasurementDayAssignment(OCT_02, 'keyResult', keyResultId)
    ).toBeUndefined()

    planner.dismissDeadlineProposal()
    expect(planner.deadlineProposal.value).toBeNull()
    expect((await goalDexieRepository.getById(goalId))?.targetDate).toBe(SEP_30)
  })

  it('confirming the proposal moves the deadline, activates the month and places the day', async () => {
    const { goalId, keyResultId } = await createGoalWithKeyResult()
    const planner = await setupPlanner(BOUNDARY_WEEK)
    const row = planner.keyResultRows.value.find(item => item.id === keyResultId)!

    await planner.handleMatrixCellToggle(row, OCT_02)
    await planner.confirmDeadlineProposal()

    expect(planner.deadlineProposal.value).toBeNull()
    expect(planner.mutationError.value).toBeNull()
    expect((await goalDexieRepository.getById(goalId))?.targetDate).toBe(OCT_02)
    expect(
      (await planningStateDexieRepository.getGoalMonthState(OCTOBER, goalId))?.activityState
    ).toBe('active')
    const updated = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    expect(updated.scheduledDayRefs).toEqual([OCT_02])
    expect(planner.isDayBeyondGoalEnd(updated, OCT_02)).toBe(false)
    expect(planner.goalSections.value.find(goal => goal.id === goalId)?.targetDate).toBe(OCT_02)
  })

  it('materializing a whole-week KR into days clips the days to the goal window', async () => {
    const { keyResultId } = await createGoalWithKeyResult()
    const planner = await setupPlanner(BOUNDARY_WEEK)
    const row = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    await planner.handleWholeWeekToggle(row)
    const wholeWeek = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    expect(planner.rowSoftKind(wholeWeek)).toBe('whole-week')

    // Deselecting Monday from a soft whole-week row keeps only the other in-window days.
    await planner.handleMatrixCellToggle(wholeWeek, '2026-09-28' as DayRef)

    const updated = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    expect([...updated.scheduledDayRefs].sort()).toEqual([SEP_29, SEP_30])
  })

  it('surfaces a failed mutation in mutationError instead of rejecting', async () => {
    const { goalId, keyResultId } = await createGoalWithKeyResult()
    const planner = await setupPlanner(BOUNDARY_WEEK)
    const row = planner.keyResultRows.value.find(item => item.id === keyResultId)!
    // Drop the only month the goal is active in — the repository guard now rejects the KR.
    await planningStateDexieRepository.deleteGoalMonthState(SEPTEMBER, goalId)

    await expect(planner.handleMatrixCellToggle(row, SEP_29)).resolves.toBeUndefined()

    expect(planner.mutationError.value).toMatch(/Goal must be active/)
    expect(planner.savingKey.value).toBe('')
  })
})
