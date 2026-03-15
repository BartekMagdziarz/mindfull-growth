import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue'
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
    await resetPlanningTestData()
  })

  it('renders week sections and shared measurement cards from persisted state', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const dayRef = parsePeriodRef('2026-03-12') as DayRef

    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
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

    expect(await screen.findByRole('heading', { name: 'Habits' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trackers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit plan/i })).toBeInTheDocument()
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
      title: 'Ship weekly workspace',
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

    expect(await screen.findByText('Ship weekly milestone')).toBeInTheDocument()

    // KRs are now nested inside goal summary cards — clicking navigates to the goal
    const goalCard = screen.getByText('Ship weekly workspace').closest('article')
    expect(goalCard).toBeTruthy()
    await fireEvent.click(goalCard as HTMLElement)

    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('objects-family')
    })
    expect(router.currentRoute.value.params.family).toBe('goals')
    expect(router.currentRoute.value.query.expandedType).toBe('goal')
    expect(router.currentRoute.value.query.expandedId).toBe(goal.id)
  })

  it('opens the monthly planner as a single workspace and assigns weekly objects across the month', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const habit = await habitDexieRepository.create({
      title: 'Weekly review',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 3,
      },
      status: 'open',
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

    await fireEvent.click(await screen.findByRole('button', { name: /create plan/i }))

    const getPlanner = () => screen.getByTestId('monthly-planner')

    await waitFor(
      () => {
        expect(screen.getByTestId('monthly-planner')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    await waitFor(() => {
      expect(
        within(getPlanner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Activate goal on the Goals tab — find the goal header container (neo-inset)
    const goalTitleEl = within(getPlanner()).getByText(goal.title)
    const goalCard = goalTitleEl.closest('.neo-inset')
    expect(goalCard).toBeTruthy()
    await fireEvent.click(
      within(goalCard as HTMLElement).getByRole('button', { name: 'Activate' })
    )

    await waitFor(async () => {
      expect(await planningStateDexieRepository.getGoalMonthState(monthRef, goal.id)).toBeTruthy()
    })
    await waitFor(() => {
      expect(
        within(getPlanner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Switch to Habits tab
    await fireEvent.click(within(getPlanner()).getByText('Habits'))

    // Expand habit accordion item
    const habitTitle = within(getPlanner()).getByText(habit.title)
    await fireEvent.click(habitTitle)

    const habitRow = habitTitle.closest('article')
    expect(habitRow).toBeTruthy()
    await fireEvent.click(within(habitRow as HTMLElement).getByRole('button', { name: 'Activate' }))

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'habit', habit.id)
      ).toBeTruthy()
    })
    await waitFor(() => {
      expect(
        within(getPlanner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Accordion stays expanded after reload — click Assign directly
    await waitFor(() => {
      const row = within(getPlanner()).getByText(habit.title).closest('article')
      expect(within(row as HTMLElement).getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    })

    const refreshedHabitRow = within(getPlanner()).getByText(habit.title).closest('article')
    expect(refreshedHabitRow).toBeTruthy()
    await fireEvent.click(
      within(refreshedHabitRow as HTMLElement).getByRole('button', { name: 'Assign' })
    )

    await waitFor(() => {
      expect(within(getPlanner()).getByRole('button', { name: 'Whole month' })).toBeInTheDocument()
    })
    await fireEvent.click(within(getPlanner()).getByRole('button', { name: 'Whole month' }))

    await waitFor(async () => {
      const weekStates = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
        'habit',
        habit.id
      )
      const monthWeekStates = weekStates.filter(state => state.weekRef.startsWith('2026-W'))
      expect(monthWeekStates.length).toBeGreaterThanOrEqual(4)
      expect(monthWeekStates.every(state => state.scheduleScope === 'whole-week')).toBe(true)
    })
  })

  it('reflects day assignments inside the monthly planner calendar', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const habit = await habitDexieRepository.create({
      title: 'Day planning habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 2,
      },
      status: 'open',
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

    await fireEvent.click(await screen.findByRole('button', { name: /create plan/i }))
    await waitFor(() => {
      expect(screen.getByTestId('monthly-planner')).toBeInTheDocument()
    })

    const planner = () => screen.getByTestId('monthly-planner')

    await waitFor(() => {
      expect(
        within(planner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Switch to Habits tab and expand the habit
    await fireEvent.click(within(planner()).getByText('Habits'))

    const habitTitle = within(planner()).getByText(habit.title)
    await fireEvent.click(habitTitle)

    const habitRow = habitTitle.closest('article')
    expect(habitRow).toBeTruthy()
    await fireEvent.click(within(habitRow as HTMLElement).getByRole('button', { name: 'Activate' }))

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementDayAssignment(
          parsePeriodRef('2026-03-12') as DayRef,
          'habit',
          habit.id
        )
      ).toBeUndefined()
    })
    await waitFor(() => {
      expect(
        within(planner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Accordion stays expanded after reload — click Assign directly
    await waitFor(() => {
      const row = within(planner()).getByText(habit.title).closest('article')
      expect(within(row as HTMLElement).getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    })

    const refreshedHabitRow = within(planner()).getByText(habit.title).closest('article')
    await fireEvent.click(
      within(refreshedHabitRow as HTMLElement).getByRole('button', { name: 'Assign' })
    )

    const dayCell = within(planner()).getByTestId('monthly-planner-day-2026-03-12')
    await fireEvent.click(dayCell)

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementDayAssignment(
          parsePeriodRef('2026-03-12') as DayRef,
          'habit',
          habit.id
        )
      ).toBeTruthy()
    })

    await waitFor(() => {
      expect(within(planner()).getAllByText(habit.title).length).toBeGreaterThan(1)
    })
  })

  it('reflects monthly day assignments inside the monthly planner calendar', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const habit = await habitDexieRepository.create({
      title: 'Monthly categorization',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
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

    await fireEvent.click(await screen.findByRole('button', { name: /create plan/i }))
    await waitFor(() => {
      expect(screen.getByTestId('monthly-planner')).toBeInTheDocument()
    })

    const planner = () => screen.getByTestId('monthly-planner')

    await waitFor(() => {
      expect(
        within(planner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Switch to Habits tab and expand the habit
    await fireEvent.click(within(planner()).getByText('Habits'))

    const habitTitle = within(planner()).getByText(habit.title)
    await fireEvent.click(habitTitle)

    const habitRow = habitTitle.closest('article')
    expect(habitRow).toBeTruthy()
    await fireEvent.click(within(habitRow as HTMLElement).getByRole('button', { name: 'Activate' }))

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'habit', habit.id)
      ).toBeTruthy()
    })
    await waitFor(() => {
      expect(
        within(planner()).queryByRole('heading', { name: 'Loading...' })
      ).not.toBeInTheDocument()
    })

    // Accordion stays expanded after reload — click Assign directly
    await waitFor(() => {
      const row = within(planner()).getByText(habit.title).closest('article')
      expect(within(row as HTMLElement).getByRole('button', { name: 'Assign' })).toBeInTheDocument()
    })

    const refreshedHabitRow = within(planner()).getByText(habit.title).closest('article')
    await fireEvent.click(
      within(refreshedHabitRow as HTMLElement).getByRole('button', { name: 'Assign' })
    )

    const dayCell = within(planner()).getByTestId('monthly-planner-day-2026-03-12')
    await fireEvent.click(dayCell)

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementDayAssignment(
          parsePeriodRef('2026-03-12') as DayRef,
          'habit',
          habit.id
        )
      ).toBeTruthy()
    })

    await waitFor(() => {
      expect(within(planner()).getAllByText(habit.title).length).toBeGreaterThan(1)
    })
  })
})
