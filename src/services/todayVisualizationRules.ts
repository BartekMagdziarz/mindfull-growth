import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import type { MeasurementSubjectType } from '@/domain/planningState'

/**
 * The finite set of chart types that can appear on a Today view measurement card.
 *
 * Epic 10 Story 1 keeps this set identical to the pre-refactor state so the
 * routing change is a pure refactor. Later stories will extend this union with
 * `rating-segmented`, `completion-ring`, `counter-ring`, `value-sparkline-summary`,
 * `rating-smooth`, and `summary-number` as new primitives land.
 */
export type TodayVizType =
  | 'initiative-check'
  | 'completion-dots'
  | 'daily-bars'
  | 'value-line'
  | 'rating-segmented'

/**
 * Inputs to the chart selection decision. A pure data shape with no Vue
 * dependency so the rule module can be unit-tested in isolation and reused by
 * any future caller (e.g. Story 1's audit utility, or Story 7's snapshot tests).
 *
 * `panelType` is typed against the real {@link MeasurementSubjectType} union
 * plus the initiative marker, matching what `TodayItem.panelType` actually holds
 * at runtime. Goals are never surfaced as measurement cards on Today view.
 */
export interface VisualizationDecisionInput {
  kind: 'initiative' | 'measurement'
  panelType?: MeasurementSubjectType | 'initiative'
  entryMode?: MeasurementEntryMode
  target?: MeasurementTarget
}

/**
 * Single source of truth for how Today view picks a chart type. Every
 * visualization decision on Today view must read from this function.
 *
 * The rule set:
 *
 *   initiative                               → 'initiative-check'
 *   completion (any panel)                   → 'completion-dots'
 *   rating (any panel)                       → 'rating-segmented'
 *   value + no target                        → 'value-line'
 *   value + target.aggregation === 'sum'     → 'daily-bars'
 *   value + target.aggregation !== 'sum'     → 'value-line'
 *   everything else (counter)                → 'daily-bars'
 *
 * The rating branch is checked BEFORE the value branch so a future change to
 * the value branch cannot accidentally swallow rating entries. Each subsequent
 * Epic 10 story will add exactly one branch and the TODO markers below flag
 * the seams where future stories will cut in.
 */
export function resolveTodayVizType(input: VisualizationDecisionInput): TodayVizType {
  if (input.kind === 'initiative') {
    return 'initiative-check'
  }

  // TODO (Epic 10 Story 4): when slot count > 7, return 'completion-ring' instead.
  if (input.entryMode === 'completion') {
    return 'completion-dots'
  }

  // Rating entries always route to the dedicated segmented primitive. Weekly
  // cadence renders vertical segmented rectangles; a future story will add a
  // `rating-smooth` type for monthly cadence.
  if (input.entryMode === 'rating') {
    return 'rating-segmented'
  }

  if (input.entryMode === 'value') {
    if (!input.target) {
      return 'value-line'
    }

    if (input.target.kind === 'value') {
      // TODO (Epic 10): when new value aggregations are introduced, decide
      // whether they belong with the line or bar branch. Only `sum` is bars.
      return input.target.aggregation === 'sum' ? 'daily-bars' : 'value-line'
    }

    return 'value-line'
  }

  // TODO (Epic 10 Story 5): monthly cadence routes to summary primitives
  //   (CounterRing, ValueSparklineSummary, SummaryNumber) instead of daily bars.
  return 'daily-bars'
}
