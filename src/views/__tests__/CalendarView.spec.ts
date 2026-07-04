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
import { toggleMeasurementDayAssignment } from '@/services/planningMutations'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, parsePeriodRef } from '@/utils/periods'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/today/:dayRef',
        name: 'today-day',
        component: { template: '<div />' },
      },
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
        path: '/objects/:family',
        name: 'objects-family',
        component: { template: '<div />' },
      },
    ],
  })
}

/**
 * The month's assignment workspace is the month wizard's second ("Weeks") step:
 * open the month ritual, advance one step, and wait for the assignment matrix.
 */
async function openWizardWeeksStep() {
  await fireEvent.click(await screen.findByRole('button', { name: /open month/i }))
  await fireEvent.click(await screen.findByRole('button', { name: /^next$/i }))
  await waitFor(() => {
    expect(screen.getByTestId('assignment-matrix')).toBeInTheDocument()
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

    // Weekly view uses the unified WeekReviewSummary — left column has
    // Journal + Emotions, right column the Summary (Kontekst) card. Per-type
    // section headings are gone; individual object titles still appear inside
    // the grid tiles. (The old WeeklyPlanner grid + its day-cell → Today
    // navigation moved into the weekly ritual's day-assignment step, so there
    // is no longer a `weekly-planner` grid on this scale.)
    expect(await screen.findByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Emotions')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    // Plan-vs-Execution rings live inside the Kontekst card and are display-only
    // on the week scale (WeekKontextCard passes show-actions=false → no inline
    // edit-plan button). The single plan/reflection affordance is the "Open week"
    // ritual entry; there is no toolbar plan/reflection button on this scale.
    expect(screen.getByRole('button', { name: /open week/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /edit plan/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /edit reflection/i }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('Review open work').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Confidence score').length).toBeGreaterThan(0)
  })

  it('renders the unified month review summary with object tiles and Plan-vs-Execution', async () => {
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

    // KR tile renders inside the unified objects grid.
    expect(await screen.findByText('Ship weekly milestone')).toBeInTheDocument()

    // Three-column layout — left has weekly recap + emotions, middle the
    // objects grid, right the Kontekst Summary card. Plan-vs-Execution lives
    // inside that card; with no MonthPlan yet it points at the month wizard
    // (planning moved into its "Weeks" step — no create/edit plan affordance).
    expect(screen.getByText('Weekly recap')).toBeInTheDocument()
    expect(screen.getByText('Emotions')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(
      screen.getByText('Open the month to plan it and assign objects to weeks.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /create plan/i }),
    ).not.toBeInTheDocument()

    // Toolbar plan/reflection actions are now per-card affordances; the
    // toolbar buttons should not appear in the document.
    expect(
      screen.queryByRole('button', { name: /edit reflection/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the month planner as a week matrix without day cells', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const habit = await habitDexieRepository.create({
      title: 'Matrix habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 4 },
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

    // One toggle cell per month week, no day-level click targets — days belong
    // to the weekly ritual.
    const monthWeeks = getChildPeriods(monthRef) as WeekRef[]
    expect(
      await screen.findByTestId(`matrix-cell-habit:${habit.id}-${monthWeeks[0]}`)
    ).toBeInTheDocument()
    for (const weekRef of monthWeeks) {
      expect(screen.getByTestId(`matrix-cell-habit:${habit.id}-${weekRef}`)).toBeInTheDocument()
    }
    expect(screen.queryByTestId('monthly-planner-day-2026-03-12')).not.toBeInTheDocument()
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

    expect(await screen.findByTestId('monthly-planner')).toBeInTheDocument()
    expect(screen.queryByTestId('monthly-planner-sidebar')).not.toBeInTheDocument()

    await openWizardWeeksStep()

    // No tabs, no activation toggle — the whole-month row action places the
    // weekly habit on every week (activation is implicit in placement).
    await fireEvent.click(await screen.findByTestId(`matrix-whole-habit:${habit.id}`))

    await waitFor(async () => {
      const weekStates = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
        'habit',
        habit.id
      )
      const monthWeekStates = weekStates.filter(state => state.weekRef.startsWith('2026-W'))
      expect(monthWeekStates.length).toBeGreaterThanOrEqual(4)
      expect(monthWeekStates.every(state => state.scheduleScope === 'whole-week')).toBe(true)
    })
    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'habit', habit.id)
      ).toBeTruthy()
    })

    void goal
  })

  it('auto-links the parent goal when activating a key result and toggles its state', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const goal = await goalDexieRepository.create({
      title: 'Auto-link goal',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const keyResult = await keyResultDexieRepository.create({
      title: 'Single KR',
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

    await openWizardWeeksStep()

    // Placing the KR on a week auto-links the parent goal (activation is
    // implicit in placement — there is no separate activate toggle).
    await fireEvent.click(
      await screen.findByTestId(`matrix-cell-keyResult:${keyResult.id}-2026-W10`)
    )

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'keyResult', keyResult.id)
      ).toBeTruthy()
    })
    await waitFor(async () => {
      expect(await planningStateDexieRepository.getGoalMonthState(monthRef, goal.id)).toBeTruthy()
    })

    // Clearing the row removes placement AND month activation (active ⇔ placed).
    await fireEvent.click(screen.getByTestId(`matrix-clear-keyResult:${keyResult.id}`))

    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'keyResult', keyResult.id)
      ).toBeUndefined()
    })
  })

  it('assigns a weekly habit to a week and stores the month target override from the planner', async () => {
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

    await openWizardWeeksStep()

    // Clicking the week cell places the habit and auto-activates the month.
    await fireEvent.click(
      await screen.findByTestId(`matrix-cell-habit:${habit.id}-2026-W11`)
    )

    await waitFor(async () => {
      const weekState = await planningStateDexieRepository.getMeasurementWeekState(
        parsePeriodRef('2026-W11') as WeekRef,
        'habit',
        habit.id
      )
      expect(weekState?.scheduleScope).toBe('whole-week')
    })
    await waitFor(async () => {
      expect(
        await planningStateDexieRepository.getMeasurementMonthState(monthRef, 'habit', habit.id)
      ).toBeTruthy()
    })

    // Once placed, the row's target pill edits the month override.
    const row = screen.getByTestId(`matrix-row-habit:${habit.id}`)
    const input = within(row).getByRole('spinbutton')
    await fireEvent.update(input, '1')
    await fireEvent.change(input)

    await waitFor(async () => {
      const monthState = await planningStateDexieRepository.getMeasurementMonthState(
        monthRef,
        'habit',
        habit.id
      )
      expect(monthState?.targetOverride).toEqual({ kind: 'count', operator: 'min', value: 1 })
    })
  })

  it('assigns monthly habits to weeks and shows existing day assignments as a badge', async () => {
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
    // Pre-existing day assignment made in the weekly ritual — the month planner
    // must surface it read-only on the week row. (This also creates the MonthPlan
    // record up front, so the wizard's weeks step reuses it instead of creating one.)
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'unassigned',
    })
    await toggleMeasurementDayAssignment({
      dayRef: parsePeriodRef('2026-03-12') as DayRef,
      subjectType: 'habit',
      subjectId: habit.id,
      cadence: 'monthly',
      monthRef,
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

    await openWizardWeeksStep()

    // The 2026-03-12 day assignment shows as a read-only badge on its week cell.
    const dayCell = await screen.findByTestId(`matrix-cell-habit:${habit.id}-2026-W10`)
    expect(within(dayCell).getByText('1')).toBeInTheDocument()

    // Toggling another week writes a sourceMonthRef-scoped week state.
    await fireEvent.click(screen.getByTestId(`matrix-cell-habit:${habit.id}-2026-W12`))
    await waitFor(async () => {
      const weekState = await planningStateDexieRepository.getMeasurementWeekState(
        parsePeriodRef('2026-W12') as WeekRef,
        'habit',
        habit.id,
        monthRef
      )
      expect(weekState?.scheduleScope).toBe('whole-week')
      expect(weekState?.sourceMonthRef).toBe(monthRef)
    })
  })
})
