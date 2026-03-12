import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import {
  listGoalsByLifeArea,
  listGoalsByPriority,
  listHabitsByLifeArea,
  listHabitsByPriority,
  listInitiativesByGoal,
  listInitiativesByLifeArea,
  listInitiativesByPriority,
  listKeyResultsByGoal,
  listTrackersByLifeArea,
  listTrackersByPriority,
} from '@/services/planningQueries'
import { connectTestDatabase } from '@/test/testDatabase'

function sortIds(values: { id: string }[]): string[] {
  return values.map((value) => value.id).sort()
}

describe('planningQueries', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.keyResults.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.initiatives.clear()
    await db.priorities.clear()
  })

  it('returns linked objects without hidden lifecycle filters by default', async () => {
    const goalA = await goalDexieRepository.create({
      title: 'Goal A',
      isActive: true,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-1'],
      status: 'open',
    })
    const goalB = await goalDexieRepository.create({
      title: 'Goal B',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-2'],
      status: 'dropped',
    })

    await keyResultDexieRepository.create({
      title: 'KR A',
      isActive: true,
      goalId: goalA.id,
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    await keyResultDexieRepository.create({
      title: 'KR B',
      isActive: false,
      goalId: goalA.id,
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'completed',
    })

    const habitA = await habitDexieRepository.create({
      title: 'Habit A',
      isActive: true,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-1'],
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const habitB = await habitDexieRepository.create({
      title: 'Habit B',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-2'],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'retired',
    })

    const trackerA = await trackerDexieRepository.create({
      title: 'Tracker A',
      isActive: true,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-1'],
      analysisPeriod: 'week',
      entryMode: 'day',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const trackerB = await trackerDexieRepository.create({
      title: 'Tracker B',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-2'],
      analysisPeriod: 'month',
      entryMode: 'month',
      kind: 'generic',
      config: {},
      status: 'dropped',
    })

    const initiativeA = await initiativeDexieRepository.create({
      title: 'Initiative A',
      isActive: true,
      goalId: goalA.id,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-1'],
    })
    const initiativeB = await initiativeDexieRepository.create({
      title: 'Initiative B',
      isActive: false,
      goalId: goalB.id,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-2'],
    })

    expect(sortIds(await listGoalsByPriority('priority-1'))).toEqual(sortIds([goalA, goalB]))
    expect(sortIds(await listGoalsByLifeArea('la-1'))).toEqual(sortIds([goalA]))
    expect(sortIds(await listKeyResultsByGoal(goalA.id))).toHaveLength(2)
    expect(sortIds(await listHabitsByPriority('priority-1'))).toEqual(sortIds([habitA, habitB]))
    expect(sortIds(await listHabitsByLifeArea('la-2'))).toEqual(sortIds([habitB]))
    expect(sortIds(await listTrackersByPriority('priority-1'))).toEqual(sortIds([trackerA, trackerB]))
    expect(sortIds(await listTrackersByLifeArea('la-1'))).toEqual(sortIds([trackerA]))
    expect(sortIds(await listInitiativesByGoal(goalA.id))).toEqual(sortIds([initiativeA]))
    expect(sortIds(await listInitiativesByPriority('priority-1'))).toEqual(
      sortIds([initiativeA, initiativeB]),
    )
    expect(sortIds(await listInitiativesByLifeArea('la-2'))).toEqual(sortIds([initiativeB]))
  })

  it('applies explicit filters only when requested', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Goal',
      isActive: true,
      priorityIds: ['priority-2'],
      lifeAreaIds: ['la-3'],
      status: 'open',
    })

    await keyResultDexieRepository.create({
      title: 'Open KR',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const archivedHabit = await habitDexieRepository.create({
      title: 'Archived Habit',
      isActive: false,
      priorityIds: ['priority-2'],
      lifeAreaIds: ['la-3'],
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const openTracker = await trackerDexieRepository.create({
      title: 'Open Tracker',
      isActive: true,
      priorityIds: ['priority-2'],
      lifeAreaIds: ['la-3'],
      analysisPeriod: 'week',
      entryMode: 'day',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    const archivedInitiative = await initiativeDexieRepository.create({
      title: 'Archived Initiative',
      isActive: false,
      goalId: goal.id,
      priorityIds: ['priority-2'],
      lifeAreaIds: ['la-3'],
    })

    expect(await listHabitsByPriority('priority-2', { isActive: false })).toEqual([archivedHabit])
    expect(await listTrackersByPriority('priority-2', { status: 'open' })).toEqual([openTracker])
    expect(await listInitiativesByPriority('priority-2', { isActive: false })).toEqual([
      archivedInitiative,
    ])
    expect(await listGoalsByPriority('priority-2', { status: 'open' })).toEqual([goal])
  })
})
