import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateExercisePlanItemPayload, ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { isDeliveringEnrollment } from '@/domain/program'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  advanceEnrollmentForPlan,
  deriveStepStates,
  effectivePractice,
  ensureCurrentStepMaterialized,
  reconcilePractices,
  runProgramScheduler,
  skipOptionalStep,
} from '@/services/programSchedulerService'

/**
 * A path that closes before its last step and keeps delivering follow-ups
 * ("Powrót") to the completed enrollment — the shame v3 shape (plan §7.1).
 */
const FOLLOW_UP: ProgramDefinition = {
  slug: 'follow-up-path',
  i18nKey: 'programs.follow-up-path',
  icon: 'x',
  estimatedWeeks: 2,
  steps: [
    { exerciseSlug: 'alpha', minGapDays: 0 },
    { exerciseSlug: 'omega', minGapDays: 0, closesPath: true },
    { exerciseSlug: 'return-measure', minGapDays: 7, afterCompletion: true },
    { exerciseSlug: 'return-note', minGapDays: 0, afterCompletion: true, optional: true },
  ],
  practices: [{ exerciseSlug: 'breath', everyDays: 2, endsAfterStep: 1 }],
}

vi.mock('@/data/programCatalog', () => ({
  getProgramDefinition: vi.fn((slug: string) => (slug === 'follow-up-path' ? FOLLOW_UP : undefined)),
}))

vi.mock('@/repositories/exercisePlanDexieRepository', () => ({
  exercisePlanDexieRepository: {
    create: vi.fn(async (payload: CreateExercisePlanItemPayload) => ({
      id: 'plan-new',
      status: 'pending',
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
      ...payload,
    })),
    delete: vi.fn(async () => undefined),
    listPendingByProgramSourceRef: vi.fn(async () => [] as ExercisePlanItem[]),
    listByProgramSourceRef: vi.fn(async () => [] as ExercisePlanItem[]),
  },
}))

vi.mock('@/repositories/programEnrollmentDexieRepository', () => ({
  programEnrollmentDexieRepository: {
    getById: vi.fn(async () => undefined),
    listAll: vi.fn(async () => [] as ProgramEnrollment[]),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/services/exercisePlanService', () => ({
  skipPlan: vi.fn(async (id: string) => ({ id, status: 'skipped' })),
}))

const day = (value: string): DayRef => value as DayRef

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-f',
    programSlug: 'follow-up-path',
    status: 'active',
    startedAt: '2026-07-01T10:00:00.000Z',
    currentStepIndex: 0,
    completedSteps: [],
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

function planItem(overrides: Partial<ExercisePlanItem> = {}): ExercisePlanItem {
  return {
    id: 'plan-1',
    exerciseSlug: 'alpha',
    dayRef: day('2026-07-01'),
    status: 'pending',
    source: 'program',
    sourceRef: 'enr-f',
    programRole: 'step',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

function mockUpdateMerging(base: ProgramEnrollment): void {
  vi.mocked(programEnrollmentDexieRepository.update).mockImplementation(async (id, patch) => ({
    ...base,
    id,
    ...patch,
  }))
}

/** A path closed on `omega` with the follow-up measure ahead. */
const CLOSED_AT_RETURN = enrollment({
  status: 'completed',
  completedAt: '2026-07-10T10:00:00.000Z',
  currentStepIndex: 2,
  completedSteps: [
    { stepIndex: 0, completedAt: '2026-07-03T10:00:00.000Z' },
    { stepIndex: 1, completedAt: '2026-07-10T10:00:00.000Z' },
  ],
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0)) // local 2026-07-10
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('isDeliveringEnrollment', () => {
  it('is true for active, and for completed only while a follow-up step is ahead', () => {
    expect(isDeliveringEnrollment(FOLLOW_UP, enrollment())).toBe(true)
    expect(isDeliveringEnrollment(FOLLOW_UP, CLOSED_AT_RETURN)).toBe(true)
    expect(
      isDeliveringEnrollment(FOLLOW_UP, enrollment({ status: 'completed', currentStepIndex: 4 }))
    ).toBe(false)
    expect(isDeliveringEnrollment(FOLLOW_UP, enrollment({ status: 'paused' }))).toBe(false)
    expect(isDeliveringEnrollment(FOLLOW_UP, enrollment({ status: 'abandoned' }))).toBe(false)
  })
})

describe('closing step', () => {
  it('completes the path on the closesPath step and materializes the follow-up at its gap', async () => {
    const e = enrollment({
      currentStepIndex: 1,
      completedSteps: [{ stepIndex: 0, completedAt: '2026-07-03T10:00:00.000Z' }],
    })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await advanceEnrollmentForPlan(planItem({ exerciseSlug: 'omega' }))

    const patch = vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]?.[1]
    expect(patch).toMatchObject({
      status: 'completed',
      completedAt: new Date().toISOString(),
      currentStepIndex: 2,
    })
    // return-measure: 7 days after the closing completion
    expect(result?.nextPlanItem).toMatchObject({
      exerciseSlug: 'return-measure',
      dayRef: day('2026-07-17'),
      programStepIndex: 2,
    })
    // practices end with the path
    expect(result?.practices?.created ?? []).toEqual([])
  })

  it('keeps completedAt once set and leaves the status alone on follow-up steps', async () => {
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(CLOSED_AT_RETURN)
    mockUpdateMerging(CLOSED_AT_RETURN)

    const result = await advanceEnrollmentForPlan(
      planItem({ exerciseSlug: 'return-measure', programStepIndex: 2, dayRef: day('2026-07-17') })
    )

    const patch = vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]?.[1]
    expect(patch?.status).toBeUndefined()
    expect(patch?.completedAt).toBeUndefined()
    expect(patch?.currentStepIndex).toBe(3)
    expect(result?.nextPlanItem?.exerciseSlug).toBe('return-note')
  })

  it('skips an optional follow-up step of a completed enrollment', async () => {
    const e = { ...CLOSED_AT_RETURN, currentStepIndex: 3 }
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await skipOptionalStep('enr-f')

    expect(result.enrollment.currentStepIndex).toBe(4)
    expect(result.enrollment.status).toBe('completed')
    expect(result.nextPlanItem).toBeNull()
  })
})

describe('materialization gate', () => {
  it('materializes a follow-up step for a completed enrollment', async () => {
    const item = await ensureCurrentStepMaterialized(CLOSED_AT_RETURN)
    expect(item).toMatchObject({ exerciseSlug: 'return-measure', dayRef: day('2026-07-17') })
  })

  it('no-ops once the follow-ups are walked', async () => {
    expect(
      await ensureCurrentStepMaterialized({ ...CLOSED_AT_RETURN, currentStepIndex: 4 })
    ).toBeNull()
  })

  it('the Today-load reconciler includes closed paths with a follow-up ahead and skips the rest', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      CLOSED_AT_RETURN,
      { ...CLOSED_AT_RETURN, id: 'enr-done', currentStepIndex: 4 },
      enrollment({ id: 'enr-paused', status: 'paused' }),
    ])

    const created = await runProgramScheduler()

    expect(created.map(item => item.sourceRef)).toEqual(['enr-f'])
    // closed paths are never content-migrated
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })

  it('shows the follow-up step as current in the timeline', () => {
    expect(deriveStepStates(FOLLOW_UP, CLOSED_AT_RETURN).map(s => s.state)).toEqual([
      'done',
      'done',
      'current',
      'locked',
    ])
  })
})

describe('practice overrides', () => {
  it('effectivePractice applies a positive override and ignores a missing or zero one', () => {
    const practice = FOLLOW_UP.practices![0]!
    expect(effectivePractice(practice, {}).everyDays).toBe(2)
    expect(effectivePractice(practice, { practiceOverrides: { breath: { everyDays: 3 } } }).everyDays).toBe(3)
    expect(effectivePractice(practice, { practiceOverrides: { breath: { everyDays: 0 } } }).everyDays).toBe(2)
  })

  it('schedules the next occurrence with the overridden rhythm', async () => {
    const e = enrollment({ currentStepIndex: 1, practiceOverrides: { breath: { everyDays: 3 } } })
    vi.mocked(exercisePlanDexieRepository.listByProgramSourceRef).mockResolvedValueOnce([
      planItem({
        id: 'done-1',
        exerciseSlug: 'breath',
        programRole: 'practice',
        status: 'done',
        updatedAt: '2026-07-09T10:00:00.000Z',
      }),
    ])

    const result = await reconcilePractices(e, day('2026-07-10'))

    expect(result.created[0]).toMatchObject({ exerciseSlug: 'breath', dayRef: day('2026-07-12') })
  })
})
