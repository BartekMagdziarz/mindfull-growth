import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarView from '../CalendarView.vue'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/calendar/year/:yearRef',
        name: 'calendar-year',
        component: CalendarView,
        props: (route) => ({ scale: 'year', periodRef: route.params.yearRef }),
      },
      {
        path: '/calendar/month/:monthRef',
        name: 'calendar-month',
        component: CalendarView,
        props: (route) => ({ scale: 'month', periodRef: route.params.monthRef }),
      },
      {
        path: '/calendar/week/:weekRef',
        name: 'calendar-week',
        component: CalendarView,
        props: (route) => ({ scale: 'week', periodRef: route.params.weekRef }),
      },
      {
        path: '/calendar/day/:dayRef',
        name: 'calendar-day',
        component: CalendarView,
        props: (route) => ({ scale: 'day', periodRef: route.params.dayRef }),
      },
      {
        path: '/objects/:family',
        name: 'objects-family',
        component: { template: '<div />' },
      },
    ],
  })
}

describe('CalendarView', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('renders week sections and shared measurement cards from persisted state', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const goal = await goalDexieRepository.create({
      title: 'Launch planning hub',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship weekly milestone',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Review open work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 4,
      },
      status: 'open',
    })
    const tracker = await trackerDexieRepository.create({
      title: 'Confidence score',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'rating',
      status: 'open',
    })

    await periodPlanDexieRepository.createWeekPlan({ weekRef })
    await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: 'Reflection already exists',
    })
    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      sourceMonthRef: monthRef,
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
      monthRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-week',
    })

    const router = createTestRouter()
    await router.push(`/calendar/week/${weekRef}`)
    await router.isReady()

    render(CalendarView, {
      props: {
        scale: 'week',
        periodRef: weekRef,
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByRole('heading', { name: 'Planned this week' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Assigned to days' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'To plan this week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view plan record/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit reflection/i })).toBeInTheDocument()
    expect(screen.getAllByText('Review open work').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Confidence score').length).toBeGreaterThan(0)
  })

  it('shows day entries for the shared measurement model', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const tracker = await trackerDexieRepository.create({
      title: 'Energy',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'value',
      status: 'open',
    })

    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      subjectType: 'tracker',
      subjectId: tracker.id,
      activityState: 'active',
      scheduleScope: 'whole-week',
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'tracker',
      subjectId: tracker.id,
      dayRef,
      value: 8,
    })

    const router = createTestRouter()
    await router.push(`/calendar/day/${dayRef}`)
    await router.isReady()

    render(CalendarView, {
      props: {
        scale: 'day',
        periodRef: dayRef,
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByRole('heading', { name: 'Entries today' })).toBeInTheDocument()
    expect(screen.getAllByText('Energy').length).toBeGreaterThan(0)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('routes month cards into the Objects Library detail panel', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    const goal = await goalDexieRepository.create({
      title: 'Launch planning hub',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Ship weekly milestone',
      isActive: true,
      goalId: goal.id,
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })

    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })

    const router = createTestRouter()
    await router.push(`/calendar/month/${monthRef}`)
    await router.isReady()

    render(CalendarView, {
      props: {
        scale: 'month',
        periodRef: monthRef,
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByRole('heading', { name: 'Key results' })).toBeInTheDocument()

    await fireEvent.click(screen.getByText('Ship weekly milestone'))

    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('objects-family')
    })
    expect(router.currentRoute.value.params.family).toBe('goals')
    expect(router.currentRoute.value.query.expandedType).toBe('keyResult')
    expect(router.currentRoute.value.query.expandedId).toBe(keyResult.id)
  })
})
