import { beforeEach, describe, expect, it } from 'vitest'
import type { MonthRef } from '@/domain/period'
import type { PriorityStatus } from '@/domain/planning'
import type { YearRef } from '@/domain/period'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import {
  getActivePrioritiesForMonth,
  setMonthTopPriorities,
  setMonthlyPriorityAssessment,
} from '@/services/monthlyPriorityService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const MONTH = parsePeriodRef('2026-06') as MonthRef

function makePriority(
  title: string,
  opts: { status?: PriorityStatus; years?: YearRef[]; order?: number } = {},
) {
  return priorityDexieRepository.create({
    title,
    years: opts.years ?? (['2026'] as YearRef[]),
    status: opts.status ?? 'active',
    order: opts.order,
    lifeAreaIds: [],
    progressSignals: [],
    riskSignals: [],
  })
}

describe('monthlyPriorityService', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('returns only active priorities whose years include the month, sorted by order', async () => {
    const second = await makePriority('Health', { order: 2 })
    const first = await makePriority('Career', { order: 1 })
    await makePriority('Paused', { status: 'paused' })
    await makePriority('Other year', { years: ['2025'] as YearRef[] })

    const active = await getActivePrioritiesForMonth(MONTH)

    expect(active.map((p) => p.id)).toEqual([first.id, second.id])
  })

  it('lazily creates then updates the month plan top priorities', async () => {
    const a = await makePriority('A')
    const b = await makePriority('B')

    await setMonthTopPriorities(MONTH, [a.id, b.id])
    const plan = await periodPlanDexieRepository.getMonthPlan(MONTH)
    expect(plan?.topPriorityIds).toEqual([a.id, b.id])

    await setMonthTopPriorities(MONTH, [a.id])
    const updated = await periodPlanDexieRepository.getMonthPlan(MONTH)
    expect(updated?.id).toBe(plan?.id)
    expect(updated?.topPriorityIds).toEqual([a.id])
  })

  it('upserts a per-priority assessment as a month PeriodObjectReflection', async () => {
    const priority = await makePriority('Career')

    await setMonthlyPriorityAssessment(MONTH, priority.id, {
      effort: 4,
      verdict: 'continue',
      note: '  pushed hard  ',
    })

    const row = await reflectionDexieRepository.getPeriodObjectReflection(
      'month',
      MONTH,
      'priority',
      priority.id,
    )
    expect(row?.effort).toBe(4)
    expect(row?.verdict).toBe('continue')
    expect(row?.note).toBe('pushed hard')
  })

  it('stores effort with no note (note stays empty, not rejected)', async () => {
    const priority = await makePriority('Health')

    await setMonthlyPriorityAssessment(MONTH, priority.id, { effort: 2 })

    const row = await reflectionDexieRepository.getPeriodObjectReflection(
      'month',
      MONTH,
      'priority',
      priority.id,
    )
    expect(row?.effort).toBe(2)
    expect(row?.verdict).toBeNull()
    expect(row?.note).toBe('')
  })

  it('deletes the assessment row when effort, verdict and note are all empty', async () => {
    const priority = await makePriority('Career')
    await setMonthlyPriorityAssessment(MONTH, priority.id, { effort: 3 })

    await setMonthlyPriorityAssessment(MONTH, priority.id, { effort: null, verdict: null, note: '' })

    const row = await reflectionDexieRepository.getPeriodObjectReflection(
      'month',
      MONTH,
      'priority',
      priority.id,
    )
    expect(row).toBeUndefined()
  })

  it('rejects an assessment for a non-existent priority', async () => {
    await expect(
      setMonthlyPriorityAssessment(MONTH, 'missing-id', { effort: 3 }),
    ).rejects.toThrow()
  })
})
