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
