/**
 * View-model types + time-state helpers for the "Strumień" (Stream) calendar.
 *
 * The period STRUCTURE is real (derived from `@/utils/periods`). The per-card
 * METRICS are computed from real data in `streamData.ts` — this module only
 * owns the shared shapes and the past/current/future classification.
 */
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { getPeriodRefsForDate } from '@/utils/periods'

export type PeriodTimeState = 'past' | 'current' | 'future'

/** A single goal/habit/tracker completion ring. `pct === null` ⇒ no data ("—"). */
export interface StreamRingVM {
  key: 'goals' | 'habits' | 'trackers'
  icon: string
  pct: number | null
  /** Future periods render dimmed (no execution data yet). */
  planOnly: boolean
  /**
   * Integer numerator/denominator when a concrete ratio exists (day engagement,
   * week attainment) — rendered as "n/d" in the dial. Absent when there is no
   * clean count behind the pct (the year ribbon's mean-of-ratios) or no data.
   */
  num?: number
  den?: number
  /** True when `pct` is an average of ratios (year ribbon) ⇒ shown as "ø72%". */
  mean?: boolean
}

/** A single bar in a life-area row or a Demands/Actions/State cluster. */
export interface StreamBarVM {
  key: string
  /** 0..1 fill ratio, or null when there is no data (rendered dimmed). */
  value: number | null
  icon?: string
}

export interface StreamClusterVM {
  key: 'W' | 'D' | 'S'
  bars: StreamBarVM[]
  /** Whether this cluster has a rating for the period (else its bars dim). */
  hasData: boolean
}

/** A month top-3 priority slot for the year ribbon (effort colours the ring). */
export interface StreamPriorityVM {
  /** Priority id, or `empty-<n>` for an unfilled slot. */
  key: string
  /** Unfilled slot — the month picked fewer than 3 priorities → render a "—". */
  empty?: boolean
  /** Priority title ('' for empty slots). */
  name: string
  icon: string
  /** Effort self-rating 1–5, or null = picked but not yet rated / future month (dimmed). */
  rating: number | null
}

export interface StreamMonthVM {
  monthRef: MonthRef
  monthIndex: number
  timeState: PeriodTimeState
  isCurrent: boolean
  /** Bars = the 5 monthly-reflection dimensions. */
  areas: StreamBarVM[]
  /** Year-view rings are Goals + Habits (trackers ring removed in this layout). */
  rings: StreamRingVM[]
  /** Month top-3 priorities — always 3 slots; unfilled slots render a "—". */
  priorities: StreamPriorityVM[]
}

export interface StreamWeekVM {
  weekRef: WeekRef
  weekNumber: number
  startDayRef: DayRef
  endDayRef: DayRef
  timeState: PeriodTimeState
  isCurrent: boolean
  clusters: StreamClusterVM[]
  rings: StreamRingVM[]
}

export interface StreamEmotionSegment {
  /** CSS color (emotion-quadrant token). */
  color: string
  /** Relative weight; segments are normalised when drawn. */
  weight: number
}

export interface StreamDayVM {
  dayRef: DayRef
  weekdayIndex: number
  dayNumber: number
  isToday: boolean
  isFuture: boolean
  journalWritten: boolean
  emotionCount: number
  emotionSegments: StreamEmotionSegment[]
  rings: StreamRingVM[]
}

// --- time-state helpers ------------------------------------------------------

export function todayDayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}

export function monthTimeState(monthRef: MonthRef, todayMonthRef: MonthRef): PeriodTimeState {
  if (monthRef < todayMonthRef) return 'past'
  if (monthRef > todayMonthRef) return 'future'
  return 'current'
}

/** Classifies a [start, end] day span against today. */
export function spanTimeState(start: DayRef, end: DayRef, today: DayRef): PeriodTimeState {
  if (start <= today && today <= end) return 'current'
  return end < today ? 'past' : 'future'
}

export function dayTimeState(dayRef: DayRef, today: DayRef): PeriodTimeState {
  if (dayRef === today) return 'current'
  return dayRef < today ? 'past' : 'future'
}
