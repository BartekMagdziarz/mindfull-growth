import type { LocationQuery, LocationQueryValue } from 'vue-router'

/**
 * Hidden calendar V2 experiment flags carried by the classic month/week routes.
 *
 * The experimental month renderer (`?layout=v2`) and its presentation variants
 * are resolved here from the URL so V1 stays the default for any URL that does
 * not opt in explicitly. Each field falls back independently: an invalid value
 * for one key never disturbs the others, and keys outside this whitelist
 * (`action`, `origin`, …) are never read nor removed by this resolver.
 */
export type CalendarLayout = 'legacy' | 'v2'
export type CalendarChartMode = 'hybrid' | 'capsules' | 'axis'
export type CalendarDensity = 'comfortable' | 'compact'

/** Backwards-compatible aliases kept for Month V2 consumers. */
export type CalendarMonthLayout = CalendarLayout
export type CalendarMonthChartMode = CalendarChartMode
export type CalendarMonthDensity = CalendarDensity

export interface CalendarExperiment {
  layout: CalendarLayout
  chartMode: CalendarChartMode
  density: CalendarDensity
}

export type CalendarMonthExperiment = CalendarExperiment

export const CALENDAR_EXPERIMENT_DEFAULTS: CalendarExperiment = {
  layout: 'legacy',
  chartMode: 'hybrid',
  density: 'comfortable',
}

/** Query keys owned by the experiment; dropped when leaving the month scale. */
export const CALENDAR_EXPERIMENT_QUERY_KEYS = ['layout', 'chart', 'density'] as const
export const CALENDAR_MONTH_EXPERIMENT_DEFAULTS = CALENDAR_EXPERIMENT_DEFAULTS
export const CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS = CALENDAR_EXPERIMENT_QUERY_KEYS

function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' && first.length > 0 ? first : undefined
}

export function resolveCalendarExperiment(query: LocationQuery): CalendarExperiment {
  const layout = firstQueryValue(query.layout)
  const chart = firstQueryValue(query.chart)
  const density = firstQueryValue(query.density)

  return {
    layout: layout === 'v2' ? 'v2' : CALENDAR_EXPERIMENT_DEFAULTS.layout,
    chartMode:
      chart === 'capsules' || chart === 'axis' || chart === 'hybrid'
        ? chart
        : CALENDAR_EXPERIMENT_DEFAULTS.chartMode,
    density:
      density === 'compact' || density === 'comfortable'
        ? density
        : CALENDAR_EXPERIMENT_DEFAULTS.density,
  }
}

export const resolveCalendarMonthExperiment = resolveCalendarExperiment
