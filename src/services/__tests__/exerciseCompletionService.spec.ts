import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateExerciseCompletionPayload } from '@/domain/exerciseCompletion'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { recordCompletion } from '@/services/exerciseCompletionService'

vi.mock('@/repositories/exerciseCompletionDexieRepository', () => ({
  exerciseCompletionDexieRepository: {
    create: vi.fn(async (payload: CreateExerciseCompletionPayload) => ({
      id: 'completion-1',
      ...payload,
    })),
  },
}))

describe('recordCompletion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('derives dayRef from the LOCAL day, not the UTC date', async () => {
    // 00:30 local: in any timezone east of UTC the UTC date is still
    // "yesterday" — dayRef must follow the local calendar regardless.
    const localAfterMidnight = new Date(2026, 2, 12, 0, 30, 0)
    vi.setSystemTime(localAfterMidnight)

    await recordCompletion('worry-tree', 'record-1')

    const payload = vi.mocked(exerciseCompletionDexieRepository.create).mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      exerciseSlug: 'worry-tree',
      dayRef: '2026-03-12',
      completedAt: localAfterMidnight.toISOString(),
      recordId: 'record-1',
      source: 'standalone',
    })
  })

  it('omits recordId when none is given', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))

    await recordCompletion('box-breathing')

    const payload = vi.mocked(exerciseCompletionDexieRepository.create).mock.calls[0]?.[0]
    expect(payload?.recordId).toBeUndefined()
    expect(payload?.dayRef).toBe('2026-06-01')
  })
})
