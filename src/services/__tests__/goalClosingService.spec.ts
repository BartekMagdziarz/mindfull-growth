import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import {
  addDaysToDayRef,
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
  parsePeriodRef,
} from '@/utils/periods'

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
  return [0, 2, 4].map(offset => addDaysToDayRef(monday, offset))
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
        await linkMeasurementPeriod({
          subjectType: 'keyResult',
          subjectId,
          cadence: 'weekly',
          periodRef: weekRef,
        })
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

/** Distinct weeks overlapping the given months, oldest first. */
function distinctWeeks(months: MonthRef[]): WeekRef[] {
  return [...new Set(months.flatMap(monthRef => getChildPeriods(monthRef) as WeekRef[]))].sort()
}

describe('buildGoalClosingSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('judges weekly key results week by week, each week once', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0, 0))
    const { goal, sessions, stretching } = await seedGoal()
    const snapshot = await buildGoalClosingSnapshot(goal.id)

    expect(snapshot.months).toEqual([JULY, AUGUST])
    // The weeks straddling June/July, July/August and August/September appear once.
    const weeks = distinctWeeks([JULY, AUGUST])
    expect(snapshot.weeks).toEqual(weeks)
    expect(snapshot.weeksPlanned).toBe(weeks.length)

    const sessionsSnap = snapshot.keyResultSnapshots.find(item => item.id === sessions.id)!
    expect(sessionsSnap.months).toEqual([])
    expect(sessionsSnap.weeks?.map(week => week.weekRef)).toEqual(weeks)
    expect(sessionsSnap.weeks?.every(week => week.state === 'met')).toBe(true)
    expect(sessionsSnap).toMatchObject({
      evaluation: 'met',
      weeksMet: weeks.length,
      weeksPlanned: weeks.length,
    })
    expect(sessionsSnap.lastReadout).toBe(`${weeks.length}/${weeks.length} tyg.`)

    const stretchingSnap = snapshot.keyResultSnapshots.find(item => item.id === stretching.id)!
    expect(stretchingSnap.weeks?.every(week => week.state === 'no-data')).toBe(true)
    expect(stretchingSnap.evaluation).toBe('no-data')
  })

  it('shows each key result only in the weeks it was assigned to', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0, 0))
    const goal = await goalDexieRepository.create({
      title: 'Czytanie',
      isActive: true,
      status: 'open',
      priorityIds: [],
      lifeAreaIds: [],
      startDate: '2026-07-01',
      targetDate: '2026-07-31',
    })
    await linkGoalToMonth(goal.id, JULY)
    const create = (title: string) =>
      keyResultDexieRepository.create({
        title,
        goalId: goal.id,
        isActive: true,
        status: 'open',
        cadence: 'weekly',
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 1 },
      })
    const picked = await create('Dwa tygodnie')
    const monthOnly = await create('Tylko aktywny w miesiącu')
    const julyWeeks = getChildPeriods(JULY) as WeekRef[]
    for (const weekRef of [julyWeeks[1], julyWeeks[3]]) {
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: picked.id,
        cadence: 'weekly',
        periodRef: weekRef,
      })
    }
    await addEntries(picked.id, [
      getPeriodBounds(julyWeeks[1]).start,
      getPeriodBounds(julyWeeks[2]).start,
    ])
    // Active in July but never placed in a week: listed under „Pozostałe”, not assigned.
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: JULY,
      subjectType: 'keyResult',
      subjectId: monthOnly.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await addEntries(monthOnly.id, [getPeriodBounds(julyWeeks[1]).start])

    const snapshot = await buildGoalClosingSnapshot(goal.id)
    const pickedSnap = snapshot.keyResultSnapshots.find(item => item.id === picked.id)!
    expect(pickedSnap.weeks?.filter(week => week.state !== 'unplanned')).toEqual([
      { weekRef: julyWeeks[1], state: 'met' },
      { weekRef: julyWeeks[3], state: 'no-data' },
    ])
    // the entry in the unassigned week 3 does not count
    expect(pickedSnap).toMatchObject({ weeksMet: 1, weeksPlanned: 2, lastReadout: '1/2 tyg.' })

    const monthOnlySnap = snapshot.keyResultSnapshots.find(item => item.id === monthOnly.id)!
    expect(monthOnlySnap.weeks?.every(week => week.state === 'unplanned')).toBe(true)
    expect(monthOnlySnap.evaluation).toBe('no-data')
    expect(snapshot.weeksPlanned).toBe(2)
  })

  it('leaves out weeks that have not started and keeps the current unmet week out of the count', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // Wednesday 12 Aug 2026: the week of 10 Aug has Mon + Wed logged, Fri still ahead.
    vi.setSystemTime(new Date(2026, 7, 12, 12, 0, 0))
    const { goal, sessions } = await seedGoal()
    const snapshot = await buildGoalClosingSnapshot(goal.id)

    const currentWeek = getPeriodRefsForDate('2026-08-12').week
    expect(snapshot.weeks.at(-1)).toBe(currentWeek)
    expect(snapshot.weeks.every(weekRef => getPeriodBounds(weekRef).start <= '2026-08-12')).toBe(
      true
    )

    const sessionsSnap = snapshot.keyResultSnapshots.find(item => item.id === sessions.id)!
    expect(sessionsSnap.weeks?.at(-1)).toEqual({ weekRef: currentWeek, state: 'ongoing' })
    const finished = snapshot.weeks.length - 1
    expect(sessionsSnap).toMatchObject({
      evaluation: 'met',
      weeksMet: finished,
      weeksPlanned: finished,
    })
  })

  it('judges monthly key results by their month summary, months that have started only', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0))
    const { goal } = await seedGoal()
    const pages = await keyResultDexieRepository.create({
      title: 'Strony',
      goalId: goal.id,
      isActive: true,
      status: 'open',
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 100 },
    })
    await linkGoalToMonth(goal.id, SEPTEMBER)
    for (const monthRef of [JULY, AUGUST, SEPTEMBER]) {
      await linkMeasurementPeriod({
        subjectType: 'keyResult',
        subjectId: pages.id,
        cadence: 'monthly',
        periodRef: monthRef,
      })
    }
    await addEntries(pages.id, ['2026-07-10' as DayRef], 120)
    await addEntries(pages.id, ['2026-08-10' as DayRef], 40)

    const snapshot = await buildGoalClosingSnapshot(goal.id)
    expect(snapshot.months).toEqual([JULY, AUGUST])
    const pagesSnap = snapshot.keyResultSnapshots.find(item => item.id === pages.id)!
    expect(pagesSnap.weeks).toBeUndefined()
    expect(pagesSnap.months).toEqual([
      { monthRef: JULY, state: 'met' },
      { monthRef: AUGUST, state: 'ongoing' },
    ])
    expect(pagesSnap).toMatchObject({ monthsMet: 1, monthsPlanned: 1, lastReadout: '1/1 mies.' })
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
    expect(result.goal.closingReflection?.keyResults.map(item => item.id).sort()).toEqual(
      [sessions.id, stretching.id].sort()
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

    const keyResults = (await keyResultDexieRepository.listAll()).filter(
      item => item.goalId === goal.id
    )
    expect(keyResults.map(item => item.status)).toEqual(['completed', 'completed'])
  })

  it('maps abandoned to dropped on the goal and its key results', async () => {
    const { goal } = await seedGoal()
    const result = await closeGoal(goal.id, { outcome: 'abandoned' })
    expect(result.goal.status).toBe('dropped')
    const keyResults = (await keyResultDexieRepository.listAll()).filter(
      item => item.goalId === goal.id
    )
    expect(keyResults.every(item => item.status === 'dropped')).toBe(true)
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
    const keyResults = (await keyResultDexieRepository.listAll()).filter(
      item => item.goalId === goal.id
    )
    expect(keyResults.every(item => item.status === 'open')).toBe(true)
  })
})
