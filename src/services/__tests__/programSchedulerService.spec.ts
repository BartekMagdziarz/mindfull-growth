import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateExercisePlanItemPayload, ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { skipPlan } from '@/services/exercisePlanService'
import {
  abandonEnrollment,
  advanceEnrollmentForPlan,
  deriveStepStates,
  eligibleDayForStep,
  enrollInProgram,
  ensureCurrentStepMaterialized,
  pauseEnrollment,
  resumeEnrollment,
  runProgramScheduler,
  skipOptionalStep,
} from '@/services/programSchedulerService'

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

const IFS = getProgramDefinition('ifs-parts')!
const CBT = getProgramDefinition('cbt-thoughts')!

// Midday-UTC timestamps keep the local day stable across test timezones.
function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-1',
    programSlug: 'ifs-parts',
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
    exerciseSlug: 'parts-mapping',
    dayRef: day('2026-07-01'),
    status: 'pending',
    source: 'program',
    sourceRef: 'enr-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

/** `update` echoes the patch merged over the given base enrollment. */
function mockUpdateMerging(base: ProgramEnrollment): void {
  vi.mocked(programEnrollmentDexieRepository.update).mockImplementation(
    async (id, patch) => ({ ...base, id, ...patch }),
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('eligibleDayForStep', () => {
  it('anchors step 0 on the enrollment start', () => {
    expect(eligibleDayForStep(IFS, enrollment(), 0)).toBe(day('2026-07-01'))
  })

  it('anchors later steps on the previous completion plus the gap', () => {
    const e = enrollment({
      currentStepIndex: 1,
      completedSteps: [{ stepIndex: 0, completedAt: '2026-07-02T10:00:00.000Z' }],
    })
    // unblending has minGapDays 3
    expect(eligibleDayForStep(IFS, e, 1)).toBe(day('2026-07-05'))
  })

  it('falls back to the latest ACTUAL completion when a step was skipped', () => {
    const e = enrollment({
      programSlug: 'cbt-thoughts',
      currentStepIndex: 4,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-07-01T10:00:00.000Z' },
        { stepIndex: 1, completedAt: '2026-07-04T10:00:00.000Z' },
        { stepIndex: 2, completedAt: '2026-07-10T10:00:00.000Z' },
        // step 3 skipped — no entry
      ],
    })
    // core-beliefs has minGapDays 3, anchored on step 2's completion
    expect(eligibleDayForStep(CBT, e, 4)).toBe(day('2026-07-13'))
  })
})

describe('ensureCurrentStepMaterialized', () => {
  it('creates the current step item at its eligible day', async () => {
    const e = enrollment({
      currentStepIndex: 2,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-06-28T10:00:00.000Z' },
        { stepIndex: 1, completedAt: '2026-07-02T10:00:00.000Z' },
      ],
    })

    const item = await ensureCurrentStepMaterialized(e)

    // trailhead has minGapDays 4
    expect(vi.mocked(exercisePlanDexieRepository.create).mock.calls[0]?.[0]).toEqual({
      exerciseSlug: 'trailhead',
      dayRef: day('2026-07-06'),
      source: 'program',
      sourceRef: 'enr-1',
    })
    expect(item?.exerciseSlug).toBe('trailhead')
  })

  it('materializes a past eligible day as-is (overdue, never clamped)', async () => {
    const e = enrollment({ startedAt: '2026-01-05T10:00:00.000Z' })

    const item = await ensureCurrentStepMaterialized(e)

    expect(item?.dayRef).toBe(day('2026-01-05'))
  })

  it('is idempotent: an existing pending item blocks a new one', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([
      planItem(),
    ])

    expect(await ensureCurrentStepMaterialized(enrollment())).toBeNull()
    expect(exercisePlanDexieRepository.create).not.toHaveBeenCalled()
  })

  it.each(['paused', 'completed', 'abandoned'] as const)('no-ops on %s enrollments', async (status) => {
    expect(await ensureCurrentStepMaterialized(enrollment({ status }))).toBeNull()
    expect(exercisePlanDexieRepository.create).not.toHaveBeenCalled()
  })

  it('no-ops once the path is fully walked', async () => {
    const e = enrollment({ currentStepIndex: IFS.steps.length })
    expect(await ensureCurrentStepMaterialized(e)).toBeNull()
    expect(exercisePlanDexieRepository.create).not.toHaveBeenCalled()
  })
})

describe('runProgramScheduler', () => {
  it('materializes every active enrollment, skipping paused/terminal ones', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ id: 'enr-a' }),
      enrollment({ id: 'enr-b', programSlug: 'cbt-thoughts', status: 'paused' }),
      enrollment({ id: 'enr-c', programSlug: 'foundation' }),
      enrollment({ id: 'enr-d', status: 'completed' }),
    ])

    const created = await runProgramScheduler()

    expect(created.map((item) => item.sourceRef)).toEqual(['enr-a', 'enr-c'])
  })

  it('one failing enrollment never blocks the rest', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ id: 'enr-bad' }),
      enrollment({ id: 'enr-good', programSlug: 'foundation' }),
    ])
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockRejectedValueOnce(
      new Error('dexie down'),
    )

    const created = await runProgramScheduler()

    expect(created.map((item) => item.sourceRef)).toEqual(['enr-good'])
  })
})

describe('advanceEnrollmentForPlan', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0)) // local 2026-07-10
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('appends the completion, advances the index and materializes the next step', async () => {
    const e = enrollment({
      currentStepIndex: 2,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-06-28T10:00:00.000Z' },
        { stepIndex: 1, completedAt: '2026-07-02T10:00:00.000Z' },
      ],
    })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await advanceEnrollmentForPlan(
      planItem({ exerciseSlug: 'trailhead', recordId: 'rec-9' }),
    )

    const patch = vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]?.[1]
    expect(patch).toMatchObject({ status: 'active', currentStepIndex: 3 })
    expect(patch?.completedSteps?.at(-1)).toEqual({
      stepIndex: 2,
      completedAt: new Date().toISOString(),
      recordId: 'rec-9',
    })
    // protector-appreciation (gap 4) anchored on today's completion
    expect(vi.mocked(exercisePlanDexieRepository.create).mock.calls[0]?.[0]).toMatchObject({
      exerciseSlug: 'protector-appreciation',
      dayRef: day('2026-07-14'),
      sourceRef: 'enr-1',
    })
    expect(result?.nextPlanItem?.exerciseSlug).toBe('protector-appreciation')
  })

  it('completes the enrollment on the last step with no next item', async () => {
    const e = enrollment({ currentStepIndex: IFS.steps.length - 1 })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await advanceEnrollmentForPlan(planItem({ exerciseSlug: 'parts-dialogue' }))

    expect(vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]?.[1]).toMatchObject({
      status: 'completed',
      currentStepIndex: IFS.steps.length,
    })
    expect(result?.nextPlanItem).toBeNull()
    expect(exercisePlanDexieRepository.create).not.toHaveBeenCalled()
  })

  it('maps repeated slugs by index: thought-record advances to another thought-record', async () => {
    const e = enrollment({
      programSlug: 'cbt-thoughts',
      currentStepIndex: 1,
      completedSteps: [{ stepIndex: 0, completedAt: '2026-07-05T10:00:00.000Z' }],
    })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await advanceEnrollmentForPlan(planItem({ exerciseSlug: 'thought-record' }))

    expect(result?.enrollment.currentStepIndex).toBe(2)
    // The next step is thought-record again, gapped 2 days from today's completion.
    expect(vi.mocked(exercisePlanDexieRepository.create).mock.calls[0]?.[0]).toMatchObject({
      exerciseSlug: 'thought-record',
      dayRef: day('2026-07-12'),
    })
  })

  it('no-ops on a slug mismatch (stale item)', async () => {
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(
      enrollment({ currentStepIndex: 2 }),
    )

    expect(await advanceEnrollmentForPlan(planItem({ exerciseSlug: 'unblending' }))).toBeNull()
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })

  it('no-ops for non-program plans, unknown or non-active enrollments', async () => {
    expect(await advanceEnrollmentForPlan(planItem({ source: 'repeat' }))).toBeNull()
    expect(await advanceEnrollmentForPlan(planItem({ sourceRef: undefined }))).toBeNull()

    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(undefined)
    expect(await advanceEnrollmentForPlan(planItem())).toBeNull()

    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(
      enrollment({ status: 'paused' }),
    )
    expect(await advanceEnrollmentForPlan(planItem())).toBeNull()
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })
})

describe('enrollInProgram', () => {
  it('creates an active enrollment and materializes step 0', async () => {
    const created = enrollment({ id: 'enr-new', programSlug: 'foundation' })
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([])
    vi.mocked(programEnrollmentDexieRepository.create).mockResolvedValueOnce(created)

    const result = await enrollInProgram('foundation')

    expect(vi.mocked(programEnrollmentDexieRepository.create).mock.calls[0]?.[0]).toEqual({
      programSlug: 'foundation',
    })
    expect(result.planItem).toMatchObject({
      exerciseSlug: 'values',
      dayRef: day('2026-07-01'),
      sourceRef: 'enr-new',
    })
  })

  it('rejects a duplicate non-terminal enrollment of the same program', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValue([
      enrollment({ status: 'paused' }),
    ])

    await expect(enrollInProgram('ifs-parts')).rejects.toThrow(/already enrolled/i)
    expect(programEnrollmentDexieRepository.create).not.toHaveBeenCalled()
  })

  it('allows parallel enrollments in different programs', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment()])
    vi.mocked(programEnrollmentDexieRepository.create).mockResolvedValueOnce(
      enrollment({ id: 'enr-new', programSlug: 'cbt-thoughts' }),
    )

    await expect(enrollInProgram('cbt-thoughts')).resolves.toBeTruthy()
  })

  it('rejects unknown programs', async () => {
    await expect(enrollInProgram('nope')).rejects.toThrow(/unknown program/i)
  })
})

describe('pause / resume / abandon', () => {
  it('pause deletes pending step items and returns their ids', async () => {
    const e = enrollment()
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'plan-77' }),
    ])
    mockUpdateMerging(e)

    const result = await pauseEnrollment('enr-1')

    expect(exercisePlanDexieRepository.delete).toHaveBeenCalledWith('plan-77')
    expect(result.enrollment.status).toBe('paused')
    expect(result.removedPlanIds).toEqual(['plan-77'])
  })

  it('pause requires an active enrollment', async () => {
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(
      enrollment({ status: 'completed' }),
    )
    await expect(pauseEnrollment('enr-1')).rejects.toThrow(/expected active/i)
  })

  it('resume re-materializes the current step at its original eligible day', async () => {
    const e = enrollment({
      status: 'paused',
      currentStepIndex: 1,
      completedSteps: [{ stepIndex: 0, completedAt: '2026-07-02T10:00:00.000Z' }],
    })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    mockUpdateMerging(e)

    const result = await resumeEnrollment('enr-1')

    expect(result.enrollment.status).toBe('active')
    expect(result.planItem).toMatchObject({
      exerciseSlug: 'unblending',
      dayRef: day('2026-07-05'),
    })
  })

  it('abandon works from paused too and cleans pending items', async () => {
    const e = enrollment({ status: 'paused' })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'plan-88' }),
    ])
    mockUpdateMerging(e)

    const result = await abandonEnrollment('enr-1')

    expect(result.enrollment.status).toBe('abandoned')
    expect(result.removedPlanIds).toEqual(['plan-88'])
  })
})

describe('skipOptionalStep', () => {
  it('skips the pending item, advances without a completion entry and materializes the next step', async () => {
    const e = enrollment({
      programSlug: 'cbt-thoughts',
      currentStepIndex: 3,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-07-01T10:00:00.000Z' },
        { stepIndex: 1, completedAt: '2026-07-03T10:00:00.000Z' },
        { stepIndex: 2, completedAt: '2026-07-05T10:00:00.000Z' },
      ],
    })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(e)
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef)
      .mockResolvedValueOnce([planItem({ id: 'plan-opt', exerciseSlug: 'thought-record' })])
      .mockResolvedValueOnce([])
    mockUpdateMerging(e)

    const result = await skipOptionalStep('enr-1')

    expect(skipPlan).toHaveBeenCalledWith('plan-opt')
    const patch = vi.mocked(programEnrollmentDexieRepository.update).mock.calls[0]?.[1]
    expect(patch).toMatchObject({ currentStepIndex: 4 })
    expect(patch?.completedSteps).toBeUndefined()
    // core-beliefs (gap 3) anchors on step 2's ACTUAL completion — a skip adds no delay.
    expect(result.nextPlanItem).toMatchObject({
      exerciseSlug: 'core-beliefs',
      dayRef: day('2026-07-08'),
    })
  })

  it('rejects skipping a non-optional step', async () => {
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(
      enrollment({ programSlug: 'cbt-thoughts', currentStepIndex: 1 }),
    )

    await expect(skipOptionalStep('enr-1')).rejects.toThrow(/not optional/i)
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })
})

describe('deriveStepStates', () => {
  it('locks everything without an enrollment (preview)', () => {
    expect(deriveStepStates(IFS, null).every((s) => s.state === 'locked')).toBe(true)
  })

  it('derives done / skipped / current / locked from the enrollment', () => {
    const e = enrollment({
      programSlug: 'cbt-thoughts',
      currentStepIndex: 4,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-07-01T10:00:00.000Z', recordId: 'rec-0' },
        { stepIndex: 1, completedAt: '2026-07-03T10:00:00.000Z' },
        { stepIndex: 2, completedAt: '2026-07-10T10:00:00.000Z' },
      ],
    })

    const states = deriveStepStates(CBT, e)

    expect(states.map((s) => s.state)).toEqual(['done', 'done', 'done', 'skipped', 'current'])
    expect(states[0]).toMatchObject({ completedAt: '2026-07-01T10:00:00.000Z', recordId: 'rec-0' })
    expect(states[4]?.eligibleDay).toBe(day('2026-07-13'))
  })

  it('keeps the current step visible while paused, locks it once terminal', () => {
    const paused = enrollment({ status: 'paused', currentStepIndex: 1 })
    expect(deriveStepStates(IFS, paused)[1]?.state).toBe('current')

    const abandoned = enrollment({ status: 'abandoned', currentStepIndex: 1 })
    expect(deriveStepStates(IFS, abandoned)[1]?.state).toBe('locked')

    const completed = enrollment({
      status: 'completed',
      currentStepIndex: IFS.steps.length,
      completedSteps: IFS.steps.map((_, stepIndex) => ({
        stepIndex,
        completedAt: '2026-07-01T10:00:00.000Z',
      })),
    })
    expect(deriveStepStates(IFS, completed).every((s) => s.state === 'done')).toBe(true)
  })
})
