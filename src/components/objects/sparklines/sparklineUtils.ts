import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'

// --- Layout constants (viewBox coordinate system) ---
export const VIEWBOX_W = 400
export const VIEWBOX_H = 96
export const PADDING_X = 24
export const PADDING_TOP = 4
export const PADDING_BOTTOM = 16
export const CHART_HEIGHT = VIEWBOX_H - PADDING_TOP - PADDING_BOTTOM // 76

// --- Compact variants for calendar cards ---
export const COMPACT_VIEWBOX_H = 52
export const COMPACT_PADDING_BOTTOM = 12
export const COMPACT_CHART_HEIGHT = COMPACT_VIEWBOX_H - PADDING_TOP - COMPACT_PADDING_BOTTOM // 36

const MAX_MONTHLY = 6
const MAX_WEEKLY = 12
const MAX_DAILY = 7

/** Slice points to the last N visible periods. */
export function getVisiblePoints(
  points: ObjectsLibraryChartPoint[],
  cadence: 'weekly' | 'monthly' | 'daily',
): ObjectsLibraryChartPoint[] {
  const max = cadence === 'monthly' ? MAX_MONTHLY : cadence === 'daily' ? MAX_DAILY : MAX_WEEKLY
  if (points.length <= max) return points
  return points.slice(-max)
}

/** Compute the max value across actual + target, floored at 1. */
export function computeMaxValue(points: ObjectsLibraryChartPoint[]): number {
  const values = points.flatMap((p) => [p.actualValue ?? 0, p.targetValue ?? 0])
  return Math.max(...values, 1)
}

/** Y coordinate for the target reference line. */
export function targetLineY(points: ObjectsLibraryChartPoint[], maxValue: number): number {
  const tv = points.find((p) => p.targetValue !== undefined)?.targetValue ?? 0
  const h = Math.max(2, (tv / maxValue) * CHART_HEIGHT)
  return PADDING_TOP + CHART_HEIGHT - h
}

/** Whether to show a period label at index i. */
export function shouldShowLabel(i: number, n: number, cadence: 'weekly' | 'monthly' | 'daily'): boolean {
  if (cadence === 'monthly' || cadence === 'daily') return true
  if (i === 0 || i === n - 1) return true
  return i % 4 === 0
}

/** Format a period reference as a short label. */
export function periodLabel(periodRef: string, cadence: 'weekly' | 'monthly' | 'daily', locale: string): string {
  if (cadence === 'daily') {
    // periodRef is a DayRef like "2026-03-14"
    const date = new Date(periodRef + 'T00:00:00')
    return new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(date)
      .slice(0, 3)
  }
  if (cadence === 'weekly') {
    const match = periodRef.match(/W(\d+)$/)
    return match ? `W${match[1]}` : periodRef.slice(-3)
  }
  const year = Number(periodRef.slice(0, 4))
  const month = Number(periodRef.slice(5, 7)) - 1
  return new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(new Date(year, month, 1))
    .slice(0, 3)
}

/** Generate unique gradient IDs to avoid SVG collisions across multiple instances. */
export function useGradientIds(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return {
    met: `${prefix}-met-${suffix}`,
    missed: `${prefix}-missed-${suffix}`,
    neutral: `${prefix}-neutral-${suffix}`,
    area: `${prefix}-area-${suffix}`,
  }
}

export type ChartColorTheme = 'keyResult' | 'habit' | 'tracker'

/** Resolve CSS variable names for chart colors based on object type. */
export function chartColorVars(theme: ChartColorTheme): { start: string; end: string } {
  switch (theme) {
    case 'habit':
      return { start: '--neo-chart-habit-start', end: '--neo-chart-habit-end' }
    case 'tracker':
      return { start: '--neo-chart-tracker-start', end: '--neo-chart-tracker-end' }
    case 'keyResult':
    default:
      return { start: '--neo-chart-kr-start', end: '--neo-chart-kr-end' }
  }
}
