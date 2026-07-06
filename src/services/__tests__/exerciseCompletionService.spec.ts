import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateExerciseCompletionPayload } from '@/domain/exerciseCompletion'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { recordCompletion } from '@/services/exerciseCompletionService'
import { autoCompleteFor } from '@/services/exercisePlanService'
import { advanceEnrollmentForPlan } from '@/services/programSchedulerService'

vi.mock('@/repositories/exerciseCompletionDexieRepository', () => ({
  exerciseCompletionDexieRepository: {
    create: vi.fn(async (payload: CreateExerciseCompletionPayload) => ({
      id: 'completion-1',
      ...payload,
    })),
  },
}))

vi.mock('@/services/exercisePlanService', () => ({
  autoCompleteFor: vi.fn(async () => null),
}))

vi.mock('@/services/programSchedulerService', () => ({
  advanceEnrollmentForPlan: vi.fn(async () => null),
}))

const completedPlanFixture: ExercisePlanItem = {
  id: 'plan-1',
  exerciseSlug: 'worry-tree',
  dayRef: '2026-03-10' as DayRef,
  status: 'done',
  source: 'repeat',
  recordId: 'record-1',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-12T00:30:00.000Z',
}

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

  it('writes source plan and returns the plan when auto-complete matches', async () => {
    vi.setSystemTime(new Date(2026, 2, 12, 0, 30, 0))
    vi.mocked(autoCompleteFor).mockResolvedValueOnce(completedPlanFixture)

    const result = await recordCompletion('worry-tree', 'record-1')

    expect(vi.mocked(autoCompleteFor).mock.calls[0]).toEqual([
      'worry-tree',
      '2026-03-12',
      'record-1',
    ])
    expect(result.completedPlan).toEqual(completedPlanFixture)
    const payload = vi.mocked(exerciseCompletionDexieRepository.create).mock.calls[0]?.[0]
    expect(payload?.source).toBe('plan')
  })

  it('stays standalone with a null plan when nothing matches', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))

    const result = await recordCompletion('worry-tree')

    expect(result.completedPlan).toBeNull()
    expect(result.completion.source).toBe('standalone')
  })

  it('still writes the completion when auto-complete throws', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))
    vi.mocked(autoCompleteFor).mockRejectedValueOnce(new Error('dexie down'))

    const result = await recordCompletion('worry-tree')

    expect(result.completion.source).toBe('standalone')
    expect(result.completedPlan).toBeNull()
    expect(exerciseCompletionDexieRepository.create).toHaveBeenCalledTimes(1)
  })

  it('advances the program when the completed plan is a program step', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))
    const programPlan: ExercisePlanItem = {
      ...completedPlanFixture,
      source: 'program',
      sourceRef: 'enrollment-1',
    }
    const advancement = { enrollment: { id: 'enrollment-1' }, nextPlanItem: null }
    vi.mocked(autoCompleteFor).mockResolvedValueOnce(programPlan)
    vi.mocked(advanceEnrollmentForPlan).mockResolvedValueOnce(
      advancement as unknown as Awaited<ReturnType<typeof advanceEnrollmentForPlan>>,
    )

    const result = await recordCompletion('worry-tree', 'record-1')

    expect(vi.mocked(advanceEnrollmentForPlan).mock.calls[0]?.[0]).toEqual(programPlan)
    expect(result.programAdvancement).toEqual(advancement)
  })

  it('does not touch program advancement for non-program plans', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))
    vi.mocked(autoCompleteFor).mockResolvedValueOnce(completedPlanFixture)

    const result = await recordCompletion('worry-tree', 'record-1')

    expect(advanceEnrollmentForPlan).not.toHaveBeenCalled()
    expect(result.programAdvancement).toBeNull()
  })

  it('still returns the completion when program advancement throws', async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0, 0))
    vi.mocked(autoCompleteFor).mockResolvedValueOnce({
      ...completedPlanFixture,
      source: 'program',
      sourceRef: 'enrollment-1',
    })
    vi.mocked(advanceEnrollmentForPlan).mockRejectedValueOnce(new Error('dexie down'))

    const result = await recordCompletion('worry-tree')

    expect(result.completion.source).toBe('plan')
    expect(result.programAdvancement).toBeNull()
    expect(exerciseCompletionDexieRepository.create).toHaveBeenCalledTimes(1)
  })
})
