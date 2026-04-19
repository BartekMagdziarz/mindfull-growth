import { toLocalDateKey } from '@/utils/streaks'
import type { Quadrant } from '@/domain/emotion'

export interface CalendarDaySlot {
  dateKey: string // YYYY-MM-DD
  dayLabel: string // narrow weekday label
  isToday: boolean
  isFuture: boolean
}

export interface CalendarWeek {
  slots: CalendarDaySlot[] // always 7 items (Mon-Sun)
}

export interface DayEmotionSummary {
  logCount: number
  quadrantProportions: Record<Quadrant, number> // values 0-1, sum = 1
}

const todayKey = (): string => toLocalDateKey(new Date())

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=Sun, 1=Mon … 6=Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function narrowWeekdayFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
}

function shortWeekdayFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' })
}

function buildSlot(
  date: Date,
  referenceDate: Date,
  fmt: Intl.DateTimeFormat,
  today: string,
  sliceLabel = false,
): CalendarDaySlot {
  const dateKey = toLocalDateKey(date)
  const raw = fmt.format(date)
  return {
    dateKey,
    dayLabel: sliceLabel ? raw.slice(0, 2) : raw,
    isToday: dateKey === today,
    isFuture: date.getTime() > referenceDate.getTime(),
  }
}

/**
 * Build an array of the last `count` calendar days ending at referenceDate.
 * Used for the collapsed (7-day) view.
 */
export function buildRecentDays(
  referenceDate: Date,
  count: number,
  locale: string,
): CalendarDaySlot[] {
  const fmt = shortWeekdayFormatter(locale)
  const today = todayKey()
  const slots: CalendarDaySlot[] = []

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() - i,
    )
    slots.push(buildSlot(d, referenceDate, fmt, today, true))
  }
  return slots
}

/**
 * Build a Mon-Sun aligned grid of `weekCount` full weeks.
 * The week containing referenceDate is the last (bottom) row.
 * Used for the expanded (5-week) view.
 */
export function buildWeekGrid(
  referenceDate: Date,
  weekCount: number,
  locale: string,
): CalendarWeek[] {
  const fmt = narrowWeekdayFormatter(locale)
  const today = todayKey()
  const currentMonday = getMonday(referenceDate)
  const weeks: CalendarWeek[] = []

  for (let w = weekCount - 1; w >= 0; w--) {
    const weekMonday = new Date(currentMonday)
    weekMonday.setDate(weekMonday.getDate() - w * 7)
    const slots: CalendarDaySlot[] = []

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekMonday)
      day.setDate(day.getDate() + d)
      slots.push(buildSlot(day, referenceDate, fmt, today))
    }
    weeks.push({ slots })
  }
  return weeks
}
