import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreateExercisePlanItemPayload, ExercisePlanItem, UpdateExercisePlanItemPayload } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import {
  autoCompleteFor,
  buildRepeatChipOptions,
  createPlan,
  retakeSuggestedDays,
  selectDueItems,
} from '@/services/exercisePlanService'

vi.mock('@/repositories/exercisePlanDexieRepository', () => ({
  exercisePlanDexieRepository: {
    create: vi.fn(async (payload: CreateExercisePlanItemPayload) => ({
      id: 'plan-1',
      status: 'pending',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      ...payload,
    })),
    update: vi.fn(async (id: string, patch: UpdateExercisePlanItemPayload) => ({
      id,
      exerciseSlug: 'worry-tree',
      // Bare cast: vi.mock factories are hoisted above the `day` helper.
      dayRef: '2026-07-01' as DayRef,
      status: 'pending',
      source: 'repeat',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      ...patch,
    })),
    listPendingBySlug: vi.fn(async () => [] as ExercisePlanItem[]),
    delete: vi.fn(async () => undefined),
    listAll: vi.fn(async () => [] as ExercisePlanItem[]),
  },
}))

const day = (value: string): DayRef => value as DayRef

function planItem(overrides: Partial<ExercisePlanItem>): ExercisePlanItem {
  return {
    id: 'plan-x',
    exerciseSlug: 'worry-tree',
    dayRef: day('2026-07-05'),
    status: 'pending',
    source: 'repeat',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('createPlan', () => {
  it('creates with default source repeat and no status in the payload', async () => {
    await createPlan('worry-tree', day('2026-07-12'))

    expect(vi.mocked(exercisePlanDexieRepository.create).mock.calls[0]?.[0]).toEqual({
      exerciseSlug: 'worry-tree',
      dayRef: day('2026-07-12'),
      source: 'repeat',
    })
  })
})

describe('autoCompleteFor', () => {
  it('completes the oldest due plan (dayRef, then createdAt) and forwards recordId', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingBySlug).mockResolvedValueOnce([
      planItem({ id: 'later-day', dayRef: day('2026-07-04') }),
      planItem({ id: 'same-day-newer', dayRef: day('2026-07-02'), createdAt: '2026-07-01T12:00:00.000Z' }),
      planItem({ id: 'oldest', dayRef: day('2026-07-02'), createdAt: '2026-07-01T08:00:00.000Z' }),
    ])

    await autoCompleteFor('worry-tree', day('2026-07-05'), 'record-9')

    expect(vi.mocked(exercisePlanDexieRepository.update).mock.calls[0]).toEqual([
      'oldest',
      { status: 'done', recordId: 'record-9' },
    ])
  })

  it('ignores plans scheduled after the completion day', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingBySlug).mockResolvedValueOnce([
      planItem({ id: 'future', dayRef: day('2026-07-06') }),
    ])

    const result = await autoCompleteFor('worry-tree', day('2026-07-05'))

    expect(result).toBeNull()
    expect(exercisePlanDexieRepository.update).not.toHaveBeenCalled()
  })

  it('returns null when nothing is pending', async () => {
    const result = await autoCompleteFor('worry-tree', day('2026-07-05'))

    expect(result).toBeNull()
  })
})

describe('selectDueItems (the D3 overdue query)', () => {
  it('includes today and overdue, excludes future and non-pending, oldest first', () => {
    const items = [
      planItem({ id: 'today', dayRef: day('2026-07-05') }),
      planItem({ id: 'overdue', dayRef: day('2026-07-02') }),
      planItem({ id: 'future', dayRef: day('2026-07-06') }),
      planItem({ id: 'done', dayRef: day('2026-07-01'), status: 'done' }),
      planItem({ id: 'skipped', dayRef: day('2026-07-01'), status: 'skipped' }),
    ]

    expect(selectDueItems(items, day('2026-07-05')).map((item) => item.id)).toEqual([
      'overdue',
      'today',
    ])
  })
})

describe('buildRepeatChipOptions', () => {
  it('marks the matching standard chip as suggested', () => {
    const options = buildRepeatChipOptions(7)

    expect(options.map((o) => o.days)).toEqual([3, 7, 14, 30])
    expect(options.find((o) => o.suggested)?.days).toBe(7)
  })

  it('prepends a "tomorrow" chip for suggestedDays 1', () => {
    const options = buildRepeatChipOptions(1)

    expect(options[0]).toEqual({
      days: 1,
      labelKey: 'exercises.repeatPrompt.chips.tomorrow',
      suggested: true,
    })
    expect(options).toHaveLength(5)
  })

  it('prepends a plural-key chip for other non-standard values', () => {
    const options = buildRepeatChipOptions(2)

    expect(options[0]).toEqual({
      days: 2,
      labelKey: 'exercises.repeatPrompt.chips.inDays',
      suggested: true,
    })
  })

  it('suggests nothing without a suggested interval', () => {
    const options = buildRepeatChipOptions()

    expect(options).toHaveLength(4)
    expect(options.some((o) => o.suggested)).toBe(false)
  })
})

describe('retakeSuggestedDays', () => {
  const now = new Date('2026-07-05T12:00:00.000Z')

  it('returns the ceiled day distance to a future eligibility', () => {
    expect(retakeSuggestedDays('2026-07-19T11:00:00.000Z', now)).toBe(14)
  })

  it('returns undefined for past, invalid or missing eligibility', () => {
    expect(retakeSuggestedDays('2026-07-01T00:00:00.000Z', now)).toBeUndefined()
    expect(retakeSuggestedDays('not-a-date', now)).toBeUndefined()
    expect(retakeSuggestedDays(undefined, now)).toBeUndefined()
  })
})
