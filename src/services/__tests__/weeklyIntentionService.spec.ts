import { beforeEach, describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { getWeekRelevantObjects } from '@/services/planningStateQueries'
import {
  createWeeklyIntention,
  listWeeklyIntentions,
  setWeekTopPriorities,
} from '@/services/weeklyIntentionService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const WEEK = parsePeriodRef('2026-W10') as WeekRef
const OTHER_WEEK = parsePeriodRef('2026-W11') as WeekRef

function makeIntentionInput(weekRef: WeekRef, title = 'Wake at 6am') {
  return {
    weekRef,
    title,
    entryMode: 'counter' as const,
    target: { kind: 'count' as const, operator: 'min' as const, value: 5 },
  }
}

describe('weeklyIntentionService', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('creates a week-scoped intention listed only in its week', async () => {
    const intention = await createWeeklyIntention(makeIntentionInput(WEEK))

    expect(intention.weekRef).toBe(WEEK)
    expect(intention.cadence).toBe('weekly')
    expect(intention.status).toBe('open')
    expect(intention.isActive).toBe(true)

    expect(await listWeeklyIntentions(WEEK)).toHaveLength(1)
    expect(await listWeeklyIntentions(OTHER_WEEK)).toHaveLength(0)
  })

  it('schedules the intention so it is active in its week bundle but absent elsewhere', async () => {
    const intention = await createWeeklyIntention(makeIntentionInput(WEEK))

    const relevant = await getWeekRelevantObjects(WEEK)
    const item = relevant.planning.measurementItems.find(
      (m) => m.subjectType === 'weeklyIntention' && m.subject.id === intention.id,
    )
    expect(item).toBeTruthy()

    const otherWeek = await getWeekRelevantObjects(OTHER_WEEK)
    expect(
      otherWeek.planning.measurementItems.some((m) => m.subjectType === 'weeklyIntention'),
    ).toBe(false)
  })

  it('lazily creates then updates the week plan top priorities', async () => {
    const intention = await createWeeklyIntention(makeIntentionInput(WEEK))
    const refs = [{ subjectType: 'weeklyIntention' as const, subjectId: intention.id }]

    await setWeekTopPriorities(WEEK, refs)
    const plan = await periodPlanDexieRepository.getWeekPlan(WEEK)
    expect(plan?.topPriorities).toEqual(refs)

    await setWeekTopPriorities(WEEK, [])
    const updated = await periodPlanDexieRepository.getWeekPlan(WEEK)
    expect(updated?.id).toBe(plan?.id)
    expect(updated?.topPriorities).toEqual([])
  })
})
