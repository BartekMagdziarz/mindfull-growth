import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ObjectsLibraryView from '@/views/ObjectsLibraryView.vue'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { resetPlanningTestData } from '@/test/planningTestUtils'

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

  it('renders a goal card with its key result inline from a deep link', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await keyResultDexieRepository.create({
      title: 'Publish v1',
      isActive: true,
      goalId: goal.id,
      entryMode: 'counter',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
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

    expect(await screen.findByDisplayValue(goal.title)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Publish v1')).toBeInTheDocument()
  })

  it('creates a new habit inline immediately without a composer form', async () => {
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

    // A new habit card appears immediately with an empty focused title input
    expect(await screen.findByPlaceholderText('Title')).toBeInTheDocument()
    // No composer form — no Create button
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    // Route stays on habits family, no composer state
    expect(router.currentRoute.value.name).toBe('objects-family')
    expect(router.currentRoute.value.params.family).toBe('habits')
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
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

  it('creates a key result inline under its goal without a composer form', async () => {
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

    // "Add key result" is now inside the "..." menu — open it first
    const moreButtons = await screen.findAllByRole('button', { name: 'More actions' })
    await fireEvent.click(moreButtons[0])
    await fireEvent.click(await screen.findByRole('button', { name: 'Add key result' }))

    // KR is created and shown inline — no Create/Cancel buttons
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    // Goal title input still visible
    expect(await screen.findByDisplayValue(goal.title)).toBeInTheDocument()
    // No composer state in route
    expect(router.currentRoute.value.query.composerMode).toBeUndefined()
  })

  it('renders key result details inline under its goal with auto-save inputs', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Ship weekly workspace',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })

    await keyResultDexieRepository.create({
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

    expect(await screen.findByDisplayValue(goal.title)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Publish v1')).toBeInTheDocument()
    expect(screen.getAllByText('Weekly').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Counter').length).toBeGreaterThanOrEqual(1)
  })

  it('deletes an object from the card menu and removes it from the list', async () => {
    await habitDexieRepository.create({
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

    expect(await screen.findByDisplayValue('Evening reset')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Evening reset')).not.toBeInTheDocument()
    })
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

    // "Add key result" is now inside the "..." menu — open it first
    const moreButtons = await screen.findAllByRole('button', { name: 'More actions' })
    await fireEvent.click(moreButtons[0])
    await fireEvent.click(await screen.findByRole('button', { name: 'Add key result' }))

    // KR is created inline — no composer form with Create button or goal selector
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    })
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

    expect(await screen.findByRole('heading', { name: 'Cele' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Goals' })).not.toBeInTheDocument()
  })
})
