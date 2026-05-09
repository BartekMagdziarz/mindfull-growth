import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import {
  loadObjectsLibraryBundle,
  parseObjectsLibraryQueryFromRoute,
  serializeObjectsLibraryQueryToRoute,
} from '@/services/objectsLibraryQueries'

describe('objectsLibraryQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('builds goal-centric results with key result previews', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    const lifeArea = await lifeAreaDexieRepository.create({
      name: 'Health',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })
    const priority = await priorityDexieRepository.create({
      title: 'Ship planning simplification',
      years: [parsePeriodRef('2026') as YearRef],
      status: 'active',
      lifeAreaIds: [lifeArea.id],
      progressSignals: [],
      riskSignals: [],
    })
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [lifeArea.id],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship weekly milestone',
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
    const initiative = await initiativeDexieRepository.create({
      title: 'Run launch checklist',
      isActive: true,
      goalId: goal.id,
      priorityIds: [priority.id],
      lifeAreaIds: [lifeArea.id],
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
      dayRef: parsePeriodRef('2026-03-12') as DayRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
    })
    await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef,
      weekRef,
    })
    await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: 'A strong delivery week',
    })
    await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'month',
      periodRef: monthRef,
      subjectType: 'goal',
      subjectId: goal.id,
      note: 'Monthly checkpoint note',
    })

    const bundle = await loadObjectsLibraryBundle({
      family: 'goals',
      q: 'ship',
      period: weekRef,
      lifeAreaIds: [lifeArea.id],
      priorityIds: [priority.id],
      showClosed: false,
      expandedType: 'goal',
      expandedId: goal.id,
    })

    expect(bundle.items).toHaveLength(1)
    expect(bundle.familyTotalCount).toBe(1)
    expect(bundle.items[0].childPreviews).toHaveLength(1)
    expect(bundle.expandedItem?.title).toBe(goal.title)
  })

  it('builds priority results as strategic cards without chart data', async () => {
    const lifeArea = await lifeAreaDexieRepository.create({
      name: 'Growth',
      reflectionSignals: [],
      isActive: true,
      sortOrder: 0,
    })
    const priority = await priorityDexieRepository.create({
      title: 'Protect deep work',
      icon: 'self_improvement',
      years: [parsePeriodRef('2026') as YearRef],
      status: 'active',
      lifeAreaIds: [lifeArea.id],
      desiredDirection: 'Make mornings available for important work',
      progressSignals: ['Three protected mornings per week'],
      riskSignals: ['Reactive calendar'],
    })
    await goalDexieRepository.create({
      title: 'Ship focused roadmap',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [lifeArea.id],
      status: 'open',
    })

    const bundle = await loadObjectsLibraryBundle({
      family: 'priorities',
      q: 'mornings',
      period: parsePeriodRef('2026-03') as MonthRef,
      lifeAreaIds: [lifeArea.id],
      priorityIds: [],
      showClosed: false,
    })

    expect(bundle.items).toHaveLength(1)
    expect(bundle.items[0]).toMatchObject({
      panelType: 'priority',
      title: priority.title,
      icon: 'self_improvement',
      years: ['2026'],
      desiredDirection: priority.desiredDirection,
      linkedCounts: {
        goals: 1,
        habits: 0,
        trackers: 0,
        initiatives: 0,
      },
    })
    expect(bundle.items[0].chartData).toBeUndefined()
  })

  it('returns habits matching the active period filter', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Deep work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 5,
      },
      status: 'open',
    })
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: parsePeriodRef('2026-03') as MonthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: parsePeriodRef('2026-03-10') as DayRef,
      value: 3,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habit.id,
      dayRef: parsePeriodRef('2026-03-12') as DayRef,
      value: 3,
    })

    const bundle = await loadObjectsLibraryBundle({
      family: 'habits',
      q: '',
      period: weekRef,
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
      expandedType: 'habit',
      expandedId: habit.id,
    })

    expect(bundle.items).toHaveLength(1)
    expect(bundle.items[0].title).toBe(habit.title)
    expect(bundle.expandedItem?.title).toBe(habit.title)
  })

  it('builds chart data for monthly-cadence habits and trackers', async () => {
    const monthRef1 = parsePeriodRef('2026-01') as MonthRef
    const monthRef2 = parsePeriodRef('2026-02') as MonthRef
    const monthRef3 = parsePeriodRef('2026-03') as MonthRef

    const habit = await habitDexieRepository.create({
      title: 'Monthly counter habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 20 },
      status: 'open',
    })

    // Month 1: met (3 × 8 = 24 ≥ 20)
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: monthRef1,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    for (const day of ['2026-01-05', '2026-01-12', '2026-01-20'] as DayRef[]) {
      await planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'habit',
        subjectId: habit.id,
        dayRef: day,
        value: 8,
      })
    }

    // Month 2: missed (3 × 4 = 12 < 20)
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: monthRef2,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    for (const day of ['2026-02-05', '2026-02-12', '2026-02-20'] as DayRef[]) {
      await planningStateDexieRepository.upsertDailyMeasurementEntry({
        subjectType: 'habit',
        subjectId: habit.id,
        dayRef: day,
        value: 4,
      })
    }

    // Month 3: no-data (active period, no entries)
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: monthRef3,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })

    const bundle = await loadObjectsLibraryBundle({
      family: 'habits',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })

    expect(bundle.items).toHaveLength(1)
    const chartData = bundle.items[0].chartData
    expect(chartData).toHaveLength(3)
    expect(chartData?.[0]).toMatchObject({ periodRef: '2026-01', status: 'met', actualValue: 24 })
    expect(chartData?.[1]).toMatchObject({ periodRef: '2026-02', status: 'missed', actualValue: 12 })
    expect(chartData?.[2]).toMatchObject({ periodRef: '2026-03', status: 'no-data' })
  })

  it('omits future periods from weekly-cadence chart data', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-11T12:00:00'))

    try {
      const habit = await habitDexieRepository.create({
        title: 'Weekly counter habit',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'counter',
        target: { kind: 'count', operator: 'min', value: 3 },
        status: 'open',
      })

      for (const monthRef of ['2026-02', '2026-03'] as MonthRef[]) {
        await planningStateDexieRepository.upsertMeasurementMonthState({
          monthRef,
          subjectType: 'habit',
          subjectId: habit.id,
          activityState: 'active',
          scheduleScope: 'whole-month',
        })
      }

      for (const weekRef of ['2026-W09', '2026-W10', '2026-W11', '2026-W12', '2026-W13'] as WeekRef[]) {
        await planningStateDexieRepository.upsertMeasurementWeekState({
          weekRef,
          subjectType: 'habit',
          subjectId: habit.id,
          activityState: 'active',
          scheduleScope: 'whole-week',
        })
      }

      const bundle = await loadObjectsLibraryBundle({
        family: 'habits',
        q: '',
        lifeAreaIds: [],
        priorityIds: [],
        showClosed: false,
      })

      const chartData = bundle.items[0].chartData
      expect(chartData?.map((point) => point.periodRef)).toEqual(['2026-W09', '2026-W10'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('omits future periods from monthly-cadence chart data', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-11T12:00:00'))

    try {
      const habit = await habitDexieRepository.create({
        title: 'Monthly counter habit',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'monthly',
        entryMode: 'counter',
        target: { kind: 'count', operator: 'min', value: 3 },
        status: 'open',
      })

      for (const monthRef of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'] as MonthRef[]) {
        await planningStateDexieRepository.upsertMeasurementMonthState({
          monthRef,
          subjectType: 'habit',
          subjectId: habit.id,
          activityState: 'active',
          scheduleScope: 'whole-month',
        })
      }

      const bundle = await loadObjectsLibraryBundle({
        family: 'habits',
        q: '',
        lifeAreaIds: [],
        priorityIds: [],
        showClosed: false,
      })

      const chartData = bundle.items[0].chartData
      expect(chartData?.map((point) => point.periodRef)).toEqual(['2026-01', '2026-02', '2026-03'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('parses and serializes the route contract for the library', () => {
    const query = parseObjectsLibraryQueryFromRoute('goals', {
      q: 'energy',
      period: '2026-W10',
      lifeAreas: 'la-1,la-2',
      priorities: 'pr-1,pr-2',
      showClosed: '1',
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })

    expect(query).toEqual({
      family: 'trackers',
      q: 'energy',
      period: '2026-W10',
      lifeAreaIds: ['la-1', 'la-2'],
      priorityIds: ['pr-1', 'pr-2'],
      showClosed: true,
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })
    expect(serializeObjectsLibraryQueryToRoute(query)).toEqual({
      q: 'energy',
      period: '2026-W10',
      lifeAreas: 'la-1,la-2',
      priorities: 'pr-1,pr-2',
      showClosed: '1',
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })
  })

  it('reuses cached bundles until a planning write invalidates the query cache', async () => {
    const listGoalsSpy = vi.spyOn(goalDexieRepository, 'listAll')
    const listGoalStatesSpy = vi.spyOn(planningStateDexieRepository, 'listGoalMonthStates')

    const goal = await goalDexieRepository.create({
      title: 'Ship library cache',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef: parsePeriodRef('2026-03') as MonthRef,
      goalId: goal.id,
      activityState: 'active',
    })

    await loadObjectsLibraryBundle({
      family: 'goals',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })
    await loadObjectsLibraryBundle({
      family: 'goals',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })

    expect(listGoalsSpy).toHaveBeenCalledTimes(1)
    expect(listGoalStatesSpy).toHaveBeenCalledTimes(1)

    await goalDexieRepository.create({
      title: 'Invalidate cache on write',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await loadObjectsLibraryBundle({
      family: 'goals',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })

    expect(listGoalsSpy).toHaveBeenCalledTimes(2)
    expect(listGoalStatesSpy).toHaveBeenCalledTimes(2)
  })
})
