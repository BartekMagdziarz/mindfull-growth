import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateMicroExerciseEntryPayload, MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { backfillMoment, isBackfilledMoment } from '@/services/momentBackfillService'
import { recordTaskProgress } from '@/services/programTaskBridgeService'

vi.mock('@/repositories/microExerciseEntryDexieRepository', () => ({
  microExerciseEntryDexieRepository: {
    create: vi.fn(
      async (payload: CreateMicroExerciseEntryPayload): Promise<MicroExerciseEntry> => ({
        id: 'bf-1',
        createdAt: payload.createdAt ?? '2026-01-01T00:00:00.000Z',
        updatedAt: payload.createdAt ?? '2026-01-01T00:00:00.000Z',
        exerciseSlug: payload.exerciseSlug,
        responses: payload.responses,
      })
    ),
  },
}))
vi.mock('@/services/programTaskBridgeService', () => ({
  recordTaskProgress: vi.fn(async () => ({ intentionIds: [] })),
}))

const DAY = '2026-09-23' as DayRef

describe('backfillMoment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes the Moment on its day as "noticed later", flagged, and counts it towards the task', async () => {
    const entry = await backfillMoment({
      kind: 'shame',
      day: DAY,
      reaction: 'attackSelf',
      response: ['kindAct'],
    })
    const payload = vi.mocked(microExerciseEntryDexieRepository.create).mock.calls[0]![0]
    expect(payload.exerciseSlug).toBe('moments')
    expect(payload.responses).toMatchObject({
      kind: 'shame',
      hadMoment: 'yes',
      compass: 'attackSelf',
      noticed: 'later',
      response: ['kindAct'],
      backfilled: 'yes',
    })
    // noon of the day, in local time — the day survives any timezone
    expect(new Date(payload.createdAt!).toISOString()).toBe(
      new Date(`${DAY}T12:00:00`).toISOString()
    )
    expect(isBackfilledMoment(entry)).toBe(true)
    expect(recordTaskProgress).toHaveBeenCalledWith('moment-shame', DAY, 'bf-1')
  })

  it('an empty answer list becomes "nothing" and a failing bridge does not lose the Moment', async () => {
    vi.mocked(recordTaskProgress).mockRejectedValueOnce(new Error('offline'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const entry = await backfillMoment({ kind: 'shame', day: DAY, reaction: 'none' })
    expect(entry.responses.response).toEqual(['nothing'])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
