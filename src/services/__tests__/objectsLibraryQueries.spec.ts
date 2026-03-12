import { beforeEach, describe, expect, it } from 'vitest'
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'
import { connectTestDatabase } from '@/test/testDatabase'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
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
    await db.keyResults.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.initiatives.clear()
    await db.priorities.clear()
    await db.lifeAreas.clear()
  })

  it('builds goal-centric results with linked period relevance, detail panel data, and history', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    const lifeArea = await lifeAreaDexieRepository.create({
      name: 'Health',
      measures: [],
      reviewCadence: 'monthly',
      isActive: true,
      sortOrder: 0,
    })
    const priority = await priorityDexieRepository.create({
      title: 'Ship planning simplification',
      isActive: true,
      year: parsePeriodRef('2026') as YearRef,
      lifeAreaIds: [lifeArea.id],
    })
    const goal = await goalDexieRepository.create({
      title: 'Launch planning hub',
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
      kind: 'generic',
      config: {},
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
      q: 'launch',
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
    expect(bundle.items[0].linkedEntities).toEqual(
      expect.arrayContaining([lifeArea.name, `${priority.year} · ${priority.title}`])
    )
    expect(bundle.items[0].matchReasons.map(reason => reason.kind)).toEqual(
      expect.arrayContaining(['linked-key-result', 'linked-initiative'])
    )

    expect(bundle.expandedItem?.title).toBe(goal.title)
    expect(bundle.expandedItem?.linkedPeriods.map(period => period.periodRef)).toEqual(
      expect.arrayContaining([monthRef, weekRef])
    )
    expect(bundle.expandedItem?.linkedPeriods[0]?.reasonLabel).toEqual(
      expect.objectContaining({ key: expect.stringContaining('planning.objects.reason') })
    )
    expect(bundle.expandedItem?.historyItems.map(item => item.source)).toEqual(
      expect.arrayContaining(['object-reflection', 'period-reflection'])
    )
  })

  it('hides closed initiatives by default and brings them back with showClosed', async () => {
    const openInitiative = await initiativeDexieRepository.create({
      title: 'Keep weekly sync',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    await initiativeDexieRepository.create({
      title: 'Sunset onboarding checklist',
      isActive: false,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'completed',
    })

    const openOnly = await loadObjectsLibraryBundle({
      family: 'initiatives',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    })
    const withClosed = await loadObjectsLibraryBundle({
      family: 'initiatives',
      q: '',
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: true,
    })

    expect(openOnly.items.map(item => item.id)).toEqual([openInitiative.id])
    expect(withClosed.items).toHaveLength(2)
    expect(withClosed.items.map(item => item.status)).toEqual(
      expect.arrayContaining(['open', 'completed'])
    )
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
})
