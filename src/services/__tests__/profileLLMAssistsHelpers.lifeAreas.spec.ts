import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LifeArea } from '@/domain/lifeArea'

const stubs = vi.hoisted(() => ({
  lifeAreaState: { lifeAreas: [] as LifeArea[] },
}))

vi.mock('@/stores/lifeArea.store', () => ({
  useLifeAreaStore: () => stubs.lifeAreaState,
}))

import { __test__, buildLifeAreasSnapshot } from '../profileLLMAssistsHelpers'

beforeEach(() => {
  stubs.lifeAreaState.lifeAreas = []
})

function makeArea(
  overrides: Partial<LifeArea> & Pick<LifeArea, 'id' | 'name' | 'sortOrder'>,
): LifeArea {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    icon: 'icon-default',
    color: '#000000',
    meaning: '',
    desiredState: '',
    typicalRisks: '',
    reflectionSignals: [],
    isActive: true,
    ...overrides,
  }
}

describe('buildLifeAreasSnapshot', () => {
  it('returns empty snapshot when no life areas exist', () => {
    expect(buildLifeAreasSnapshot()).toEqual({ items: [], snapshot: '' })
  })

  it('sorts items by sortOrder ascending', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({ id: 'a', name: 'Alpha', sortOrder: 2 }),
      makeArea({ id: 'b', name: 'Bravo', sortOrder: 0 }),
      makeArea({ id: 'c', name: 'Charlie', sortOrder: 1 }),
    ]

    const result = buildLifeAreasSnapshot()

    expect(result.items.map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('excludes inactive areas', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({ id: 'a', name: 'Active', sortOrder: 0, isActive: true }),
      makeArea({ id: 'b', name: 'Archived 1', sortOrder: 1, isActive: false }),
      makeArea({ id: 'c', name: 'Archived 2', sortOrder: 2, isActive: false }),
    ]

    const result = buildLifeAreasSnapshot()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('a')
  })

  it('omits the reflection-signals block when none are defined', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({
        id: 'a',
        name: 'Career',
        sortOrder: 0,
        meaning: 'Mastery',
        desiredState: 'Flow',
        typicalRisks: 'Burnout',
        reflectionSignals: [],
      }),
    ]

    const body = buildLifeAreasSnapshot().items[0]!.body

    expect(body).toContain('- Career')
    expect(body).toContain('  Meaning: Mastery')
    expect(body).toContain('  Desired state: Flow')
    expect(body).toContain('  Risks: Burnout')
    expect(body).not.toContain('Reflection signals:')
  })

  it('omits empty optional fields entirely', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({
        id: 'a',
        name: 'Family',
        sortOrder: 0,
        meaning: 'Love',
        desiredState: '',
        typicalRisks: 'Distance',
        reflectionSignals: [],
      }),
    ]

    const body = buildLifeAreasSnapshot().items[0]!.body

    expect(body).toContain('  Meaning: Love')
    expect(body).toContain('  Risks: Distance')
    expect(body).not.toContain('Desired state:')
  })

  it('preserves newlines inside multiline fields', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({
        id: 'a',
        name: 'Health',
        sortOrder: 0,
        meaning: 'line1\nline2',
      }),
    ]

    const body = buildLifeAreasSnapshot().items[0]!.body

    expect(body).toContain('line1\nline2')
  })

  it('joins all item bodies with double newlines into the snapshot', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({
        id: 'a',
        name: 'Career',
        sortOrder: 0,
        meaning: 'Mastery',
      }),
      makeArea({
        id: 'b',
        name: 'Family',
        sortOrder: 1,
        meaning: 'Love',
      }),
    ]

    const result = buildLifeAreasSnapshot()

    expect(result.snapshot).toBe(result.items.map((i) => i.body).join('\n\n'))
    expect(result.snapshot).toBe(
      '- Career\n  Meaning: Mastery\n\n- Family\n  Meaning: Love',
    )
  })

  it('skips areas with empty name (data-integrity guard)', () => {
    stubs.lifeAreaState.lifeAreas = [
      makeArea({ id: 'a', name: '', sortOrder: 0 }),
      makeArea({ id: 'b', name: '   ', sortOrder: 1 }),
      makeArea({ id: 'c', name: 'Real', sortOrder: 2 }),
    ]

    const result = buildLifeAreasSnapshot()

    expect(result.items.map((i) => i.id)).toEqual(['c'])
  })
})

describe('formatLifeArea (unit)', () => {
  it('produces the canonical markdown shape with all fields populated', () => {
    const area = makeArea({
      id: 'a',
      name: 'Career',
      sortOrder: 0,
      meaning: 'Where I build mastery',
      desiredState: 'Deep, consistent flow',
      typicalRisks: 'Burnout, comparison spirals',
      reflectionSignals: [
        'Did I do focused work today?',
        'Am I avoiding the hard problem?',
      ],
    })

    expect(__test__.formatLifeArea(area)).toBe(
      [
        '- Career',
        '  Meaning: Where I build mastery',
        '  Desired state: Deep, consistent flow',
        '  Risks: Burnout, comparison spirals',
        '  Reflection signals:',
        '    - Did I do focused work today?',
        '    - Am I avoiding the hard problem?',
      ].join('\n'),
    )
  })
})
