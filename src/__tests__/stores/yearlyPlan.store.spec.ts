/**
 * Yearly Plan Store Tests
 *
 * Unit tests for useYearlyPlanStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Current period detection
 * - Sorting and date-based filtering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import { mockDate } from '../utils/mockDate'

describe('useYearlyPlanStore', () => {
  let restoreDate: (() => void) | null = null

  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-yearly-plan')

    const db = getUserDatabase()
    await db.yearlyPlans.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
    if (restoreDate) {
      restoreDate()
      restoreDate = null
    }
    vi.restoreAllMocks()
  })

  describe('loadYearlyPlans', () => {
    it('loads all yearly plans from the database', async () => {
      const store = useYearlyPlanStore()
      const db = getUserDatabase()

      await db.yearlyPlans.bulkAdd([
        {
          id: 'yp-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          year: 2026,
          focusLifeAreaIds: [],
        },
        {
          id: 'yp-2',
          createdAt: '2027-01-01T00:00:00.000Z',
          updatedAt: '2027-01-01T00:00:00.000Z',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          year: 2027,
          focusLifeAreaIds: [],
        },
      ])

      await store.loadYearlyPlans()

      expect(store.yearlyPlans).toHaveLength(2)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('loads yearly plans filtered by year', async () => {
      const store = useYearlyPlanStore()
      const db = getUserDatabase()

      await db.yearlyPlans.bulkAdd([
        {
          id: 'yp-2026',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          year: 2026,
          focusLifeAreaIds: [],
        },
        {
          id: 'yp-2027',
          createdAt: '2027-01-01T00:00:00.000Z',
          updatedAt: '2027-01-01T00:00:00.000Z',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          year: 2027,
          focusLifeAreaIds: [],
        },
      ])

      await store.loadYearlyPlans({ year: 2026 })

      expect(store.yearlyPlans).toHaveLength(1)
      expect(store.yearlyPlans[0].year).toBe(2026)
    })
  })

  describe('createYearlyPlan', () => {
    it('creates a new yearly plan with auto-generated fields', async () => {
      const store = useYearlyPlanStore()

      const created = await store.createYearlyPlan({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        name: '2026 Plan',
        year: 2026,
        focusLifeAreaIds: [],
        primaryFocusLifeAreaId: undefined,
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.name).toBe('2026 Plan')
      expect(created.year).toBe(2026)
    })
  })

  describe('updateYearlyPlan', () => {
    it('updates an existing yearly plan', async () => {
      const store = useYearlyPlanStore()

      const created = await store.createYearlyPlan({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
        primaryFocusLifeAreaId: undefined,
      })

      const updated = await store.updateYearlyPlan(created.id, {
        yearTheme: 'Balance',
      })

      expect(updated.yearTheme).toBe('Balance')
    })
  })

  describe('deleteYearlyPlan', () => {
    it('deletes a yearly plan from state and database', async () => {
      const store = useYearlyPlanStore()

      const created = await store.createYearlyPlan({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
        primaryFocusLifeAreaId: undefined,
      })

      await store.deleteYearlyPlan(created.id)

      expect(store.yearlyPlans).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.yearlyPlans.get(created.id)
      expect(persisted).toBeUndefined()
    })
  })

  describe('getCurrentYearPlans', () => {
    it('returns plans that overlap today', async () => {
      restoreDate = mockDate('2026-06-15T12:00:00.000Z')

      const store = useYearlyPlanStore()
      const db = getUserDatabase()

      await db.yearlyPlans.add({
        id: 'yp-current',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
      })

      await store.loadYearlyPlans()

      const current = store.getCurrentYearPlans
      expect(current).toHaveLength(1)
      expect(current[0].id).toBe('yp-current')
    })
  })

  describe('getYearlyPlansByDate', () => {
    it('returns plans overlapping the given date', async () => {
      const store = useYearlyPlanStore()
      const db = getUserDatabase()

      await db.yearlyPlans.bulkAdd([
        {
          id: 'yp-2026',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          year: 2026,
          focusLifeAreaIds: [],
        },
        {
          id: 'yp-2027',
          createdAt: '2027-01-01T00:00:00.000Z',
          updatedAt: '2027-01-01T00:00:00.000Z',
          startDate: '2027-01-01',
          endDate: '2027-12-31',
          year: 2027,
          focusLifeAreaIds: [],
        },
      ])

      await store.loadYearlyPlans()

      const plans = store.getYearlyPlansByDate('2026-06-01')
      expect(plans).toHaveLength(1)
      expect(plans[0].id).toBe('yp-2026')
    })
  })

  describe('sortedYearlyPlans', () => {
    it('returns plans sorted by startDate descending', async () => {
      const store = useYearlyPlanStore()

      await store.createYearlyPlan({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        year: 2025,
        focusLifeAreaIds: [],
        primaryFocusLifeAreaId: undefined,
      })
      await store.createYearlyPlan({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
        primaryFocusLifeAreaId: undefined,
      })

      const sorted = store.sortedYearlyPlans
      expect(sorted[0].year).toBe(2026)
      expect(sorted[1].year).toBe(2025)
    })
  })
})
