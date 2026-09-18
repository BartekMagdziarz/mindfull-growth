import type { DayRef, MonthRef, PeriodRef, WeekRef } from '@/domain/period'
import { getPeriodBounds, getPeriodType } from '@/utils/periods'

export function formatPeriodLabel(periodRef: PeriodRef, locale: string, weekLabel: string): string {
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

export function formatMonthName(monthRef: MonthRef, locale: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(0, 4)
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
  }).format(new Date(Number(year), monthIndex, 1))
}

/** Short month with year for quiet card facts, e.g. "sie 2026" / "Aug 2026". */
export function formatMonthShort(monthRef: MonthRef, locale: string): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = Number(monthRef.slice(0, 4))
  const month = new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(new Date(year, monthIndex, 1))
    .replace(/\.$/, '')
  return `${month} ${year}`
}

/** Short day label, e.g. "26 wrz" / "Sep 26"; the year is added only when asked. */
export function formatDayShort(dayRef: DayRef, locale: string, withYear = false): string {
  const [year, month, day] = dayRef.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
    .format(new Date(year, month - 1, day))
    .replace(/\.(\s|$)/g, '$1')
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

/** Date-first label shared by period selection and assigned-period badges. */
export function formatWeekRange(weekRef: WeekRef, locale: string): string {
  const { start, end } = getPeriodBounds(weekRef)
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return formatter.formatRange(new Date(`${start}T12:00:00`), new Date(`${end}T12:00:00`))
}
