export type PlanningScale = 'day' | 'week' | 'month' | 'year'

export type PlanningUi = 'legacy' | 'next'

export interface PlanningWorkspaceProps {
  scale: PlanningScale
  periodRef: string
  ui: PlanningUi
}

export type PlanningViewState = 'loading' | 'error' | 'empty' | 'ready'

export interface PlanningViewModel<T> {
  state: PlanningViewState
  data: T | null
  error: string | null
}
