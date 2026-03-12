import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

describe('planningState Dexie repository', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
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

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('rejects canonical month planning config for weekly cadence subjects', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Improve delivery',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship weekly milestone',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })

    await expect(
      planningStateDexieRepository.upsertCadencedMonthState({
        monthRef: parsePeriodRef('2026-03') as MonthRef,
        subjectType: 'keyResult',
        subjectId: keyResult.id,
        activityState: 'active',
        planningMode: 'times-per-period',
        targetCount: 2,
      })
    ).rejects.toThrow('Failed to persist cadenced month state in database')
  })

  it('requires monthly cadence week states to be gated by an active month state', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Monthly outreach',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    await expect(
      planningStateDexieRepository.upsertCadencedWeekState({
        weekRef,
        sourceMonthRef: monthRef,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        planningMode: 'times-per-period',
        targetCount: 3,
      })
    ).rejects.toThrow('Failed to persist cadenced week state in database')

    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 12,
    })

    const weekState = await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 4,
    })

    expect(weekState.sourceMonthRef).toBe(monthRef)
  })

  it('requires weekly cadence day assignments to have an active week state', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Weekly review',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
    })

    await expect(
      planningStateDexieRepository.upsertCadencedDayAssignment({
        dayRef,
        subjectType: 'habit',
        subjectId: habit.id,
      })
    ).rejects.toThrow('Failed to persist cadenced day assignment in database')

    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'specific-days',
    })

    const assignment = await planningStateDexieRepository.upsertCadencedDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })

    expect(assignment.dayRef).toBe(dayRef)
  })

  it('enforces tracker month gating for active week states and entryMode for entries', async () => {
    const tracker = await trackerDexieRepository.create({
      title: 'Energy',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      analysisPeriod: 'week',
      entryMode: 'day',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    await expect(
      planningStateDexieRepository.upsertTrackerWeekState({
        weekRef,
        trackerId: tracker.id,
        activityState: 'active',
      })
    ).rejects.toThrow('Failed to persist tracker week state in database')

    await planningStateDexieRepository.upsertTrackerMonthState({
      monthRef,
      trackerId: tracker.id,
      activityState: 'active',
    })

    const weekState = await planningStateDexieRepository.upsertTrackerWeekState({
      weekRef,
      trackerId: tracker.id,
      activityState: 'active',
    })

    expect(weekState.activityState).toBe('active')

    await expect(
      planningStateDexieRepository.upsertTrackerEntry({
        trackerId: tracker.id,
        periodType: 'week',
        periodRef: weekRef,
        value: 5,
      })
    ).rejects.toThrow('Failed to persist tracker entry in database')

    const entry = await planningStateDexieRepository.upsertTrackerEntry({
      trackerId: tracker.id,
      periodType: 'day',
      periodRef: dayRef,
      value: 5,
      note: ' steady ',
    })

    expect(entry.note).toBe('steady')
  })

  it('updates initiative plan state hierarchically for the same initiative', async () => {
    const initiative = await initiativeDexieRepository.create({
      title: 'Book venue',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const created = await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
      weekRef,
      dayRef,
    })
    const updated = await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
      weekRef,
      dayRef: undefined,
    })

    expect(updated.id).toBe(created.id)
    expect(updated.dayRef).toBeUndefined()
    expect(await planningStateDexieRepository.listInitiativePlanStates()).toHaveLength(1)
  })
})
