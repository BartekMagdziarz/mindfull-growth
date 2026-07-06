import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import {
  enrollInProgram,
  pauseEnrollment,
  runProgramScheduler,
} from '@/services/programSchedulerService'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'

vi.mock('@/repositories/programEnrollmentDexieRepository', () => ({
  programEnrollmentDexieRepository: {
    listAll: vi.fn(async () => [] as ProgramEnrollment[]),
  },
}))

vi.mock('@/services/programSchedulerService', () => ({
  enrollInProgram: vi.fn(),
  pauseEnrollment: vi.fn(),
  resumeEnrollment: vi.fn(),
  abandonEnrollment: vi.fn(),
  skipOptionalStep: vi.fn(),
  runProgramScheduler: vi.fn(async () => [] as ExercisePlanItem[]),
}))

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
    dayRef: '2026-07-01' as DayRef,
    status: 'pending',
    source: 'program',
    sourceRef: 'enr-1',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('useProgramEnrollmentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // clearAllMocks keeps implementations — pin the default explicitly
    // so per-test mockResolvedValueOnce lists never leak across tests.
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValue([])
  })

  it('ensureLoaded hydrates once', async () => {
    const store = useProgramEnrollmentStore()
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment()])

    await store.ensureLoaded()
    await store.ensureLoaded()

    expect(programEnrollmentDexieRepository.listAll).toHaveBeenCalledTimes(1)
    expect(store.enrollments).toHaveLength(1)
  })

  it('applyUpdate replaces by id, appends unknown ids and no-ops before load', async () => {
    const store = useProgramEnrollmentStore()

    store.applyUpdate(enrollment())
    expect(store.enrollments).toHaveLength(0) // pre-load no-op

    await store.ensureLoaded()
    store.applyUpdate(enrollment({ id: 'enr-a' }))
    store.applyUpdate(enrollment({ id: 'enr-a', status: 'paused' }))
    store.applyUpdate(enrollment({ id: 'enr-b' }))

    expect(store.enrollments).toHaveLength(2)
    expect(store.enrollments.find((e) => e.id === 'enr-a')?.status).toBe('paused')
  })

  it('activeEnrollments filters and orders by creation', async () => {
    const store = useProgramEnrollmentStore()
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ id: 'enr-b', createdAt: '2026-07-03T10:00:00.000Z' }),
      enrollment({ id: 'enr-paused', status: 'paused' }),
      enrollment({ id: 'enr-a', createdAt: '2026-07-01T10:00:00.000Z' }),
    ])
    await store.ensureLoaded()

    expect(store.activeEnrollments.map((e) => e.id)).toEqual(['enr-a', 'enr-b'])
  })

  it('enrollmentForProgram prefers open enrollments, then completed, never abandoned', async () => {
    const store = useProgramEnrollmentStore()
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ id: 'enr-old', status: 'abandoned', createdAt: '2026-06-01T10:00:00.000Z' }),
      enrollment({ id: 'enr-done', status: 'completed', createdAt: '2026-06-10T10:00:00.000Z' }),
      enrollment({ id: 'enr-open', status: 'paused', createdAt: '2026-07-01T10:00:00.000Z' }),
    ])
    await store.ensureLoaded()

    expect(store.enrollmentForProgram('ifs-parts')?.id).toBe('enr-open')
    expect(store.enrollmentForProgram('cbt-thoughts')).toBeUndefined()
  })

  it('enroll mirrors the enrollment and the materialized step into both stores', async () => {
    const store = useProgramEnrollmentStore()
    const planStore = useExercisePlanStore()
    await store.ensureLoaded()
    planStore.isLoaded = true
    vi.mocked(enrollInProgram).mockResolvedValueOnce({
      enrollment: enrollment({ id: 'enr-new' }),
      planItem: planItem({ id: 'plan-new', sourceRef: 'enr-new' }),
    })

    await store.enroll('ifs-parts')

    expect(store.enrollments.map((e) => e.id)).toContain('enr-new')
    expect(planStore.items.map((i) => i.id)).toContain('plan-new')
  })

  it('pause applies the plan-item removals to the plan store', async () => {
    const store = useProgramEnrollmentStore()
    const planStore = useExercisePlanStore()
    await store.ensureLoaded()
    planStore.isLoaded = true
    planStore.applyUpdate(planItem({ id: 'plan-77' }))
    store.applyUpdate(enrollment())
    vi.mocked(pauseEnrollment).mockResolvedValueOnce({
      enrollment: enrollment({ status: 'paused' }),
      removedPlanIds: ['plan-77'],
    })

    await store.pause('enr-1')

    expect(store.enrollments[0]?.status).toBe('paused')
    expect(planStore.items).toHaveLength(0)
  })

  it('runScheduler mirrors created items and never throws', async () => {
    const store = useProgramEnrollmentStore()
    const planStore = useExercisePlanStore()
    planStore.isLoaded = true
    vi.mocked(runProgramScheduler).mockRejectedValueOnce(new Error('dexie down'))

    await expect(store.runScheduler()).resolves.toBeUndefined()

    vi.mocked(runProgramScheduler).mockResolvedValueOnce([planItem({ id: 'plan-sched' })])
    await store.runScheduler()

    expect(planStore.items.map((i) => i.id)).toEqual(['plan-sched'])
  })

  it('reset clears everything', async () => {
    const store = useProgramEnrollmentStore()
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment()])
    await store.ensureLoaded()

    store.reset()

    expect(store.enrollments).toHaveLength(0)
    expect(store.isLoaded).toBe(false)
    expect(store.error).toBeNull()
  })
})
