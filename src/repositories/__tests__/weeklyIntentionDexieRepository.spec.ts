import { beforeEach, describe, expect, it } from 'vitest'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { WeeklyIntention } from '@/domain/planning'
import type { WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

const WEEK = parsePeriodRef('2026-W20') as WeekRef

/** Raw row as written before intentions could link priorities — no priorityIds. */
function legacyRow(id: string): Omit<WeeklyIntention, 'priorityIds'> {
  return {
    id,
    weekRef: WEEK,
    title: 'Legacy intention',
    isActive: true,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 1 },
    status: 'open',
    createdAt: '2026-05-11T08:00:00.000Z',
    updatedAt: '2026-05-11T08:00:00.000Z',
  } as Omit<WeeklyIntention, 'priorityIds'>
}

describe('weeklyIntentionDexieRepository', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.weeklyIntentions.clear()
  })

  it('hydrates legacy records without priorityIds on every read path', async () => {
    const db = await connectTestDatabase()
    await db.weeklyIntentions.add(legacyRow('legacy-1') as WeeklyIntention)

    const all = await weeklyIntentionDexieRepository.listAll()
    expect(all).toHaveLength(1)
    expect(all[0].priorityIds).toEqual([])

    const byWeek = await weeklyIntentionDexieRepository.listByWeek(WEEK)
    expect(byWeek[0].priorityIds).toEqual([])

    const byId = await weeklyIntentionDexieRepository.getById('legacy-1')
    expect(byId?.priorityIds).toEqual([])
  })

  it('updating a legacy record persists the defaulted priorityIds', async () => {
    const db = await connectTestDatabase()
    await db.weeklyIntentions.add(legacyRow('legacy-2') as WeeklyIntention)

    const updated = await weeklyIntentionDexieRepository.update('legacy-2', {
      title: 'Renamed',
    })
    expect(updated.priorityIds).toEqual([])

    const raw = await db.weeklyIntentions.get('legacy-2')
    expect(raw?.priorityIds).toEqual([])
  })

  it('leaves modern records untouched', async () => {
    const created = await weeklyIntentionDexieRepository.create({
      weekRef: WEEK,
      title: 'Modern intention',
      isActive: true,
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
      priorityIds: ['p1'],
    })

    const byId = await weeklyIntentionDexieRepository.getById(created.id)
    expect(byId?.priorityIds).toEqual(['p1'])
  })
})
