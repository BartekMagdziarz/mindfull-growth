import { describe, expect, it, vi } from 'vitest'
import { useGoalCreationWizard } from '@/composables/useGoalCreationWizard'
import type { CreateGoalPayload, CreateKeyResultPayload, Goal, KeyResult } from '@/domain/planning'

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
  }
}

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
})
