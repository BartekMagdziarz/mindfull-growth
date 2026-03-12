import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

describe('planning Dexie repositories', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.keyResults.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.initiatives.clear()
    await db.priorities.clear()
  })

  it('persists Priority records with normalized links', async () => {
    const created = await priorityDexieRepository.create({
      title: '  2026 Theme ',
      description: '  Ship the core planning system ',
      isActive: true,
      year: parsePeriodRef('2026') as YearRef,
      lifeAreaIds: ['la-1', ' la-1 ', 'la-2'],
    })

    const listed = await priorityDexieRepository.listAll()
    const reloaded = await priorityDexieRepository.getById(created.id)

    expect(listed).toHaveLength(1)
    expect(reloaded).toEqual(created)
    expect(created.lifeAreaIds).toEqual(['la-1', 'la-2'])
    expect(created.description).toBe('Ship the core planning system')
  })

  it('rejects KeyResult creation when the owning Goal does not exist', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      keyResultDexieRepository.create({
        title: 'Lead measure',
        isActive: true,
        goalId: 'missing-goal',
        cadence: 'weekly',
        entryMode: 'completion',
        target: {
          kind: 'count',
          operator: 'min',
          value: 1,
        },
        status: 'open',
      }),
    ).rejects.toThrow('Failed to create key result in database')
  })

  it('cascade-deletes KeyResults when deleting a Goal', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Launch Calendar View',
      isActive: true,
      priorityIds: ['priority-1'],
      lifeAreaIds: [],
      status: 'open',
    })

    const keyResult = await keyResultDexieRepository.create({
      title: 'Weekly prototype ready',
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

    expect(await keyResultDexieRepository.getById(keyResult.id)).toBeDefined()

    await goalDexieRepository.delete(goal.id)

    expect(await goalDexieRepository.getById(goal.id)).toBeUndefined()
    expect(await keyResultDexieRepository.getById(keyResult.id)).toBeUndefined()
  })

  it('supports CRUD for Habit, Tracker, and Initiative without plan-state fields', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Morning review',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-1'],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 4,
      },
      status: 'retired',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Energy level',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: ['la-1'],
      cadence: 'weekly',
      entryMode: 'rating',
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Email designer',
      isActive: true,
      goalId: '',
      priorityIds: ['priority-1'],
      lifeAreaIds: ['la-2'],
      status: 'open',
    })

    const updatedHabit = await habitDexieRepository.update(habit.id, {
      status: 'open',
      isActive: true,
    })
    const updatedTracker = await trackerDexieRepository.update(tracker.id, {
      entryMode: 'value',
      cadence: 'monthly',
    })
    const updatedInitiative = await initiativeDexieRepository.update(initiative.id, {
      goalId: 'goal-42',
    })

    expect(updatedHabit.status).toBe('open')
    expect(updatedHabit.isActive).toBe(true)
    expect(updatedTracker.entryMode).toBe('value')
    expect(updatedTracker.cadence).toBe('monthly')
    expect(updatedInitiative.goalId).toBe('goal-42')
  })
})
