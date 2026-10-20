import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { getTodayViewBundleForDay } from '@/services/todayViewQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef } from '@/domain/period'
import { getPeriodRefsForDate, parsePeriodRef } from '@/utils/periods'

describe('todayViewQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('maps explicit day, week, month, and hidden context into Today sections', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const otherDayRef = parsePeriodRef('2026-03-13') as DayRef

    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: ['priority-ship'],
      lifeAreaIds: [],
      status: 'open',
    })
    const scheduledKr = await keyResultDexieRepository.create({
      title: 'Ship Today route',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    const weekHabit = await habitDexieRepository.create({
      title: 'Weekly review',
      isActive: true,
      priorityIds: ['priority-review'],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 3 },
      status: 'open',
    })
    const hiddenTracker = await trackerDexieRepository.create({
      title: 'Energy score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'value',
      status: 'open',
    })
    const unassignedWeeklyTracker = await trackerDexieRepository.create({
      title: 'Focus streak',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'rating',
      status: 'open',
    })
    const monthHabit = await habitDexieRepository.create({
      title: 'Monthly audit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 2 },
      status: 'open',
    })
    const specificDayHabit = await habitDexieRepository.create({
      title: 'Friday prep',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: refs.month as MonthRef,
      goalId: goal.id,
      activityState: 'active',
    })

    await Promise.all([
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'keyResult',
        subjectId: scheduledKr.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'habit',
        subjectId: weekHabit.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'tracker',
        subjectId: hiddenTracker.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'tracker',
        subjectId: unassignedWeeklyTracker.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'habit',
        subjectId: monthHabit.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'habit',
        subjectId: specificDayHabit.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
    ])

    await Promise.all([
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef: refs.week,
        subjectType: 'keyResult',
        subjectId: scheduledKr.id,
        activityState: 'active',
        scheduleScope: 'specific-days',
      }),
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef: refs.week,
        subjectType: 'habit',
        subjectId: weekHabit.id,
        activityState: 'active',
        scheduleScope: 'whole-week',
      }),
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef: refs.week,
        subjectType: 'tracker',
        subjectId: unassignedWeeklyTracker.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
      }),
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef: refs.week,
        subjectType: 'habit',
        subjectId: specificDayHabit.id,
        activityState: 'active',
        scheduleScope: 'specific-days',
      }),
    ])

    await Promise.all([
      planningStateDexieRepository.upsertMeasurementDayAssignment({
        dayRef,
        subjectType: 'keyResult',
        subjectId: scheduledKr.id,
      }),
      planningStateDexieRepository.upsertMeasurementDayAssignment({
        dayRef: otherDayRef,
        subjectType: 'habit',
        subjectId: specificDayHabit.id,
      }),
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'tracker',
        subjectId: hiddenTracker.id,
        dayRef,
        value: 7,
      }),
      planningStateDexieRepository.upsertTodayHiddenState({
        dayRef,
        subjectType: 'tracker',
        subjectId: hiddenTracker.id,
      }),
    ])

    const bundle = await getTodayViewBundleForDay(dayRef)

    expect(bundle.sections.scheduled.map(item => item.subject.title)).toEqual(
      expect.arrayContaining(['Ship Today route'])
    )
    expect(bundle.sections.week.map(item => item.subject.title)).toEqual(
      expect.arrayContaining(['Weekly review', 'Focus streak'])
    )
    expect(bundle.sections.month.map(item => item.subject.title)).toEqual(
      expect.arrayContaining(['Monthly audit'])
    )
    expect(bundle.hiddenItems.map(item => item.subject.title)).toEqual(['Energy score'])
    // Priority links ride along: key results borrow the parent goal's, habits carry their own.
    const priorityIdsOf = (title: string) => {
      const match = [...bundle.sections.scheduled, ...bundle.sections.week].find(
        item => item.kind === 'measurement' && item.subject.title === title
      )
      return match?.kind === 'measurement' ? match.priorityIds : undefined
    }
    expect(priorityIdsOf('Ship Today route')).toEqual(['priority-ship'])
    expect(priorityIdsOf('Weekly review')).toEqual(['priority-review'])
    expect(priorityIdsOf('Focus streak')).toEqual([])
    expect(bundle.sections.scheduled.some(item => item.subject.title === 'Friday prep')).toBe(false)
    expect(bundle.sections.week.some(item => item.subject.title === 'Friday prep')).toBe(false)
    expect(bundle.sections.month.some(item => item.subject.title === 'Energy score')).toBe(false)
  })

  it('deduplicates overlapping monthly subjects and hidden state expires the next day', async () => {
    const dayRef = parsePeriodRef('2026-03-01') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const previousMonthRef = parsePeriodRef('2026-02') as MonthRef
    const nextDayRef = parsePeriodRef('2026-03-02') as DayRef

    const habit = await habitDexieRepository.create({
      title: 'Monthly reading',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 2 },
      status: 'open',
    })

    await Promise.all([
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: previousMonthRef,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
      }),
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: refs.month,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
      }),
      planningStateDexieRepository.upsertTodayHiddenState({
        dayRef,
        subjectType: 'habit',
        subjectId: habit.id,
      }),
    ])

    const hiddenBundle = await getTodayViewBundleForDay(dayRef)
    const visibleBundle = await getTodayViewBundleForDay(nextDayRef)

    expect(hiddenBundle.sections.month).toHaveLength(0)
    expect(hiddenBundle.hiddenItems).toHaveLength(1)
    expect(visibleBundle.sections.month).toHaveLength(1)
    expect(visibleBundle.sections.month[0]?.kind).toBe('measurement')
    expect(
      visibleBundle.sections.month[0] && visibleBundle.sections.month[0].kind === 'measurement'
        ? visibleBundle.sections.month[0].sourceMonthRef
        : undefined
    ).toBe(refs.month)
  })
})
