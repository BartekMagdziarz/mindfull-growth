import { describe, expect, it } from 'vitest'
import type { CreateHabitPayload, Habit, MultiCompletionItem } from '@/domain/planning'
import { MULTI_COMPLETION_MAX_ACTIVE_ITEMS, normalizeHabitPayload, normalizeTrackerPayload } from '@/domain/planning'
import { normalizeDailyMeasurementEntryPayload } from '@/domain/planningState'
import type { DayRef } from '@/domain/period'

const items: MultiCompletionItem[] = [
  { id: 'wake', label: 'Pobudka 6:00', weight: 1 },
  { id: 'meditate', label: 'Medytacja', icon: 'self_improvement', weight: 1 },
  { id: 'train', label: 'Trening', weight: 2 },
]

function multiHabitPayload(overrides: Partial<CreateHabitPayload> = {}): CreateHabitPayload {
  return {
    title: 'Poranna rutyna',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'multi-completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 3 },
    multiItems: items,
    status: 'open',
    ...overrides,
  }
}

describe('normalize multi-completion object payloads', () => {
  it('normalizes items, defaulting weight to 1 and keeping order', () => {
    const result = normalizeHabitPayload(
      multiHabitPayload({
        multiItems: [
          { id: 'a', label: ' A ' } as MultiCompletionItem,
          { id: 'b', label: 'B', weight: 3, archived: false },
        ],
      }),
    )

    expect(result.multiItems).toEqual([
      { id: 'a', label: 'A', icon: undefined, weight: 1 },
      { id: 'b', label: 'B', icon: undefined, weight: 3 },
    ])
  })

  it('requires multiItems for the multi-completion entry mode', () => {
    expect(() => normalizeHabitPayload(multiHabitPayload({ multiItems: undefined }))).toThrow(
      'multiItems must be an array',
    )
  })

  it('rejects duplicate ids, empty labels and invalid weights', () => {
    expect(() =>
      normalizeHabitPayload(
        multiHabitPayload({ multiItems: [items[0], { ...items[1], id: 'wake' }] }),
      ),
    ).toThrow('duplicated')
    expect(() =>
      normalizeHabitPayload(multiHabitPayload({ multiItems: [{ id: 'a', label: '  ', weight: 1 }] })),
    ).toThrow('label')
    expect(() =>
      normalizeHabitPayload(multiHabitPayload({ multiItems: [{ id: 'a', label: 'A', weight: 0 }] })),
    ).toThrow('weight')
    expect(() =>
      normalizeHabitPayload(multiHabitPayload({ multiItems: [{ id: 'a', label: 'A', weight: 1.5 }] })),
    ).toThrow('weight')
  })

  it('requires at least one non-archived item and caps active items', () => {
    expect(() =>
      normalizeHabitPayload(
        multiHabitPayload({
          multiItems: [{ id: 'a', label: 'A', weight: 1, archived: true }],
        }),
      ),
    ).toThrow('at least one non-archived item')

    const tooMany = Array.from({ length: MULTI_COMPLETION_MAX_ACTIVE_ITEMS + 1 }, (_, index) => ({
      id: `item-${index}`,
      label: `Item ${index}`,
      weight: 1,
    }))
    expect(() => normalizeHabitPayload(multiHabitPayload({ multiItems: tooMany }))).toThrow(
      `at most ${MULTI_COMPLETION_MAX_ACTIVE_ITEMS}`,
    )

    const maxActivePlusArchived = [
      ...tooMany.slice(0, MULTI_COMPLETION_MAX_ACTIVE_ITEMS),
      { id: 'old', label: 'Old', weight: 1, archived: true },
    ]
    expect(
      normalizeHabitPayload(multiHabitPayload({ multiItems: maxActivePlusArchived })).multiItems,
    ).toHaveLength(MULTI_COMPLETION_MAX_ACTIVE_ITEMS + 1)
  })

  it('validates the daily threshold and treats null as a reset to the all-items default', () => {
    expect(normalizeHabitPayload(multiHabitPayload({ multiDailyThreshold: 3 })).multiDailyThreshold).toBe(3)
    expect(
      normalizeHabitPayload(multiHabitPayload({ multiDailyThreshold: null as unknown as number }))
        .multiDailyThreshold,
    ).toBeUndefined()
    expect(() => normalizeHabitPayload(multiHabitPayload({ multiDailyThreshold: 0 }))).toThrow(
      'multiDailyThreshold',
    )
    expect(() => normalizeHabitPayload(multiHabitPayload({ multiDailyThreshold: 2.5 }))).toThrow(
      'multiDailyThreshold',
    )
  })

  it('strips multi fields for other entry modes', () => {
    const result = normalizeHabitPayload(
      multiHabitPayload({ entryMode: 'completion', multiDailyThreshold: 3 }),
    )
    expect(result.multiItems).toBeUndefined()
    expect(result.multiDailyThreshold).toBeUndefined()
  })

  it('keeps the entryDays condition on multi-completion count targets', () => {
    const result = normalizeHabitPayload(
      multiHabitPayload({
        target: { kind: 'count', operator: 'min', value: 3, entryDays: { operator: 'min', value: 5 } },
      }),
    )
    expect(result.target).toEqual({
      kind: 'count',
      operator: 'min',
      value: 3,
      entryDays: { operator: 'min', value: 5 },
    })
  })

  it('falls back to existing items and threshold on partial updates', () => {
    const existing: Habit = {
      id: 'habit-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...normalizeHabitPayload(multiHabitPayload({ multiDailyThreshold: 2 })),
    }

    const result = normalizeHabitPayload({ status: 'retired' }, existing)
    expect(result.multiItems).toEqual(existing.multiItems)
    expect(result.multiDailyThreshold).toBe(2)
  })

  it('supports trackers (no target) with multi items', () => {
    const result = normalizeTrackerPayload({
      title: 'Rutyna wieczorna',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      entryMode: 'multi-completion',
      cadence: 'weekly',
      multiItems: items,
      status: 'open',
    })
    expect(result.multiItems).toHaveLength(3)
  })
})

describe('normalizeDailyMeasurementEntryPayload checkedItemIds', () => {
  const base = {
    subjectType: 'habit' as const,
    subjectId: 'habit-1',
    dayRef: '2026-03-12' as DayRef,
    value: null,
  }

  it('keeps checked ids and copies the array', () => {
    const ids = ['wake', 'train']
    const result = normalizeDailyMeasurementEntryPayload({ ...base, checkedItemIds: ids })
    expect(result.checkedItemIds).toEqual(['wake', 'train'])
    expect(result.checkedItemIds).not.toBe(ids)
  })

  it('leaves the field undefined when absent', () => {
    expect(normalizeDailyMeasurementEntryPayload(base).checkedItemIds).toBeUndefined()
  })

  it('rejects empty arrays, duplicates and non-string ids', () => {
    expect(() => normalizeDailyMeasurementEntryPayload({ ...base, checkedItemIds: [] })).toThrow(
      'non-empty array',
    )
    expect(() =>
      normalizeDailyMeasurementEntryPayload({ ...base, checkedItemIds: ['a', 'a'] }),
    ).toThrow('duplicate')
    expect(() =>
      normalizeDailyMeasurementEntryPayload({ ...base, checkedItemIds: [' '] }),
    ).toThrow('non-empty strings')
  })
})
