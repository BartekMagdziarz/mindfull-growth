import { beforeEach, describe, expect, it } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { priorityLinkDexieRepository } from '@/repositories/priorityLinkDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import {
  abandonProposedLink,
  createActiveLink,
  createObjectFromProposal,
  createPriorityFromRitual,
  listLinksForPriority,
  resolveProposedLink,
  retireActiveLink,
} from '@/services/priorityLinkService'
import { saveDraftToDB, loadDraftFromDB } from '@/services/draftStorage'
import { connectTestDatabase } from '@/test/testDatabase'
import type { UserDatabase } from '@/services/userDatabase.service'
import type { YearRef } from '@/domain/period'

const RITUAL_PRIORITY = {
  title: 'Dążenie do równowagi',
  years: ['2026' as YearRef],
  status: 'active' as const,
  lifeAreaIds: [],
  progressSignals: ['więcej spokoju'],
  riskSignals: ['presja wyniku'],
}

async function seedHabit() {
  const habit = await habitDexieRepository.create({
    title: 'Spokojny spacer',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    status: 'open',
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 4 },
  })
  return habit
}

describe('priorityLinkService', () => {
  let db: UserDatabase

  beforeEach(async () => {
    db = await connectTestDatabase()
    await db.priorityLinks.clear()
    await db.priorities.clear()
    await db.goals.clear()
    await db.keyResults.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.weeklyIntentions.clear()
    await db.initiatives.clear()
  })

  it('creates the priority, active + proposed links and drops the draft atomically', async () => {
    const habit = await seedHabit()
    await saveDraftToDB('priority-creator-ritual', '{"stepIndex":5}')

    const result = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [
        {
          subjectRef: { subjectType: 'habit', subjectId: habit.id },
          contribution: 'Wspiera regenerację',
          expectedSignal: 'Więcej dni z energią',
        },
        {
          proposal: { objectType: 'goal', title: 'Plan przygotowań' },
          contribution: 'Porządkuje działania',
          expectedSignal: 'Plan możliwy do wdrożenia',
        },
      ],
      draftKey: 'priority-creator-ritual',
    })

    expect(result.priority.status).toBe('active')
    expect(result.links).toHaveLength(2)

    const links = await listLinksForPriority(result.priority.id)
    expect(links.map(link => link.status)).toEqual(['active', 'proposed'])
    expect(links[0].subjectRef).toEqual({ subjectType: 'habit', subjectId: habit.id })
    expect(links[1].proposal).toEqual({ objectType: 'goal', title: 'Plan przygotowań' })

    // Dual-write: the legacy array on the habit gained the priority id.
    const updatedHabit = await habitDexieRepository.getById(habit.id)
    expect(updatedHabit?.priorityIds).toContain(result.priority.id)

    // Draft is gone.
    expect(await loadDraftFromDB('priority-creator-ritual')).toBeNull()
  })

  it('rolls the whole finale back when any link is invalid (draft survives)', async () => {
    await saveDraftToDB('priority-creator-ritual', '{"stepIndex":5}')

    await expect(createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [
        {
          // Points at a habit that does not exist → dual-write throws inside the txn.
          subjectRef: { subjectType: 'habit', subjectId: 'missing-habit' },
          contribution: '',
          expectedSignal: '',
        },
      ],
      draftKey: 'priority-creator-ritual',
    })).rejects.toThrow()

    expect(await db.priorities.count()).toBe(0)
    expect(await db.priorityLinks.count()).toBe(0)
    expect(await loadDraftFromDB('priority-creator-ritual')).toBe('{"stepIndex":5}')
  })

  it('rejects a link that carries both or neither of subjectRef/proposal', async () => {
    await expect(createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ contribution: '', expectedSignal: '' }],
    })).rejects.toThrow('exactly one')
  })

  it('resolves a proposed link once the real object exists (dual-write included)', async () => {
    const { priority, links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{
        proposal: { objectType: 'habit', title: 'Spokojny spacer' },
        contribution: 'Wspiera regenerację',
        expectedSignal: 'Więcej dni z energią',
      }],
    })
    const habit = await seedHabit()

    const resolved = await resolveProposedLink(links[0].id, { subjectType: 'habit', subjectId: habit.id })

    expect(resolved.status).toBe('active')
    expect(resolved.subjectRef).toEqual({ subjectType: 'habit', subjectId: habit.id })
    expect(resolved.proposal).toBeUndefined()
    expect(resolved.contribution).toBe('Wspiera regenerację')

    const updatedHabit = await habitDexieRepository.getById(habit.id)
    expect(updatedHabit?.priorityIds).toContain(priority.id)

    await expect(resolveProposedLink(links[0].id, { subjectType: 'habit', subjectId: habit.id }))
      .rejects.toThrow('only proposed')
  })

  it('abandons proposed links and refuses to abandon active ones', async () => {
    const habit = await seedHabit()
    const { links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [
        { proposal: { objectType: 'tracker', title: 'Energia' }, contribution: '', expectedSignal: '' },
        { subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' },
      ],
    })
    const proposed = links.find(link => link.status === 'proposed')!
    const active = links.find(link => link.status === 'active')!

    await abandonProposedLink(proposed.id)
    expect(await priorityLinkDexieRepository.getById(proposed.id)).toBeUndefined()

    await expect(abandonProposedLink(active.id)).rejects.toThrow('only proposed')
  })

  it('retires an active link and removes the id from the legacy array', async () => {
    const habit = await seedHabit()
    const { priority, links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' }],
    })

    const retired = await retireActiveLink(links[0].id)
    expect(retired.status).toBe('retired')
    expect(retired.validTo).toBeTruthy()

    const updatedHabit = await habitDexieRepository.getById(habit.id)
    expect(updatedHabit?.priorityIds).not.toContain(priority.id)
  })

  it('createActiveLink is idempotent for an already-linked pair', async () => {
    const habit = await seedHabit()
    const priority = await priorityDexieRepository.create(RITUAL_PRIORITY)

    const first = await createActiveLink(priority.id, { subjectType: 'habit', subjectId: habit.id })
    const second = await createActiveLink(priority.id, { subjectType: 'habit', subjectId: habit.id })

    expect(second.id).toBe(first.id)
    expect(await db.priorityLinks.count()).toBe(1)
    const updatedHabit = await habitDexieRepository.getById(habit.id)
    expect(updatedHabit?.priorityIds).toEqual([priority.id])
  })

  it('closing a priority retires its active links and drops proposed ones', async () => {
    const habit = await seedHabit()
    const { priority, links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [
        { subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' },
        { proposal: { objectType: 'goal', title: 'Nigdy nie powstał' }, contribution: '', expectedSignal: '' },
      ],
    })

    await priorityDexieRepository.update(priority.id, {
      status: 'closed',
      closingReflection: { closedAt: new Date().toISOString() },
    })

    const remaining = await listLinksForPriority(priority.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('retired')
    expect(remaining[0].validTo).toBeTruthy()
    expect(links.some(link => link.status === 'proposed')).toBe(true)
  })

  it('deleting a priority hard-deletes its links', async () => {
    const habit = await seedHabit()
    const { priority } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' }],
    })

    await priorityDexieRepository.delete(priority.id)

    expect(await db.priorityLinks.count()).toBe(0)
    const updatedHabit = await habitDexieRepository.getById(habit.id)
    expect(updatedHabit?.priorityIds).toEqual([])
  })

  it('deleting a linked object retires its links (history kept)', async () => {
    const habit = await seedHabit()
    const { priority, links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' }],
    })

    await habitDexieRepository.delete(habit.id)

    const link = await priorityLinkDexieRepository.getById(links[0].id)
    expect(link?.status).toBe('retired')
    expect(link?.validTo).toBeTruthy()
    expect(link?.priorityId).toBe(priority.id)
  })

  it('deleting a goal retires links of the goal and of its cascade-deleted key results', async () => {
    const priority = await priorityDexieRepository.create(RITUAL_PRIORITY)
    const goal = await goalDexieRepository.create({
      title: 'Cel',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await db.transaction('rw', db.keyResults, async () => {
      const record = {
        id: 'kr-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'KR',
        isActive: true,
        goalId: goal.id,
        entryMode: 'completion' as const,
        cadence: 'weekly' as const,
        target: { kind: 'count' as const, operator: 'min' as const, value: 1 },
        status: 'open' as const,
      }
      await db.keyResults.add(record)
      return record
    })

    await createActiveLink(priority.id, { subjectType: 'goal', subjectId: goal.id })
    await db.priorityLinks.add({
      id: 'link-kr',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priorityId: priority.id,
      status: 'active',
      subjectRef: { subjectType: 'keyResult', subjectId: keyResult.id },
      contribution: '',
      expectedSignal: '',
      validFrom: new Date().toISOString(),
    })

    await goalDexieRepository.delete(goal.id)

    const links = await listLinksForPriority(priority.id)
    expect(links).toHaveLength(2)
    expect(links.every(link => link.status === 'retired')).toBe(true)
  })

  it('createObjectFromProposal creates a habit, resolves the link and dual-writes', async () => {
    const { priority, links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ proposal: { objectType: 'habit', title: 'Spokojny spacer' }, contribution: 'Regeneracja', expectedSignal: 'Więcej energii' }],
    })

    const result = await createObjectFromProposal(links[0])

    expect(result.family).toBe('habits')
    expect(result.link.status).toBe('active')
    expect(result.subjectRef.subjectType).toBe('habit')

    const habit = await habitDexieRepository.getById(result.subjectRef.subjectId)
    expect(habit?.title).toBe('Spokojny spacer')
    expect(habit?.priorityIds).toContain(priority.id)
    // Semantic fields carried from the proposal survive.
    expect(result.link.contribution).toBe('Regeneracja')

    const remaining = await listLinksForPriority(priority.id)
    expect(remaining.filter(link => link.status === 'proposed')).toHaveLength(0)
    expect(remaining.filter(link => link.status === 'active')).toHaveLength(1)
  })

  it('createObjectFromProposal creates goal and tracker objects for their proposal types', async () => {
    const { links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [
        { proposal: { objectType: 'goal', title: 'Plan' }, contribution: '', expectedSignal: '' },
        { proposal: { objectType: 'tracker', title: 'Energia' }, contribution: '', expectedSignal: '' },
      ],
    })

    for (const link of links) {
      const result = await createObjectFromProposal(link)
      if (result.family === 'goals') {
        expect((await goalDexieRepository.getById(result.subjectRef.subjectId))?.title).toBe('Plan')
      } else {
        expect(result.family).toBe('trackers')
        expect((await trackerDexieRepository.getById(result.subjectRef.subjectId))?.title).toBe('Energia')
      }
    }
  })

  it('createObjectFromProposal refuses a non-proposed link', async () => {
    const habit = await seedHabit()
    const { links } = await createPriorityFromRitual({
      priority: RITUAL_PRIORITY,
      links: [{ subjectRef: { subjectType: 'habit', subjectId: habit.id }, contribution: '', expectedSignal: '' }],
    })

    await expect(createObjectFromProposal(links[0])).rejects.toThrow('not a proposed link')
  })
})
