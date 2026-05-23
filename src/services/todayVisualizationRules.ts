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
   * Variant used by the monthly-slice scope only: per-week bars whose height
   * encodes the entry count and whose color follows the week's evaluation
   * status. The shape differs from {@link 'daily-bars'} because completion
   * entries don't have a continuous value — only a count + per-week status.
   */
  | 'monthly-completion-bars'

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

/**
 * Sibling rule for the **weekly-slice** scope (currently consumed by the weekly
 * reflection grid). Unlike {@link resolveTodayVizType}, it always renders the
 * WEEKLY visualisation of an item even when the underlying object has monthly
 * cadence — the surrounding tile pairs this with a separate
 * `MonthlyContextFooter` to retain the month-level context.
 *
 * The two functions share {@link VisualizationDecisionInput} and the
 * {@link TodayVizType} enum on purpose: the chart primitives are identical, so
 * a future caller (e.g. CalendarView's weekly view) can adopt this resolver
 * without inventing a new visualisation language. When a third caller arrives,
 * consider renaming this file to a more generic name.
 *
 * Routing table (note the differences vs. Today are flagged with `*`):
 *
 *   initiative                                          → 'initiative-check'
 *
 *   completion + count target ≤ 7                       → 'completion-dots'
 *   completion + count target > 7                       → 'completion-dots'  *
 *   completion + tracker (no target)                    → 'completion-dots'  * (always, even monthly)
 *
 *   rating + any cadence                                → 'rating-segmented' * (no monthly variant)
 *
 *   counter + any cadence                               → 'daily-bars'       * (no monthly variant)
 *
 *   value + value-sum target + any cadence              → 'daily-bars'       * (no monthly variant)
 *   value + value-avg/last target OR no target          → 'value-line'       * (no monthly variant)
 *
 * In every monthly-cadence branch the tile additionally shows a small
 * `MonthlyContextFooter` underneath the chart with the month-scope progress —
 * that's where the monthly summary information lives in this scope.
 */
export function resolveWeeklySliceVizType(input: VisualizationDecisionInput): TodayVizType {
  if (input.kind === 'initiative') {
    return 'initiative-check'
  }

  if (input.entryMode === 'completion') {
    // Always 7 day-slots — even for "Meditation 15x/month" the user sees Mon-Sun.
    return 'completion-dots'
  }

  if (input.entryMode === 'rating') {
    return 'rating-segmented'
  }

  if (input.entryMode === 'counter') {
    return 'daily-bars'
  }

  if (input.entryMode === 'value') {
    if (input.target?.kind === 'value' && input.target.aggregation === 'sum') {
      return 'daily-bars'
    }
    return 'value-line'
  }

  return 'daily-bars'
}

/**
 * Sibling rule for the **monthly-slice** scope (consumed by the month reflection
 * grid). Returns the same weekly-shape primitives as
 * {@link resolveWeeklySliceVizType}, but the slot array fed to the chart
 * represents weeks of the month (typically 4-5) rather than days of a week.
 * Aggregation across weeks is handled by the slot builders in
 * `monthlySliceChartData.ts`, not by this resolver.
 *
 * Same routing as `resolveWeeklySliceVizType` — kept as a separate function so
 * future divergence (e.g. a monthly-specific "weekly bars" primitive) does not
 * touch the weekly-scope path.
 */
export function resolveMonthlySliceVizType(input: VisualizationDecisionInput): TodayVizType {
  if (input.kind === 'initiative') {
    return 'initiative-check'
  }

  // Completion entries render as bars whose height reflects the number of
  // entries in each week and whose color reflects the per-week status. The
  // 4-5 weekly slots make bar-height comparisons meaningful (unlike the dot
  // layout in the weekly slice where every dot is just on/off).
  if (input.entryMode === 'completion') {
    return 'monthly-completion-bars'
  }

  if (input.entryMode === 'rating') {
    return 'rating-segmented'
  }

  if (input.entryMode === 'counter') {
    return 'daily-bars'
  }

  if (input.entryMode === 'value') {
    if (input.target?.kind === 'value' && input.target.aggregation === 'sum') {
      return 'daily-bars'
    }
    return 'value-line'
  }

  return 'daily-bars'
}
