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

  it('renders the three sections, records a completion entry, and opens object details', async () => {
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
    expect(screen.getByRole('heading', { name: 'Scheduled for today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active this week' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active this month' })).toBeInTheDocument()

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

  it('hides and restores month context items for the current day only', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const tracker = await trackerDexieRepository.create({
      title: 'Mood average',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'rating',
      status: 'open',
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

    expect(await screen.findByRole('button', { name: 'Hide for today' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Hide for today' }))

    expect(await screen.findByRole('heading', { name: 'Hidden for today (1)' })).toBeInTheDocument()
    await fireEvent.click(
      screen.getByRole('button', {
        name: /Hidden for today \(1\).*Show hidden/i,
      })
    )
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hide for today' })).toBeInTheDocument()
    })
  })

  it('moves scheduled measurement items to another day', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const nextDayRef = parsePeriodRef('2026-03-13') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
    const habit = await habitDexieRepository.create({
      title: 'Inbox zero',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 1 },
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

    const router = createTestRouter()
    await router.push('/today')
    await router.isReady()

    render(TodayView, {
      global: {
        plugins: [router],
      },
    })

    const moveInput = await screen.findByLabelText('Move to day')
    await fireEvent.update(moveInput, nextDayRef)
    await fireEvent.click(screen.getByRole('button', { name: 'Move to day' }))
    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementDayAssignment(
          nextDayRef,
          'habit',
          habit.id
        )
      ).toBeDefined()
    })
    expect(
      await planningStateDexieRepository.getMeasurementDayAssignment(dayRef, 'habit', habit.id)
    ).toBeUndefined()
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

    await fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!)
    await waitFor(async () => {
      expect(await initiativeDexieRepository.getById(initiative.id)).toBeUndefined()
    })
  })

  it('opens the current month in Calendar from Today context', async () => {
    const dayRef = parsePeriodRef('2026-03-12') as DayRef
    const refs = getPeriodRefsForDate(dayRef)
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

    await fireEvent.click(await screen.findByRole('button', { name: 'Open month' }))
    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('calendar-month')
    })
    expect(router.currentRoute.value.params.monthRef).toBe(refs.month)
  })
})
