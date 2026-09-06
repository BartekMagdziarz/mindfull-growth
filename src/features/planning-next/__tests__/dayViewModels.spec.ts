import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import { canMoveToTomorrow, isRelatedToCompass, markerIcon, markerTitle, objectCompassKey, priorityCompassKey, priorityTone, rescheduleWeekLock } from '../dayViewModels'

const item = { kind: 'measurement', key: 'habit:h1', priorityIds: ['p1'] } as unknown as TodayMeasurementItem

describe('dayViewModels', () => {
  it('relates rows to compass tiles by priority or by exact object key', () => {
    expect(isRelatedToCompass(item, priorityCompassKey('p1'))).toBe(true)
    expect(isRelatedToCompass(item, priorityCompassKey('p2'))).toBe(false)
    expect(isRelatedToCompass(item, objectCompassKey('habit:h1'))).toBe(true)
    expect(isRelatedToCompass(item, objectCompassKey('habit:h2'))).toBe(false)
    expect(isRelatedToCompass(item, null)).toBe(false)
  })

  it('never yields mint or amber tones', () => {
    expect([0, 1, 2, 3].map(priorityTone)).toEqual(['blue', 'lavender', 'rose', 'blue'])
  })

  it('labels markers through the translator and keeps goal titles verbatim', () => {
    const t = (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`
    const deadline: DayMarker = { key: 'd', kind: 'deadline', dayRef: '2026-03-16' as DayRef, goal: { id: 'g', title: 'Wydać MVP', icon: 'rocket_launch' } as DayMarker extends { goal: infer G } ? G : never }
    const week: DayMarker = { key: 'w', kind: 'ritual', dayRef: '2026-03-16' as DayRef, ritual: 'week', weekRef: '2026-W12' as WeekRef }
    const month: DayMarker = { key: 'm', kind: 'ritual', dayRef: '2026-04-01' as DayRef, ritual: 'month', monthRef: '2026-04' as MonthRef }

    expect(markerTitle(deadline, t, 'pl-PL')).toBe('Wydać MVP')
    expect(markerTitle(week, t, 'pl-PL')).toBe('planning.today.upcoming.planWeek:{"n":12}')
    expect(markerTitle(month, t, 'pl-PL')).toBe('planning.today.upcoming.planMonth:{"month":"kwiecień"}')
    expect(markerIcon(deadline)).toBe('rocket_launch')
    expect(markerIcon(week)).toBe('edit_calendar')
    expect(markerIcon(month)).toBe('date_range')
  })

  it('locks weekly intentions to their week: no "Jutro" on the last day of the week', () => {
    const intention = { kind: 'measurement', key: 'weeklyIntention:i', panelType: 'weeklyIntention', canHide: true, isScheduledToday: false, subject: { weekRef: '2026-W10' } } as unknown as TodayMeasurementItem
    const habit = { kind: 'measurement', key: 'habit:h', panelType: 'habit', canHide: true, isScheduledToday: false, subject: {} } as unknown as TodayMeasurementItem
    const thursday = '2026-03-12' as DayRef
    const sunday = '2026-03-15' as DayRef

    expect(rescheduleWeekLock(intention)).toBe('2026-W10')
    expect(rescheduleWeekLock(habit)).toBeNull()
    expect(canMoveToTomorrow(habit, sunday)).toBe(true)
    expect(canMoveToTomorrow(intention, thursday)).toBe(true)
    expect(canMoveToTomorrow(intention, sunday)).toBe(false)
  })
})
