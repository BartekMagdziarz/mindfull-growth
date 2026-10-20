import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import { toggleMeasurementWeekAssignment } from '@/services/planningMutations'
import { parsePeriodRef } from '@/utils/periods'
import { getCalendarYearSummary } from '@/services/calendarViewQueries'

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
    await weeklyIntentionDexieRepository.create({
      weekRef: parsePeriodRef('2026-W10') as WeekRef,
      title: 'Review sidebar copy',
      isActive: true,
      priorityIds: [],
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
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
    const summary = await getCalendarYearSummary(yearRef)
    const march = summary.months.find(item => item.monthRef === monthRef)

    expect(march).toMatchObject({
      hasPlan: true,
      hasReflection: true,
      activeGoalCount: 1,
      activeCadencedCount: 1,
      activeTrackerCount: 1,
      activeIntentionCount: 1,
    })
    expect(march!.goalGroups).toHaveLength(1)
    expect(march!.goalGroups[0].goalId).toBe(goal.id)
    expect(march!.goalGroups[0].pills).toHaveLength(1)
    expect(march!.goalGroups[0].pills[0]).toMatchObject({
      id: keyResult.id,
      cadence: 'monthly',
      monthlyStatus: 'no-data',
    })
    expect(summary.totals).toEqual({
      activeGoalCount: 1,
      activeCadencedCount: 1,
      activeTrackerCount: 1,
      activeIntentionCount: 1,
    })
  })

  it('computes weekly KR pill data with met/missed weeks', async () => {
    const yearRef = parsePeriodRef('2026') as YearRef
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    const goal = await goalDexieRepository.create({
      title: 'Weekly goal',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Weekly KR',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
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

    // Add entry in week 10 (met) but not week 11 (missed)
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      dayRef: parsePeriodRef('2026-03-02') as DayRef,
      value: null,
    })

    const summary = await getCalendarYearSummary(yearRef)
    const march = summary.months.find(item => item.monthRef === monthRef)

    expect(march!.goalGroups).toHaveLength(1)
    const krPill = march!.goalGroups[0].pills[0]
    expect(krPill.cadence).toBe('weekly')
    expect(krPill.weeksTotal).toBeGreaterThanOrEqual(4)
    expect(krPill.weeksMet).toBeGreaterThanOrEqual(1)
  })

  it('counts weekly pills only over assigned weeks, judging a boundary week on all its days', async () => {
    const yearRef = parsePeriodRef('2026') as YearRef
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const goal = await goalDexieRepository.create({
      title: 'Weekly goal',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Twice a week',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
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
    // Assigned: W10 and the boundary W13 (Mon 30 Mar … Sun 5 Apr).
    for (const weekRef of ['2026-W10', '2026-W13']) {
      await toggleMeasurementWeekAssignment({
        weekRef: parsePeriodRef(weekRef) as WeekRef,
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        cadence: 'weekly',
      })
    }
    // W10 met; W11 met but not assigned; W13 met only thanks to its April day.
    for (const dayRef of [
      '2026-03-09',
      '2026-03-10',
      '2026-03-16',
      '2026-03-17',
      '2026-03-31',
      '2026-04-01',
    ]) {
      await planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        dayRef: parsePeriodRef(dayRef) as DayRef,
        value: null,
      })
    }

    const summary = await getCalendarYearSummary(yearRef)
    const pill = summary.months.find(item => item.monthRef === monthRef)!.goalGroups[0].pills[0]
    expect(pill).toMatchObject({ cadence: 'weekly', weeksMet: 2, weeksTotal: 2 })
  })
})
