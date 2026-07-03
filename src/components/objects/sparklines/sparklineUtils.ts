import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'

// --- Layout constants (viewBox coordinate system) ---
export const VIEWBOX_W = 400
export const VIEWBOX_H = 96
export const PADDING_X = 24
export const PADDING_TOP = 4
export const PADDING_BOTTOM = 16
export const CHART_HEIGHT = VIEWBOX_H - PADDING_TOP - PADDING_BOTTOM // 76

// --- Compact variants for today-view cards ---
export const COMPACT_VIEWBOX_H = 160
export const COMPACT_PADDING_BOTTOM = 16
export const COMPACT_CHART_HEIGHT = COMPACT_VIEWBOX_H - PADDING_TOP - COMPACT_PADDING_BOTTOM // 140

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
      .slice(0, 2)
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

/**
 * Top-corner radius as a FRACTION of bar width. A fixed radius in viewBox units
 * renders inconsistently because charts scale their viewBox very differently on
 * screen: `r=3` in a 400-wide viewBox (daily/monthly/sparkline bars, often with
 * `preserveAspectRatio="none"`) shrinks to ~1px and looks square, while the same
 * 3 in a 20-wide rating cell renders ~3px. Scaling the radius with bar width
 * makes every bar's rounded top cover the same proportion (~this fraction × 2 of
 * its width), so they read the same regardless of viewBox scale.
 */
export const BAR_CORNER_FRACTION = 0.2

/**
 * SVG path for a bar with rounded TOP corners and a flat base — the app-wide
 * house style for baseline-anchored bars. (A `<rect rx>` rounds all four
 * corners, which makes a bar look like it floats rather than sitting planted on
 * the baseline.) `x,y` is the top-left corner; `h` grows downward to the base.
 * The radius defaults to a fraction of width and is clamped so thin/short bars
 * stay valid.
 */
export function topRoundedBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r = w * BAR_CORNER_FRACTION,
): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return (
    `M${x},${y + h}` +
    `L${x},${y + rr}` +
    `Q${x},${y} ${x + rr},${y}` +
    `L${x + w - rr},${y}` +
    `Q${x + w},${y} ${x + w},${y + rr}` +
    `L${x + w},${y + h}Z`
  )
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
