import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
  getWeekRelevantObjects,
} from '@/services/planningStateQueries'
import { getPeriodRefsForDate, parsePeriodRef } from '@/utils/periods'

describe('planningStateQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('does not eagerly create plans or reflections when querying empty periods', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    expect(await getMonthPlanningBundle(monthRef)).toMatchObject({
      monthRef,
      goalItems: [],
      measurementItems: [],
      cadencedItems: [],
      trackerItems: [],
      initiativeItems: [],
      rawEntries: [],
    })
    expect(await getWeekReflectionBundle(weekRef)).toMatchObject({
      weekRef,
      relevant: {
        goalItems: [],
        measurementItems: [],
        cadencedItems: [],
        trackerItems: [],
        initiativeItems: [],
      },
    })
  })

  it('computes month measurement actuals from shared daily entries', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Outreach',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 6,
      },
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
      successNote: 'Consistent month',
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: parsePeriodRef('2026-03-03') as DayRef,
      value: 2,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: parsePeriodRef('2026-03-10') as DayRef,
      value: 5,
    })

    const bundle = await getMonthPlanningBundle(monthRef)

    expect(bundle.measurementItems).toHaveLength(1)
    expect(bundle.measurementItems[0]).toMatchObject({
      subjectType: 'habit',
      planning: {
        activityState: 'active',
        scheduleScope: 'whole-month',
        successNote: 'Consistent month',
      },
      measurement: {
        actualValue: 7,
        entryCount: 2,
        evaluationStatus: 'met',
      },
    })
  })

  it('applies month target overrides to month and week summaries', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship deliberately',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Reach 2 milestones',
      isActive: true,
      goalId: goal.id,
      cadence: 'monthly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 2,
      },
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

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
      targetOverride: {
        kind: 'count',
        operator: 'min',
        value: 4,
      },
    })

    const monthBundle = await getMonthPlanningBundle(monthRef)
    const weekBundle = await getWeekPlanningBundle(weekRef)

    expect(monthBundle.measurementItems[0]?.measurement?.target).toEqual({
      kind: 'count',
      operator: 'min',
      value: 4,
    })
    expect(weekBundle.relevant.measurementItems[0]?.measurement.target).toEqual({
      kind: 'count',
      operator: 'min',
      value: 4,
    })
  })

  it('splits weekly planning into planned, assigned, and unassigned measurement work', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const goal = await goalDexieRepository.create({
      title: 'Launch feature',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Finish implementation',
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
      title: 'Bridge habit',
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
    const initiative = await initiativeDexieRepository.create({
      title: 'Review rollout',
      isActive: true,
      goalId: goal.id,
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
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
      successNote: 'Held up well',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
      successNote: 'Good bridge week',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef,
      value: null,
    })
    await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
      weekRef,
    })
    await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: 'Strong execution week',
    })

    const relevant = await getWeekRelevantObjects(weekRef)
    const planningBundle = await getWeekPlanningBundle(weekRef)
    const reflectionBundle = await getWeekReflectionBundle(weekRef)

    expect(relevant.planning.measurementItems.map((item) => item.placement)).toEqual(
      expect.arrayContaining(['assigned', 'unassigned']),
    )
    expect(relevant.planning.cadencedItems).toHaveLength(2)
    expect(relevant.planning.cadencedItems.find((item) => item.subject.id === habit.id)?.planning.scheduledDayRefs).toEqual([dayRef])
    expect(planningBundle.relevant.initiativeItems).toHaveLength(1)
    expect(reflectionBundle.periodReflection?.note).toBe('Strong execution week')
    expect(reflectionBundle.relevant.goalItems).toHaveLength(1)
    expect(reflectionBundle.relevant.measurementItems.find((item) => item.subject.id === habit.id)?.hasEntries).toBe(true)
  })

  it('ignores orphaned week state records that no longer have valid month context', async () => {
    const db = await resetPlanningTestData()
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const goal = await goalDexieRepository.create({
      title: 'Keep weekly flow lean',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship calendar cleanup',
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
    const monthlyHabit = await habitDexieRepository.create({
      title: 'Monthly review sweep',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })

    await db.measurementWeekStates.bulkAdd([
      {
        id: 'orphan-weekly-state',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        weekRef,
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        activityState: 'active',
        scheduleScope: 'whole-week',
      },
      {
        id: 'orphan-monthly-state',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        weekRef,
        sourceMonthRef: parsePeriodRef('2026-03') as MonthRef,
        subjectType: 'habit',
        subjectId: monthlyHabit.id,
        activityState: 'active',
        scheduleScope: 'whole-week',
      },
    ])

    const relevant = await getWeekRelevantObjects(weekRef)

    expect(relevant.planning.measurementItems).toHaveLength(0)
    expect(relevant.planning.cadencedItems).toHaveLength(0)
  })

  it('shows monthly objects only in explicit weeks once they have week or day placements', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const firstWeekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-18') as DayRef
    const secondWeekRef = getPeriodRefsForDate(dayRef).week as WeekRef
    const thirdWeekRef = parsePeriodRef('2026-W14') as WeekRef
    const habit = await habitDexieRepository.create({
      title: 'Categorize expenses',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: firstWeekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-week',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: secondWeekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })

    const firstWeek = await getWeekRelevantObjects(firstWeekRef)
    const secondWeek = await getWeekRelevantObjects(secondWeekRef)
    const thirdWeek = await getWeekRelevantObjects(thirdWeekRef)

    expect(firstWeek.planning.measurementItems.map(item => item.subject.id)).toContain(habit.id)
    expect(secondWeek.planning.measurementItems.map(item => item.subject.id)).toContain(habit.id)
    expect(thirdWeek.planning.measurementItems.map(item => item.subject.id)).not.toContain(habit.id)
  })
})
