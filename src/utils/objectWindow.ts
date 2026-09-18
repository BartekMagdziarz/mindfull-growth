import type { DayRef, MonthRef, YearRef } from '@/domain/period'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

/**
 * Pure geometry for the object-card timeline. The component only draws what
 * comes out of here; every rule about "where does the window start/end and
 * how far along is today" lives in this file so it can be unit-tested.
 */

export type ObjectWindowState =
  /** No start could be derived — nothing to draw. */
  | 'empty'
  /** Start known, no end: the pencil fades out to the right. */
  | 'open'
  /** Today is before the start. */
  | 'upcoming'
  /** Inside the window. */
  | 'running'
  /** The end is today. */
  | 'due-today'
  /** Today is after the end. */
  | 'overdue'

export interface ObjectWindow {
  start: DayRef | null
  end: DayRef | null
  /** 0..1 position of today's dot along the track (null when nothing to draw). */
  progress: number | null
  state: ObjectWindowState
  /** Signed days from today to the end (negative = overdue). Null without an end. */
  daysToEnd: number | null
}

export interface GoalWindowInput {
  startDate?: string
  targetDate?: string
  monthRefs?: string[]
  createdAt?: string
}

/** Ink length used for open windows: "started and running", nothing more. */
export const OPEN_WINDOW_PROGRESS = 0.4

const DAY_MS = 86_400_000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/

function toDayRef(value: string | undefined): DayRef | null {
  if (!value) return null
  if (DAY_RE.test(value)) return value as DayRef
  // ISO timestamps (createdAt) → local calendar day.
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return getPeriodRefsForDate(parsed).day
}

function dayToUtcMs(day: DayRef): number {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date)
}

export function daysBetween(from: DayRef, to: DayRef): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / DAY_MS)
}

function resolveToday(today: Date | string): DayRef {
  return typeof today === 'string' && DAY_RE.test(today)
    ? (today as DayRef)
    : getPeriodRefsForDate(today).day
}

/**
 * Goal window. Start = startDate → first linked month → createdAt day.
 * End = targetDate → last linked month → open.
 */
export function computeGoalWindow(input: GoalWindowInput, today: Date | string): ObjectWindow {
  const months = [...(input.monthRefs ?? [])].filter((ref) => MONTH_RE.test(ref)).sort()
  const firstMonth = months[0] as MonthRef | undefined
  const lastMonth = months[months.length - 1] as MonthRef | undefined

  const start =
    toDayRef(input.startDate) ??
    (firstMonth ? getPeriodBounds(firstMonth).start : null) ??
    toDayRef(input.createdAt)
  const end = toDayRef(input.targetDate) ?? (lastMonth ? getPeriodBounds(lastMonth).end : null)

  return buildWindow(start, end, resolveToday(today))
}

function buildWindow(start: DayRef | null, end: DayRef | null, today: DayRef): ObjectWindow {
  if (!start && !end) {
    return { start: null, end: null, progress: null, state: 'empty', daysToEnd: null }
  }

  // End without a start: draw a short run-up so the deadline still reads.
  const effectiveStart = start ?? end!
  const daysToEnd = end ? daysBetween(today, end) : null

  if (!end) {
    const state: ObjectWindowState = daysBetween(start!, today) < 0 ? 'upcoming' : 'open'
    return {
      start,
      end: null,
      progress: state === 'upcoming' ? 0 : OPEN_WINDOW_PROGRESS,
      state,
      daysToEnd: null,
    }
  }

  const total = Math.max(daysBetween(effectiveStart, end), 1)
  const elapsed = daysBetween(effectiveStart, today)
  const progress = Math.min(Math.max(elapsed / total, 0), 1)

  let state: ObjectWindowState = 'running'
  if (daysToEnd! < 0) state = 'overdue'
  else if (daysToEnd === 0) state = 'due-today'
  else if (elapsed < 0) state = 'upcoming'

  return { start, end, progress, state, daysToEnd }
}

export type YearDotState = 'done' | 'current' | 'future'

export interface YearsWindow {
  years: Array<{ ref: YearRef; state: YearDotState }>
  /** 0..1 ink length from the first dot; null when nothing is done yet. */
  progress: number | null
}

/**
 * Priority window: one stepper dot per year. Always includes the current
 * year and pads to at least three dots so the strip has a rhythm.
 */
export function computeYearsWindow(years: YearRef[], today: Date | string, minDots = 3): YearsWindow {
  const todayRef = resolveToday(today)
  const currentYear = Number(todayRef.slice(0, 4))
  const set = new Set<number>(years.map(Number).filter((year) => Number.isFinite(year)))
  set.add(currentYear)
  let next = Math.max(...set) + 1
  while (set.size < minDots) {
    set.add(next)
    next += 1
  }
  const sorted = [...set].sort((a, b) => a - b)

  const dots = sorted.map((year) => ({
    ref: String(year) as YearRef,
    state: (year < currentYear ? 'done' : year === currentYear ? 'current' : 'future') as YearDotState,
  }))

  const currentIndex = sorted.indexOf(currentYear)
  const yearStart = `${currentYear}-01-01` as DayRef
  const yearEnd = `${currentYear}-12-31` as DayRef
  const withinYear = daysBetween(yearStart, todayRef) / Math.max(daysBetween(yearStart, yearEnd), 1)
  const segments = Math.max(sorted.length - 1, 1)
  const progress = Math.min((currentIndex + withinYear) / segments, 1)

  return { years: dots, progress: sorted.length > 1 ? progress : null }
}
