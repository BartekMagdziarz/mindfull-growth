import type { MonthRef, WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

/**
 * "29 cze – 25 paź" for the first and last of the given period refs; the
 * year appears only when the window leaves the current year. Months
 * format as "cze – paź".
 */
export function formatPeriodRange(
  periodRefs: string[],
  cadence: 'weekly' | 'monthly',
  locale: string,
  now: Date = new Date()
): string {
  const refs = [...new Set(periodRefs)].sort()
  if (!refs.length) return ''
  const start = getPeriodBounds(refs[0] as MonthRef | WeekRef).start
  const end = getPeriodBounds(refs[refs.length - 1] as MonthRef | WeekRef).end
  const currentYear = String(now.getFullYear())
  const withYear = start.slice(0, 4) !== currentYear || end.slice(0, 4) !== currentYear
  const options: Intl.DateTimeFormatOptions =
    cadence === 'monthly'
      ? { month: 'short', ...(withYear ? { year: 'numeric' } : {}) }
      : { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }
  return new Intl.DateTimeFormat(locale, options).formatRange(
    new Date(`${start}T12:00:00`),
    new Date(`${end}T12:00:00`)
  )
}

/** Whole weeks between an ISO timestamp and now (never negative). */
export function weeksSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((now.getTime() - then) / (7 * 24 * 60 * 60 * 1000)))
}
