import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import { getMonthPlanningBundle, getWeekRelevantObjects } from '@/services/planningStateQueries'
import { getCalendarYearSummary } from '@/services/calendarViewQueries'
import { getTodayViewBundleForDay } from '@/services/todayViewQueries'
import { getPeriodRefsForDate, parsePeriodRef } from '@/utils/periods'

/**
 * Closing a goal/measurement (status -> completed/dropped/retired) must NOT erase it
 * from the periods where it was active: it still appears in the calendar, the
 * plan-vs-execution summaries, and the year overview. It must still disappear from the
 * Today view (a forward/actionable surface). Manually archiving (isActive: false)
 * remains a hard hide everywhere.
 */
describe('closed objects stay in historical views, out of forward-looking ones', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  async function seedGoalWithMonthlyKr(monthRef: MonthRef) {
    const goal = await goalDexieRepository.create({
      title: 'Marathon training block',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Run 12 sessions',
      isActive: true,
      goalId: goal.id,
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 12 },
      status: 'open',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    return { goal, keyResult }
  }

  describe('month planning bundle (calendar tile + plan-vs-execution)', () => {
    it('keeps a completed goal and its key result in the month it was active', async () => {
      const monthRef = parsePeriodRef('2026-03') as MonthRef
      const { goal, keyResult } = await seedGoalWithMonthlyKr(monthRef)

      await goalDexieRepository.update(goal.id, { status: 'completed' })

      const bundle = await getMonthPlanningBundle(monthRef)

      expect(bundle.goalItems.map((item) => item.goal.id)).toContain(goal.id)
      expect(bundle.measurementItems.map((item) => item.subject.id)).toContain(keyResult.id)
    })

    it('hides an archived goal even from a month it was active', async () => {
      const monthRef = parsePeriodRef('2026-03') as MonthRef
      const goal = await goalDexieRepository.create({
        title: 'Abandoned idea',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      await planningStateDexieRepository.upsertGoalMonthState({
        monthRef,
        goalId: goal.id,
        activityState: 'active',
      })

      await goalDexieRepository.update(goal.id, { isActive: false })

      const bundle = await getMonthPlanningBundle(monthRef)

      expect(bundle.goalItems.map((item) => item.goal.id)).not.toContain(goal.id)
    })
  })

  describe('week relevant objects (week calendar + week review)', () => {
    it("keeps a dropped goal's key result and goal grouping in its active week", async () => {
      const monthRef = parsePeriodRef('2026-03') as MonthRef
      const weekRef = parsePeriodRef('2026-W10') as WeekRef
      const goal = await goalDexieRepository.create({
        title: 'Strength phase',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      const keyResult = await keyResultDexieRepository.create({
        title: 'Lift twice a week',
        isActive: true,
        goalId: goal.id,
        cadence: 'weekly',
        entryMode: 'counter',
        target: { kind: 'count', operator: 'min', value: 2 },
        status: 'open',
      })
      await planningStateDexieRepository.upsertGoalMonthState({
        monthRef,
        goalId: goal.id,
        activityState: 'active',
      })
      await planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef,
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      })
      await planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef,
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        activityState: 'active',
        scheduleScope: 'whole-week',
      })

      await goalDexieRepository.update(goal.id, { status: 'dropped' })

      const relevant = await getWeekRelevantObjects(weekRef)

      expect(relevant.planning.measurementItems.map((item) => item.subject.id)).toContain(
        keyResult.id,
      )
      expect(relevant.reflection.goalItems.map((item) => item.goal.id)).toContain(goal.id)
    })
  })

  describe('calendar year summary', () => {
    it('counts a completed goal in the months it was active', async () => {
      const yearRef = parsePeriodRef('2026') as YearRef
      const monthRef = parsePeriodRef('2026-03') as MonthRef
      const { goal } = await seedGoalWithMonthlyKr(monthRef)

      await goalDexieRepository.update(goal.id, { status: 'completed' })

      const summary = await getCalendarYearSummary(yearRef)
      const march = summary.months.find((item) => item.monthRef === monthRef)

      expect(march?.activeGoalCount).toBe(1)
      expect(march?.goalGroups.map((group) => group.goalId)).toContain(goal.id)
    })

    it('excludes an archived goal from the year summary', async () => {
      const yearRef = parsePeriodRef('2026') as YearRef
      const monthRef = parsePeriodRef('2026-03') as MonthRef
      const goal = await goalDexieRepository.create({
        title: 'Archived plan',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      await planningStateDexieRepository.upsertGoalMonthState({
        monthRef,
        goalId: goal.id,
        activityState: 'active',
      })

      await goalDexieRepository.update(goal.id, { isActive: false })

      const summary = await getCalendarYearSummary(yearRef)
      const march = summary.months.find((item) => item.monthRef === monthRef)

      expect(march?.activeGoalCount).toBe(0)
      expect(march?.goalGroups.map((group) => group.goalId)).not.toContain(goal.id)
    })
  })

  describe('today view forward gate', () => {
    it('drops a habit from Today once it is retired, even with an active month link', async () => {
      const dayRef = parsePeriodRef('2026-03-12') as DayRef
      const refs = getPeriodRefsForDate(dayRef)
      const habit = await habitDexieRepository.create({
        title: 'Mobility drill',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'monthly',
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 10 },
        status: 'open',
      })
      await planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month as MonthRef,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
      })

      const before = await getTodayViewBundleForDay(dayRef)
      const presentBefore = [
        ...before.sections.scheduled,
        ...before.sections.week,
        ...before.sections.month,
      ].some((item) => item.kind !== 'initiative' && item.subject.id === habit.id)
      expect(presentBefore).toBe(true)

      await habitDexieRepository.update(habit.id, { status: 'retired' })

      const after = await getTodayViewBundleForDay(dayRef)
      const presentAfter = [
        ...after.sections.scheduled,
        ...after.sections.week,
        ...after.sections.month,
        ...after.hiddenItems,
      ].some((item) => item.kind !== 'initiative' && item.subject.id === habit.id)
      expect(presentAfter).toBe(false)
    })
  })
})
