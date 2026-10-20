import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { bucketMarker, getDayMarkers, getDayUpcoming, type DayMarker } from '@/services/dayUpcomingQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'

const TODAY = '2026-03-12' as DayRef // Thursday, W10 (weeks count from the first Monday of the year)
const WIDE = { start: '2026-01-01' as DayRef, end: '2026-04-30' as DayRef }

function goal(title: string, targetDate: string, status: 'open' | 'completed' | 'dropped' = 'open', isActive = true) {
  return goalDexieRepository.create({ title, isActive, priorityIds: [], lifeAreaIds: [], status, targetDate })
}

const brief = (marker: DayMarker) => {
  if (marker.kind === 'deadline') return [marker.dayRef, marker.state, 'deadline', marker.goal.title]
  if (marker.kind === 'letter' || marker.kind === 'return') return [marker.dayRef, marker.state, marker.kind, marker.programSlug]
  return [marker.dayRef, marker.state, `${marker.ritual}:${marker.action}`, marker.ritual === 'week' ? marker.weekRef : marker.monthRef]
}

/** A shame path closed on `closedOn` (steps 0–23 done, the return steps ahead), optionally with a letter. */
async function closedShamePath(closedOn: string, letter?: { showAt: string; readAt?: string }, completedSteps = true) {
  const enrollment = await programEnrollmentDexieRepository.create({
    programSlug: 'shame-compassion',
    startedAt: '2025-12-01T12:00:00.000Z',
    contentVersion: 3,
  })
  return programEnrollmentDexieRepository.update(enrollment.id, {
    status: 'completed',
    currentStepIndex: 24,
    completedAt: `${closedOn}T12:00:00.000Z`,
    completedSteps: completedSteps ? [{ stepIndex: 23, completedAt: `${closedOn}T12:00:00.000Z` }] : [],
    ...(letter ? { futureLetter: { entryId: 'letter-entry', ...letter } } : {}),
  })
}

describe('dayUpcomingQueries', () => {
  beforeEach(async () => {
    const db = await resetPlanningTestData()
    await db.programEnrollments.clear()
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

  it('announces the return 56 days after the close like a deadline, done once the last follow-up step is', async () => {
    const enrollment = await closedShamePath('2026-01-20')
    const markers = await getDayMarkers(WIDE, TODAY)

    expect(markers.map(brief)).toContainEqual(['2026-03-17', 'due', 'return', 'shame-compassion'])
    expect(markers.find(marker => marker.kind === 'return')?.key).toBe(`return:${enrollment.id}`)

    await programEnrollmentDexieRepository.update(enrollment.id, { currentStepIndex: 27 })
    expect((await getDayMarkers(WIDE, TODAY)).map(brief)).toContainEqual(['2026-03-17', 'done', 'return', 'shame-compassion'])
  })

  it('anchors the return on the close date when no completion is recorded, and keeps it overdue within reach', async () => {
    await closedShamePath('2025-12-20', undefined, false)
    const markers = await getDayUpcoming(TODAY)

    expect(markers.map(brief)).toContainEqual(['2026-02-14', 'due', 'return', 'shame-compassion'])
  })

  it('shows the letter from its day on, never ahead, waiting until read, then on its reading day for a week', async () => {
    await closedShamePath('2026-01-20', { showAt: '2026-03-20' })
    expect((await getDayMarkers(WIDE, TODAY)).some(marker => marker.kind === 'letter')).toBe(false)

    const db = await resetPlanningTestData()
    await db.programEnrollments.clear()
    const waiting = await closedShamePath('2026-01-20', { showAt: '2026-03-01' })
    expect((await getDayUpcoming(TODAY)).map(brief)).toContainEqual(['2026-03-01', 'due', 'letter', 'shame-compassion'])

    await programEnrollmentDexieRepository.update(waiting.id, {
      futureLetter: { entryId: 'letter-entry', showAt: '2026-03-01', readAt: '2026-03-02T09:00:00.000Z' },
    })
    expect((await getDayMarkers(WIDE, TODAY)).some(marker => marker.kind === 'letter')).toBe(false)

    await programEnrollmentDexieRepository.update(waiting.id, {
      futureLetter: { entryId: 'letter-entry', showAt: '2026-02-20', readAt: '2026-03-10T09:00:00.000Z' },
    })
    expect((await getDayMarkers(WIDE, TODAY)).map(brief)).toContainEqual(['2026-03-10', 'done', 'letter', 'shame-compassion'])
  })

  it('buckets markers relative to today', () => {
    const base: DayMarker = { key: 'w', kind: 'ritual', dayRef: '2026-03-09' as DayRef, state: 'due', ritual: 'week', action: 'plan', weekRef: '2026-W10' as WeekRef }

    expect(bucketMarker(base, TODAY)).toBe('overdue')
    expect(bucketMarker({ ...base, state: 'done' }, TODAY)).toBe('pastDone')
    expect(bucketMarker({ ...base, dayRef: TODAY }, TODAY)).toBe('upcoming')
    expect(bucketMarker({ ...base, state: 'done', dayRef: '2026-03-16' as DayRef }, TODAY)).toBe('upcoming')
  })
})
