/**
 * Weekly Plan Store Tests
 *
 * Unit tests for useWeeklyPlanStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Current period detection
 * - Sorting by startDate
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import { mockDate } from '../utils/mockDate'

describe('useWeeklyPlanStore', () => {
  let restoreDate: (() => void) | null = null

  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-weekly-plan')

    const db = getUserDatabase()
    await db.weeklyPlans.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
    if (restoreDate) {
      restoreDate()
      restoreDate = null
    }
    vi.restoreAllMocks()
  })

  describe('loadWeeklyPlans', () => {
    it('loads all weekly plans from the database', async () => {
      const store = useWeeklyPlanStore()
      const db = getUserDatabase()

      await db.weeklyPlans.bulkAdd([
        {
          id: 'wp-1',
          createdAt: '2026-01-12T00:00:00.000Z',
          updatedAt: '2026-01-12T00:00:00.000Z',
          startDate: '2026-01-12',
          endDate: '2026-01-18',
        },
        {
          id: 'wp-2',
          createdAt: '2026-01-19T00:00:00.000Z',
          updatedAt: '2026-01-19T00:00:00.000Z',
          startDate: '2026-01-19',
          endDate: '2026-01-25',
        },
      ])

      await store.loadWeeklyPlans()

      expect(store.weeklyPlans).toHaveLength(2)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('loads weekly plans filtered by year', async () => {
      const store = useWeeklyPlanStore()
      const db = getUserDatabase()

      await db.weeklyPlans.bulkAdd([
        {
          id: 'wp-2026',
          createdAt: '2026-01-12T00:00:00.000Z',
          updatedAt: '2026-01-12T00:00:00.000Z',
          startDate: '2026-01-12',
          endDate: '2026-01-18',
        },
        {
          id: 'wp-2027',
          createdAt: '2027-01-04T00:00:00.000Z',
          updatedAt: '2027-01-04T00:00:00.000Z',
          startDate: '2027-01-04',
          endDate: '2027-01-10',
        },
      ])

      await store.loadWeeklyPlans({ year: 2026 })

      expect(store.weeklyPlans).toHaveLength(1)
      expect(store.weeklyPlans[0].startDate).toBe('2026-01-12')
    })
  })

  describe('createWeeklyPlan', () => {
    it('creates a new weekly plan with auto-generated fields', async () => {
      const store = useWeeklyPlanStore()

      const created = await store.createWeeklyPlan({
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        name: 'Week 3',
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.startDate).toBe('2026-01-12')
      expect(created.endDate).toBe('2026-01-18')
      expect(created.name).toBe('Week 3')
    })
  })

  describe('updateWeeklyPlan', () => {
    it('updates an existing weekly plan', async () => {
      const store = useWeeklyPlanStore()

      const created = await store.createWeeklyPlan({
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        name: 'Week 3',
      })

      const updated = await store.updateWeeklyPlan(created.id, {
        capacityNote: 'Busy week',
      })

      expect(updated.capacityNote).toBe('Busy week')
    })
  })

  describe('deleteWeeklyPlan', () => {
    it('deletes a weekly plan from state and database', async () => {
      const store = useWeeklyPlanStore()

      const created = await store.createWeeklyPlan({
        startDate: '2026-01-12',
        endDate: '2026-01-18',
      })

      await store.deleteWeeklyPlan(created.id)

      expect(store.weeklyPlans).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.weeklyPlans.get(created.id)
      expect(persisted).toBeUndefined()
    })
  })

  describe('getCurrentWeekPlans', () => {
    it('returns plans that overlap today', async () => {
      restoreDate = mockDate('2026-01-15T12:00:00.000Z')

      const store = useWeeklyPlanStore()
      const db = getUserDatabase()

      await db.weeklyPlans.add({
        id: 'wp-current',
        createdAt: '2026-01-12T00:00:00.000Z',
        updatedAt: '2026-01-12T00:00:00.000Z',
        startDate: '2026-01-12',
        endDate: '2026-01-18',
      })

      await store.loadWeeklyPlans()

      const current = store.getCurrentWeekPlans
      expect(current).toHaveLength(1)
      expect(current[0].id).toBe('wp-current')
    })
  })

  describe('sortedWeeklyPlans', () => {
    it('returns plans sorted by startDate descending', async () => {
      const store = useWeeklyPlanStore()

      await store.createWeeklyPlan({
        startDate: '2026-01-05',
        endDate: '2026-01-11',
      })
      await store.createWeeklyPlan({
        startDate: '2026-01-19',
        endDate: '2026-01-25',
      })

      const sorted = store.sortedWeeklyPlans
      expect(sorted[0].startDate).toBe('2026-01-19')
      expect(sorted[1].startDate).toBe('2026-01-05')
    })
  })
})
