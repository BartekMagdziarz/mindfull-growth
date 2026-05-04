import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { annualPlanDexieRepository } from '@/repositories/annualPlanDexieRepository'
import { normalizeAnnualPlanPayload } from '@/domain/annualPlan'
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
    await db.annualPlans.clear()
  })

  it('normalizes AnnualPlan payloads and requires a YearRef', () => {
    const normalized = normalizeAnnualPlanPayload({
      yearRef: parsePeriodRef('2026') as YearRef,
      status: 'draft',
      annualBriefNote: '  Start here  ',
      narrative: {
        theme: '  Build quietly  ',
        story: '',
      },
    })

    expect(normalized.yearRef).toBe('2026')
    expect(normalized.annualBriefNote).toBe('Start here')
    expect(normalized.narrative).toEqual({ theme: 'Build quietly' })

    expect(() =>
      normalizeAnnualPlanPayload({
        yearRef: parsePeriodRef('2026-05') as YearRef,
        status: 'draft',
      }),
    ).toThrow('AnnualPlan.yearRef must be a YearRef')
  })

  it('upserts one AnnualPlan per year and allows completion without losing data', async () => {
    const yearRef = parsePeriodRef('2026') as YearRef

    const draft = await annualPlanDexieRepository.upsertForYear(yearRef, {
      annualBriefNote: 'Brief placeholder',
      narrative: { theme: 'Year of steadiness' },
    })
    const updated = await annualPlanDexieRepository.upsertForYear(yearRef, {
      status: 'completed',
      narrative: {
        theme: 'Year of steadiness',
        bestHopes: 'More coherent work',
      },
    })

    const listed = await annualPlanDexieRepository.listAll()
    expect(listed).toHaveLength(1)
    expect(updated.id).toBe(draft.id)
    expect(updated.status).toBe('completed')
    expect(updated.annualBriefNote).toBe('Brief placeholder')
    expect(updated.narrative).toEqual({
      theme: 'Year of steadiness',
      bestHopes: 'More coherent work',
    })
  })

  it('persists Priority records with normalized links', async () => {
    const created = await priorityDexieRepository.create({
      title: '  2026 Theme ',
      description: '  Ship the core planning system ',
      years: [parsePeriodRef('2026') as YearRef],
      status: 'active',
      lifeAreaIds: ['la-1', ' la-1 ', 'la-2'],
      progressSignals: ['  monthly review '],
      riskSignals: [],
    })

    const listed = await priorityDexieRepository.listAll()
    const reloaded = await priorityDexieRepository.getById(created.id)

    expect(listed).toHaveLength(1)
    expect(reloaded).toEqual(created)
    expect(created.lifeAreaIds).toEqual(['la-1', 'la-2'])
    expect(created.description).toBe('Ship the core planning system')
    expect(created.order).toBe(1)
    expect(created.progressSignals).toEqual(['monthly review'])
  })

  it('enforces active priority limits and normalizes active order', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    for (let index = 0; index < 5; index++) {
      await priorityDexieRepository.create({
        title: `Priority ${index + 1}`,
        years: ['2026' as YearRef],
        status: 'active',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      })
    }

    await expect(priorityDexieRepository.create({
      title: 'Sixth priority',
      years: ['2026' as YearRef],
      status: 'active',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })).rejects.toThrow('Failed to create priority in database')

    await priorityDexieRepository.create({
      title: 'Draft priority',
      years: ['2026' as YearRef],
      status: 'draft',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })

    const active = (await priorityDexieRepository.listAll())
      .filter(priority => priority.status === 'active')
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    expect(active.map(priority => priority.order)).toEqual([1, 2, 3, 4, 5])
  })

  it('clears order when pausing and assigns order when reactivating', async () => {
    const priority = await priorityDexieRepository.create({
      title: 'Health',
      years: ['2026' as YearRef],
      status: 'active',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })

    const paused = await priorityDexieRepository.update(priority.id, { status: 'paused' })
    expect(paused.order).toBeUndefined()

    const active = await priorityDexieRepository.update(priority.id, { status: 'active' })
    expect(active.order).toBe(1)
  })

  it('cleans priority links when deleting a Priority', async () => {
    const priority = await priorityDexieRepository.create({
      title: 'Strategic direction',
      years: ['2026' as YearRef],
      status: 'active',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })
    const goal = await goalDexieRepository.create({
      title: 'Goal',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [],
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Habit',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Tracker',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      status: 'open',
    })
    const initiative = await initiativeDexieRepository.create({
      title: 'Initiative',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [],
      status: 'open',
    })

    await priorityDexieRepository.delete(priority.id)

    expect(await priorityDexieRepository.getById(priority.id)).toBeUndefined()
    expect((await goalDexieRepository.getById(goal.id))?.priorityIds).toEqual([])
    expect((await habitDexieRepository.getById(habit.id))?.priorityIds).toEqual([])
    expect((await trackerDexieRepository.getById(tracker.id))?.priorityIds).toEqual([])
    expect((await initiativeDexieRepository.getById(initiative.id))?.priorityIds).toEqual([])
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
