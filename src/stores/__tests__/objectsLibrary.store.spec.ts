import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'

describe('useObjectsLibraryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hydrates and serializes the shared URL query contract', () => {
    const store = useObjectsLibraryStore()

    store.hydrateFromRoute('trackers', {
      q: 'energy',
      period: '2026-W10',
      lifeAreas: 'la-1,la-2',
      priorities: 'pr-1',
      showClosed: '1',
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })

    expect(store.query).toEqual({
      family: 'trackers',
      q: 'energy',
      period: '2026-W10',
      lifeAreaIds: ['la-1', 'la-2'],
      priorityIds: ['pr-1'],
      showClosed: true,
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })
    expect(store.serializeForRoute()).toEqual({
      q: 'energy',
      period: '2026-W10',
      lifeAreas: 'la-1,la-2',
      priorities: 'pr-1',
      showClosed: '1',
      composerMode: 'edit',
      composerType: 'tracker',
      composerId: 'tracker-1',
      composerParentType: 'goal',
      composerParentId: 'goal-1',
      expandedType: 'tracker',
      expandedId: 'tracker-1',
    })
  })

  it('preserves shared filters when switching family and clears family-scoped state', () => {
    const store = useObjectsLibraryStore()

    store.hydrateFromRoute('goals', {
      q: 'launch',
      period: '2026-03',
      lifeAreas: 'la-1',
      priorities: 'pr-1',
      showClosed: '1',
      composerMode: 'edit',
      composerType: 'goal',
      composerId: 'goal-1',
      composerParentType: 'goal',
      composerParentId: 'goal-parent',
      expandedType: 'goal',
      expandedId: 'goal-1',
    })

    store.setFamily('initiatives')

    expect(store.query).toEqual({
      family: 'initiatives',
      q: '',
      period: '2026-03',
      lifeAreaIds: ['la-1'],
      priorityIds: ['pr-1'],
      showClosed: true,
    })

    store.openComposer('create', 'initiative')
    expect(store.query.composerMode).toBe('create')
    expect(store.query.composerType).toBe('initiative')
    expect(store.query.composerId).toBeUndefined()
    expect(store.query.composerParentType).toBeUndefined()
    expect(store.query.composerParentId).toBeUndefined()

    store.expandItem('initiative', 'initiative-1')
    expect(store.query.expandedType).toBe('initiative')
    expect(store.query.expandedId).toBe('initiative-1')

    store.closeComposer()
    expect(store.query.composerMode).toBeUndefined()
    expect(store.query.composerType).toBeUndefined()
    expect(store.query.composerId).toBeUndefined()
    expect(store.query.composerParentType).toBeUndefined()
    expect(store.query.composerParentId).toBeUndefined()

    store.collapseItem()
    expect(store.query.expandedType).toBeUndefined()
    expect(store.query.expandedId).toBeUndefined()
  })

  it('normalizes the family from panel type when the route is inconsistent', () => {
    const store = useObjectsLibraryStore()

    store.hydrateFromRoute('trackers', {
      expandedType: 'goal',
      expandedId: 'goal-1',
    })

    expect(store.query.family).toBe('goals')
  })
})
