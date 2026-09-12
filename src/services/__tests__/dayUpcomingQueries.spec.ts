import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { bucketMarker, getDayMarkers, getDayUpcoming, type DayMarker } from '@/services/dayUpcomingQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'

const TODAY = '2026-03-12' as DayRef // Thursday, W10 (weeks count from the first Monday of the year)
const WIDE = { start: '2026-01-01' as DayRef, end: '2026-04-30' as DayRef }

function goal(title: string, targetDate: string, status: 'open' | 'completed' | 'dropped' = 'open', isActive = true) {
  return goalDexieRepository.create({ title, isActive, priorityIds: [], lifeAreaIds: [], status, targetDate })
}

const brief = (marker: DayMarker) =>
  marker.kind === 'deadline'
    ? [marker.dayRef, marker.state, 'deadline', marker.goal.title]
    : [marker.dayRef, marker.state, `${marker.ritual}:${marker.action}`, marker.ritual === 'week' ? marker.weekRef : marker.monthRef]

describe('dayUpcomingQueries', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('emits the previous/current/next rituals for week and month, all due when nothing exists', async () => {
    const markers = await getDayMarkers(WIDE, TODAY)

    expect(markers.map(brief)).toEqual([
      ['2026-02-28', 'due', 'month:reflect', '2026-02'],
      ['2026-03-01', 'due', 'month:plan', '2026-03'],
      ['2026-03-08', 'due', 'week:reflect', '2026-W09'],
      ['2026-03-09', 'due', 'week:plan', '2026-W10'],
      ['2026-03-16', 'due', 'week:plan', '2026-W11'],
      ['2026-04-01', 'due', 'month:plan', '2026-04'],
    ])
  })

  it('keeps ritual markers when the plan or reflection exists, marking them done', async () => {
    await periodPlanDexieRepository.createWeekPlan({ weekRef: '2026-W11' as WeekRef, topPriorities: [] })
    await structuredReflectionDexieRepository.upsertWeekly({ weekRef: '2026-W09' as WeekRef })
    await periodPlanDexieRepository.createMonthPlan({ monthRef: '2026-03' as MonthRef, topPriorityIds: [] })

    const markers = await getDayMarkers(WIDE, TODAY)
    const byKey = Object.fromEntries(markers.map(marker => [marker.key, marker.state]))

    expect(byKey['ritual:week:plan:2026-W11']).toBe('done')
    expect(byKey['ritual:week:reflect:2026-W09']).toBe('done')
    expect(byKey['ritual:month:plan:2026-03']).toBeUndefined() // done 11 days ago → past the grace window
    expect(byKey['ritual:week:plan:2026-W10']).toBe('due')
  })

  it('drops done markers once they are older than the grace window', async () => {
    await structuredReflectionDexieRepository.upsertMonthly({ monthRef: '2026-02' as MonthRef }) // 2026-02-28 = 12 days ago
    await structuredReflectionDexieRepository.upsertWeekly({ weekRef: '2026-W09' as WeekRef }) // 2026-03-08 = 4 days ago
    await goal('Stary zrobiony', '2026-03-01', 'completed')
    await goal('Świeży zrobiony', '2026-03-10', 'completed')

    const markers = await getDayMarkers(WIDE, TODAY)
    const keys = markers.map(marker => marker.key)

    expect(keys).not.toContain('ritual:month:reflect:2026-02')
    expect(keys).toContain('ritual:week:reflect:2026-W09')
    expect(markers.filter(marker => marker.kind === 'deadline').map(brief)).toEqual([['2026-03-10', 'done', 'deadline', 'Świeży zrobiony']])
  })

  it('keeps overdue open goals even when the range starts today, within the overdue reach', async () => {
    await goal('Wydać MVP', '2026-03-18')
    await goal('Przeterminowany', '2026-01-20')
    await goal('Prehistoryczny', '2025-11-01')
    await goal('Porzucony', '2026-03-14', 'dropped')
    await goal('Nieaktywny', '2026-03-14', 'open', false)
    await goal('Za daleko', '2026-06-01')

    const markers = await getDayUpcoming(TODAY)

    expect(markers.filter(marker => marker.kind === 'deadline').map(brief)).toEqual([
      ['2026-01-20', 'due', 'deadline', 'Przeterminowany'],
      ['2026-03-18', 'due', 'deadline', 'Wydać MVP'],
    ])
    expect(markers.filter(marker => marker.kind === 'ritual').map(marker => marker.dayRef)).toEqual(['2026-03-16', '2026-04-01'])
  })

  it('sorts due before done on the same day', async () => {
    await goal('Zrobiony', '2026-03-16', 'completed')
    await goal('Otwarty', '2026-03-16')

    const markers = await getDayUpcoming(TODAY)

    expect(markers.filter(marker => marker.dayRef === '2026-03-16').map(brief)).toEqual([
      ['2026-03-16', 'due', 'deadline', 'Otwarty'],
      ['2026-03-16', 'due', 'week:plan', '2026-W11'],
      ['2026-03-16', 'done', 'deadline', 'Zrobiony'],
    ])
  })

  it('adds the current period reflection on its last day only', async () => {
    const sunday = '2026-03-15' as DayRef
    const markers = await getDayMarkers(WIDE, sunday)
    const current = markers.find(marker => marker.key === 'ritual:week:reflect:2026-W10')

    expect(current?.dayRef).toBe(sunday)
    expect(current?.state).toBe('due')
    expect((await getDayMarkers(WIDE, TODAY)).some(marker => marker.key === 'ritual:week:reflect:2026-W10')).toBe(false)
  })

  it('buckets markers relative to today', () => {
    const base: DayMarker = { key: 'w', kind: 'ritual', dayRef: '2026-03-09' as DayRef, state: 'due', ritual: 'week', action: 'plan', weekRef: '2026-W10' as WeekRef }

    expect(bucketMarker(base, TODAY)).toBe('overdue')
    expect(bucketMarker({ ...base, state: 'done' }, TODAY)).toBe('pastDone')
    expect(bucketMarker({ ...base, dayRef: TODAY }, TODAY)).toBe('upcoming')
    expect(bucketMarker({ ...base, state: 'done', dayRef: '2026-03-16' as DayRef }, TODAY)).toBe('upcoming')
  })
})
