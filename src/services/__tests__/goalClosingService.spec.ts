import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  buildGoalClosingSnapshot,
  closeGoal,
  deferGoalClosing,
  reopenGoal,
} from '@/services/goalClosingService'
import { linkGoalToMonth, linkMeasurementPeriod } from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { addDaysToDayRef, getChildPeriods, getPeriodBounds, parsePeriodRef } from '@/utils/periods'

const JULY = parsePeriodRef('2026-07') as MonthRef
const AUGUST = parsePeriodRef('2026-08') as MonthRef
const SEPTEMBER = parsePeriodRef('2026-09') as MonthRef

async function addEntries(subjectId: string, days: DayRef[], value: number | null = null) {
  for (const dayRef of days) {
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'keyResult',
      subjectId,
      dayRef,
      value,
    })
  }
}

/** Mon/Wed/Fri of a week. */
function threeDays(weekRef: WeekRef): DayRef[] {
  const monday = getPeriodBounds(weekRef).start
  return [0, 2, 4].map((offset) => addDaysToDayRef(monday, offset))
}

async function seedGoal() {
  const goal = await goalDexieRepository.create({
    title: 'Blok treningowy',
    isActive: true,
    status: 'open',
    priorityIds: ['p-1'],
    lifeAreaIds: ['la-1'],
    icon: 'fitness_center',
    startDate: '2026-07-01',
    targetDate: '2026-09-30',
    successDefinition: '3 treningi tygodniowo',
    confidenceRating: 8,
  })
  // Active in July and August only; September stays unplanned.
  await linkGoalToMonth(goal.id, JULY)
  await linkGoalToMonth(goal.id, AUGUST)

  const sessions = await keyResultDexieRepository.create({
    title: '3 treningi w tygodniu',
    goalId: goal.id,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
  })
  const stretching = await keyResultDexieRepository.create({
    title: 'Rozciąganie',
    goalId: goal.id,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 5 },
  })

  // Every July + August week is planned for both; sessions met every week, stretching never logged.
  for (const monthRef of [JULY, AUGUST]) {
    for (const weekRef of getChildPeriods(monthRef) as WeekRef[]) {
      for (const subjectId of [sessions.id, stretching.id]) {
        await linkMeasurementPeriod({ subjectType: 'keyResult', subjectId, cadence: 'weekly', periodRef: weekRef })
      }
      await addEntries(sessions.id, threeDays(weekRef))
    }
  }
  return { goal, sessions, stretching }
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await resetPlanningTestData()
})

describe('buildGoalClosingSnapshot', () => {
  it('judges every key result month by month across the goal window', async () => {
    const { goal, sessions, stretching } = await seedGoal()
    const snapshot = await buildGoalClosingSnapshot(goal.id)

    expect(snapshot.months).toEqual([JULY, AUGUST])
    expect(snapshot.weeksPlanned).toBeGreaterThanOrEqual(9)

    const sessionsSnap = snapshot.keyResultSnapshots.find((item) => item.id === sessions.id)!
    expect(sessionsSnap.months.map((month) => month.state)).toEqual(['met', 'met'])
    expect(sessionsSnap).toMatchObject({ evaluation: 'met', monthsMet: 2, monthsPlanned: 2 })
    expect(sessionsSnap.lastReadout).toMatch(/^\d+\/\d+ tyg\.$/)

    const stretchingSnap = snapshot.keyResultSnapshots.find((item) => item.id === stretching.id)!
    expect(stretchingSnap.months.map((month) => month.state)).toEqual(['no-data', 'no-data'])
    expect(stretchingSnap.evaluation).toBe('no-data')
  })

  it('falls back to the start→target span when the goal was never placed in a month', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Bare goal',
      isActive: true,
      status: 'open',
      priorityIds: [],
      lifeAreaIds: [],
      startDate: '2026-08-10',
      targetDate: '2026-09-15',
    })
    const snapshot = await buildGoalClosingSnapshot(goal.id)
    expect(snapshot.months).toEqual([AUGUST, SEPTEMBER])
    expect(snapshot.keyResultSnapshots).toEqual([])
  })
})

describe('closeGoal', () => {
  it('writes the reflection with the snapshot, closes key results and spins off habits', async () => {
    const { goal, sessions, stretching } = await seedGoal()

    const result = await closeGoal(goal.id, {
      outcome: 'partial',
      successMet: 'partly',
      confidenceInHindsight: 6,
      learned: 'Mniej, ale regularnie.',
      followUp: { kind: 'habit', note: 'Treningi zostają.' },
      habitFromKeyResultIds: [sessions.id],
    })

    expect(result.goal.status).toBe('completed')
    expect(result.goal.closingReflection).toMatchObject({
      outcome: 'partial',
      successMet: 'partly',
      confidenceInHindsight: 6,
      learned: 'Mniej, ale regularnie.',
      window: { startDate: '2026-07-01', targetDate: '2026-09-30' },
    })
    expect(result.goal.closingReflection?.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.goal.closingReflection?.keyResults.map((item) => item.id).sort()).toEqual(
      [sessions.id, stretching.id].sort(),
    )

    expect(result.createdHabits).toHaveLength(1)
    const habit = result.createdHabits[0]
    expect(habit).toMatchObject({
      title: '3 treningi w tygodniu',
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
      priorityIds: ['p-1'],
      lifeAreaIds: ['la-1'],
      icon: 'fitness_center',
      status: 'open',
    })
    expect(habit.description).toContain('Blok treningowy')
    expect(result.goal.closingReflection?.followUp?.createdHabitIds).toEqual([habit.id])
    expect(await habitDexieRepository.getById(habit.id)).toBeTruthy()

    const keyResults = (await keyResultDexieRepository.listAll()).filter((item) => item.goalId === goal.id)
    expect(keyResults.map((item) => item.status)).toEqual(['completed', 'completed'])
  })

  it('maps abandoned to dropped on the goal and its key results', async () => {
    const { goal } = await seedGoal()
    const result = await closeGoal(goal.id, { outcome: 'abandoned' })
    expect(result.goal.status).toBe('dropped')
    const keyResults = (await keyResultDexieRepository.listAll()).filter((item) => item.goalId === goal.id)
    expect(keyResults.every((item) => item.status === 'dropped')).toBe(true)
    expect(result.createdHabits).toEqual([])
  })

  it('does not create habits unless the follow-up is habit', async () => {
    const { goal, sessions } = await seedGoal()
    const result = await closeGoal(goal.id, {
      outcome: 'achieved',
      followUp: { kind: 'none' },
      habitFromKeyResultIds: [sessions.id],
    })
    expect(result.createdHabits).toEqual([])
    expect(await habitDexieRepository.listAll()).toEqual([])
  })

  it('keeps the original closing date and earlier habits when edited again', async () => {
    const { goal, sessions } = await seedGoal()
    const first = await closeGoal(goal.id, {
      outcome: 'partial',
      followUp: { kind: 'habit' },
      habitFromKeyResultIds: [sessions.id],
    })
    const firstHabitId = first.createdHabits[0].id
    const second = await closeGoal(goal.id, { outcome: 'achieved', followUp: { kind: 'none' } })
    expect(second.goal.closingReflection?.closedAt).toBe(first.goal.closingReflection?.closedAt)
    expect(second.goal.closingReflection?.followUp?.createdHabitIds).toEqual([firstHabitId])
    expect(second.goal.status).toBe('completed')
  })
})

describe('deferGoalClosing / reopenGoal', () => {
  it('defers by seven days and clears the deferral when closing', async () => {
    const { goal } = await seedGoal()
    const deferred = await deferGoalClosing(goal.id)
    expect(deferred.closingDeferredUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const closed = await closeGoal(goal.id, { outcome: 'missed' })
    expect(closed.goal.closingDeferredUntil).toBeUndefined()
  })

  it('reopens the goal and its key results and drops the reflection', async () => {
    const { goal } = await seedGoal()
    await closeGoal(goal.id, { outcome: 'missed', learned: 'x' })
    const reopened = await reopenGoal(goal.id)
    expect(reopened.status).toBe('open')
    expect(reopened.closingReflection).toBeUndefined()
    const keyResults = (await keyResultDexieRepository.listAll()).filter((item) => item.goalId === goal.id)
    expect(keyResults.every((item) => item.status === 'open')).toBe(true)
  })
})
