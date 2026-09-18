import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import {
  canMoveToTomorrow,
  isRelatedToCompass,
  markerContextLabel,
  markerDateLabel,
  markerIcon,
  markerTitle,
  objectCompassKey,
  priorityCompassKey,
  priorityTone,
  rescheduleWeekLock,
} from '../dayViewModels'

const item = {
  kind: 'measurement',
  key: 'habit:h1',
  priorityIds: ['p1'],
} as unknown as TodayMeasurementItem

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
    const t = (key: string, params?: Record<string, string | number>) =>
      `${key}:${JSON.stringify(params ?? {})}`
    const deadline: DayMarker = {
      key: 'd',
      kind: 'deadline',
      dayRef: '2026-03-16' as DayRef,
      state: 'due',
      goal: { id: 'g', title: 'Wydać MVP', icon: 'rocket_launch' } as DayMarker extends {
        goal: infer G
      }
        ? G
        : never,
    }
    const week: DayMarker = {
      key: 'w',
      kind: 'ritual',
      dayRef: '2026-03-16' as DayRef,
      state: 'due',
      ritual: 'week',
      action: 'plan',
      weekRef: '2026-W12' as WeekRef,
    }
    const month: DayMarker = {
      key: 'm',
      kind: 'ritual',
      dayRef: '2026-04-01' as DayRef,
      state: 'due',
      ritual: 'month',
      action: 'plan',
      monthRef: '2026-04' as MonthRef,
    }
    const reflectWeek: DayMarker = {
      ...week,
      action: 'reflect',
      weekRef: '2026-W11' as WeekRef,
      dayRef: '2026-03-15' as DayRef,
    }
    const reflectMonth: DayMarker = {
      ...month,
      action: 'reflect',
      monthRef: '2026-02' as MonthRef,
      dayRef: '2026-02-28' as DayRef,
    }

    expect(markerTitle(deadline, t, 'pl-PL')).toBe('Wydać MVP')
    expect(markerTitle(week, t, 'pl-PL')).toBe(
      'planning.today.upcoming.planWeek:{} · 23–29 mar 2026'
    )
    expect(markerTitle(month, t, 'pl-PL')).toBe(
      'planning.today.upcoming.planMonth:{"month":"kwiecień"}'
    )
    expect(markerTitle(reflectWeek, t, 'pl-PL')).toBe(
      'planning.today.upcoming.reflectWeek:{} · 16–22 mar 2026'
    )
    expect(markerTitle(reflectMonth, t, 'pl-PL')).toBe(
      'planning.today.upcoming.reflectMonth:{"month":"luty"}'
    )
    expect(markerIcon(deadline)).toBe('rocket_launch')
    expect(markerIcon(week)).toBe('edit_calendar')
    expect(markerIcon(month)).toBe('date_range')
    expect(markerIcon(reflectWeek)).toBe('rate_review')
  })

  it('distinguishes completed rituals, pending rituals and today', () => {
    const t = (key: string) => key.split('.').at(-1)!
    const today = '2026-03-12' as DayRef
    const done: DayMarker = {
      key: 'w',
      kind: 'ritual',
      dayRef: '2026-03-16' as DayRef,
      state: 'done',
      ritual: 'week',
      action: 'plan',
      weekRef: '2026-W12' as WeekRef,
    }
    const overdue: DayMarker = {
      ...done,
      state: 'due',
      dayRef: '2026-03-09' as DayRef,
      weekRef: '2026-W11' as WeekRef,
    }

    expect(markerIcon(done)).toBe('check')
    expect(markerDateLabel(done, today, t, 'pl-PL')).toBe('planned')
    expect(markerDateLabel({ ...done, state: 'due' }, today, t, 'pl-PL')).toBe('za 4 dni')
    expect(markerDateLabel(overdue, today, t, 'pl-PL')).toBe('notPlanned')
    expect(markerDateLabel({ ...done, state: 'due', dayRef: today }, today, t, 'pl-PL')).toBe(
      'today'
    )
  })

  it('uses relative week labels and date ranges across the year boundary', () => {
    const t = (key: string) => key.split('.').at(-1)!
    const marker: DayMarker = {
      key: 'w',
      kind: 'ritual',
      dayRef: '2026-01-05' as DayRef,
      state: 'due',
      ritual: 'week',
      action: 'plan',
      weekRef: '2026-W01' as WeekRef,
    }
    expect(markerTitle(marker, t, 'pl-PL', '2026-01-01' as DayRef)).toBe('planWeek_next')
    expect(markerContextLabel(marker, '2026-01-01' as DayRef, t, 'pl-PL')).toBe('5–11 sty 2026')
    expect(
      markerTitle(
        { ...marker, weekRef: '2025-W52' as WeekRef, action: 'reflect' },
        t,
        'en',
        '2026-01-05' as DayRef
      )
    ).toBe('reflectWeek_previous')
  })

  it('names the goal date explicitly and keeps the year for dates outside this year', () => {
    const t = (key: string) => key.split('.').at(-1)!
    const marker = {
      key: 'g',
      kind: 'deadline',
      dayRef: '2027-01-02',
      state: 'due',
      goal: { id: 'g', title: 'Goal' },
    } as DayMarker
    expect(markerContextLabel(marker, '2026-12-31' as DayRef, t, 'en')).toBe(
      'plannedEnd · Jan 2, 2027'
    )
    expect(
      markerDateLabel(
        { ...marker, dayRef: '2026-12-30' as DayRef },
        '2026-12-31' as DayRef,
        t,
        'en'
      )
    ).toBe('overdue')
    expect(markerDateLabel({ ...marker, state: 'done' }, '2026-12-31' as DayRef, t, 'en')).toBe(
      'completed'
    )
  })

  it('locks weekly intentions to their week: no "Jutro" on the last day of the week', () => {
    const intention = {
      kind: 'measurement',
      key: 'weeklyIntention:i',
      panelType: 'weeklyIntention',
      canHide: true,
      isScheduledToday: false,
      subject: { weekRef: '2026-W10' },
    } as unknown as TodayMeasurementItem
    const habit = {
      kind: 'measurement',
      key: 'habit:h',
      panelType: 'habit',
      canHide: true,
      isScheduledToday: false,
      subject: {},
    } as unknown as TodayMeasurementItem
    const thursday = '2026-03-12' as DayRef
    const sunday = '2026-03-15' as DayRef

    expect(rescheduleWeekLock(intention)).toBe('2026-W10')
    expect(rescheduleWeekLock(habit)).toBeNull()
    expect(canMoveToTomorrow(habit, sunday)).toBe(true)
    expect(canMoveToTomorrow(intention, thursday)).toBe(true)
    expect(canMoveToTomorrow(intention, sunday)).toBe(false)
  })
})
