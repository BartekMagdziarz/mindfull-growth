export type PlanningScale = 'day' | 'week' | 'month' | 'year'
/** The calendar owns the aggregation scales; the day is its own view (Dzisiaj). */
export type CalendarScale = Exclude<PlanningScale, 'day'>

export type PlanningUi = 'legacy' | 'next'

export interface PlanningWorkspaceProps {
  scale: CalendarScale
  periodRef: string
  ui: PlanningUi
}

export type PlanningViewState = 'loading' | 'error' | 'empty' | 'ready'

export interface PlanningViewModel<T> {
  state: PlanningViewState
  data: T | null
  error: string | null
}
