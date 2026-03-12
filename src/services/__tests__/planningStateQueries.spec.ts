import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { MonthRef, WeekRef } from '@/domain/period'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
  getWeekRelevantObjects,
} from '@/services/planningStateQueries'
import { parsePeriodRef } from '@/utils/periods'

describe('planningStateQueries', () => {
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

  it('does not eagerly create plans or reflections when querying empty periods', async () => {
    const db = await connectTestDatabase()
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    expect(await getMonthPlanningBundle(monthRef)).toMatchObject({
      monthRef,
      goalItems: [],
      cadencedItems: [],
      trackerItems: [],
      initiativeItems: [],
    })
    expect(await getWeekReflectionBundle(weekRef)).toMatchObject({
      weekRef,
      relevant: {
        goalItems: [],
        cadencedItems: [],
        trackerItems: [],
        initiativeItems: [],
      },
    })

    expect(await db.monthPlans.count()).toBe(0)
    expect(await db.weekPlans.count()).toBe(0)
    expect(await db.periodReflections.count()).toBe(0)
    expect(await db.periodObjectReflections.count()).toBe(0)
  })

  it('marks monthly cadenced items as overAllocated when weekly allocations exceed the monthly target', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Outreach',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 6,
    })
    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef: parsePeriodRef('2026-W10') as WeekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 4,
    })
    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef: parsePeriodRef('2026-W11') as WeekRef,
      sourceMonthRef: monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 3,
    })

    const bundle = await getMonthPlanningBundle(monthRef)

    expect(bundle.cadencedItems).toHaveLength(1)
    expect(bundle.cadencedItems[0].overAllocated).toBe(true)
  })

  it('uses both overlapping months when computing weekly planning relevance', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Bridge habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const febRef = parsePeriodRef('2026-02') as MonthRef
    const marRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W08') as WeekRef

    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef: febRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 2,
    })
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef: marRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 3,
    })
    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef,
      sourceMonthRef: marRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 1,
    })

    const relevant = await getWeekRelevantObjects(weekRef)

    expect(relevant.overlappingMonthRefs).toEqual([febRef, marRef])
    expect(relevant.planning.cadencedItems).toHaveLength(1)
    expect(relevant.planning.cadencedItems[0].reasons).toContain('week-state')
    expect(relevant.planning.cadencedItems[0].reasons).toContain('month-active-unassigned')
    expect(relevant.planning.cadencedItems[0].unassignedMonthRefs).toEqual([febRef])
  })

  it('surfaces linked goals in weekly reflection when KRs or initiatives are relevant', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
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
      kind: 'generic',
      config: {},
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
      planningMode: 'times-per-period',
      targetCount: 1,
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

    const planningBundle = await getWeekPlanningBundle(weekRef)
    const reflectionBundle = await getWeekReflectionBundle(weekRef)

    expect(planningBundle.relevant.cadencedItems).toHaveLength(1)
    expect(planningBundle.relevant.initiativeItems).toHaveLength(1)
    expect(reflectionBundle.periodReflection?.note).toBe('Strong execution week')
    expect(reflectionBundle.relevant.goalItems).toHaveLength(1)
    expect(reflectionBundle.relevant.goalItems[0].goal.id).toBe(goal.id)
    expect(reflectionBundle.relevant.goalItems[0].reasons).toEqual(['goal-linked-work'])
  })
})
