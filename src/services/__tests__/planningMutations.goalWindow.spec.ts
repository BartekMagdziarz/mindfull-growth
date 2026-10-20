import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  linkGoalToMonth,
  materializeMeasurementDayAssignments,
  moveGoalTargetDate,
  toggleMeasurementDayAssignment,
  toggleMeasurementWeekAssignment,
} from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const SEPTEMBER = parsePeriodRef('2026-09') as MonthRef
const OCTOBER = parsePeriodRef('2026-10') as MonthRef
// 2026-W39 spans 2026-09-28 – 2026-10-04: the last week of September ends in October.
const BOUNDARY_WEEK = parsePeriodRef('2026-W39') as WeekRef
const SEP_29 = '2026-09-29' as DayRef
const OCT_02 = '2026-10-02' as DayRef

async function createGoalWithKeyResult(cadence: 'weekly' | 'monthly' = 'weekly') {
  const goal = await goalDexieRepository.create({
    title: 'Ship the September release',
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    targetDate: '2026-09-30',
  })
  await linkGoalToMonth(goal.id, SEPTEMBER)
  const keyResult = await keyResultDexieRepository.create({
    title: 'Fix release blockers',
    goalId: goal.id,
    isActive: true,
    status: 'open',
    cadence,
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
  })
  return { goalId: goal.id, keyResultId: keyResult.id }
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await resetPlanningTestData()
})

describe('weekly KR placement on a month-boundary week', () => {
  it('assigns a day inside the goal window even though the week reaches a month the goal is not active in', async () => {
    const { keyResultId } = await createGoalWithKeyResult()

    await expect(
      toggleMeasurementDayAssignment({
        dayRef: SEP_29,
        cadence: 'weekly',
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    ).resolves.toBeUndefined()

    const assignment = await planningStateDexieRepository.getMeasurementDayAssignment(
      SEP_29,
      'keyResult',
      keyResultId
    )
    expect(assignment).toBeDefined()

    // Only the goal's active month gets a KR month state; October stays untouched.
    const september = await planningStateDexieRepository.getMeasurementMonthState(
      SEPTEMBER,
      'keyResult',
      keyResultId
    )
    const october = await planningStateDexieRepository.getMeasurementMonthState(
      OCTOBER,
      'keyResult',
      keyResultId
    )
    expect(september?.activityState).toBe('active')
    expect(october).toBeUndefined()
  })

  it('places the whole week and materializes specific days without touching the inactive month', async () => {
    const { keyResultId } = await createGoalWithKeyResult()

    await toggleMeasurementWeekAssignment({
      weekRef: BOUNDARY_WEEK,
      cadence: 'weekly',
      subjectType: 'keyResult',
      subjectId: keyResultId,
    })
    const weekState = await planningStateDexieRepository.getMeasurementWeekState(
      BOUNDARY_WEEK,
      'keyResult',
      keyResultId
    )
    expect(weekState?.scheduleScope).toBe('whole-week')

    await materializeMeasurementDayAssignments({
      weekRef: BOUNDARY_WEEK,
      cadence: 'weekly',
      subjectType: 'keyResult',
      subjectId: keyResultId,
      dayRefs: ['2026-09-28' as DayRef, SEP_29],
    })
    const assignments = (await planningStateDexieRepository.listMeasurementDayAssignments()).filter(
      item => item.subjectId === keyResultId
    )
    expect(assignments.map(item => item.dayRef).sort()).toEqual(['2026-09-28', SEP_29])
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(OCTOBER, 'keyResult', keyResultId)
    ).toBeUndefined()
  })

  it('still refuses a KR whose goal is active in none of the overlapping months', async () => {
    const { goalId, keyResultId } = await createGoalWithKeyResult()
    await planningStateDexieRepository.deleteGoalMonthState(SEPTEMBER, goalId)

    await expect(
      toggleMeasurementDayAssignment({
        dayRef: SEP_29,
        cadence: 'weekly',
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    ).rejects.toThrow(/Goal must be active/)
  })
})

describe('moveGoalTargetDate', () => {
  it('moves the deadline and activates the goal in the months it now reaches', async () => {
    const { goalId, keyResultId } = await createGoalWithKeyResult()

    await moveGoalTargetDate(goalId, OCT_02)

    expect((await goalDexieRepository.getById(goalId))?.targetDate).toBe(OCT_02)
    expect(
      (await planningStateDexieRepository.getGoalMonthState(OCTOBER, goalId))?.activityState
    ).toBe('active')
    expect(
      (await planningStateDexieRepository.getGoalMonthState(SEPTEMBER, goalId))?.activityState
    ).toBe('active')

    // With the goal active in October the KR can be placed there and gets an October month state.
    await toggleMeasurementDayAssignment({
      dayRef: OCT_02,
      cadence: 'weekly',
      subjectType: 'keyResult',
      subjectId: keyResultId,
    })
    expect(
      (
        await planningStateDexieRepository.getMeasurementMonthState(
          OCTOBER,
          'keyResult',
          keyResultId
        )
      )?.activityState
    ).toBe('active')
  })

  it('does not unlink months when the deadline moves earlier', async () => {
    const { goalId } = await createGoalWithKeyResult()
    await linkGoalToMonth(goalId, OCTOBER)

    await moveGoalTargetDate(goalId, SEP_29)

    expect((await goalDexieRepository.getById(goalId))?.targetDate).toBe(SEP_29)
    expect(
      (await planningStateDexieRepository.getGoalMonthState(OCTOBER, goalId))?.activityState
    ).toBe('active')
  })
})
