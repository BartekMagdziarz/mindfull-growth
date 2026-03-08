/**
 * Monthly Plan Store Tests
 *
 * Unit tests for useMonthlyPlanStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Current period detection
 * - Filtering by year and date range
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import { mockDate } from '../utils/mockDate'

describe('useMonthlyPlanStore', () => {
  let restoreDate: (() => void) | null = null

  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-monthly-plan')

    const db = getUserDatabase()
    await db.monthlyPlans.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
    if (restoreDate) {
      restoreDate()
      restoreDate = null
    }
    vi.restoreAllMocks()
  })

  describe('loadMonthlyPlans', () => {
    it('loads all monthly plans from the database', async () => {
      const store = useMonthlyPlanStore()
      const db = getUserDatabase()

      await db.monthlyPlans.bulkAdd([
        {
          id: 'mp-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          name: 'January 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
        {
          id: 'mp-2',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          name: 'February 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
      ])

      await store.loadMonthlyPlans()

      expect(store.monthlyPlans).toHaveLength(2)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('loads monthly plans filtered by year', async () => {
      const store = useMonthlyPlanStore()
      const db = getUserDatabase()

      await db.monthlyPlans.bulkAdd([
        {
          id: 'mp-2026',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          name: 'January 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
        {
          id: 'mp-2027',
          createdAt: '2027-01-01T00:00:00.000Z',
          updatedAt: '2027-01-01T00:00:00.000Z',
          startDate: '2027-01-01',
          endDate: '2027-01-31',
          name: 'January 2027',
          year: 2027,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
      ])

      await store.loadMonthlyPlans({ year: 2026 })

      expect(store.monthlyPlans).toHaveLength(1)
      expect(store.monthlyPlans[0].year).toBe(2026)
    })

    it('loads monthly plans overlapping a date range', async () => {
      const store = useMonthlyPlanStore()
      const db = getUserDatabase()

      await db.monthlyPlans.bulkAdd([
        {
          id: 'mp-jan',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          name: 'January 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
        {
          id: 'mp-feb',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          name: 'February 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
      ])

      await store.loadMonthlyPlans({ startDate: '2026-02-10', endDate: '2026-02-15' })

      expect(store.monthlyPlans).toHaveLength(1)
      expect(store.monthlyPlans[0].id).toBe('mp-feb')
    })
  })

  describe('createMonthlyPlan', () => {
    it('creates a new monthly plan with auto-generated fields', async () => {
      const store = useMonthlyPlanStore()

      const created = await store.createMonthlyPlan({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        name: 'March 2026',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.name).toBe('March 2026')
      expect(created.startDate).toBe('2026-03-01')
    })
  })

  describe('updateMonthlyPlan', () => {
    it('updates an existing monthly plan', async () => {
      const store = useMonthlyPlanStore()

      const created = await store.createMonthlyPlan({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        name: 'March 2026',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
      })

      const updated = await store.updateMonthlyPlan(created.id, {
        name: 'Updated March',
        monthIntention: 'Momentum',
      })

      expect(updated.name).toBe('Updated March')
      expect(updated.monthIntention).toBe('Momentum')
    })
  })

  describe('deleteMonthlyPlan', () => {
    it('deletes a monthly plan from state and database', async () => {
      const store = useMonthlyPlanStore()

      const created = await store.createMonthlyPlan({
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        name: 'April 2026',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
      })

      await store.deleteMonthlyPlan(created.id)

      expect(store.monthlyPlans).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.monthlyPlans.get(created.id)
      expect(persisted).toBeUndefined()
    })
  })

  describe('getCurrentMonthPlans', () => {
    it('returns plans that overlap today', async () => {
      restoreDate = mockDate('2026-01-15T12:00:00.000Z')

      const store = useMonthlyPlanStore()
      const db = getUserDatabase()

      await db.monthlyPlans.add({
        id: 'mp-jan',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        name: 'January 2026',
        year: 2026,
        secondaryFocusLifeAreaIds: [],
        projectIds: [],
      })

      await store.loadMonthlyPlans()

      const current = store.getCurrentMonthPlans
      expect(current).toHaveLength(1)
      expect(current[0].id).toBe('mp-jan')
    })
  })

  describe('canonical monthly plans', () => {
    it('prefers the newest updated monthly plan for a period', async () => {
      const store = useMonthlyPlanStore()
      const db = getUserDatabase()

      await db.monthlyPlans.bulkAdd([
        {
          id: 'mp-old',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          name: 'February 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
        {
          id: 'mp-new',
          createdAt: '2026-02-02T00:00:00.000Z',
          updatedAt: '2026-02-03T00:00:00.000Z',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
          name: 'February 2026',
          year: 2026,
          secondaryFocusLifeAreaIds: [],
          projectIds: [],
        },
      ])

      await store.loadMonthlyPlans()

      expect(store.getCanonicalMonthlyPlanByPeriod('2026-02-01', '2026-02-28')?.id).toBe('mp-new')
      expect(store.canonicalMonthlyPlans).toHaveLength(1)
    })
  })
})
