/**
 * Commitment Store Tests
 *
 * Unit tests for useCommitmentStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Getter filtering (by week, project, life area, status)
 * - Sorting behavior (createdAt desc)
 * - Status updates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommitmentStore } from '@/stores/commitment.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'

function buildCommitment(data: {
  id: string
  createdAt: string
  weeklyPlanId?: string
  projectId?: string
  lifeAreaIds?: string[]
  priorityIds?: string[]
  name?: string
  status?: 'planned' | 'done' | 'skipped'
  startDate?: string
  endDate?: string
  periodType?: 'weekly' | 'monthly'
}) {
  return {
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
    startDate: data.startDate ?? '2026-01-06',
    endDate: data.endDate ?? '2026-01-12',
    periodType: data.periodType ?? 'weekly',
    weeklyPlanId: data.weeklyPlanId,
    projectId: data.projectId,
    lifeAreaIds: data.lifeAreaIds ?? [],
    priorityIds: data.priorityIds ?? [],
    name: data.name ?? 'Commitment',
    status: data.status ?? 'planned',
  }
}

describe('useCommitmentStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-commitment')

    const db = getUserDatabase()
    await db.commitments.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  describe('loadCommitments', () => {
    it('loads commitments filtered by weekly plan', async () => {
      const store = useCommitmentStore()
      const db = getUserDatabase()

      await db.commitments.bulkAdd([
        buildCommitment({ id: 'c-1', createdAt: '2026-01-01T00:00:00.000Z', weeklyPlanId: 'week-1' }),
        buildCommitment({ id: 'c-2', createdAt: '2026-01-02T00:00:00.000Z', weeklyPlanId: 'week-2' }),
      ])

      await store.loadCommitments({ weeklyPlanId: 'week-1' })

      expect(store.commitments).toHaveLength(1)
      expect(store.commitments[0].id).toBe('c-1')
    })

    it('loads commitments filtered by project', async () => {
      const store = useCommitmentStore()
      const db = getUserDatabase()

      await db.commitments.bulkAdd([
        buildCommitment({ id: 'c-1', createdAt: '2026-01-01T00:00:00.000Z', weeklyPlanId: 'week-1', projectId: 'p-1' }),
        buildCommitment({ id: 'c-2', createdAt: '2026-01-02T00:00:00.000Z', weeklyPlanId: 'week-1', projectId: 'p-2' }),
      ])

      await store.loadCommitments({ projectId: 'p-1' })

      expect(store.commitments).toHaveLength(1)
      expect(store.commitments[0].projectId).toBe('p-1')
    })

    it('loads commitments filtered by life area', async () => {
      const store = useCommitmentStore()
      const db = getUserDatabase()

      await db.commitments.bulkAdd([
        buildCommitment({
          id: 'c-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          weeklyPlanId: 'week-1',
          lifeAreaIds: ['la-1'],
        }),
        buildCommitment({
          id: 'c-2',
          createdAt: '2026-01-02T00:00:00.000Z',
          weeklyPlanId: 'week-1',
          lifeAreaIds: ['la-2'],
        }),
      ])

      await store.loadCommitments({ lifeAreaId: 'la-1' })

      expect(store.commitments).toHaveLength(1)
      expect(store.commitments[0].lifeAreaIds).toEqual(['la-1'])
    })
  })

  describe('createCommitment', () => {
    it('creates a commitment with auto-generated fields', async () => {
      const store = useCommitmentStore()

      const created = await store.createCommitment({
        startDate: '2026-01-06',
        endDate: '2026-01-12',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        projectId: 'project-1',
        lifeAreaIds: ['la-1'],
        priorityIds: ['pr-1'],
        name: 'Run 3 times',
        status: 'planned',
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.name).toBe('Run 3 times')

      const db = getUserDatabase()
      const persisted = await db.commitments.get(created.id)
      expect(persisted).toBeDefined()
      expect(persisted?.name).toBe('Run 3 times')
    })
  })

  describe('updateCommitment', () => {
    it('updates commitment fields', async () => {
      const store = useCommitmentStore()

      const created = await store.createCommitment({
        startDate: '2026-01-06',
        endDate: '2026-01-12',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Original',
        status: 'planned',
      })

      const updated = await store.updateCommitment(created.id, {
        name: 'Updated',
        status: 'done',
      })

      expect(updated.name).toBe('Updated')
      expect(updated.status).toBe('done')
    })
  })

  describe('updateCommitmentStatus', () => {
    it('updates only the commitment status', async () => {
      const store = useCommitmentStore()

      const created = await store.createCommitment({
        startDate: '2026-01-06',
        endDate: '2026-01-12',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Status Update',
        status: 'planned',
      })

      const updated = await store.updateCommitmentStatus(created.id, 'done')
      expect(updated.status).toBe('done')
    })
  })

  describe('deleteCommitment', () => {
    it('removes commitment from state and database', async () => {
      const store = useCommitmentStore()

      const created = await store.createCommitment({
        startDate: '2026-01-06',
        endDate: '2026-01-12',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'To delete',
        status: 'planned',
      })

      await store.deleteCommitment(created.id)

      expect(store.commitments).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.commitments.get(created.id)
      expect(persisted).toBeUndefined()
    })
  })

  describe('sortedCommitments', () => {
    it('sorts by createdAt desc', async () => {
      const store = useCommitmentStore()
      const db = getUserDatabase()

      await db.commitments.bulkAdd([
        buildCommitment({
          id: 'c-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          weeklyPlanId: 'week-1',
          name: 'Old',
        }),
        buildCommitment({
          id: 'c-2',
          createdAt: '2026-01-02T00:00:00.000Z',
          weeklyPlanId: 'week-1',
          name: 'Middle',
        }),
        buildCommitment({
          id: 'c-3',
          createdAt: '2026-01-03T00:00:00.000Z',
          weeklyPlanId: 'week-1',
          name: 'Newest',
        }),
      ])

      await store.loadCommitments()

      const sorted = store.sortedCommitments
      expect(sorted.map((c) => c.id)).toEqual(['c-3', 'c-2', 'c-1'])
    })
  })
})
