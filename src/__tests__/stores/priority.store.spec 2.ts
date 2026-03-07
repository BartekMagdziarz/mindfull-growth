/**
 * Priority Store Tests
 *
 * Unit tests for usePriorityStore covering:
 * - CRUD operations (load, create, update, delete)
 * - LifeAreaIds validation on create/update
 * - Getter filtering (by life area, by year, by active state)
 * - getActivePriorities respecting linked Life Area active state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePriorityStore } from '@/stores/priority.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import type { CreatePriorityPayload } from '@/domain/planning'

async function createTestLifeArea(name = 'Test Life Area', isActive = true) {
  const lifeAreaStore = useLifeAreaStore()
  return lifeAreaStore.createLifeArea({
    name,
    measures: [],
    reviewCadence: 'monthly',
    isActive,
    sortOrder: 0,
  })
}

describe('usePriorityStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-priority')

    const db = getUserDatabase()
    await db.lifeAreas.clear()
    await db.priorities.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  describe('loadPriorities', () => {
    it('loads all priorities from the database', async () => {
      const store = usePriorityStore()
      const lifeArea = await createTestLifeArea()
      const db = getUserDatabase()

      await db.priorities.bulkAdd([
        {
          id: 'p-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lifeAreaIds: [lifeArea.id],
          year: 2026,
          name: 'Priority 1',
          successSignals: ['Signal 1'],
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'p-2',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lifeAreaIds: [lifeArea.id],
          year: 2026,
          name: 'Priority 2',
          successSignals: ['Signal 2'],
          isActive: true,
          sortOrder: 1,
        },
      ])

      await store.loadPriorities()

      expect(store.priorities).toHaveLength(2)
      expect(store.priorities.map((p) => p.name)).toContain('Priority 1')
      expect(store.priorities.map((p) => p.name)).toContain('Priority 2')
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('loads priorities filtered by year', async () => {
      const store = usePriorityStore()
      const lifeArea = await createTestLifeArea()
      const db = getUserDatabase()

      await db.priorities.bulkAdd([
        {
          id: 'p-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lifeAreaIds: [lifeArea.id],
          year: 2026,
          name: 'Priority 2026',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'p-2',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          lifeAreaIds: [lifeArea.id],
          year: 2025,
          name: 'Priority 2025',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        },
      ])

      await store.loadPriorities(2026)

      expect(store.priorities).toHaveLength(1)
      expect(store.priorities[0].name).toBe('Priority 2026')
    })

    it('loads priorities filtered by life area ID', async () => {
      const store = usePriorityStore()
      const la1 = await createTestLifeArea('Life Area 1')
      const la2 = await createTestLifeArea('Life Area 2')
      const db = getUserDatabase()

      await db.priorities.bulkAdd([
        {
          id: 'p-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lifeAreaIds: [la1.id],
          year: 2026,
          name: 'LA1 Priority',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'p-2',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lifeAreaIds: [la2.id],
          year: 2026,
          name: 'LA2 Priority',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        },
      ])

      await store.loadPriorities(undefined, la1.id)

      expect(store.priorities).toHaveLength(1)
      expect(store.priorities[0].name).toBe('LA1 Priority')
    })
  })

  describe('createPriority', () => {
    it('creates a new priority with auto-generated fields', async () => {
      const store = usePriorityStore()
      const lifeArea = await createTestLifeArea()

      const payload: CreatePriorityPayload = {
        lifeAreaIds: [lifeArea.id],
        year: 2026,
        name: 'Build consistent exercise habit',
        icon: 'flag',
        successSignals: ['Exercise 3x/week', 'Feel energized'],
        constraints: ['No injuries', 'Keep time for family'],
        isActive: true,
        sortOrder: 0,
      }

      const created = await store.createPriority(payload)

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.name).toBe('Build consistent exercise habit')
      expect(created.icon).toBe('flag')
      expect(created.lifeAreaIds).toEqual([lifeArea.id])
      expect(created.successSignals).toEqual(['Exercise 3x/week', 'Feel energized'])
      expect(created.constraints).toEqual(['No injuries', 'Keep time for family'])

      expect(store.priorities).toHaveLength(1)
      expect(store.priorities[0].id).toBe(created.id)

      const db = getUserDatabase()
      const persisted = await db.priorities.get(created.id)
      expect(persisted).toBeDefined()
      expect(persisted?.name).toBe('Build consistent exercise habit')
      expect(persisted?.icon).toBe('flag')
    })

    it('throws error when lifeAreaId does not exist', async () => {
      const store = usePriorityStore()

      await expect(
        store.createPriority({
          lifeAreaIds: ['missing-life-area'],
          year: 2026,
          name: 'Invalid priority',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        })
      ).rejects.toThrow('Life Area')
    })
  })

  describe('updatePriority', () => {
    it('updates priority fields', async () => {
      const store = usePriorityStore()
      const la1 = await createTestLifeArea('Life Area 1')
      const la2 = await createTestLifeArea('Life Area 2')

      const created = await store.createPriority({
        lifeAreaIds: [la1.id],
        year: 2026,
        name: 'Original',
        successSignals: [],
        isActive: true,
        sortOrder: 0,
      })

      const updated = await store.updatePriority(created.id, {
        name: 'Updated',
        icon: 'trophy',
        lifeAreaIds: [la2.id],
      })

      expect(updated.name).toBe('Updated')
      expect(updated.icon).toBe('trophy')
      expect(updated.lifeAreaIds).toEqual([la2.id])
    })

    it('throws error when updating to an invalid life area', async () => {
      const store = usePriorityStore()
      const la1 = await createTestLifeArea('Life Area 1')

      const created = await store.createPriority({
        lifeAreaIds: [la1.id],
        year: 2026,
        name: 'Original',
        successSignals: [],
        isActive: true,
        sortOrder: 0,
      })

      await expect(
        store.updatePriority(created.id, {
          lifeAreaIds: ['missing-life-area'],
        })
      ).rejects.toThrow('Life Area')

      expect(store.priorities[0].lifeAreaIds).toEqual([la1.id])
    })
  })

  describe('getActivePriorities', () => {
    it('filters priorities by active life areas', async () => {
      const store = usePriorityStore()
      const activeLifeArea = await createTestLifeArea('Active Area', true)
      const inactiveLifeArea = await createTestLifeArea('Inactive Area', false)

      await store.createPriority({
        lifeAreaIds: [activeLifeArea.id],
        year: 2026,
        name: 'Active Priority',
        successSignals: [],
        isActive: true,
        sortOrder: 0,
      })
      await store.createPriority({
        lifeAreaIds: [inactiveLifeArea.id],
        year: 2026,
        name: 'Inactive Priority',
        successSignals: [],
        isActive: true,
        sortOrder: 1,
      })
      await store.createPriority({
        lifeAreaIds: [],
        year: 2026,
        name: 'Unlinked Priority',
        successSignals: [],
        isActive: true,
        sortOrder: 2,
      })

      const active = store.getActivePriorities(2026)

      expect(active.map((p) => p.name)).toEqual(['Active Priority', 'Unlinked Priority'])
    })
  })

  describe('deletePriority', () => {
    it('removes priority from state and database', async () => {
      const store = usePriorityStore()
      const lifeArea = await createTestLifeArea()

      const created = await store.createPriority({
        lifeAreaIds: [lifeArea.id],
        year: 2026,
        name: 'Priority',
        successSignals: [],
        isActive: true,
        sortOrder: 0,
      })

      await store.deletePriority(created.id)

      expect(store.priorities).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.priorities.get(created.id)
      expect(persisted).toBeUndefined()
    })
  })
})
