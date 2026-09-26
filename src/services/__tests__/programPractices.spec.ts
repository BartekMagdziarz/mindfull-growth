import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreateExercisePlanItemPayload, ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  advanceEnrollmentForPlan,
  advancePracticeForPlan,
  eligibleDayForPractice,
  ensureCurrentStepMaterialized,
  isPracticeWindowOpen,
  reconcilePractices,
  skipOptionalStep,
} from '@/services/programSchedulerService'

const day = (value: string): DayRef => value as DayRef

// Fixture path: 4 steps, a daily log from enrollment until step 2 is done,
// and breathing every other day once step 0 is done.
const PROGRAM: ProgramDefinition = {
  slug: 'fixture-path',
  i18nKey: 'programs.fixture-path',
  icon: 'mg-exercise-anger-log',
  estimatedWeeks: 4,
  steps: [
    { exerciseSlug: 'anger-map', minGapDays: 0 },
    { exerciseSlug: 'pause-plan', minGapDays: 3 },
    { exerciseSlug: 'thought-record', minGapDays: 3, optional: true },
    { exerciseSlug: 'maintenance-plan', minGapDays: 3 },
  ],
  practices: [
    { exerciseSlug: 'anger-log', everyDays: 1, endsAfterStep: 2 },
    { exerciseSlug: 'paced-breathing', everyDays: 2, startsAfterStep: 0 },
  ],
}

vi.mock('@/data/programCatalog', () => ({
  getProgramDefinition: (slug: string) => (slug === 'fixture-path' ? PROGRAM : undefined),
}))

let planIdCounter = 0
vi.mock('@/repositories/exercisePlanDexieRepository', () => ({
  exercisePlanDexieRepository: {
    create: vi.fn(async (payload: CreateExercisePlanItemPayload) => ({
      id: `plan-created-${++planIdCounter}`,
      status: 'pending',
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
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

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-1',
    programSlug: 'fixture-path',
    status: 'active',
    startedAt: '2026-09-20T10:00:00.000Z',
    currentStepIndex: 0,
    completedSteps: [],
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  }
}

function planItem(overrides: Partial<ExercisePlanItem> = {}): ExercisePlanItem {
  return {
    id: 'plan-1',
    exerciseSlug: 'anger-log',
    dayRef: day('2026-09-23'),
    status: 'pending',
    source: 'program',
    sourceRef: 'enr-1',
    programRole: 'practice',
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  }
}

const createdPayloads = () =>
  vi.mocked(exercisePlanDexieRepository.create).mock.calls.map((call) => call[0])

afterEach(() => {
  vi.clearAllMocks()
})

describe('practice windows', () => {
  const [log, breathing] = PROGRAM.practices!

  it('opens from enrollment until the step after endsAfterStep', () => {
    expect(isPracticeWindowOpen(PROGRAM, log!, enrollment({ currentStepIndex: 0 }))).toBe(true)
    expect(isPracticeWindowOpen(PROGRAM, log!, enrollment({ currentStepIndex: 2 }))).toBe(true)
    expect(isPracticeWindowOpen(PROGRAM, log!, enrollment({ currentStepIndex: 3 }))).toBe(false)
  })

  it('opens only after startsAfterStep is passed', () => {
    expect(isPracticeWindowOpen(PROGRAM, breathing!, enrollment({ currentStepIndex: 0 }))).toBe(false)
    expect(isPracticeWindowOpen(PROGRAM, breathing!, enrollment({ currentStepIndex: 1 }))).toBe(true)
  })

  it('is closed for paused or finished enrollments', () => {
    expect(isPracticeWindowOpen(PROGRAM, log!, enrollment({ status: 'paused' }))).toBe(false)
    expect(isPracticeWindowOpen(PROGRAM, log!, enrollment({ currentStepIndex: 4, status: 'completed' }))).toBe(false)
  })
})

describe('eligibleDayForPractice', () => {
  const [log, breathing] = PROGRAM.practices!

  it('first occurrence: the enrollment start, clamped to today', () => {
    expect(eligibleDayForPractice(log!, enrollment(), undefined, day('2026-09-20'))).toBe(day('2026-09-20'))
    expect(eligibleDayForPractice(log!, enrollment(), undefined, day('2026-09-23'))).toBe(day('2026-09-23'))
  })

  it('next occurrence: last done + everyDays', () => {
    expect(eligibleDayForPractice(breathing!, enrollment(), '2026-09-23T18:00:00.000Z', day('2026-09-23'))).toBe(
      day('2026-09-25'),
    )
  })

  it('never births an overdue occurrence after a long gap', () => {
    expect(eligibleDayForPractice(log!, enrollment(), '2026-09-01T10:00:00.000Z', day('2026-09-23'))).toBe(
      day('2026-09-23'),
    )
  })
})

describe('reconcilePractices', () => {
  it('materializes one occurrence per open practice with programRole practice', async () => {
    const result = await reconcilePractices(enrollment({ currentStepIndex: 1 }), day('2026-09-23'))
    expect(result.created).toHaveLength(2)
    expect(createdPayloads()).toEqual([
      expect.objectContaining({ exerciseSlug: 'anger-log', dayRef: '2026-09-23', programRole: 'practice', sourceRef: 'enr-1' }),
      expect.objectContaining({ exerciseSlug: 'paced-breathing', programRole: 'practice' }),
    ])
  })

  it('is idempotent: an existing pending occurrence blocks a new one', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([planItem()])
    const result = await reconcilePractices(enrollment({ currentStepIndex: 0 }), day('2026-09-23'))
    expect(result.created).toHaveLength(0)
    expect(exercisePlanDexieRepository.create).not.toHaveBeenCalled()
  })

  it('schedules the next occurrence from the last done one', async () => {
    vi.mocked(exercisePlanDexieRepository.listByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'old-1', status: 'done', updatedAt: '2026-09-22T19:00:00.000Z' }),
      planItem({ id: 'old-2', status: 'done', updatedAt: '2026-09-23T19:00:00.000Z' }),
      // A step with the same enrollment never counts as practice history.
      planItem({ id: 'step', status: 'done', programRole: 'step', exerciseSlug: 'anger-log', updatedAt: '2026-09-25T10:00:00.000Z' }),
    ])
    await reconcilePractices(enrollment({ currentStepIndex: 0 }), day('2026-09-23'))
    expect(createdPayloads()[0]).toMatchObject({ exerciseSlug: 'anger-log', dayRef: '2026-09-24' })
  })

  it('a skipped occurrence counts as handled: no same-day re-creation', async () => {
    vi.mocked(exercisePlanDexieRepository.listByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'skipped', status: 'skipped', updatedAt: '2026-09-23T08:00:00.000Z' }),
    ])
    await reconcilePractices(enrollment({ currentStepIndex: 0 }), day('2026-09-23'))
    expect(createdPayloads()[0]).toMatchObject({ exerciseSlug: 'anger-log', dayRef: '2026-09-24' })
  })

  it('deletes occurrences whose window closed', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'log-pending' }),
      planItem({ id: 'breath-pending', exerciseSlug: 'paced-breathing' }),
      planItem({ id: 'step-pending', programRole: 'step', exerciseSlug: 'maintenance-plan' }),
    ])
    const result = await reconcilePractices(enrollment({ currentStepIndex: 3 }), day('2026-09-23'))
    expect(result.removedPlanIds).toEqual(['log-pending'])
    // The step item is never touched by practice reconciliation.
    expect(exercisePlanDexieRepository.delete).toHaveBeenCalledTimes(1)
  })

  it('leaves no pending practice on a paused enrollment', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([planItem()])
    const result = await reconcilePractices(enrollment({ status: 'paused' }), day('2026-09-23'))
    expect(result).toEqual({ created: [], removedPlanIds: ['plan-1'] })
  })
})

describe('steps and practices stay separate', () => {
  it('a pending practice does not block materializing the current step', async () => {
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([planItem()])
    const item = await ensureCurrentStepMaterialized(enrollment())
    expect(item).toMatchObject({ exerciseSlug: 'anger-map', programRole: 'step' })
  })

  it('completing a practice never advances the step index', async () => {
    expect(await advanceEnrollmentForPlan(planItem({ status: 'done' }))).toBeNull()
    expect(programEnrollmentDexieRepository.update).not.toHaveBeenCalled()
  })

  it('completing a practice schedules the next occurrence', async () => {
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(enrollment())
    vi.mocked(exercisePlanDexieRepository.listByProgramSourceRef).mockResolvedValueOnce([
      planItem({ status: 'done', updatedAt: '2026-09-23T19:00:00.000Z' }),
    ])
    const result = await advancePracticeForPlan(planItem({ status: 'done' }))
    expect(result?.created).toHaveLength(1)
    expect(result?.created[0]?.exerciseSlug).toBe('anger-log')
  })

  it('advancing a step opens the practice that starts after it', async () => {
    const base = enrollment()
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(base)
    vi.mocked(programEnrollmentDexieRepository.update).mockImplementation(async (id, patch) => ({ ...base, id, ...patch }))
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef)
      .mockResolvedValueOnce([]) // ensureCurrentStepMaterialized
      .mockResolvedValueOnce([planItem({ id: 'log-pending' })]) // reconcilePractices
    const advancement = await advanceEnrollmentForPlan(
      planItem({ id: 'step-0', programRole: 'step', exerciseSlug: 'anger-map', status: 'done' }),
    )
    expect(advancement?.enrollment.currentStepIndex).toBe(1)
    expect(advancement?.practices?.created.map((item) => item.exerciseSlug)).toEqual(['paced-breathing'])
  })

  it('skipping an optional step skips the step item, not a practice', async () => {
    const base = enrollment({ currentStepIndex: 2 })
    vi.mocked(programEnrollmentDexieRepository.getById).mockResolvedValueOnce(base)
    vi.mocked(programEnrollmentDexieRepository.update).mockImplementation(async (id, patch) => ({ ...base, id, ...patch }))
    vi.mocked(exercisePlanDexieRepository.listPendingByProgramSourceRef).mockResolvedValueOnce([
      planItem({ id: 'log-pending' }),
      planItem({ id: 'step-2', programRole: 'step', exerciseSlug: 'thought-record' }),
    ])
    const result = await skipOptionalStep('enr-1')
    expect(result.skippedPlan?.id).toBe('step-2')
  })
})
