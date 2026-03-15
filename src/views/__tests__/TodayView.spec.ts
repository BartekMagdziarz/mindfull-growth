import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import TodayView from '@/views/TodayView.vue'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef } from '@/domain/period'
import { getPeriodRefsForDate, parsePeriodRef } from '@/utils/periods'

const FIXED_TIME = new Date('2026-03-12T12:00:00.000Z').getTime()

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/today', name: 'today', component: TodayView },
      {
        path: '/calendar/week/:weekRef',
        name: 'calendar-week',
        component: { template: '<div />' },
      },
      {
        path: '/calendar/month/:monthRef',
        name: 'calendar-month',
        component: { template: '<div />' },
      },
      { path: '/calendar/day/:dayRef', name: 'calendar-day', component: { template: '<div />' } },
      { path: '/objects/:family', name: 'objects-family', component: { template: '<div />' } },
    ],
  })
}

describe('TodayView', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIME)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders columns with items, records a completion entry, and opens object details', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Morning focus',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Energy score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'value',
      status: 'open',
    })

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: refs.month,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: refs.week,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef,
      subjectType: 'habit',
      subjectId: habit.id,
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: refs.month,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })

    const router = createTestRouter()
    await router.push('/today')
    await router.isReady()

    render(TodayView, {
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByText('Morning focus')).toBeInTheDocument()
    expect(screen.getByText('Habits')).toBeInTheDocument()
    expect(screen.getByText('Trackers')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Record today' }))
    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getDailyMeasurementEntry('habit', habit.id, dayRef)
      ).toBeDefined()
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Morning focus' }))
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('objects-family')
    })
    expect(router.currentRoute.value.params.family).toBe('habits')
    expect(router.currentRoute.value.query.expandedType).toBe('habit')
    expect(router.currentRoute.value.query.expandedId).toBe(habit.id)
    expect(goal.id).toBeTruthy()
  })

  it('deletes scheduled initiatives only after confirmation', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const initiative = await initiativeDexieRepository.create({
      title: 'Book photographer',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await planningStateDexieRepository.upsertInitiativePlanState({
      initiativeId: initiative.id,
      monthRef: refs.month,
      weekRef: refs.week,
      dayRef,
    })

    const router = createTestRouter()
    await router.push('/today')
    await router.isReady()

    render(TodayView, {
      global: {
        plugins: [router],
      },
    })

    await screen.findByText('Book photographer')

    // Open the overflow menu on the initiative card
    const itemText = screen.getByText('Book photographer')
    const card = itemText.closest('article')!
    const overflowBtn = card.querySelector('[aria-label="More actions"]')!
    await fireEvent.click(overflowBtn)

    await fireEvent.click(await screen.findByText('Delete'))
    // Confirm in dialog
    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!)
    await waitFor(async () => {
      expect(await initiativeDexieRepository.getById(initiative.id)).toBeUndefined()
    })
  })
})
