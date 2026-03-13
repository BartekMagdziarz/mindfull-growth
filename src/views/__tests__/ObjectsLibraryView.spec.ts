import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { MonthRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'
import ObjectsLibraryView from '@/views/ObjectsLibraryView.vue'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { formatPeriodLabel } from '@/utils/periodLabels'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/objects/:family',
        name: 'objects-family',
        component: ObjectsLibraryView,
        props: route => ({ family: route.params.family }),
      },
      {
        path: '/calendar/year/:yearRef',
        name: 'calendar-year',
        component: { template: '<div />' },
      },
      {
        path: '/calendar/month/:monthRef',
        name: 'calendar-month',
        component: { template: '<div />' },
      },
      {
        path: '/calendar/week/:weekRef',
        name: 'calendar-week',
        component: { template: '<div />' },
      },
      { path: '/calendar/day/:dayRef', name: 'calendar-day', component: { template: '<div />' } },
      { path: '/areas/:id', name: 'life-area-detail', component: { template: '<div />' } },
    ],
  })
}

describe('ObjectsLibraryView', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('opens inline details from a deep link and navigates back to Calendar from linked periods', async () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
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
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: {
        expandedType: 'goal',
        expandedId: goal.id,
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByRole('heading', { name: goal.title })).toBeInTheDocument()
    const expectedLabel = formatPeriodLabel(monthRef, 'en', 'Week')

    await fireEvent.click(screen.getByRole('button', { name: new RegExp(expectedLabel, 'i') }))

    await waitFor(() => {
      expect(router.currentRoute.value.name).toBe('calendar-month')
    })
    expect(router.currentRoute.value.params.monthRef).toBe(monthRef)
  })

  it('creates a new habit inline and keeps the expanded object in the route', async () => {
    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'habits' },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'habits',
      },
      global: {
        plugins: [router],
      },
    })

    await fireEvent.click(await screen.findByRole('button', { name: 'Add habit' }))
    await fireEvent.update(screen.getByRole('textbox', { name: 'Title' }), 'Evening reset')
    await fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(
      await screen.findByRole('heading', { name: 'Evening reset' })
    ).toBeInTheDocument()
    expect(router.currentRoute.value.name).toBe('objects-family')
    expect(router.currentRoute.value.params.family).toBe('habits')
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
    expect(router.currentRoute.value.query.expandedType).toBe('habit')
    expect(router.currentRoute.value.query.expandedId).toEqual(expect.any(String))
  })

  it('keeps period input local until commit and shows inline validation errors', async () => {
    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    const periodInput = await screen.findByLabelText('Period')

    await fireEvent.update(periodInput, '2026-W')
    expect(screen.queryByText('Use a valid period reference like 2026, 2026-03, 2026-W10, or 2026-03-12.')).not.toBeInTheDocument()
    expect(router.currentRoute.value.query.period).toBeUndefined()

    await fireEvent.blur(periodInput)
    expect(await screen.findByText('Use a valid period reference like 2026, 2026-03, 2026-W10, or 2026-03-12.')).toBeInTheDocument()
    expect(router.currentRoute.value.query.period).toBeUndefined()

    await fireEvent.update(periodInput, '2026-W10')
    await fireEvent.keyDown(periodInput, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(router.currentRoute.value.query.period).toBe('2026-W10')
    })
    expect(screen.queryByText('Use a valid period reference like 2026, 2026-03, 2026-W10, or 2026-03-12.')).not.toBeInTheDocument()
  })

  it('preserves shared filters when switching families and clears search plus panel state', async () => {
    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: {
        q: 'launch',
        period: '2026-W10',
        lifeAreas: 'la-1',
        priorities: 'pr-1',
        showClosed: '1',
        composerMode: 'edit',
        composerType: 'goal',
        composerId: 'goal-1',
        expandedType: 'goal',
        expandedId: 'goal-1',
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    await fireEvent.click(await screen.findByRole('button', { name: 'Initiatives' }))

    await waitFor(() => {
      expect(router.currentRoute.value.params.family).toBe('initiatives')
    })
    expect(router.currentRoute.value.query.q).toBeUndefined()
    expect(router.currentRoute.value.query.period).toBe('2026-W10')
    expect(router.currentRoute.value.query.lifeAreas).toBe('la-1')
    expect(router.currentRoute.value.query.priorities).toBe('pr-1')
    expect(router.currentRoute.value.query.showClosed).toBe('1')
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
    expect(router.currentRoute.value.query.composerType).toBeUndefined()
    expect(router.currentRoute.value.query.composerId).toBeUndefined()
    expect(router.currentRoute.value.query.expandedType).toBeUndefined()
    expect(router.currentRoute.value.query.expandedId).toBeUndefined()
  })

  it('returns to the expanded goal when cancelling key result creation', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: {
        expandedType: 'goal',
        expandedId: goal.id,
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    await fireEvent.click(await screen.findByRole('button', { name: 'Add key result' }))
    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByRole('heading', { name: goal.title })).toBeInTheDocument()
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
    expect(router.currentRoute.value.query.expandedType).toBe('goal')
    expect(router.currentRoute.value.query.expandedId).toBe(goal.id)
  })

  it('renders key result details under its goal and opens key result edit mode', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const keyResult = await keyResultDexieRepository.create({
      title: 'Publish v1',
      isActive: true,
      goalId: goal.id,
      entryMode: 'counter',
      cadence: 'weekly',
      target: {
        kind: 'count',
        operator: 'min',
        value: 1,
      },
      status: 'open',
    })

    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: {
        expandedType: 'keyResult',
        expandedId: keyResult.id,
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByRole('heading', { name: goal.title })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: keyResult.title })).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Publish v1')

    await waitFor(() => {
      expect(router.currentRoute.value.query.composerMode).toBe('edit')
      expect(router.currentRoute.value.query.composerType).toBe('keyResult')
      expect(router.currentRoute.value.query.composerId).toBe(keyResult.id)
    })
  })

  it('deletes an object from inline edit and clears the expanded route state', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Evening reset',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
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
    await router.push({
      name: 'objects-family',
      params: { family: 'habits' },
      query: {
        expandedType: 'habit',
        expandedId: habit.id,
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'habits',
      },
      global: {
        plugins: [router],
      },
    })

    await fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Evening reset' })).not.toBeInTheDocument()
    })
    expect(router.currentRoute.value.query.expandedType).toBeUndefined()
    expect(router.currentRoute.value.query.expandedId).toBeUndefined()
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
  })

  it('hides the goal dropdown when creating a key result from within a goal', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
      query: {
        expandedType: 'goal',
        expandedId: goal.id,
      },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    await fireEvent.click(await screen.findByRole('button', { name: 'Add key result' }))
    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Owner goal' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Owner goal')).not.toBeInTheDocument()
  })

  it('renders localized library copy in Polish', async () => {
    const prefs = useUserPreferencesStore()
    prefs.$patch({ locale: 'pl' })

    await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    const router = createTestRouter()
    await router.push({
      name: 'objects-family',
      params: { family: 'goals' },
    })
    await router.isReady()

    render(ObjectsLibraryView, {
      props: {
        family: 'goals',
      },
      global: {
        plugins: [router],
      },
    })

    expect(await screen.findByText('Cel')).toBeInTheDocument()
    expect(screen.queryByText('Goal')).not.toBeInTheDocument()
  })
})
