import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, MonthRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { getDayMarkers, getDayUpcoming } from '@/services/dayUpcomingQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getPeriodRefsForDate } from '@/utils/periods'

const TODAY = '2026-03-12' as DayRef // Thursday, W11

describe('dayUpcomingQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('marks open goal deadlines in range and the next unplanned week and month rituals', async () => {
    await goalDexieRepository.create({ title: 'Wydać MVP', isActive: true, priorityIds: [], lifeAreaIds: [], status: 'open', targetDate: '2026-03-18' })
    await goalDexieRepository.create({ title: 'Zamknięty', isActive: true, priorityIds: [], lifeAreaIds: [], status: 'completed', targetDate: '2026-03-19' })
    await goalDexieRepository.create({ title: 'Za daleko', isActive: true, priorityIds: [], lifeAreaIds: [], status: 'open', targetDate: '2026-06-01' })

    const markers = await getDayUpcoming(TODAY)

    expect(markers.map(marker => [marker.kind, marker.dayRef])).toEqual([
      ['ritual', '2026-03-16'], // Monday of W12 — no week plan yet
      ['deadline', '2026-03-18'],
      ['ritual', '2026-04-01'], // 1st of next month — no month plan yet
    ])
  })

  it('drops the ritual markers once the plan exists', async () => {
    await periodPlanDexieRepository.createWeekPlan({ weekRef: getPeriodRefsForDate(new Date('2026-03-16T12:00:00')).week, topPriorities: [] })
    await periodPlanDexieRepository.createMonthPlan({ monthRef: '2026-04' as MonthRef, topPriorityIds: [] })

    const markers = await getDayMarkers({ start: '2026-03-01' as DayRef, end: '2026-04-30' as DayRef }, TODAY)

    expect(markers).toEqual([])
  })

  it('marks only the nearest Monday, even when the range spans several weeks', async () => {
    const markers = await getDayMarkers({ start: '2026-03-01' as DayRef, end: '2026-03-31' as DayRef }, TODAY)

    expect(markers.filter(marker => marker.kind === 'ritual').map(marker => marker.dayRef)).toEqual(['2026-03-16'])
  })
})
