import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { getPeriodRefsForDate, parsePeriodRef } from '@/utils/periods'

describe('planningState Dexie repository', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('upserts goal month states by [monthRef+goalId]', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship calendar',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const created = await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: parsePeriodRef('2026-03') as MonthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    const updated = await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: parsePeriodRef('2026-03') as MonthRef,
      goalId: goal.id,
      activityState: 'paused',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.activityState).toBe('paused')
    expect(await planningStateDexieRepository.listGoalMonthStates()).toHaveLength(1)
  })

  it('requires monthly cadence week states to be gated by an active month state', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Monthly outreach',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 12,
      },
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    await expect(
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef,
        sourceMonthRef: monthRef,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        scheduleScope: 'whole-week',
      })
    ).rejects.toThrow('Failed to persist measurement week state in database')

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
      successNote: 'Strong month',
    })

    const weekState = await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-week',
      successNote: 'Strong week',
    })

    expect(weekState.sourceMonthRef).toBe(monthRef)
    expect(weekState.successNote).toBe('Strong week')
  })

  it('rejects tracker success notes and requires specific-days placement for assignments', async () => {
    const tracker = await trackerDexieRepository.create({
      title: 'Energy',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'rating',
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Weekly review',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    await expect(
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef,
        subjectType: 'tracker',
        subjectId: tracker.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
        successNote: 'Not allowed',
      })
    ).rejects.toThrow('Failed to persist measurement month state in database')

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })

    await expect(
      planningStateDexieRepository.upsertMeasurementDayAssignment({
        dayRef,
        subjectType: 'habit',
        subjectId: habit.id,
      })
    ).rejects.toThrow('Failed to persist measurement day assignment in database')

    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })

    const assignment = await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })

    expect(assignment.dayRef).toBe(dayRef)
  })

  it('stores target overrides for month states and rejects them for trackers', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Improve consistency',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship 3 milestones',
      isActive: true,
      goalId: goal.id,
      cadence: 'monthly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Energy score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'value',
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })

    const state = await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
      targetOverride: {
        kind: 'count',
        operator: 'min',
        value: 3,
      },
    })

    expect(state.targetOverride).toEqual({
      kind: 'count',
      operator: 'min',
      value: 3,
    })

    await expect(
      planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef,
        subjectType: 'tracker',
        subjectId: tracker.id,
        activityState: 'active',
        scheduleScope: 'unassigned',
        targetOverride: {
          kind: 'value',
          aggregation: 'sum',
          operator: 'gte',
          value: 5,
        },
      }),
    ).rejects.toThrow('Failed to persist measurement month state in database')
  })

  it('enforces one daily entry per subject and validates entry mode payloads', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Improve delivery',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Close three tasks',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 3,
      },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Focus score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Book venue',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const created = await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      dayRef,
      value: 2,
    })
    const updated = await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      dayRef,
      value: 5,
    })

    expect(updated.id).toBe(created.id)
    expect(updated.value).toBe(5)
    expect(await planningStateDexieRepository.listDailyMeasurementEntries()).toHaveLength(1)

    await expect(
      planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'tracker',
        subjectId: tracker.id,
        dayRef,
        value: 1,
      })
    ).rejects.toThrow('Failed to persist daily measurement entry in database')

    const initiativeState = await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef: parsePeriodRef('2026-03') as MonthRef,
      weekRef: parsePeriodRef('2026-W10') as WeekRef,
    })

    expect(initiativeState.initiativeId).toBe(initiative.id)
  })

  it('stores one hidden state per day and subject', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Deep work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Ship Today view',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const created = await planningStateDexieRepository.upsertTodayHiddenState({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    const updated = await planningStateDexieRepository.upsertTodayHiddenState({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    await planningStateDexieRepository.upsertTodayHiddenState({
      dayRef,
      subjectType: 'initiative',
      subjectId: initiative.id,
    })

    expect(updated.id).toBe(created.id)
    expect(await planningStateDexieRepository.listTodayHiddenStates()).toHaveLength(2)
  })

  it('supports scoped reads for months, weeks, and day ranges', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Stabilize planning',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Review weekly scope',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const marchRef = parsePeriodRef('2026-03') as MonthRef
    const aprilRef = parsePeriodRef('2026-04') as MonthRef
    const marchWeekRef = parsePeriodRef('2026-W10') as WeekRef
    const firstDayRef = parsePeriodRef('2026-03-12') as DayRef
    const secondDayRef = parsePeriodRef('2026-04-09') as DayRef
    const aprilWeekRef = getPeriodRefsForDate(secondDayRef).week as WeekRef

    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: marchRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: aprilRef,
      goalId: goal.id,
      activityState: 'paused',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: marchRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: aprilRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: marchWeekRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: aprilWeekRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef: firstDayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef: secondDayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: firstDayRef,
      value: null,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: secondDayRef,
      value: null,
    })
    await planningStateDexieRepository.upsertTodayHiddenState({
      dayRef: firstDayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })

    expect(await planningStateDexieRepository.listGoalMonthStatesForMonths([marchRef])).toHaveLength(1)
    expect(await planningStateDexieRepository.listMeasurementMonthStatesForMonths([marchRef])).toHaveLength(1)
    expect(await planningStateDexieRepository.listMeasurementWeekStatesForWeeks([marchWeekRef])).toHaveLength(1)
    expect(
      await planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(
        firstDayRef,
        firstDayRef,
      ),
    ).toHaveLength(1)
    expect(
      await planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(
        firstDayRef,
        firstDayRef,
      ),
    ).toHaveLength(1)
    expect(await planningStateDexieRepository.listTodayHiddenStatesForDay(firstDayRef)).toHaveLength(1)
  })
})
