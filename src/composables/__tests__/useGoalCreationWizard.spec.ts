import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoalCreationWizard } from '@/composables/useGoalCreationWizard'
import type {
  CreateGoalPayload,
  CreateKeyResultPayload,
  Goal,
  KeyResult,
  UpdateGoalPayload,
  UpdateKeyResultPayload,
} from '@/domain/planning'

const linkGoalToMonth = vi.fn(async (..._args: unknown[]): Promise<void> => {})
const unlinkGoalFromMonth = vi.fn(async (..._args: unknown[]): Promise<void> => {})
const linkMeasurementPeriod = vi.fn(async (..._args: unknown[]): Promise<void> => {})
const unlinkMeasurementPeriod = vi.fn(async (..._args: unknown[]): Promise<void> => {})
const activateMeasurementInMonth = vi.fn(async (..._args: unknown[]): Promise<void> => {})
const deactivateMeasurementInMonth = vi.fn(async (..._args: unknown[]): Promise<void> => {})

vi.mock('@/services/planningMutations', () => ({
  linkGoalToMonth: (...args: unknown[]) => linkGoalToMonth(...args),
  unlinkGoalFromMonth: (...args: unknown[]) => unlinkGoalFromMonth(...args),
  linkMeasurementPeriod: (...args: unknown[]) => linkMeasurementPeriod(...args),
  unlinkMeasurementPeriod: (...args: unknown[]) => unlinkMeasurementPeriod(...args),
  activateMeasurementInMonth: (...args: unknown[]) => activateMeasurementInMonth(...args),
  deactivateMeasurementInMonth: (...args: unknown[]) => deactivateMeasurementInMonth(...args),
}))

function createRepoMock() {
  return {
    createWithKeyResults: vi.fn(
      async (
        goal: CreateGoalPayload,
        keyResults: Omit<CreateKeyResultPayload, 'goalId'>[],
      ): Promise<{ goal: Goal; keyResults: KeyResult[] }> => ({
        goal: {
          id: 'goal-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          ...goal,
        } as Goal,
        keyResults: keyResults.map((kr, idx) => ({
          id: `kr-${idx}`,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          goalId: 'goal-1',
          ...kr,
        })) as KeyResult[],
      }),
    ),
    update: vi.fn(
      async (id: string, data: UpdateGoalPayload): Promise<Goal> =>
        ({
          id,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          isActive: true,
          status: 'open',
          priorityIds: [],
          lifeAreaIds: [],
          title: '',
          ...data,
        }) as Goal,
    ),
  }
}

function createKrRepoMock() {
  return {
    create: vi.fn(
      async (data: CreateKeyResultPayload): Promise<KeyResult> =>
        ({
          id: `kr-new-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          ...data,
        }) as KeyResult,
    ),
    update: vi.fn(
      async (id: string, data: UpdateKeyResultPayload): Promise<KeyResult> =>
        ({
          id,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          goalId: 'goal-1',
          isActive: true,
          status: 'open',
          title: '',
          entryMode: 'completion',
          cadence: 'weekly',
          target: { kind: 'count', operator: 'min', value: 1 },
          ...data,
        }) as KeyResult,
    ),
    delete: vi.fn(async () => {}),
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    title: 'Run a 10K',
    description: undefined,
    icon: undefined,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    targetDate: '2026-12-31',
    successDefinition: 'Under 60 min',
    whyMatters: undefined,
    confidenceRating: undefined,
    obstacles: undefined,
    resources: undefined,
    ...overrides,
  }
}

function makeKr(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-existing-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    goalId: 'goal-1',
    title: 'Run 25km/week',
    description: undefined,
    entryMode: 'value',
    cadence: 'weekly',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 25 },
    status: 'open',
    ...overrides,
  }
}

beforeEach(() => {
  linkGoalToMonth.mockClear()
  unlinkGoalFromMonth.mockClear()
  linkMeasurementPeriod.mockClear()
  unlinkMeasurementPeriod.mockClear()
  activateMeasurementInMonth.mockClear()
  deactivateMeasurementInMonth.mockClear()
})

describe('useGoalCreationWizard', () => {
  it('starts at the specific step with a single empty KR draft', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    expect(wizard.currentStep.value).toBe('specific')
    expect(wizard.stepIndex.value).toBe(0)
    expect(wizard.krDrafts.value).toHaveLength(1)
    expect(wizard.canSave.value).toBe(false)
  })

  it('blocks advancing past specific step without a title', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    expect(wizard.canAdvance.value).toBe(false)
    wizard.goalDraft.title = '  My goal  '
    expect(wizard.canAdvance.value).toBe(true)
  })

  it('measurable step requires at least one valid KR', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'A goal'
    wizard.nextStep()
    expect(wizard.currentStep.value).toBe('measurable')

    // Default KR draft has empty title — invalid
    expect(wizard.canAdvance.value).toBe(false)

    wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Run 25km/week' })
    expect(wizard.canAdvance.value).toBe(true)
  })

  it('timebound step requires targetDate before saving', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'A goal'
    wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'KR' })
    wizard.goToStep('timebound')

    expect(wizard.canAdvance.value).toBe(false)
    wizard.goalDraft.targetDate = '2026-12-31'
    expect(wizard.canAdvance.value).toBe(true)
  })

  it('canSave is true only when title, targetDate, and ≥1 valid KR present', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    expect(wizard.canSave.value).toBe(false)

    wizard.goalDraft.title = 'Run a 10K'
    expect(wizard.canSave.value).toBe(false)

    wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Run 25km/week' })
    expect(wizard.canSave.value).toBe(false)

    wizard.goalDraft.targetDate = '2026-12-31'
    expect(wizard.canSave.value).toBe(true)
  })

  it('saves via repo.createWithKeyResults and resets after success', async () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'Run a 10K'
    wizard.goalDraft.targetDate = '2026-12-31'
    wizard.goalDraft.confidenceRating = 7
    wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Run 25km/week' })

    const id = await wizard.save()
    expect(id).toBe('goal-1')
    expect(repo.createWithKeyResults).toHaveBeenCalledTimes(1)

    const [goalArg, krArgs] = repo.createWithKeyResults.mock.calls[0]
    expect(goalArg.title).toBe('Run a 10K')
    expect(goalArg.targetDate).toBe('2026-12-31')
    expect(goalArg.confidenceRating).toBe(7)
    expect(krArgs).toHaveLength(1)
    expect(krArgs[0].title).toBe('Run 25km/week')

    // After save, state is reset
    expect(wizard.goalDraft.title).toBe('')
    expect(wizard.currentStep.value).toBe('specific')
  })

  it('refuses to save when gate conditions are not met', async () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'Run a 10K'
    // missing targetDate and invalid KR

    await expect(wizard.save()).rejects.toThrow(/Cannot save/)
    expect(repo.createWithKeyResults).not.toHaveBeenCalled()
  })

  it('smartCompleteness reflects filled fields', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'Run a 10K'
    wizard.goalDraft.successDefinition = 'Under 60 min'
    wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Run weekly' })
    wizard.goalDraft.targetDate = '2026-12-31'

    const completeness = wizard.smartCompleteness.value
    expect(completeness.S).toBe(true)
    expect(completeness.M).toBe(true)
    expect(completeness.T).toBe(true)
    expect(completeness.score).toBeGreaterThanOrEqual(3)
  })

  it('reset returns to specific step with fresh KR draft', () => {
    const repo = createRepoMock()
    const wizard = useGoalCreationWizard({ repo })

    wizard.goalDraft.title = 'x'
    wizard.goalDraft.targetDate = '2026-12-31'
    wizard.addKrDraft()
    wizard.goToStep('review')

    wizard.reset()

    expect(wizard.currentStep.value).toBe('specific')
    expect(wizard.goalDraft.title).toBe('')
    expect(wizard.goalDraft.targetDate).toBeUndefined()
    expect(wizard.krDrafts.value).toHaveLength(1)
  })

  describe('edit mode', () => {
    it('loadForEdit hydrates goal + KR drafts and switches mode', () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal({ whyMatters: 'Health' }),
        keyResults: [makeKr()],
        goalMonthRefs: ['2026-05', '2026-06'],
        krPeriodRefsByKrId: { 'kr-existing-1': ['2026-W22'] },
      })

      expect(wizard.mode.value).toBe('edit')
      expect(wizard.goalId.value).toBe('goal-1')
      expect(wizard.goalDraft.title).toBe('Run a 10K')
      expect(wizard.goalDraft.whyMatters).toBe('Health')
      expect(wizard.goalDraft.linkedMonthRefs).toEqual(['2026-05', '2026-06'])
      expect(wizard.krDrafts.value).toHaveLength(1)
      expect(wizard.krDrafts.value[0].existingId).toBe('kr-existing-1')
      expect(wizard.krDrafts.value[0].localId).toBe('kr-existing-1')
      expect(wizard.goalDraft.krPeriodRefsByLocalId['kr-existing-1']).toEqual(['2026-W22'])
      expect(wizard.canSave.value).toBe(true)
    })

    it('save in edit mode calls repo.update and krRepo.update for existing KR', async () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [makeKr()],
        goalMonthRefs: [],
        krPeriodRefsByKrId: { 'kr-existing-1': [] },
      })
      wizard.goalDraft.title = 'Run a half-marathon'
      wizard.updateKrDraft('kr-existing-1', { title: 'Run 30km/week' })

      const id = await wizard.save()
      expect(id).toBe('goal-1')
      expect(repo.update).toHaveBeenCalledTimes(1)
      const [updateId, updatePayload] = repo.update.mock.calls[0]
      expect(updateId).toBe('goal-1')
      expect(updatePayload.title).toBe('Run a half-marathon')
      expect(repo.createWithKeyResults).not.toHaveBeenCalled()

      expect(krRepo.update).toHaveBeenCalledTimes(1)
      expect(krRepo.update.mock.calls[0][0]).toBe('kr-existing-1')
      expect(krRepo.update.mock.calls[0][1].title).toBe('Run 30km/week')
      expect(krRepo.create).not.toHaveBeenCalled()
      expect(krRepo.delete).not.toHaveBeenCalled()

      // After save, state resets
      expect(wizard.mode.value).toBe('create')
      expect(wizard.goalId.value).toBeNull()
    })

    it('save in edit mode creates new KRs added during edit', async () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [makeKr()],
        goalMonthRefs: [],
        krPeriodRefsByKrId: { 'kr-existing-1': [] },
      })
      wizard.addKrDraft()
      const newLocalId = wizard.krDrafts.value[1].localId
      wizard.updateKrDraft(newLocalId, { title: 'New KR' })

      await wizard.save()

      expect(krRepo.update).toHaveBeenCalledTimes(1)
      expect(krRepo.create).toHaveBeenCalledTimes(1)
      expect(krRepo.create.mock.calls[0][0].goalId).toBe('goal-1')
      expect(krRepo.create.mock.calls[0][0].title).toBe('New KR')
    })

    it('save in edit mode deletes removed existing KRs', async () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [
          makeKr({ id: 'kr-keep' }),
          makeKr({ id: 'kr-drop', title: 'Old KR' }),
        ],
        goalMonthRefs: [],
        krPeriodRefsByKrId: { 'kr-keep': [], 'kr-drop': ['2026-W22'] },
      })

      wizard.removeKrDraft('kr-drop')

      await wizard.save()

      expect(krRepo.delete).toHaveBeenCalledWith('kr-drop')
      expect(unlinkMeasurementPeriod).toHaveBeenCalledWith(
        expect.objectContaining({ periodRef: '2026-W22', subjectId: 'kr-drop' }),
      )
    })

    it('save in edit mode syncs goal month link diffs', async () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [makeKr()],
        goalMonthRefs: ['2026-05', '2026-06'],
        krPeriodRefsByKrId: { 'kr-existing-1': [] },
      })

      wizard.goalDraft.linkedMonthRefs = ['2026-06', '2026-07']

      await wizard.save()

      expect(linkGoalToMonth).toHaveBeenCalledWith('goal-1', '2026-07')
      expect(unlinkGoalFromMonth).toHaveBeenCalledWith('goal-1', '2026-05')
      expect(linkGoalToMonth).not.toHaveBeenCalledWith('goal-1', '2026-06')
      expect(unlinkGoalFromMonth).not.toHaveBeenCalledWith('goal-1', '2026-06')
    })

    it('save in edit mode syncs KR period link diffs', async () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [makeKr()],
        goalMonthRefs: [],
        krPeriodRefsByKrId: { 'kr-existing-1': ['2026-W22'] },
      })

      wizard.goalDraft.krPeriodRefsByLocalId['kr-existing-1'] = ['2026-W23']

      await wizard.save()

      expect(linkMeasurementPeriod).toHaveBeenCalledWith(
        expect.objectContaining({ periodRef: '2026-W23', subjectId: 'kr-existing-1' }),
      )
      expect(unlinkMeasurementPeriod).toHaveBeenCalledWith(
        expect.objectContaining({ periodRef: '2026-W22', subjectId: 'kr-existing-1' }),
      )
    })

    it('changing KR cadence clears stale period refs', () => {
      const repo = createRepoMock()
      const krRepo = createKrRepoMock()
      const wizard = useGoalCreationWizard({ repo, krRepo })

      wizard.loadForEdit({
        goal: makeGoal(),
        keyResults: [makeKr()],
        goalMonthRefs: [],
        krPeriodRefsByKrId: { 'kr-existing-1': ['2026-W22'] },
      })

      expect(wizard.goalDraft.krPeriodRefsByLocalId['kr-existing-1']).toEqual(['2026-W22'])

      wizard.updateKrDraft('kr-existing-1', { cadence: 'monthly' })

      expect(wizard.goalDraft.krPeriodRefsByLocalId['kr-existing-1']).toEqual([])
    })
  })
})
