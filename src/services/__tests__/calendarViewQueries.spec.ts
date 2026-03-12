import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'
import { getCalendarYearSummary, getDayCalendarBundle } from '@/services/calendarViewQueries'

describe('calendarViewQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('summarizes month-level status across a year', async () => {
    const yearRef = parsePeriodRef('2026') as YearRef
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const secondMonthRef = parsePeriodRef('2026-04') as MonthRef

    const goal = await goalDexieRepository.create({
      title: 'Ship calendar workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Finish UI shell',
      isActive: true,
      goalId: goal.id,
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 2,
      },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Usability confidence',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'rating',
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Review sidebar copy',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await periodPlanDexieRepository.createMonthPlan({ monthRef })
    await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'month',
      periodRef: monthRef,
      note: 'Useful month',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: secondMonthRef,
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
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: secondMonthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: secondMonthRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
    })

    const summary = await getCalendarYearSummary(yearRef)
    const march = summary.months.find((item) => item.monthRef === monthRef)

    expect(march).toMatchObject({
      hasPlan: true,
      hasReflection: true,
      activeGoalCount: 1,
      activeCadencedCount: 1,
      activeTrackerCount: 1,
      activeInitiativeCount: 1,
    })
    expect(summary.totals).toEqual({
      activeGoalCount: 1,
      activeCadencedCount: 1,
      activeTrackerCount: 1,
      activeInitiativeCount: 1,
    })
  })

  it('builds day bundles with scheduled work, entries, and context', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const goal = await goalDexieRepository.create({
      title: 'Launch calendar',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Polish week layout',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Review open monthly work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 4,
      },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Confidence score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'rating',
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Send walkthrough to reviewer',
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
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-week',
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'tracker',
      subjectId: tracker.id,
      dayRef,
      value: 8,
    })
    await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
      weekRef,
      dayRef,
    })

    const bundle = await getDayCalendarBundle(dayRef)

    expect(bundle.refs.week).toBe(weekRef)
    expect(bundle.refs.month).toBe(monthRef)
    expect(bundle.scheduledMeasurementItems.map((item) => item.subject.id)).toEqual(
      expect.arrayContaining([keyResult.id, habit.id, tracker.id]),
    )
    expect(bundle.scheduledInitiativeItems).toHaveLength(1)
    expect(bundle.entriesToday).toHaveLength(1)
    expect(bundle.entriesToday[0]?.subjectType).toBe('tracker')
    expect(bundle.contextMeasurementItems).toHaveLength(0)
    expect(bundle.monthPlanning.goalItems).toHaveLength(1)
  })
})
