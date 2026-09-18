import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoalCreationWizard } from '@/composables/useGoalCreationWizard'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getChildPeriods, getWeekOverlappingMonths, parsePeriodRef } from '@/utils/periods'

// Integration test against the real planningMutations + Dexie layer (no mocks),
// guarding the create-goal save path against the concurrent-upsert race that
// surfaced as "Failed to persist measurement month state in database".
describe('useGoalCreationWizard – create save integration', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await resetPlanningTestData()
  })

  it('saves a weekly KR spanning multiple weeks of the same month without a unique-index collision', async () => {
    const monthRef = parsePeriodRef('2026-06') as MonthRef
    // Weeks that fall entirely inside the month all share the same overlapping
    // month, so every week's link upserts the same measurement-month-state row.
    const weeks = (getChildPeriods(monthRef) as WeekRef[]).filter(
      (weekRef) => getWeekOverlappingMonths(weekRef).length === 1,
    )
    expect(weeks.length).toBeGreaterThanOrEqual(2)

    const wizard = useGoalCreationWizard()
    wizard.goalDraft.title = 'Race goal'
    wizard.goalDraft.targetDate = '2026-12-31'

    const kr = wizard.krDrafts.value[0]
    wizard.updateKrDraft(kr.localId, { title: 'Exercise', cadence: 'weekly' })
    wizard.goalDraft.krPeriodRefsByLocalId[kr.localId] = [...weeks]

    expect(wizard.canSave.value).toBe(true)

    const goalId = await wizard.save()

    const keyResults = await keyResultDexieRepository.listAll()
    const created = keyResults.find((item) => item.goalId === goalId)
    expect(created).toBeDefined()

    const monthStates = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(
      'keyResult',
      created!.id,
    )
    const weekStates = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
      'keyResult',
      created!.id,
    )

    // Exactly one month-state row for the shared month (no duplicates, no crash),
    // and one active week-state per selected week.
    expect(monthStates).toHaveLength(1)
    expect(monthStates[0].monthRef).toBe(monthRef)
    expect(weekStates).toHaveLength(weeks.length)
  })
})

it('persists an inherited schedule and preserves saved assignments on an unchanged edit', async () => {
  const { goalDexieRepository } = await import('@/repositories/goalDexieRepository')
  await resetPlanningTestData()
  const wizard = useGoalCreationWizard()
  wizard.goalDraft.title = 'Shared schedule'
  wizard.goalDraft.startDate = '2026-09-07'
  wizard.goalDraft.targetDate = '2026-09-27'
  wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Weekly practice' })
  const expected = wizard.krPeriods(wizard.krDrafts.value[0].localId)
  const id = await wizard.save()
  const goal = (await goalDexieRepository.getById(id))!
  expect(goal.startDate).toBe('2026-09-07')
  const keyResults = (await keyResultDexieRepository.listAll()).filter(kr => kr.goalId === id)
  const kr = keyResults[0]
  const states = await planningStateDexieRepository.listMeasurementWeekStatesForSubject('keyResult', kr.id)
  expect(states.map(state => state.weekRef).sort()).toEqual(expected)
  const editor = useGoalCreationWizard()
  editor.loadForEdit({ goal: { ...goal, periodAssignmentMode: undefined }, keyResults: keyResults.map(kr => ({ ...kr, periodAssignmentMode: undefined })), goalMonthRefs: ['2026-09'], krPeriodRefsByKrId: { [kr.id]: expected } })
  editor.goalDraft.targetDate = '2026-10-04'
  expect(editor.krPeriods(kr.id)).toEqual(expected)
  await editor.save()
  const after = await planningStateDexieRepository.listMeasurementWeekStatesForSubject('keyResult', kr.id)
  expect(after.map(state => state.weekRef).sort()).toEqual(expected)
})

it('retains automatic scheduling after reopening and extends the saved weeks when the deadline changes', async () => {
  const { goalDexieRepository } = await import('@/repositories/goalDexieRepository')
  await resetPlanningTestData()
  const wizard = useGoalCreationWizard()
  wizard.goalDraft.title = 'Automatic goal'
  wizard.goalDraft.startDate = '2026-09-07'
  wizard.goalDraft.targetDate = '2026-09-27'
  wizard.updateKrDraft(wizard.krDrafts.value[0].localId, { title: 'Weekly exercise' })
  const id = await wizard.save()
  const goal = (await goalDexieRepository.getById(id))!
  const keyResults = (await keyResultDexieRepository.listAll()).filter(kr => kr.goalId === id)
  const kr = keyResults[0]
  const periods = (await planningStateDexieRepository.listMeasurementWeekStatesForSubject('keyResult', kr.id)).map(state => state.weekRef)
  const editor = useGoalCreationWizard()
  editor.loadForEdit({ goal, keyResults, goalMonthRefs: ['2026-09'], krPeriodRefsByKrId: { [kr.id]: periods } })
  expect(editor.inheritsSchedule(kr.id)).toBe(true)
  editor.goalDraft.targetDate = '2026-10-04'
  expect(editor.krPeriods(kr.id)).toHaveLength(4)
  await editor.save()
  expect(await planningStateDexieRepository.listMeasurementWeekStatesForSubject('keyResult', kr.id)).toHaveLength(4)
})
