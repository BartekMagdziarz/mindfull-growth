import type { MonthRef, WeekRef } from '@/domain/period'
import { getNextPeriod, getPeriodRefsForDate, isPeriodRef } from '@/utils/periods'

/** Full calendar periods intersecting an inclusive local date range. */
export function periodsInDateRange(
  start: string,
  end: string,
  cadence: 'weekly' | 'monthly'
): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    !isPeriodRef(start) ||
    !isPeriodRef(end) ||
    start > end
  )
    return []
  const scale = cadence === 'weekly' ? 'week' : 'month'
  let current: MonthRef | WeekRef = getPeriodRefsForDate(start)[scale]
  const last = getPeriodRefsForDate(end)[scale]
  const result: string[] = []
  while (current <= last) {
    result.push(current)
    if (current === last) break
    current = getNextPeriod(current) as MonthRef | WeekRef
  }
  return result
}
