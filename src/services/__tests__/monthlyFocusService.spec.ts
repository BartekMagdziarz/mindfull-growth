import { beforeEach, describe, expect, it } from 'vitest'
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { createWeeklyIntention, setWeekTopPriorities } from '@/services/weeklyIntentionService'
import {
  computeMonthlyFocus,
  getMonthlyFocusConfrontation,
  type ResolvedPick,
} from '@/services/monthlyFocusService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getChildPeriods } from '@/utils/periods'

const W1 = '2026-W23' as WeekRef
const W2 = '2026-W24' as WeekRef
const countTarget = { kind: 'count' as const, operator: 'min' as const, value: 1 }

describe('computeMonthlyFocus (pure)', () => {
  it('rolls picks under their linked active priority across weeks', () => {
    const picks = new Map<WeekRef, ResolvedPick[]>([
      [W1, [{ subjectType: 'habit', subjectId: 'h1', title: 'Medytacja', priorityIds: ['P'] }]],
      [W2, [
        { subjectType: 'habit', subjectId: 'h1', title: 'Medytacja', priorityIds: ['P'] },
        { subjectType: 'keyResult', subjectId: 'k1', title: 'KR1', priorityIds: ['P'] },
      ]],
    ])
    const r = computeMonthlyFocus([W1, W2], picks, ['P'])

    expect(r.perPriority).toHaveLength(1)
    const p = r.perPriority[0]
    expect(p.focusWeekRefs).toEqual([W1, W2])
    expect(p.objects.map((o) => o.subjectId).sort()).toEqual(['h1', 'k1'])
    expect(p.objects.find((o) => o.subjectId === 'h1')?.weekRefs).toEqual([W1, W2])
    expect(r.drift).toHaveLength(0)
  })

  it('sends unlinked picks to drift (unlinked=true)', () => {
    const picks = new Map<WeekRef, ResolvedPick[]>([
      [W1, [{ subjectType: 'weeklyIntention', subjectId: 'i1', title: 'Wstawanie', priorityIds: [] }]],
    ])
    const r = computeMonthlyFocus([W1], picks, ['P'])

    expect(r.perPriority[0].objects).toHaveLength(0)
    expect(r.drift).toEqual([
      { subjectType: 'weeklyIntention', subjectId: 'i1', title: 'Wstawanie', weekRefs: [W1], unlinked: true },
    ])
  })

  it('sends picks linked only to non-active priorities to drift (unlinked=false)', () => {
    const picks = new Map<WeekRef, ResolvedPick[]>([
      [W1, [{ subjectType: 'habit', subjectId: 'h2', title: 'X', priorityIds: ['OTHER'] }]],
    ])
    const r = computeMonthlyFocus([W1], picks, ['P'])

    expect(r.drift).toHaveLength(1)
    expect(r.drift[0].unlinked).toBe(false)
  })

  it('keeps a priority with no weekly focus empty', () => {
    const r = computeMonthlyFocus([W1], new Map(), ['P'])
    expect(r.perPriority[0].focusWeekRefs).toEqual([])
    expect(r.perPriority[0].objects).toEqual([])
  })
})

describe('getMonthlyFocusConfrontation (loader)', () => {
  const MONTH = '2026-06' as MonthRef

  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('resolves KR via goal, habit + intention directly, and drifts unlinked picks', async () => {
    const priority = await priorityDexieRepository.create({
      title: 'Zdrowie', years: ['2026'] as YearRef[], status: 'active', lifeAreaIds: [], progressSignals: [], riskSignals: [],
    })
    const goal = await goalDexieRepository.create({
      title: 'Cel', isActive: true, status: 'open', priorityIds: [priority.id], lifeAreaIds: [],
    })
    const kr = await keyResultDexieRepository.create({
      goalId: goal.id, title: 'KR', isActive: true, status: 'open', entryMode: 'completion', cadence: 'weekly', target: countTarget,
    })
    const linkedHabit = await habitDexieRepository.create({
      title: 'Medytacja', isActive: true, status: 'open', priorityIds: [priority.id], lifeAreaIds: [], entryMode: 'completion', cadence: 'weekly', target: countTarget,
    })
    const unlinkedHabit = await habitDexieRepository.create({
      title: 'Luźny nawyk', isActive: true, status: 'open', priorityIds: [], lifeAreaIds: [], entryMode: 'completion', cadence: 'weekly', target: countTarget,
    })

    const week = getChildPeriods(MONTH)[1]
    const intention = await createWeeklyIntention({
      weekRef: week, title: 'Wstawanie 6:00', entryMode: 'completion', target: countTarget, priorityIds: [priority.id],
    })

    await setWeekTopPriorities(week, [
      { subjectType: 'keyResult', subjectId: kr.id },
      { subjectType: 'habit', subjectId: linkedHabit.id },
      { subjectType: 'habit', subjectId: unlinkedHabit.id },
      { subjectType: 'weeklyIntention', subjectId: intention.id },
    ])

    const result = await getMonthlyFocusConfrontation(MONTH, [priority.id])

    const focus = result.perPriority.find((p) => p.priorityId === priority.id)
    expect(focus?.focusWeekRefs).toContain(week)
    expect(focus?.objects.map((o) => o.subjectId).sort()).toEqual(
      [kr.id, linkedHabit.id, intention.id].sort(),
    )

    expect(result.drift).toHaveLength(1)
    expect(result.drift[0].subjectId).toBe(unlinkedHabit.id)
    expect(result.drift[0].unlinked).toBe(true)
  })
})
