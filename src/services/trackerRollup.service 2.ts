/**
 * Tracker Rollup Service
 *
 * Computes progress summaries for Trackers based on their TrackerPeriod data.
 * All tracking data is stored directly in TrackerPeriods — no more aggregate-
 * from-commitments logic. This simplifies rollup to: query TrackerPeriods by
 * trackerId and date range, then compute summaries from the embedded data.
 */

import type {
  WeeklyPlan,
  Tracker,
  TrackerPeriod,
  TrackerCadence,
  TrackerRollup,
  TrackerType,
  ValueDirection,
} from '@/domain/planning'
import {
  trackerDexieRepository,
  trackerPeriodDexieRepository,
  weeklyPlanDexieRepository,
  monthlyPlanDexieRepository,
} from '@/repositories/planningDexieRepository'
import {
  formatPeriodDateRange,
  formatPeriodDateRangeNoYear,
  getMonthRange,
  getMonthRangesBetween,
  getTodayString,
  getWeekRange,
  getWeekRangesBetween,
  parseLocalISODate,
  toLocalISODateString,
  type IsoDateRange,
} from '@/utils/periodUtils'

// ============================================================================
// Types
// ============================================================================

export interface TrackerProgressSummary {
  trackerId: string
  type: TrackerType
  cadence: TrackerCadence
  rollup?: TrackerRollup
  percent: number | null
  summary: string
  numerator?: number
  denominator?: number
  value?: number
  average?: number
  entriesCount?: number
  periodsCount?: number
}

export interface CompliancePeriodSummary {
  startDate: string
  endDate: string
  ratio: number
  isComplete: boolean
  label: string
}

export interface RollingComplianceSummary {
  trackerId: string
  cadence: TrackerCadence
  periods: CompliancePeriodSummary[]
  successRatio: number
  successCount: number
  totalPeriods: number
}

export interface DateWindow {
  startDate?: string
  endDate?: string
  ranges: IsoDateRange[]
  periodType: TrackerCadence
  periodCount: number
}

// ============================================================================
// Helpers
// ============================================================================

const FALLBACK_DECIMALS = 1

function clampRatio(value: number): number {
  return Math.max(0, Math.min(value, 1))
}

function roundNumber(value: number, decimals: number = FALLBACK_DECIMALS): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function formatSummaryLabel(value: number | undefined, suffix?: string): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  const rounded = roundNumber(value)
  return suffix ? `${rounded}${suffix}` : `${rounded}`
}

function isFullMonthWindow(range?: IsoDateRange): boolean {
  if (!range) return false

  const monthRanges = getMonthRangesBetween(range.startDate, range.endDate)
  if (monthRanges.length === 0) return false

  const firstMonth = monthRanges[0]
  const lastMonth = monthRanges[monthRanges.length - 1]
  return firstMonth.startDate === range.startDate && lastMonth.endDate === range.endDate
}

function buildRatioSummary(
  numerator: number,
  denominator: number,
  label?: string
): { summary: string; percent: number | null } {
  if (denominator <= 0) {
    return { summary: label ? `0/0 ${label}` : 'No data', percent: null }
  }
  const ratio = clampRatio(numerator / denominator)
  const summaryLabel = label ? `${numerator}/${denominator} ${label}` : `${numerator}/${denominator}`
  return { summary: summaryLabel, percent: ratio * 100 }
}

function computeNumericRollup(values: number[], rollup?: TrackerRollup): number | undefined {
  if (values.length === 0) return undefined
  if (rollup === 'sum') {
    return values.reduce((total, v) => total + v, 0)
  }
  if (rollup === 'average') {
    return values.reduce((total, v) => total + v, 0) / values.length
  }
  // 'last' or default
  return values[values.length - 1]
}

function computeValueRatio(
  value: number | undefined,
  targetValue?: number,
  direction?: ValueDirection,
  ratingScaleMax?: number
): number | null {
  if (value === undefined || Number.isNaN(value)) return null
  if (ratingScaleMax) {
    return clampRatio(value / ratingScaleMax)
  }
  if (!targetValue) return null
  if (direction === 'decrease') {
    if (value <= 0) return 1
    return clampRatio(targetValue / value)
  }
  return clampRatio(value / targetValue)
}

// ============================================================================
// Progress Computation
// ============================================================================

/**
 * Compute progress for a single tracker over a set of TrackerPeriods.
 * This works for all tracker types: count, adherence, value, rating, checkin.
 */
function computeTrackerProgress(
  tracker: Tracker,
  periods: TrackerPeriod[],
  dateRange?: IsoDateRange
): TrackerProgressSummary {
  const { type, rollup } = tracker

  // Count / Adherence: completion against target (percent)
  if (type === 'count' || type === 'adherence') {
    const totalCompleted = periods.reduce((sum, period) => {
      const ticks = period.ticks ?? []
      return sum + ticks.filter((t) => t.completed).length
    }, 0)

    let totalTarget = periods.reduce((sum, period) => {
      const target = period.periodTarget ?? tracker.targetCount ?? 0
      return sum + target
    }, 0)

    if (tracker.cadence === 'monthly' && dateRange && isFullMonthWindow(dateRange)) {
      const monthCount = getMonthRangesBetween(dateRange.startDate, dateRange.endDate).length
      totalTarget = (tracker.targetCount ?? 0) * monthCount
    }

    const { summary, percent } = buildRatioSummary(totalCompleted, totalTarget)
    return {
      trackerId: tracker.id,
      type,
      cadence: tracker.cadence,
      rollup,
      percent,
      summary,
      numerator: totalCompleted,
      denominator: totalTarget,
      periodsCount: periods.length,
    }
  }

  // Value: aggregate values from entries across periods
  if (type === 'value') {
    const allValues: number[] = []
    for (const period of periods) {
      const entries = period.entries ?? []
      for (const entry of entries) {
        allValues.push(entry.value)
      }
    }

    const rollupValue = computeNumericRollup(allValues, rollup ?? 'last')
    const ratio = computeValueRatio(rollupValue, tracker.targetValue, tracker.direction)
    const summary =
      rollupValue === undefined
        ? 'No data'
        : tracker.targetValue
          ? `${formatSummaryLabel(rollupValue, tracker.unit ? ` ${tracker.unit}` : '')}/${formatSummaryLabel(tracker.targetValue, tracker.unit ? ` ${tracker.unit}` : '')}`
          : `${formatSummaryLabel(rollupValue, tracker.unit ? ` ${tracker.unit}` : '')}`

    return {
      trackerId: tracker.id,
      type,
      cadence: tracker.cadence,
      rollup,
      percent: ratio === null ? null : ratio * 100,
      summary,
      value: rollupValue,
      entriesCount: allValues.length,
      periodsCount: periods.length,
    }
  }

  // Rating: aggregate ratings across periods
  if (type === 'rating') {
    const ratings = periods
      .map((p) => p.rating)
      .filter((r): r is number => r !== undefined)

    const rollupValue = computeNumericRollup(ratings, rollup ?? 'average')
    const ratio = computeValueRatio(rollupValue, undefined, undefined, tracker.ratingScaleMax)
    const label = (rollup ?? 'average') === 'last' ? 'Last' : 'Avg'
    const summary =
      rollupValue === undefined
        ? 'No data'
        : `${label} ${formatSummaryLabel(rollupValue)}/${tracker.ratingScaleMax ?? ''}`.trim()

    return {
      trackerId: tracker.id,
      type,
      cadence: tracker.cadence,
      rollup,
      percent: ratio === null ? null : ratio * 100,
      summary,
      value: rollupValue,
      average: rollupValue,
      entriesCount: ratings.length,
      periodsCount: periods.length,
    }
  }

  // Checkin: count periods that have notes
  if (type === 'checkin') {
    const withNotes = periods.filter((p) => p.note && p.note.trim().length > 0).length
    const total = periods.length
    const ratio = total > 0 ? clampRatio(withNotes / total) : null
    const { summary, percent } = buildRatioSummary(withNotes, total)

    return {
      trackerId: tracker.id,
      type,
      cadence: tracker.cadence,
      rollup,
      percent: ratio === null ? null : percent,
      summary,
      numerator: withNotes,
      denominator: total,
      entriesCount: withNotes,
      periodsCount: periods.length,
    }
  }

  // Fallback
  return {
    trackerId: tracker.id,
    type,
    cadence: tracker.cadence,
    percent: null,
    summary: 'No data',
    periodsCount: periods.length,
  }
}

// ============================================================================
// Window Resolution
// ============================================================================

async function loadWeeklyPlansByIds(ids: string[]): Promise<WeeklyPlan[]> {
  const uniqueIds = Array.from(new Set(ids))
  const plans = await Promise.all(uniqueIds.map((id) => weeklyPlanDexieRepository.getById(id)))
  return plans.filter((plan): plan is WeeklyPlan => Boolean(plan))
}

async function loadMonthlyPlansByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids))
  const plans = await Promise.all(uniqueIds.map((id) => monthlyPlanDexieRepository.getById(id)))
  return plans.filter(Boolean)
}

function buildRangesFromPlans(
  plans: Array<{ startDate: string; endDate: string }>
): IsoDateRange[] {
  return plans.map((plan) => ({
    startDate: plan.startDate,
    endDate: plan.endDate,
  }))
}

function hasExplicitTrackerSelections(plans: WeeklyPlan[]): boolean {
  return plans.some((plan) => Array.isArray(plan.selectedTrackerIds))
}

function planIncludesTracker(plan: WeeklyPlan, trackerId: string): boolean {
  if (!Array.isArray(plan.selectedTrackerIds)) {
    // Legacy plans without explicit selection should keep historical compatibility.
    return true
  }
  return plan.selectedTrackerIds.includes(trackerId)
}

function computePeriodCountFromBounds(
  periodType: TrackerCadence,
  startDate?: string,
  endDate?: string
): number {
  if (!startDate || !endDate) return 0
  if (periodType === 'monthly') {
    return getMonthRangesBetween(startDate, endDate).length
  }
  return getWeekRangesBetween(startDate, endDate).length
}

function resolveBounds(startDate?: string, endDate?: string): { start?: string; end?: string } {
  if (!startDate && !endDate) return {}
  const today = getTodayString()
  const start = startDate ?? endDate ?? today
  const end = endDate ?? startDate ?? today
  if (start <= end) {
    return { start, end }
  }
  return { start: end, end: start }
}

export async function resolveProjectWindow(
  project: {
    startDate?: string
    endDate?: string
    focusWeekIds?: string[]
    focusMonthIds?: string[]
  },
  cadence?: TrackerCadence
): Promise<DateWindow> {
  const focusWeekIds = project.focusWeekIds ?? []
  const focusMonthIds = project.focusMonthIds ?? []

  let periodType: TrackerCadence = cadence ?? 'weekly'

  if (cadence === 'monthly' || cadence === 'weekly') {
    periodType = cadence
  } else if (focusMonthIds.length > 0 && focusWeekIds.length === 0) {
    periodType = 'monthly'
  }

  let ranges: IsoDateRange[] = []

  if (periodType === 'weekly' && focusWeekIds.length > 0) {
    const plans = await loadWeeklyPlansByIds(focusWeekIds)
    ranges = buildRangesFromPlans(plans as Array<{ startDate: string; endDate: string }>)
  } else if (periodType === 'monthly' && focusMonthIds.length > 0) {
    const plans = await loadMonthlyPlansByIds(focusMonthIds)
    ranges = buildRangesFromPlans(plans as Array<{ startDate: string; endDate: string }>)
  } else if (focusWeekIds.length > 0) {
    const plans = await loadWeeklyPlansByIds(focusWeekIds)
    ranges = buildRangesFromPlans(plans as Array<{ startDate: string; endDate: string }>)
    periodType = 'weekly'
  } else if (focusMonthIds.length > 0) {
    const plans = await loadMonthlyPlansByIds(focusMonthIds)
    ranges = buildRangesFromPlans(plans as Array<{ startDate: string; endDate: string }>)
    periodType = 'monthly'
  }

  const bounds = resolveBounds(project.startDate, project.endDate)
  const periodCount =
    ranges.length > 0
      ? ranges.length
      : computePeriodCountFromBounds(periodType, bounds.start, bounds.end)

  return {
    startDate: bounds.start,
    endDate: bounds.end,
    ranges,
    periodType,
    periodCount,
  }
}

function getCurrentPeriodRange(
  cadence: TrackerCadence,
  referenceDate: Date = new Date()
): IsoDateRange {
  if (cadence === 'monthly') {
    const range = getMonthRange(referenceDate)
    return {
      startDate: toLocalISODateString(range.start),
      endDate: toLocalISODateString(range.end),
    }
  }
  const range = getWeekRange(referenceDate)
  return {
    startDate: toLocalISODateString(range.start),
    endDate: toLocalISODateString(range.end),
  }
}

function getRollingPeriods(
  cadence: TrackerCadence,
  count: number,
  referenceDate: Date = new Date()
): IsoDateRange[] {
  const ranges: IsoDateRange[] = []
  let cursor = new Date(referenceDate)

  for (let i = 0; i < count; i += 1) {
    const range = getCurrentPeriodRange(cadence, cursor)
    ranges.unshift(range)
    if (cadence === 'monthly') {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
    } else {
      cursor = new Date(cursor)
      cursor.setDate(cursor.getDate() - 7)
    }
  }

  return ranges
}

function buildPeriodLabel(range: IsoDateRange, cadence: TrackerCadence): string {
  if (cadence === 'monthly') {
    const monthStart = parseLocalISODate(range.startDate)
    return monthStart.toLocaleDateString('en-US', { month: 'short' })
  }
  return formatPeriodDateRangeNoYear(range.startDate, range.endDate)
}

function uniqueSortedRanges(ranges: IsoDateRange[]): IsoDateRange[] {
  const byStartDate = new Map<string, IsoDateRange>()
  for (const range of ranges) {
    if (!byStartDate.has(range.startDate)) {
      byStartDate.set(range.startDate, range)
    }
  }
  return Array.from(byStartDate.values()).sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function filterHistoricalRanges(ranges: IsoDateRange[], cadence: TrackerCadence): IsoDateRange[] {
  const currentRange = getCurrentPeriodRange(cadence)
  return ranges.filter((range) => range.startDate < currentRange.startDate)
}

function getWindowBounds(ranges: IsoDateRange[]): { startDate: string; endDate: string } | null {
  if (ranges.length === 0) return null
  const sorted = uniqueSortedRanges(ranges)
  return {
    startDate: sorted[0].startDate,
    endDate: sorted[sorted.length - 1].endDate,
  }
}

function buildScopedSubRanges(
  cadence: TrackerCadence,
  bounds: { startDate: string; endDate: string }
): IsoDateRange[] {
  return cadence === 'monthly'
    ? getMonthRangesBetween(bounds.startDate, bounds.endDate)
    : getWeekRangesBetween(bounds.startDate, bounds.endDate)
}

function buildHistoricalFallbackRanges(cadence: TrackerCadence): IsoDateRange[] {
  const count = cadence === 'monthly' ? 3 : 6
  const cursor = new Date()
  if (cadence === 'monthly') {
    cursor.setMonth(cursor.getMonth() - 1)
  } else {
    cursor.setDate(cursor.getDate() - 7)
  }
  return uniqueSortedRanges(filterHistoricalRanges(getRollingPeriods(cadence, count, cursor), cadence))
}

// ============================================================================
// Project Trend Resolution
// ============================================================================

/**
 * Resolve the trend date ranges for a project's compliance bars.
 *
 * Resolution order:
 * 1. Weekly cadence + focusWeekIds => explicit weekly focus windows.
 * 2. Month links (focusMonthIds first, then monthIds) => derive weekly/monthly windows.
 * 3. Optional project start/end bounds => derive windows.
 * 4. Blind rolling fallback.
 *
 * Returned trend ranges are always historical only (strictly before current period).
 */
export async function resolveProjectTrendRanges(
  project: {
    monthIds?: string[]
    focusMonthIds?: string[]
    focusWeekIds?: string[]
    startDate?: string
    endDate?: string
  },
  cadence: TrackerCadence,
  options?: {
    trackerId?: string
  }
): Promise<{ ranges: IsoDateRange[]; dateRangeLabel: string | null }> {
  const focusWeekIds = project.focusWeekIds ?? []
  if (cadence === 'weekly' && focusWeekIds.length > 0) {
    const weekPlans = await loadWeeklyPlansByIds(focusWeekIds)
    const hasExplicitSelections = hasExplicitTrackerSelections(weekPlans)
    const trackerId = options?.trackerId
    const scopedWeekPlans =
      trackerId && hasExplicitSelections
        ? weekPlans.filter((plan) => planIncludesTracker(plan, trackerId))
        : weekPlans

    const weekRanges = buildRangesFromPlans(scopedWeekPlans)
    const sortedWeeks = uniqueSortedRanges(weekRanges)

    // If the project has focus weeks with explicit tracker selection and this tracker
    // is not selected for any of them, return no history rather than unrelated month ranges.
    if (
      trackerId &&
      hasExplicitSelections &&
      sortedWeeks.length === 0 &&
      weekPlans.length > 0
    ) {
      return { ranges: [], dateRangeLabel: null }
    }

    if (sortedWeeks.length > 0) {
      const bounds = getWindowBounds(sortedWeeks)
      const historicalWeeks = uniqueSortedRanges(filterHistoricalRanges(sortedWeeks, cadence))
      if (historicalWeeks.length > 0) {
        return {
          ranges: historicalWeeks,
          dateRangeLabel: bounds ? formatPeriodDateRange(bounds.startDate, bounds.endDate) : null,
        }
      }

      if (trackerId && hasExplicitSelections) {
        return {
          ranges: [],
          dateRangeLabel: bounds ? formatPeriodDateRange(bounds.startDate, bounds.endDate) : null,
        }
      }

      // No historical focus-week ranges (for example, only current/future selected):
      // allow broader project scope fallbacks (month links, explicit bounds).
    }
  }

  const linkedMonthIds =
    project.focusMonthIds && project.focusMonthIds.length > 0
      ? project.focusMonthIds
      : (project.monthIds ?? [])

  if (linkedMonthIds.length > 0) {
    const monthPlans = await loadMonthlyPlansByIds(linkedMonthIds)
    const monthRanges = uniqueSortedRanges(
      buildRangesFromPlans(monthPlans as Array<{ startDate: string; endDate: string }>)
    )
    const monthBounds = getWindowBounds(monthRanges)
    if (monthBounds) {
      const subRanges = buildScopedSubRanges(cadence, monthBounds)
      const subRangesFiltered = uniqueSortedRanges(filterHistoricalRanges(subRanges, cadence))
      return {
        ranges: subRangesFiltered,
        dateRangeLabel: formatPeriodDateRange(monthBounds.startDate, monthBounds.endDate),
      }
    }
  }

  const bounds = resolveBounds(project.startDate, project.endDate)
  if (bounds.start && bounds.end) {
    const subRanges = buildScopedSubRanges(cadence, {
      startDate: bounds.start,
      endDate: bounds.end,
    })
    return {
      ranges: uniqueSortedRanges(filterHistoricalRanges(subRanges, cadence)),
      dateRangeLabel: formatPeriodDateRange(bounds.start, bounds.end),
    }
  }

  return { ranges: buildHistoricalFallbackRanges(cadence), dateRangeLabel: null }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute progress for a tracker (by ID) within a date range.
 * Works for project KRs, process trackers, and standalone trackers.
 */
export async function computeTrackerProgressById(
  trackerId: string,
  dateRange?: IsoDateRange
): Promise<TrackerProgressSummary | null> {
  const tracker = await trackerDexieRepository.getById(trackerId)
  if (!tracker) return null

  let periods: TrackerPeriod[]
  if (dateRange) {
    periods = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
      trackerId,
      dateRange.startDate,
      dateRange.endDate
    )
  } else {
    periods = await trackerPeriodDexieRepository.getByTrackerId(trackerId)
  }

  return computeTrackerProgress(tracker, periods, dateRange)
}

/**
 * Compute progress for a tracker within a date range.
 * Accepts the Tracker object directly (avoids re-fetching from DB).
 * Use when the caller already has the tracker loaded (e.g. from the store).
 */
export async function computeTrackerProgressDirect(
  tracker: Tracker,
  dateRange?: IsoDateRange
): Promise<TrackerProgressSummary> {
  let periods: TrackerPeriod[]
  if (dateRange) {
    periods = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
      tracker.id,
      dateRange.startDate,
      dateRange.endDate
    )
  } else {
    periods = await trackerPeriodDexieRepository.getByTrackerId(tracker.id)
  }

  return computeTrackerProgress(tracker, periods, dateRange)
}

/**
 * Compute progress for all Key Results (trackers) on a project.
 */
export async function computeProjectKRsProgress(
  projectId: string,
  dateRange?: IsoDateRange
): Promise<TrackerProgressSummary[]> {
  const trackers = await trackerDexieRepository.getByParent('project', projectId)
  if (trackers.length === 0) return []

  const results: TrackerProgressSummary[] = []
  for (const tracker of trackers) {
    let periods: TrackerPeriod[]
    if (dateRange) {
      periods = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
        tracker.id,
        dateRange.startDate,
        dateRange.endDate
      )
    } else {
      periods = await trackerPeriodDexieRepository.getByTrackerId(tracker.id)
    }
    results.push(computeTrackerProgress(tracker, periods, dateRange))
  }

  return results
}

/**
 * Compute rolling compliance for a tracker over recent periods.
 * Shows how consistently the user has met their target.
 */
export async function computeRollingCompliance(
  trackerId: string,
  cadence: TrackerCadence
): Promise<RollingComplianceSummary | null> {
  const tracker = await trackerDexieRepository.getById(trackerId)
  if (!tracker) return null

  const periodCount = cadence === 'monthly' ? 3 : 6
  const ranges = getRollingPeriods(cadence, periodCount)

  const periodSummaries: CompliancePeriodSummary[] = []

  for (const range of ranges) {
    const periods = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
      trackerId,
      range.startDate,
      range.endDate
    )
    const progress = computeTrackerProgress(tracker, periods, range)
    const ratio =
      progress.percent != null
        ? clampRatio(progress.percent / 100)
        : tracker.type === 'count'
          ? (progress.numerator ?? 0) > 0
            ? 1
            : 0
          : 0
    periodSummaries.push({
      startDate: range.startDate,
      endDate: range.endDate,
      ratio,
      isComplete: ratio >= 1,
      label: buildPeriodLabel(range, cadence),
    })
  }

  const successCount = periodSummaries.filter((p) => p.isComplete).length
  const totalPeriods = periodSummaries.length
  const successRatio = totalPeriods > 0 ? successCount / totalPeriods : 0

  return {
    trackerId,
    cadence,
    periods: periodSummaries,
    successRatio,
    successCount,
    totalPeriods,
  }
}
