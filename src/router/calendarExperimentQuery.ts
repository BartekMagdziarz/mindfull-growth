import type { LocationQuery, LocationQueryValue } from 'vue-router'

/**
 * Hidden Month V2 experiment flags carried in the classic month route's query.
 *
 * The experimental month renderer (`?layout=v2`) and its presentation variants
 * are resolved here from the URL so V1 stays the default for any URL that does
 * not opt in explicitly. Each field falls back independently: an invalid value
 * for one key never disturbs the others, and keys outside this whitelist
 * (`action`, `origin`, …) are never read nor removed by this resolver.
 */
export type CalendarMonthLayout = 'legacy' | 'v2'
export type CalendarMonthChartMode = 'hybrid' | 'capsules' | 'axis'
export type CalendarMonthDensity = 'comfortable' | 'compact'
export const CALENDAR_MONTH_FOCUS_KEYS = [
  'goals',
  'habits',
  'trackers',
  'intentions',
  'emotions',
  'journal',
] as const
export type MonthFocusKey = (typeof CALENDAR_MONTH_FOCUS_KEYS)[number]

export interface CalendarMonthExperiment {
  layout: CalendarMonthLayout
  chartMode: CalendarMonthChartMode
  density: CalendarMonthDensity
  focus: MonthFocusKey | null
}

export const CALENDAR_MONTH_EXPERIMENT_DEFAULTS: CalendarMonthExperiment = {
  layout: 'legacy',
  chartMode: 'hybrid',
  density: 'comfortable',
  focus: null,
}

/** Query keys owned by the experiment; dropped when leaving the month scale. */
export const CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS = ['layout', 'chart', 'density', 'focus'] as const

function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' && first.length > 0 ? first : undefined
}

/** Parse the optional Month V2 disclosure state from a Vue Router query value. */
export function parseMonthFocusKey(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): MonthFocusKey | null {
  const focus = firstQueryValue(value)
  return CALENDAR_MONTH_FOCUS_KEYS.find(key => key === focus) ?? null
}

/** Serialize focus for Vue Router; `null` removes the optional query key. */
export function serializeMonthFocusKey(
  focus: MonthFocusKey | null | undefined
): MonthFocusKey | undefined {
  return focus ?? undefined
}

export function resolveCalendarMonthExperiment(query: LocationQuery): CalendarMonthExperiment {
  const layout = firstQueryValue(query.layout)
  const chart = firstQueryValue(query.chart)
  const density = firstQueryValue(query.density)

  return {
    layout: layout === 'v2' ? 'v2' : CALENDAR_MONTH_EXPERIMENT_DEFAULTS.layout,
    chartMode:
      chart === 'capsules' || chart === 'axis' || chart === 'hybrid'
        ? chart
        : CALENDAR_MONTH_EXPERIMENT_DEFAULTS.chartMode,
    density:
      density === 'compact' || density === 'comfortable'
        ? density
        : CALENDAR_MONTH_EXPERIMENT_DEFAULTS.density,
    focus: parseMonthFocusKey(query.focus),
  }
}
