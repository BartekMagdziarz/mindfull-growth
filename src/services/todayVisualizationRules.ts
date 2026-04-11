import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { MeasurementSubjectType } from '@/domain/planningState'

/**
 * The finite set of chart types that can appear on a Today view measurement card.
 *
 * The union covers both weekly detail primitives (bars, lines, segmented rects,
 * dots) and monthly summary primitives (rings, sparkline+label, smooth bar,
 * large number) introduced by Epic 10 Stories 2-5.
 */
export type TodayVizType =
  | 'initiative-check'
  | 'completion-dots'
  | 'completion-ring'
  | 'daily-bars'
  | 'value-line'
  | 'rating-segmented'
  | 'counter-ring'
  | 'value-sparkline-summary'
  | 'rating-smooth'
  | 'summary-number'

/**
 * Inputs to the chart selection decision. A pure data shape with no Vue
 * dependency so the rule module can be unit-tested in isolation and reused by
 * any future caller (e.g. Story 1's audit utility, or Story 7's snapshot tests).
 *
 * `panelType` is typed against the real {@link MeasurementSubjectType} union
 * plus the initiative marker, matching what `TodayItem.panelType` actually holds
 * at runtime. Goals are never surfaced as measurement cards on Today view.
 *
 * `cadence` is effectively required for measurement branches — when omitted,
 * the decision function treats the item as weekly for backward compatibility
 * with the initiative path (which does not depend on cadence).
 */
export interface VisualizationDecisionInput {
  kind: 'initiative' | 'measurement'
  panelType?: MeasurementSubjectType | 'initiative'
  entryMode?: MeasurementEntryMode
  target?: MeasurementTarget
  cadence?: PlanningCadence
}

/**
 * Single source of truth for how Today view picks a chart type. Every
 * visualization decision on Today view must read from this function.
 *
 * The rule set reads the cadence branch INSIDE each entryMode block. This
 * mirrors the design intent: pick the aggregate type from entryMode + target +
 * aggregation, then pick the detail-vs-summary form from cadence.
 *
 * Routing table:
 *
 *   initiative                                          → 'initiative-check'
 *
 *   completion + count target ≤ 7                       → 'completion-dots'
 *   completion + count target > 7                       → 'completion-ring'
 *   completion + tracker (no target) + weekly           → 'completion-dots'
 *   completion + tracker (no target) + monthly          → 'summary-number'
 *
 *   rating + weekly                                     → 'rating-segmented'
 *   rating + monthly                                    → 'rating-smooth'
 *
 *   counter + weekly                                    → 'daily-bars'
 *   counter + count target + monthly                    → 'counter-ring'
 *   counter + tracker (no target) + monthly             → 'summary-number'
 *
 *   value + value-sum target + weekly                   → 'daily-bars'
 *   value + value-sum target + monthly                  → 'counter-ring'
 *   value + no target OR avg/last target + weekly       → 'value-line'
 *   value + no target OR avg/last target + monthly      → 'value-sparkline-summary'
 */
export function resolveTodayVizType(input: VisualizationDecisionInput): TodayVizType {
  if (input.kind === 'initiative') {
    return 'initiative-check'
  }

  const isMonthly = input.cadence === 'monthly'

  // --- completion ---
  if (input.entryMode === 'completion') {
    // Count target with > 7 slots overflows the dot row — use the ring instead.
    if (input.target?.kind === 'count' && input.target.value > 7) {
      return 'completion-ring'
    }
    if (input.target?.kind === 'count') {
      return 'completion-dots'
    }
    // Tracker (no target): monthly gets a summary number; weekly keeps the
    // familiar dot row.
    return isMonthly ? 'summary-number' : 'completion-dots'
  }

  // --- rating ---
  // Weekly cadence renders vertical segmented rectangles; monthly collapses to
  // a smooth-fill bar next to the average label.
  if (input.entryMode === 'rating') {
    return isMonthly ? 'rating-smooth' : 'rating-segmented'
  }

  // --- counter ---
  // Counters aggregate by sum. Weekly shows per-day bars; monthly uses either
  // a ring (with target) or a summary number (tracker, no target).
  if (input.entryMode === 'counter') {
    if (isMonthly) {
      return input.target?.kind === 'count' ? 'counter-ring' : 'summary-number'
    }
    return 'daily-bars'
  }

  // --- value ---
  if (input.entryMode === 'value') {
    // Value-sum targets behave like counters: the aggregate is a total, so the
    // weekly view stacks bars and the monthly view uses a ring.
    if (input.target?.kind === 'value' && input.target.aggregation === 'sum') {
      return isMonthly ? 'counter-ring' : 'daily-bars'
    }
    // Everything else (no target OR avg/last aggregation) is line-like: weekly
    // renders the full line; monthly renders a sparkline + aggregate label.
    return isMonthly ? 'value-sparkline-summary' : 'value-line'
  }

  // Fallback — should be unreachable for measurements with a valid entryMode.
  return 'daily-bars'
}
