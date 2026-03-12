/**
 * Life Area Store Tests
 *
 * Unit tests for useLifeAreaStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Sorting and active filtering
 * - Reordering and active toggling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'

function buildLifeArea(id: string, name: string, sortOrder: number, isActive = true) {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name,
    measures: [],
    reviewCadence: 'monthly' as const,
    isActive,
    sortOrder,
  }
}

describe('useLifeAreaStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-life-area')

    const db = getUserDatabase()
    await db.lifeAreas.clear()
    await db.lifeAreaAssessments.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  describe('loadLifeAreas', () => {
    it('loads all life areas from the database', async () => {
      const store = useLifeAreaStore()
      const db = getUserDatabase()

      await db.lifeAreas.bulkAdd([
        buildLifeArea('la-1', 'Health', 0),
        buildLifeArea('la-2', 'Career', 1, false),
      ])

      await store.loadLifeAreas()

      expect(store.lifeAreas).toHaveLength(2)
      expect(store.lifeAreas.map((la) => la.name)).toContain('Health')
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('createLifeArea', () => {
    it('creates a new life area with auto-generated fields', async () => {
      const store = useLifeAreaStore()

      const created = await store.createLifeArea({
        name: 'Health & Fitness',
        icon: 'heart',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.name).toBe('Health & Fitness')
      expect(created.icon).toBe('heart')

      const db = getUserDatabase()
      const persisted = await db.lifeAreas.get(created.id)
      expect(persisted).toBeDefined()
      expect(persisted?.name).toBe('Health & Fitness')
      expect(persisted?.icon).toBe('heart')
    })
  })

  describe('updateLifeArea', () => {
    it('updates an existing life area', async () => {
      const store = useLifeAreaStore()

      const created = await store.createLifeArea({
        name: 'Career',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })

      const updated = await store.updateLifeArea(created.id, {
        name: 'Career & Work',
        icon: 'briefcase',
        reviewCadence: 'quarterly',
      })

      expect(updated.name).toBe('Career & Work')
      expect(updated.icon).toBe('briefcase')
      expect(updated.reviewCadence).toBe('quarterly')
    })
  })

  describe('deleteLifeArea', () => {
    it('deletes a life area from state and database', async () => {
      const store = useLifeAreaStore()

      const created = await store.createLifeArea({
        name: 'Finances',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })

      await store.deleteLifeArea(created.id)

      expect(store.lifeAreas).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.lifeAreas.get(created.id)
      expect(persisted).toBeUndefined()
    })

    it('blocks permanent deletion when assessment history exists', async () => {
      const store = useLifeAreaStore()
      const db = getUserDatabase()

      const created = await store.createLifeArea({
        name: 'Health',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })

      await db.lifeAreaAssessments.put({
        id: 'assessment-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        scope: 'full',
        lifeAreaIds: [created.id],
        items: [
          {
            lifeAreaId: created.id,
            lifeAreaNameSnapshot: 'Health',
            score: 6,
          },
        ],
      })

      await expect(store.deleteLifeArea(created.id)).rejects.toThrow('assessment history')
      expect(await db.lifeAreas.get(created.id)).toBeDefined()
    })
  })

  describe('reorderLifeAreas', () => {
    it('updates sortOrder for the provided list', async () => {
      const store = useLifeAreaStore()

      const first = await store.createLifeArea({
        name: 'Health',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })
      const second = await store.createLifeArea({
        name: 'Relationships',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 1,
      })

      await store.loadLifeAreas()
      await store.reorderLifeAreas([second.id, first.id])

      const reorderedFirst = store.getLifeAreaById(first.id)
      const reorderedSecond = store.getLifeAreaById(second.id)

      expect(reorderedSecond?.sortOrder).toBe(0)
      expect(reorderedFirst?.sortOrder).toBe(1)
    })
  })

  describe('activeLifeAreas', () => {
    it('filters inactive life areas', async () => {
      const store = useLifeAreaStore()

      await store.createLifeArea({
        name: 'Health',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })
      await store.createLifeArea({
        name: 'Hobbies',
        measures: [],
        reviewCadence: 'monthly',
        isActive: false,
        sortOrder: 1,
      })

      const active = store.activeLifeAreas
      expect(active).toHaveLength(1)
      expect(active[0].name).toBe('Health')
    })
  })

  describe('setLifeAreaActive', () => {
    it('toggles the active flag', async () => {
      const store = useLifeAreaStore()

      const created = await store.createLifeArea({
        name: 'Personal Growth',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      })

      const updated = await store.setLifeAreaActive(created.id, false)
      expect(updated.isActive).toBe(false)
    })
  })

  describe('seedDefaultAreas', () => {
    it('assigns default icon IDs for seeded life areas', async () => {
      const store = useLifeAreaStore()

      await store.seedDefaultAreas()

      expect(store.lifeAreas.length).toBeGreaterThan(0)
      expect(
        store.lifeAreas.every((lifeArea) => typeof lifeArea.icon === 'string' && lifeArea.icon.length > 0)
      ).toBe(true)
    })
  })
})
