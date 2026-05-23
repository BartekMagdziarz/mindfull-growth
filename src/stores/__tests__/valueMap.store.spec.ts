import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useValueMapStore } from '../valueMap.store'
import type { ValueMap } from '@/domain/exercises'

vi.mock('@/repositories/exercisesDexieRepository', () => ({
  valueMapDexieRepository: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { valueMapDexieRepository } from '@/repositories/exercisesDexieRepository'

function makeMap(overrides: Partial<ValueMap> = {}): ValueMap {
  return {
    id: overrides.id ?? 'map-1',
    createdAt: overrides.createdAt ?? '2026-05-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00.000Z',
    catalogVersion: '2026-05',
    sort: overrides.sort ?? {
      autonomy: 'mostImportant',
      honesty: 'veryImportant',
      growth: 'veryImportant',
      health: 'important',
      family: 'important',
    },
    customValues: overrides.customValues ?? [],
    rankedValues: overrides.rankedValues ?? [
      { valueId: 'autonomy', rank: 1, personalMeaning: 'Choosing deliberately.' },
      { valueId: 'honesty', rank: 2, personalMeaning: 'Saying what is true.' },
      { valueId: 'growth', rank: 3, personalMeaning: 'Becoming more capable.' },
      { valueId: 'health', rank: 4 },
      { valueId: 'family', rank: 5 },
    ],
    coreValues: overrides.coreValues ?? ['Autonomy', 'Honesty', 'Growth'],
    globalConflicts: overrides.globalConflicts ?? [],
    lifeAreaAssignments: overrides.lifeAreaAssignments ?? [],
    notes: overrides.notes,
  }
}

describe('useValueMapStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads maps and exposes the latest map by createdAt', async () => {
    const older = makeMap({ id: 'older', createdAt: '2026-04-01T00:00:00.000Z' })
    const newer = makeMap({ id: 'newer', createdAt: '2026-05-01T00:00:00.000Z' })
    vi.mocked(valueMapDexieRepository.getAll).mockResolvedValue([older, newer])

    const store = useValueMapStore()
    await store.loadMaps()

    expect(store.maps).toEqual([older, newer])
    expect(store.latestMap?.id).toBe('newer')
  })

  it('adds created maps to local state', async () => {
    const created = makeMap({ id: 'created' })
    vi.mocked(valueMapDexieRepository.create).mockResolvedValue(created)

    const store = useValueMapStore()
    const result = await store.createMap({
      catalogVersion: '2026-05',
      sort: created.sort,
      customValues: [],
      rankedValues: created.rankedValues,
      coreValues: created.coreValues,
      globalConflicts: [],
      lifeAreaAssignments: [],
    })

    expect(result).toEqual(created)
    expect(store.maps).toEqual([created])
  })

  it('resets in-memory state', async () => {
    const created = makeMap({ id: 'created' })
    vi.mocked(valueMapDexieRepository.create).mockResolvedValue(created)

    const store = useValueMapStore()
    await store.createMap({
      catalogVersion: '2026-05',
      sort: created.sort,
      customValues: [],
      rankedValues: created.rankedValues,
      coreValues: created.coreValues,
      globalConflicts: [],
      lifeAreaAssignments: [],
    })

    store.reset()

    expect(store.maps).toEqual([])
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('accepts life-area assignments without a tension defined', async () => {
    const created = makeMap()
    vi.mocked(valueMapDexieRepository.create).mockResolvedValue(created)

    const store = useValueMapStore()

    await expect(
      store.createMap({
        catalogVersion: '2026-05',
        sort: created.sort,
        customValues: [],
        rankedValues: created.rankedValues,
        coreValues: created.coreValues,
        globalConflicts: [],
        lifeAreaAssignments: [
          { lifeAreaId: 'area-1', valueIds: ['autonomy'] },
          { lifeAreaId: 'area-2', valueIds: [] },
        ],
      }),
    ).resolves.toEqual(created)
    expect(store.error).toBeNull()
  })

  it('rejects maps with fewer than five ranked values', async () => {
    const store = useValueMapStore()

    await expect(
      store.createMap({
        catalogVersion: '2026-05',
        sort: {},
        customValues: [],
        rankedValues: [
          { valueId: 'autonomy', rank: 1 },
          { valueId: 'honesty', rank: 2 },
          { valueId: 'growth', rank: 3 },
        ],
        coreValues: ['Autonomy', 'Honesty', 'Growth'],
        globalConflicts: [],
        lifeAreaAssignments: [],
      }),
    ).rejects.toThrow('between 5 and 10')
  })
})
