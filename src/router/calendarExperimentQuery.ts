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

export interface CalendarMonthExperiment {
  layout: CalendarMonthLayout
  chartMode: CalendarMonthChartMode
  density: CalendarMonthDensity
}

export const CALENDAR_MONTH_EXPERIMENT_DEFAULTS: CalendarMonthExperiment = {
  layout: 'legacy',
  chartMode: 'hybrid',
  density: 'comfortable',
}

/** Query keys owned by the experiment; dropped when leaving the month scale. */
export const CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS = ['layout', 'chart', 'density'] as const

function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' && first.length > 0 ? first : undefined
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
  }
}
