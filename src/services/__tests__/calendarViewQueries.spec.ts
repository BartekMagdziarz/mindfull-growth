import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'
import { getCalendarYearSummary, getDayCalendarBundle } from '@/services/calendarViewQueries'

describe('calendarViewQueries', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.periodObjectReflections.clear()
    await db.periodReflections.clear()
    await db.trackerEntries.clear()
    await db.trackerWeekStates.clear()
    await db.trackerMonthStates.clear()
    await db.initiativePlanStates.clear()
    await db.cadencedDayAssignments.clear()
    await db.cadencedWeekStates.clear()
    await db.cadencedMonthStates.clear()
    await db.goalMonthStates.clear()
    await db.weekPlans.clear()
    await db.monthPlans.clear()
    await db.keyResults.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.initiatives.clear()
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
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Usability confidence',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      analysisPeriod: 'month',
      entryMode: 'week',
      kind: 'generic',
      config: {},
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
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 3,
    })
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef: secondMonthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 2,
    })
    await planningStateDexieRepository.upsertTrackerMonthState({
      monthRef,
      trackerId: tracker.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertTrackerMonthState({
      monthRef: secondMonthRef,
      trackerId: tracker.id,
      activityState: 'active',
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

  it('builds day bundles with scheduled work and inherited context', async () => {
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
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Review open monthly work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Confidence score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      analysisPeriod: 'week',
      entryMode: 'day',
      kind: 'generic',
      config: {},
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
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      planningMode: 'specific-days',
    })
    await planningStateDexieRepository.upsertCadencedDayAssignment({
      dayRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
    })
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 4,
    })
    await planningStateDexieRepository.upsertTrackerMonthState({
      monthRef,
      trackerId: tracker.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertTrackerWeekState({
      weekRef,
      trackerId: tracker.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertTrackerEntry({
      trackerId: tracker.id,
      periodType: 'day',
      periodRef: dayRef,
      value: 8,
      note: 'Stable focus',
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
    expect(bundle.scheduledCadencedItems).toHaveLength(1)
    expect(bundle.scheduledInitiativeItems).toHaveLength(1)
    expect(bundle.trackerEntriesToday).toHaveLength(1)
    expect(bundle.contextCadencedItems).toHaveLength(1)
    expect(bundle.monthPlanning.goalItems).toHaveLength(1)
  })
})
