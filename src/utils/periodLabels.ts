import type { DayRef, MonthRef, PeriodRef, WeekRef } from '@/domain/period'
import { getPeriodBounds, getPeriodType } from '@/utils/periods'

export function formatPeriodLabel(
  periodRef: PeriodRef,
  locale: string,
  weekLabel: string,
): string {
  switch (getPeriodType(periodRef)) {
    case 'year':
      return periodRef
    case 'month':
      return formatMonthTitle(periodRef as MonthRef, locale)
    case 'week':
      return formatWeekTitle(periodRef as WeekRef, locale, weekLabel)
    case 'day':
      return formatDayTitle(periodRef as DayRef, locale)
  }
}

export function formatMonthTitle(monthRef: MonthRef, locale: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(0, 4)
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), monthIndex, 1))
}

export function formatWeekTitle(weekRef: WeekRef, locale: string, weekLabel: string): string {
  const bounds = getPeriodBounds(weekRef)
  return (
    `${weekLabel} ${weekRef.slice(-2)}` +
    ` · ${formatDayRange(bounds.start, locale)} - ${formatDayRange(bounds.end, locale)}`
  )
}

export function formatDayTitle(dayRef: DayRef, locale: string): string {
  const date = new Date(`${dayRef}T00:00:00`)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDayRange(dayRef: DayRef, locale: string): string {
  const date = new Date(`${dayRef}T00:00:00`)
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTimestamp(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
