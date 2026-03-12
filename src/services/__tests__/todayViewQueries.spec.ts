import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
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
      title: 'Launch planning hub',
      isActive: true,
      priorityIds: [],
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
      priorityIds: [],
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
    const initiativeToday = await initiativeDexieRepository.create({
      title: 'Call designer',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      goalId: goal.id,
      status: 'open',
    })
    const initiativeWeek = await initiativeDexieRepository.create({
      title: 'Review copy',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const initiativeMonth = await initiativeDexieRepository.create({
      title: 'Collect references',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
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
      planningStateDexieRepository.upsertInitiativePlanState({
        initiativeId: initiativeToday.id,
        monthRef: refs.month,
        weekRef: refs.week,
        dayRef,
      }),
      planningStateDexieRepository.upsertInitiativePlanState({
        initiativeId: initiativeWeek.id,
        monthRef: refs.month,
        weekRef: refs.week,
      }),
      planningStateDexieRepository.upsertInitiativePlanState({
        initiativeId: initiativeMonth.id,
        monthRef: refs.month,
      }),
    ])

    const bundle = await getTodayViewBundleForDay(dayRef)

    expect(
      bundle.sections.scheduled.map(item =>
        item.kind === 'initiative' ? item.initiative.title : item.subject.title
      )
    ).toEqual(expect.arrayContaining(['Ship Today route', 'Call designer']))
    expect(
      bundle.sections.week.map(item =>
        item.kind === 'initiative' ? item.initiative.title : item.subject.title
      )
    ).toEqual(expect.arrayContaining(['Weekly review', 'Focus streak', 'Review copy']))
    expect(
      bundle.sections.month.map(item =>
        item.kind === 'initiative' ? item.initiative.title : item.subject.title
      )
    ).toEqual(expect.arrayContaining(['Monthly audit', 'Collect references']))
    expect(
      bundle.hiddenItems.map(item =>
        item.kind === 'initiative' ? item.initiative.title : item.subject.title
      )
    ).toEqual(['Energy score'])
    expect(
      bundle.sections.scheduled.some(
        item =>
          (item.kind === 'initiative' ? item.initiative.title : item.subject.title) ===
          'Friday prep'
      )
    ).toBe(false)
    expect(
      bundle.sections.week.some(
        item =>
          (item.kind === 'initiative' ? item.initiative.title : item.subject.title) ===
          'Friday prep'
      )
    ).toBe(false)
    expect(
      bundle.sections.month.some(
        item =>
          (item.kind === 'initiative' ? item.initiative.title : item.subject.title) ===
          'Energy score'
      )
    ).toBe(false)
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
