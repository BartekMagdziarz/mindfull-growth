import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarView from '../CalendarView.vue'
import { connectTestDatabase } from '@/test/testDatabase'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import type { MonthRef, WeekRef } from '@/domain/period'
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
        props: route => ({ scale: 'year', periodRef: route.params.yearRef }),
      },
      {
        path: '/calendar/month/:monthRef',
        name: 'calendar-month',
        component: CalendarView,
        props: route => ({ scale: 'month', periodRef: route.params.monthRef }),
      },
      {
        path: '/calendar/week/:weekRef',
        name: 'calendar-week',
        component: CalendarView,
        props: route => ({ scale: 'week', periodRef: route.params.weekRef }),
      },
      {
        path: '/calendar/day/:dayRef',
        name: 'calendar-day',
        component: CalendarView,
        props: route => ({ scale: 'day', periodRef: route.params.dayRef }),
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
    const db = await connectTestDatabase()
    await db.periodObjectReflections.clear()
    await db.periodReflections.clear()
    await db.trackerEntries.clear()
    await db.trackerWeekStates.clear()
    await db.trackerMonthStates.clear()
    await db.initiativePlanStates.clear()
    await db.cadencedDayAssignments.clear()
    await db.cadencedWeekStates.clear()
    await db.cadencedMonthStates.clear()
    await db.goalMonthStates.clear()
    await db.weekPlans.clear()
    await db.monthPlans.clear()
    await db.keyResults.clear()
    await db.goals.clear()
    await db.habits.clear()
    await db.trackers.clear()
    await db.initiatives.clear()
  })

  it('renders grouped week sections and honest plan actions from persisted plan state', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    const goal = await goalDexieRepository.create({
      title: 'Launch planning hub',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Review open work',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
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
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 3,
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
    expect(screen.getByRole('heading', { name: 'To plan this week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view plan record/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit reflection/i })).toBeInTheDocument()
    expect(screen.getByText('Review open work')).toBeInTheDocument()
  })

  it('keeps the side panel collapsed until the user opens an action', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    const goal = await goalDexieRepository.create({
      title: 'Launch planning hub',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
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
    expect(screen.queryByRole('heading', { name: 'Week plan' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /create plan/i }))

    expect(screen.getByRole('heading', { name: 'Week plan' })).toBeInTheDocument()
  })

  it('hides empty summary metrics and the removed subtitle copy', async () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

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
    expect(
      screen.queryByText('Navigate one planning workspace across year, month, week, and day.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Plan ready')).not.toBeInTheDocument()
    expect(screen.queryByText('Reflection ready')).not.toBeInTheDocument()
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
      kind: 'generic',
      config: {},
      status: 'open',
    })

    await planningStateDexieRepository.upsertGoalMonthState({
      monthRef,
      goalId: goal.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertCadencedMonthState({
      monthRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
    })
    await planningStateDexieRepository.upsertCadencedWeekState({
      weekRef: parsePeriodRef('2026-W10') as WeekRef,
      subjectType: 'keyResult',
      subjectId: keyResult.id,
      activityState: 'active',
      planningMode: 'specific-days',
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
