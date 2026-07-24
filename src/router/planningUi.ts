import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { PlanningUi } from '@/design-system/contracts'

export const DEFAULT_PLANNING_UI: PlanningUi = 'next'

export function resolvePlanningUi(
  query: { ui?: LocationQueryValue | LocationQueryValue[] },
  fallback: PlanningUi = DEFAULT_PLANNING_UI,
): PlanningUi {
  return query.ui === 'legacy' || query.ui === 'next' ? query.ui : fallback
}

export function preservePlanningUi(query: LocationQuery): LocationQueryRaw {
  const ui = resolvePlanningUi(query)
  return ui === DEFAULT_PLANNING_UI ? {} : { ui }
}
