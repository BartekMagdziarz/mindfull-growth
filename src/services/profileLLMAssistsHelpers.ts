/**
 * Profile LLM assist helpers — small, purely-functional utilities used by
 * the psychological-profile build pipeline. Kept separate from
 * `profileLLMAssists.ts` so the heavy prompt/parser file stays focused.
 *
 * Contents:
 *   - `summariseExerciseSession(bundle)` — picks the most meaningful
 *     free-text field from an exercise session row and produces a short
 *     one-line summary.
 *   - `extractWeeklyRatings(reflection)` / `extractMonthlyRatings(reflection)` —
 *     pull only the numeric rating fields into a plain record.
 *   - `buildPlanningSnapshot()` — reads goals / key results / habits / trackers
 *     directly from the repositories and returns a compact bulleted summary
 *     of what's currently active.
 */

import type {
  MonthlyReflection,
  WeeklyReflection,
} from '@/domain/reflection'
import {
  MONTHLY_RATING_KEYS,
  WEEKLY_CONTEXT_KEYS,
  WEEKLY_EVALUATION_KEYS,
  WEEKLY_STATE_KEYS,
} from '@/domain/reflection'
import type {
  Habit,
  KeyResult,
  PlanningCadence,
  Priority,
  PriorityClosingReflection,
  Tracker,
} from '@/domain/planning'
import type { DayRef, PeriodRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  buildMeasurementSummary,
  EXECUTION_METRICS_MAX_PERIODS,
  ON_TRACK_BANDS,
  TRACKER_TREND_DEADBAND_PCT,
  type MeasurementPeriodRef,
} from '@/services/measurementProgress'
import {
  addDaysToDayRef,
  comparePeriodRefs,
  getNextPeriod,
  getPeriodRefsForDate,
} from '@/utils/periods'
import type { ExerciseSessionBundle } from '@/services/reflectionDataQueries'
import type {
  ShadowBeliefs,
  TransformativePurpose,
  ValueMap,
  ValueMapCustomValue,
  ValuesDiscovery,
} from '@/domain/exercises'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type {
  AssessmentAttempt,
  AssessmentId,
  ScaleScore,
} from '@/domain/assessments'
import type { FoundationItemId } from '@/services/foundationCompleteness'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useValueMapStore } from '@/stores/valueMap.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useAssessmentStore } from '@/stores/assessment.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import type { LifeArea } from '@/domain/lifeArea'
import valueCatalog from '@/data/valueCatalog.json'
import { messages } from '@/locales'

// ---------------------------------------------------------------------------
// Exercise summariser
// ---------------------------------------------------------------------------

/**
 * Field names in priority order — the first non-empty string value from a
 * session row is used as the body of the summary. Kept deliberately short;
 * Story 4 does not attempt per-exercise bespoke summarisation (that's a
 * future improvement called out in "Out of scope").
 */
const MEANINGFUL_FIELDS = [
  'situation',
  'hotThought',
  'freeformReflection',
  'reflection',
  'note',
  'notes',
  'insights',
  'insight',
  'description',
  'body',
  'content',
  'question',
] as const

function firstMeaningfulString(raw: Record<string, unknown>): string | null {
  for (const key of MEANINGFUL_FIELDS) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function dateOnly(iso: string): string {
  // Take just the "YYYY-MM-DD" part, tolerant of malformed timestamps.
  const idx = iso.indexOf('T')
  return idx >= 0 ? iso.slice(0, idx) : iso
}

/**
 * Produces a single-line summary `"<type> on <date>. <firstMeaningfulField>"`
 * (or a fallback when no free-text is recorded). Used to build the
 * `[EXERCISE SESSIONS]` block of the profile prompt payload.
 */
export function summariseExerciseSession(bundle: ExerciseSessionBundle): string {
  const date = dateOnly(bundle.createdAt)
  const body = firstMeaningfulString(bundle.raw)
  if (!body) {
    return `${bundle.type} on ${date}. (no free-text details recorded)`
  }
  return `${bundle.type} on ${date}. ${body}`
}

// ---------------------------------------------------------------------------
// Weekly / monthly rating extractors
// ---------------------------------------------------------------------------

/**
 * Returns a plain `{ key: number | null }` record with just the numeric
 * rating fields for a weekly reflection. Keys preserve the domain names so
 * the LLM can interpret them (they're already descriptive).
 */
export function extractWeeklyRatings(
  reflection: WeeklyReflection,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const key of [
    ...WEEKLY_CONTEXT_KEYS,
    ...WEEKLY_STATE_KEYS,
    ...WEEKLY_EVALUATION_KEYS,
  ]) {
    out[key] = reflection[key]
  }
  return out
}

/**
 * Returns a plain `{ key: number | null }` record with just the numeric
 * rating fields for a monthly reflection.
 */
export function extractMonthlyRatings(
  reflection: MonthlyReflection,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const key of MONTHLY_RATING_KEYS) {
    out[key] = reflection[key]
  }
  return out
}

// ---------------------------------------------------------------------------
// Planning snapshot
// ---------------------------------------------------------------------------

export interface PlanningSnapshot {
  activeGoals: Array<{ id: string; title: string; status: string }>
  activeKeyResults: Array<{ id: string; title: string; goalId: string; status: string }>
  activeHabits: Array<{ id: string; title: string; status: string; isActive: boolean }>
  activeTrackers: Array<{ id: string; title: string; status: string; isActive: boolean }>
  priorities: {
    active: Priority[]
    paused: Priority[]
    closed: Priority[]
  }
  /** Bulleted, human-readable summary suitable for dropping straight into a prompt. */
  snapshot: string
}

/**
 * Safe wrapper around a repository `listAll()` call that returns an empty
 * array on error so planning snapshot failures never block profile builds.
 */
async function safeListAll<T>(
  label: string,
  fn: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await fn()
  } catch (err) {
    console.warn(`buildPlanningSnapshot: failed to load ${label}`, err)
    return []
  }
}

async function safeListMeasurementEntriesForDayRange(
  startDayRef: DayRef,
  endDayRef: DayRef,
): Promise<DailyMeasurementEntry[]> {
  try {
    return await planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(
      startDayRef,
      endDayRef,
    )
  } catch (err) {
    console.warn('buildPlanningSnapshot: failed to load measurement entries', err)
    return []
  }
}

export type ExecutionOnTrackStatus = 'ahead' | 'on-track' | 'behind' | 'no-data'
export type TrackerTrend = 'rising' | 'flat' | 'falling'

export interface HabitExecutionMetrics {
  habitId: string
  cadence: PlanningCadence
  currentStreak: number
  completionRate30d: number
  completionRate90d: number
  lastCompletedAt?: string
}

export interface KRExecutionMetrics {
  keyResultId: string
  cadence: PlanningCadence
  progressFraction?: number
  currentValue?: number
  targetValue?: number
  onTrack: ExecutionOnTrackStatus
  lastEntryAt?: string
}

export interface TrackerExecutionMetrics {
  trackerId: string
  cadence: PlanningCadence
  avg30d?: number
  avg90d?: number
  trend: TrackerTrend
  entryCount30d: number
}

function compareEntries(left: DailyMeasurementEntry, right: DailyMeasurementEntry): number {
  return (
    left.dayRef.localeCompare(right.dayRef) ||
    left.updatedAt.localeCompare(right.updatedAt) ||
    left.createdAt.localeCompare(right.createdAt)
  )
}

function latestEntry(entries: DailyMeasurementEntry[]): DailyMeasurementEntry | undefined {
  return [...entries].sort(compareEntries).at(-1)
}

function getDayRefForDate(date: Date): DayRef {
  return getPeriodRefsForDate(date).day
}

function maxDayRef(left: DayRef, right: DayRef): DayRef {
  return left.localeCompare(right) >= 0 ? left : right
}

function isWithinDayRange(entry: DailyMeasurementEntry, startDayRef: DayRef, endDayRef: DayRef): boolean {
  return entry.dayRef.localeCompare(startDayRef) >= 0 && entry.dayRef.localeCompare(endDayRef) <= 0
}

function getMeasurementPeriodRef(dayRef: DayRef, cadence: PlanningCadence): MeasurementPeriodRef {
  const refs = getPeriodRefsForDate(dayRef)
  return cadence === 'monthly' ? refs.month : refs.week
}

function getCurrentMeasurementPeriodRef(
  cadence: PlanningCadence,
  now: Date,
): MeasurementPeriodRef {
  return getMeasurementPeriodRef(getDayRefForDate(now), cadence)
}

function getCadencePeriodRefsInDayRange(
  cadence: PlanningCadence,
  startDayRef: DayRef,
  endDayRef: DayRef,
): MeasurementPeriodRef[] {
  if (startDayRef.localeCompare(endDayRef) > 0) return []

  const refs: MeasurementPeriodRef[] = []
  let current = getMeasurementPeriodRef(startDayRef, cadence)
  const endPeriod = getMeasurementPeriodRef(endDayRef, cadence)

  while (comparePeriodRefs(current, endPeriod) <= 0) {
    refs.push(current)
    current = getNextPeriod(current as PeriodRef) as MeasurementPeriodRef
  }

  return refs
}

function filterEntriesForPeriod(
  entries: DailyMeasurementEntry[],
  cadence: PlanningCadence,
  periodRef: MeasurementPeriodRef,
): DailyMeasurementEntry[] {
  return entries.filter((entry) => getMeasurementPeriodRef(entry.dayRef, cadence) === periodRef)
}

function completionRateForWindow(
  habit: Habit,
  entries: DailyMeasurementEntry[],
  now: Date,
  days: number,
): number {
  const today = getDayRefForDate(now)
  const windowStart = addDaysToDayRef(today, -(days - 1))
  const createdAt = dateOnly(habit.createdAt) as DayRef
  const startDayRef = maxDayRef(windowStart, createdAt)
  const periodRefs = getCadencePeriodRefsInDayRange(habit.cadence, startDayRef, today)
  if (periodRefs.length === 0) return 0

  const metCount = periodRefs.filter((periodRef) => (
    buildMeasurementSummary(habit, entries, periodRef).evaluationStatus === 'met'
  )).length

  return metCount / periodRefs.length
}

function latestMetDayRef(
  subject: Habit,
  entries: DailyMeasurementEntry[],
  periodRefs: MeasurementPeriodRef[],
): DayRef | undefined {
  let latest: DayRef | undefined
  for (const periodRef of periodRefs) {
    const summary = buildMeasurementSummary(subject, entries, periodRef)
    if (summary.evaluationStatus !== 'met') continue

    const latestPeriodEntry = latestEntry(filterEntriesForPeriod(entries, subject.cadence, periodRef))
    if (latestPeriodEntry && (!latest || latestPeriodEntry.dayRef.localeCompare(latest) > 0)) {
      latest = latestPeriodEntry.dayRef
    }
  }
  return latest
}

function currentStreakForHabit(
  habit: Habit,
  entries: DailyMeasurementEntry[],
  now: Date,
): number {
  const today = getDayRefForDate(now)
  const startDayRef = addDaysToDayRef(today, -89)
  const periodRefs = getCadencePeriodRefsInDayRange(habit.cadence, startDayRef, today)
  if (periodRefs.length === 0) return 0

  const currentPeriodRef = getCurrentMeasurementPeriodRef(habit.cadence, now)
  let index = periodRefs.findIndex((periodRef) => periodRef === currentPeriodRef)
  if (index < 0) index = periodRefs.length - 1

  const currentSummary = buildMeasurementSummary(habit, entries, periodRefs[index])
  if (currentSummary.evaluationStatus !== 'met') {
    index -= 1
  }

  let streak = 0
  for (let i = index; i >= 0; i -= 1) {
    const summary = buildMeasurementSummary(habit, entries, periodRefs[i])
    if (summary.evaluationStatus !== 'met') break
    streak += 1
  }
  return streak
}

export function computeHabitExecutionMetrics(
  habit: Habit,
  entries: DailyMeasurementEntry[],
  now: Date = new Date(),
): HabitExecutionMetrics {
  const sortedEntries = [...entries].sort(compareEntries)
  const today = getDayRefForDate(now)
  const periodRefs90d = getCadencePeriodRefsInDayRange(habit.cadence, addDaysToDayRef(today, -89), today)

  return {
    habitId: habit.id,
    cadence: habit.cadence,
    currentStreak: currentStreakForHabit(habit, sortedEntries, now),
    completionRate30d: completionRateForWindow(habit, sortedEntries, now, 30),
    completionRate90d: completionRateForWindow(habit, sortedEntries, now, 90),
    lastCompletedAt: latestMetDayRef(habit, sortedEntries, periodRefs90d),
  }
}

function onTrackStatusFromRatio(ratio: number): ExecutionOnTrackStatus {
  if (ratio >= ON_TRACK_BANDS.AHEAD) return 'ahead'
  if (ratio >= ON_TRACK_BANDS.ON_TRACK) return 'on-track'
  return 'behind'
}

export function computeKRExecutionMetrics(
  kr: KeyResult,
  entries: DailyMeasurementEntry[],
  now: Date = new Date(),
): KRExecutionMetrics {
  const sortedEntries = [...entries].sort(compareEntries)
  const today = getDayRefForDate(now)
  const periodRefs = getCadencePeriodRefsInDayRange(kr.cadence, addDaysToDayRef(today, -89), today)
    .slice(-EXECUTION_METRICS_MAX_PERIODS)
  const currentPeriodRef = getCurrentMeasurementPeriodRef(kr.cadence, now)
  const currentSummary = buildMeasurementSummary(kr, sortedEntries, currentPeriodRef)
  const targetValue = kr.entryMode === 'value' && kr.target.kind === 'value' ? kr.target.value : undefined
  const currentValue = targetValue === undefined ? undefined : currentSummary.actualValue
  const progressFraction =
    targetValue !== undefined && targetValue !== 0 && currentValue !== undefined
      ? currentValue / targetValue
      : undefined

  const hasEntriesInWindow = sortedEntries.some((entry) => isWithinDayRange(entry, addDaysToDayRef(today, -89), today))
  const metCount = periodRefs.filter((periodRef) => (
    buildMeasurementSummary(kr, sortedEntries, periodRef).evaluationStatus === 'met'
  )).length
  const onTrack = hasEntriesInWindow && periodRefs.length > 0
    ? onTrackStatusFromRatio(metCount / periodRefs.length)
    : 'no-data'

  return {
    keyResultId: kr.id,
    cadence: kr.cadence,
    progressFraction,
    currentValue,
    targetValue,
    onTrack,
    lastEntryAt: latestEntry(sortedEntries)?.dayRef,
  }
}

function averageNumericEntries(entries: DailyMeasurementEntry[]): number | undefined {
  const values = entries.flatMap((entry) => (typeof entry.value === 'number' ? [entry.value] : []))
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function numericEntryCount(entries: DailyMeasurementEntry[]): number {
  return entries.filter((entry) => typeof entry.value === 'number').length
}

function trackerTypicalRange(tracker: Tracker): number {
  if (
    tracker.entryMode === 'rating' &&
    typeof tracker.ratingScale === 'number' &&
    typeof tracker.ratingScaleMin === 'number' &&
    tracker.ratingScale > tracker.ratingScaleMin
  ) {
    return tracker.ratingScale - tracker.ratingScaleMin
  }
  return 5
}

export function computeTrackerExecutionMetrics(
  tracker: Tracker,
  entries: DailyMeasurementEntry[],
  now: Date = new Date(),
): TrackerExecutionMetrics {
  const sortedEntries = [...entries].sort(compareEntries)
  const today = getDayRefForDate(now)
  const start30d = addDaysToDayRef(today, -29)
  const start90d = addDaysToDayRef(today, -89)
  const entries30d = sortedEntries.filter((entry) => isWithinDayRange(entry, start30d, today))
  const entries90d = sortedEntries.filter((entry) => isWithinDayRange(entry, start90d, today))
  const baselineEntries = sortedEntries.filter((entry) => (
    entry.dayRef.localeCompare(start90d) >= 0 && entry.dayRef.localeCompare(start30d) < 0
  ))
  const avg30d = averageNumericEntries(entries30d)
  const avg90d = averageNumericEntries(entries90d)
  let trend: TrackerTrend = 'flat'

  if (
    avg30d !== undefined &&
    avg90d !== undefined &&
    numericEntryCount(entries30d) >= 3 &&
    numericEntryCount(baselineEntries) >= 3
  ) {
    const diff = avg30d - avg90d
    const deadband = TRACKER_TREND_DEADBAND_PCT * trackerTypicalRange(tracker)
    if (Math.abs(diff) > deadband) {
      trend = diff > 0 ? 'rising' : 'falling'
    }
  }

  return {
    trackerId: tracker.id,
    cadence: tracker.cadence,
    avg30d,
    avg90d,
    trend,
    entryCount30d: entries30d.length,
  }
}

function formatBulletSection(title: string, items: string[]): string {
  if (items.length === 0) return ''
  const header = `${title}:`
  const lines = items.map((t) => `- ${t}`)
  return [header, ...lines].join('\n')
}

function formatPriority(priority: Priority): string {
  const lines = [`[${priority.years.join(', ')}] ${priority.title}`]
  const fields: Array<[string, string | undefined]> = [
    ['Direction', priority.desiredDirection],
    ['Why now', priority.whyNow],
    ['Tradeoffs', priority.tradeoffs],
  ]
  for (const [label, value] of fields) {
    const trimmed = value?.trim()
    if (trimmed) lines.push(`  ${label}: ${trimmed}`)
  }
  if (priority.progressSignals.length > 0) {
    lines.push(`  Progress signals: ${priority.progressSignals.join('; ')}`)
  }
  if (priority.riskSignals.length > 0) {
    lines.push(`  Risk signals: ${priority.riskSignals.join('; ')}`)
  }
  return lines.join('\n')
}

function formatClosingReflection(reflection: PriorityClosingReflection): string[] {
  const fields: Array<[string, string | undefined]> = [
    ['Summary', reflection.summary],
    ['Worked well', reflection.workedWell],
    ['Was difficult', reflection.wasDifficult],
    ['Learned', reflection.learned],
  ]
  return fields.flatMap(([label, value]) => {
    const trimmed = value?.trim()
    return trimmed ? [`  ${label}: ${trimmed}`] : []
  })
}

function formatClosedPriority(priority: Priority): string {
  const lines = [`[${priority.years.join(', ')}] ${priority.title}`]
  if (priority.closingReflection) {
    lines.push(...formatClosingReflection(priority.closingReflection))
  }
  return lines.join('\n')
}

function compareActivePriorities(left: Priority, right: Priority): number {
  return (
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
    left.title.localeCompare(right.title)
  )
}

function compareClosedPriorities(left: Priority, right: Priority): number {
  const leftDate = left.closingReflection?.closedAt ?? left.updatedAt
  const rightDate = right.closingReflection?.closedAt ?? right.updatedAt
  return rightDate.localeCompare(leftDate) || left.title.localeCompare(right.title)
}

function measurementEntryKey(subjectType: MeasurementSubjectType, subjectId: string): string {
  return `${subjectType}:${subjectId}`
}

function groupMeasurementEntriesBySubject(
  entries: DailyMeasurementEntry[],
): Map<string, DailyMeasurementEntry[]> {
  const groups = new Map<string, DailyMeasurementEntry[]>()
  for (const entry of entries) {
    const key = measurementEntryKey(entry.subjectType, entry.subjectId)
    const existing = groups.get(key) ?? []
    existing.push(entry)
    groups.set(key, existing)
  }
  return groups
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatOneDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatProgressValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const ON_TRACK_LABELS: Record<ExecutionOnTrackStatus, string> = {
  ahead: 'Ahead',
  'on-track': 'On track',
  behind: 'Behind',
  'no-data': 'No data',
}

function formatHabitForSnapshot(habit: Habit, entries: DailyMeasurementEntry[]): string {
  const lines = [`${habit.title} [habit, ${habit.cadence}]`]
  if (entries.length === 0) return lines.join('\n')

  const metrics = computeHabitExecutionMetrics(habit, entries)
  const fragments = [
    `Streak: ${metrics.currentStreak} ${habit.cadence === 'monthly' ? 'months' : 'weeks'}`,
    `30d completion: ${formatPercent(metrics.completionRate30d)}`,
    metrics.lastCompletedAt ? `Last: ${metrics.lastCompletedAt}` : '',
  ].filter(Boolean)
  if (fragments.length > 0) lines.push(`  ${fragments.join(' * ')}`)
  return lines.join('\n')
}

function formatKRForSnapshot(kr: KeyResult, entries: DailyMeasurementEntry[]): string {
  const lines = [`${kr.title} [key result, ${kr.cadence}]`]
  if (entries.length === 0) return lines.join('\n')

  const metrics = computeKRExecutionMetrics(kr, entries)
  const fragments: string[] = []
  if (
    metrics.currentValue !== undefined &&
    metrics.targetValue !== undefined &&
    metrics.progressFraction !== undefined
  ) {
    fragments.push(
      `Progress: ${formatProgressValue(metrics.currentValue)}/${formatProgressValue(metrics.targetValue)} (${formatPercent(metrics.progressFraction)})`,
    )
  }
  fragments.push(ON_TRACK_LABELS[metrics.onTrack])
  if (metrics.lastEntryAt) fragments.push(`Last entry: ${metrics.lastEntryAt}`)

  if (fragments.length > 0) lines.push(`  ${fragments.join(' * ')}`)
  return lines.join('\n')
}

function formatTrackerForSnapshot(tracker: Tracker, entries: DailyMeasurementEntry[]): string {
  const lines = [`${tracker.title} [tracker, ${tracker.cadence}]`]
  if (entries.length === 0) return lines.join('\n')

  const metrics = computeTrackerExecutionMetrics(tracker, entries)
  const fragments: string[] = []
  if (metrics.avg30d !== undefined) {
    const avg90 = metrics.avg90d !== undefined ? ` (90d: ${formatOneDecimal(metrics.avg90d)})` : ''
    fragments.push(`30d avg: ${formatOneDecimal(metrics.avg30d)}`)
    fragments.push(`trend ${metrics.trend}${avg90}`)
  }
  fragments.push(`${metrics.entryCount30d} entries`)

  if (fragments.length > 0) lines.push(`  ${fragments.join(' * ')}`)
  return lines.join('\n')
}

/**
 * Reads currently-active planning objects from the repositories and returns
 * both a structured view and a bulleted-text snapshot suitable for the
 * `[PLANNING SNAPSHOT]` block of the profile prompt.
 *
 * "Active" rules (matches existing UI filters):
 *   - Goal:     `status === 'open'`
 *   - KeyResult: `status === 'open'`
 *   - Habit:    `status === 'open' && isActive !== false`
 *   - Tracker:  `status === 'open' && isActive !== false`
 */
export async function buildPlanningSnapshot(): Promise<PlanningSnapshot> {
  const todayDayRef = getDayRefForDate(new Date())
  const measurementWindowStart = addDaysToDayRef(todayDayRef, -89)
  const [goals, keyResults, habits, trackers, priorities, measurementEntries] = await Promise.all([
    safeListAll('goals', () => goalDexieRepository.listAll()),
    safeListAll('keyResults', () => keyResultDexieRepository.listAll()),
    safeListAll('habits', () => habitDexieRepository.listAll()),
    safeListAll('trackers', () => trackerDexieRepository.listAll()),
    safeListAll('priorities', () => priorityDexieRepository.listAll()),
    safeListMeasurementEntriesForDayRange(measurementWindowStart, todayDayRef),
  ])

  const activeGoals = goals
    .filter((g) => g.status === 'open')
    .map((g) => ({ id: g.id, title: g.title, status: g.status }))

  const activeKeyResultSubjects = keyResults.filter((kr) => kr.status === 'open')
  const activeKeyResults = activeKeyResultSubjects
    .map((kr) => ({ id: kr.id, title: kr.title, goalId: kr.goalId, status: kr.status }))

  const activeHabitSubjects = habits.filter((h) => h.status === 'open' && h.isActive !== false)
  const activeHabits = activeHabitSubjects
    .map((h) => ({ id: h.id, title: h.title, status: h.status, isActive: h.isActive }))

  const activeTrackerSubjects = trackers.filter((t) => t.status === 'open' && t.isActive !== false)
  const activeTrackers = activeTrackerSubjects
    .map((t) => ({ id: t.id, title: t.title, status: t.status, isActive: t.isActive }))

  const priorityGroups = {
    active: priorities.filter(priority => priority.status === 'active').sort(compareActivePriorities),
    paused: priorities
      .filter(priority => priority.status === 'paused')
      .sort((left, right) => left.title.localeCompare(right.title)),
    closed: priorities.filter(priority => priority.status === 'closed').sort(compareClosedPriorities),
  }
  const entriesBySubject = groupMeasurementEntriesBySubject(measurementEntries)

  const parts = [
    formatBulletSection(
      'Active priorities',
      priorityGroups.active.map(formatPriority),
    ),
    formatBulletSection(
      'Paused priorities',
      priorityGroups.paused.map(formatPriority),
    ),
    formatBulletSection(
      'Closed priority reflections',
      priorityGroups.closed.map(formatClosedPriority),
    ),
    formatBulletSection(
      'Active goals',
      activeGoals.map((g) => g.title),
    ),
    formatBulletSection(
      'Active key results',
      activeKeyResultSubjects.map((kr) => formatKRForSnapshot(
        kr,
        entriesBySubject.get(measurementEntryKey('keyResult', kr.id)) ?? [],
      )),
    ),
    formatBulletSection(
      'Active habits',
      activeHabitSubjects.map((h) => formatHabitForSnapshot(
        h,
        entriesBySubject.get(measurementEntryKey('habit', h.id)) ?? [],
      )),
    ),
    formatBulletSection(
      'Active trackers',
      activeTrackerSubjects.map((t) => formatTrackerForSnapshot(
        t,
        entriesBySubject.get(measurementEntryKey('tracker', t.id)) ?? [],
      )),
    ),
  ].filter((part) => part.length > 0)

  const snapshot = parts.join('\n\n')

  return {
    activeGoals,
    activeKeyResults,
    activeHabits,
    activeTrackers,
    priorities: priorityGroups,
    snapshot,
  }
}

// ---------------------------------------------------------------------------
// Foundation snapshot
// ---------------------------------------------------------------------------

export interface FoundationSnapshotItem {
  id: FoundationItemId
  label: string
  completedAt: string
  body: string
}

export interface FoundationSnapshot {
  items: FoundationSnapshotItem[]
  /** Markdown blocks (one per item) joined by blank lines, ascending by `completedAt`. */
  snapshot: string
}

interface ValueCatalogEntry {
  id: string
  label: { en: string; pl: string }
}

const VALUE_LABELS_EN: Map<string, string> = new Map(
  ((valueCatalog as { values: ValueCatalogEntry[] }).values ?? []).map((value) => [
    value.id,
    value.label.en,
  ]),
)

const ASSESSMENT_LABELS: Record<AssessmentId, string> = {
  'ipip-bfm-50': 'Personality (IPIP-BFM-50)',
  'ipip-neo-120': 'Personality facets (IPIP-NEO-120)',
  'hexaco-60': 'Personality (HEXACO-60)',
  'pvq-40': 'Schwartz values (PVQ-40)',
  vlq: 'Valued living (VLQ)',
}

const ASSESSMENT_IDS: readonly AssessmentId[] = [
  'ipip-bfm-50',
  'ipip-neo-120',
  'hexaco-60',
  'pvq-40',
  'vlq',
] as const

/**
 * Walks the static `messages.en` tree by dotted key. The project has no
 * `vue-i18n` runtime instance — `src/locales/index.ts` only exposes the raw
 * `messages` object — so this is the canonical lookup. Falls back to the
 * last segment (capitalised) when the key cannot be resolved so the LLM
 * still gets a sensible label.
 */
function resolveScaleLabel(labelKey: string): string {
  const parts = labelKey.split('.')
  let node: unknown = messages.en
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part]
    } else {
      node = undefined
      break
    }
  }
  if (typeof node === 'string' && node.length > 0) return node
  const last = parts[parts.length - 1] ?? labelKey
  return last.charAt(0).toUpperCase() + last.slice(1)
}

function resolveValueLabel(
  valueId: string,
  customValues: ValueMapCustomValue[] = [],
): string {
  const catalog = VALUE_LABELS_EN.get(valueId)
  if (catalog) return catalog
  const custom = customValues.find((v) => v.id === valueId)
  if (custom) return custom.label
  return valueId
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '-'
}

function formatValuesDiscovery(entry: ValuesDiscovery): FoundationSnapshotItem {
  const completedAt = entry.createdAt
  const date = dateOnly(completedAt)
  const figures = entry.admirablePeople
    .map((person) => {
      const qualities = person.qualities.filter((q) => q.trim().length > 0)
      return qualities.length > 0
        ? `${person.name} (${qualities.join(', ')})`
        : person.name
    })
    .filter((line) => line.trim().length > 0)
  const lines = [
    `## Values discovery (${date})`,
    `Admired figures: ${figures.length > 0 ? figures.join('; ') : '-'}`,
    `Core values: ${formatList(entry.coreValues)}`,
    `Notes: ${entry.notes?.trim() ? entry.notes.trim() : '-'}`,
  ]
  return {
    id: 'valuesDiscovery',
    label: 'Values discovery',
    completedAt,
    body: lines.join('\n'),
  }
}

function formatValueMap(entry: ValueMap): FoundationSnapshotItem {
  const completedAt = entry.createdAt
  const date = dateOnly(completedAt)
  const sections: string[] = [`## Value map (${date})`]

  const ranked = [...entry.rankedValues].sort((a, b) => a.rank - b.rank).slice(0, 5)
  if (ranked.length > 0) {
    const rankedLines = ranked.map((rv) => {
      const label = resolveValueLabel(rv.valueId, entry.customValues)
      const meaning = rv.personalMeaning?.trim()
      return meaning
        ? `${rv.rank}. ${label} - "${meaning}"`
        : `${rv.rank}. ${label}`
    })
    sections.push(['Top values (ranked):', ...rankedLines].join('\n'))
  }

  if (entry.globalConflicts.length > 0) {
    const conflictLines = entry.globalConflicts.map((c) => {
      const a = resolveValueLabel(c.valueId, entry.customValues)
      const b = resolveValueLabel(c.conflictingValueId, entry.customValues)
      const note = c.note?.trim()
      return note ? `${a} vs ${b} - "${note}"` : `${a} vs ${b}`
    })
    sections.push(['Conflicts:', ...conflictLines].join('\n'))
  }

  if (entry.lifeAreaAssignments.length > 0) {
    // Life-area names are not snapshotted on ValueMap; Story 5 may inject a
    // lookup. For now use the lifeAreaId verbatim — the LLM can still see
    // structure even if the area name is opaque.
    const assignmentLines = entry.lifeAreaAssignments.map((a) => {
      const labels = a.valueIds.map((id) => resolveValueLabel(id, entry.customValues))
      return `${a.lifeAreaId} -> [${labels.join(', ')}]`
    })
    sections.push(['Life-area assignments:', ...assignmentLines].join('\n'))
  }

  return {
    id: 'valueMap',
    label: 'Value map',
    completedAt,
    body: sections.join('\n'),
  }
}

function formatWheelOfLife(entry: LifeAreaAssessment): FoundationSnapshotItem {
  const completedAt = entry.createdAt
  const date = dateOnly(completedAt)
  const lines = [`## Wheel of life (${date})`]
  for (const item of entry.items) {
    const note = item.note?.trim()
    lines.push(
      note
        ? `${item.lifeAreaNameSnapshot}: ${item.score}/10 - "${note}"`
        : `${item.lifeAreaNameSnapshot}: ${item.score}/10`,
    )
  }
  if (entry.notes?.trim()) {
    lines.push(`Overall notes: ${entry.notes.trim()}`)
  }
  return {
    id: 'wheelOfLife',
    label: 'Wheel of life',
    completedAt,
    body: lines.join('\n'),
  }
}

function formatShadowBeliefs(entry: ShadowBeliefs): FoundationSnapshotItem {
  const completedAt = entry.createdAt
  const date = dateOnly(completedAt)
  const sections: string[] = [`## Shadow beliefs (${date})`]

  if (entry.selfSabotagingBeliefs.length > 0) {
    sections.push(
      ['Self-sabotaging:', ...entry.selfSabotagingBeliefs.map((b) => `- ${b}`)].join('\n'),
    )
  }
  if (entry.reframedBeliefs.length > 0) {
    sections.push(
      ['Reframes:', ...entry.reframedBeliefs.map((b) => `- ${b}`)].join('\n'),
    )
  }
  if (entry.adviceToOthers.length > 0) {
    sections.push(
      ['Advice to others:', ...entry.adviceToOthers.map((a) => `- ${a}`)].join('\n'),
    )
  }
  if (entry.notes?.trim()) {
    sections.push(`Notes: ${entry.notes.trim()}`)
  }

  return {
    id: 'shadowBeliefs',
    label: 'Shadow beliefs',
    completedAt,
    body: sections.join('\n'),
  }
}

function formatTransformativePurpose(
  entry: TransformativePurpose,
): FoundationSnapshotItem {
  const completedAt = entry.createdAt
  const date = dateOnly(completedAt)
  const lines = [
    `## Transformative purpose (${date})`,
    `Statement: ${entry.purposeStatement?.trim() ? entry.purposeStatement.trim() : '-'}`,
    `Intersection: ${entry.intersection?.trim() ? entry.intersection.trim() : '-'}`,
    `Curiosities: ${formatList(entry.curiosities)}`,
    `Problems I am drawn to: ${formatList(entry.problems)}`,
  ]
  return {
    id: 'transformativePurpose',
    label: 'Transformative purpose',
    completedAt,
    body: lines.join('\n'),
  }
}

function formatScaleScoreLine(scale: ScaleScore): string {
  const label = resolveScaleLabel(scale.labelKey)
  const score = scale.normalizedMean ?? scale.rawMean
  const band = scale.band ? ` (${scale.band})` : ''
  return `${label}: ${score}${band}`
}

function formatGenericAssessment(
  id: AssessmentId,
  attempt: AssessmentAttempt,
): FoundationSnapshotItem {
  const completedAt = attempt.completedAt ?? attempt.createdAt
  const date = dateOnly(completedAt)
  const label = ASSESSMENT_LABELS[id]
  const scales = (attempt.computedScales ?? []).filter(
    (s) => s.normalizedMean !== null || s.rawMean !== null,
  )
  const lines = [`## ${label} (${date})`, ...scales.map(formatScaleScoreLine)]
  return { id, label, completedAt, body: lines.join('\n') }
}

function formatPvq40Assessment(attempt: AssessmentAttempt): FoundationSnapshotItem {
  const completedAt = attempt.completedAt ?? attempt.createdAt
  const date = dateOnly(completedAt)
  const label = ASSESSMENT_LABELS['pvq-40']
  const scales = attempt.computedScales ?? []
  const scoredScales = scales.filter((s) => s.normalizedMean !== null)

  const labelByScaleId = new Map(scales.map((s) => [s.scaleId, resolveScaleLabel(s.labelKey)]))

  const summaryTopValues = attempt.overallSummary?.topValues ?? []
  const topThreeIds = summaryTopValues.length > 0
    ? summaryTopValues.slice(0, 3).map((tv) => tv.scaleId)
    : [...scoredScales]
        .sort((a, b) => (b.normalizedMean ?? 0) - (a.normalizedMean ?? 0))
        .slice(0, 3)
        .map((s) => s.scaleId)

  const bottomThreeIds = [...scoredScales]
    .sort((a, b) => (a.normalizedMean ?? 0) - (b.normalizedMean ?? 0))
    .slice(0, 3)
    .map((s) => s.scaleId)

  const topLabels = topThreeIds.map((id) => labelByScaleId.get(id) ?? id)
  const bottomLabels = bottomThreeIds.map((id) => labelByScaleId.get(id) ?? id)

  const sections: string[] = [`## ${label} (${date})`]
  if (topLabels.length > 0) sections.push(`Top 3: ${topLabels.join(', ')}`)
  if (bottomLabels.length > 0) sections.push(`Bottom 3: ${bottomLabels.join(', ')}`)
  if (scoredScales.length > 0) {
    sections.push(['All:', ...scoredScales.map(formatScaleScoreLine)].join('\n'))
  }

  return { id: 'pvq-40', label, completedAt, body: sections.join('\n') }
}

function formatVlqAssessment(attempt: AssessmentAttempt): FoundationSnapshotItem {
  const completedAt = attempt.completedAt ?? attempt.createdAt
  const date = dateOnly(completedAt)
  const label = ASSESSMENT_LABELS.vlq
  const scales = attempt.computedScales ?? []

  const lines: Array<{ gap: number; line: string }> = []
  for (const scale of scales) {
    const importance = scale.details?.importance
    const consistency = scale.details?.consistency
    const gap = scale.details?.gap
    if (
      typeof importance !== 'number' ||
      typeof consistency !== 'number' ||
      typeof gap !== 'number'
    ) {
      continue
    }
    const scaleLabel = resolveScaleLabel(scale.labelKey)
    lines.push({
      gap,
      line: `${scaleLabel}: importance ${importance}, consistency ${consistency} (gap: ${gap})`,
    })
  }
  lines.sort((a, b) => b.gap - a.gap)

  const body = [`## ${label} (${date})`, ...lines.map((entry) => entry.line)].join('\n')
  return { id: 'vlq', label, completedAt, body }
}

async function formatAssessment(
  id: AssessmentId,
  attempt: AssessmentAttempt,
): Promise<FoundationSnapshotItem> {
  if (id === 'pvq-40') return formatPvq40Assessment(attempt)
  if (id === 'vlq') return formatVlqAssessment(attempt)
  return formatGenericAssessment(id, attempt)
}

/**
 * Builds the `[FOUNDATION SNAPSHOT]` block content for the profile prompt.
 * Reads the latest completed entry of each of the ten foundation exercises
 * from their respective Pinia stores (already hydrated at app boot) and
 * concatenates them in ascending `completedAt` order.
 *
 * Returns `{ items, snapshot }` where `items` is the structured per-tile
 * list and `snapshot` is the markdown string suitable for direct injection.
 * When no foundation data exists, returns `{ items: [], snapshot: '' }` so
 * the caller can decide whether to emit the block at all.
 */
export async function buildFoundationSnapshot(): Promise<FoundationSnapshot> {
  const items: FoundationSnapshotItem[] = []

  const valuesDiscovery = useValuesDiscoveryStore().latestDiscovery
  if (valuesDiscovery) items.push(formatValuesDiscovery(valuesDiscovery))

  const valueMap = useValueMapStore().latestMap
  if (valueMap) items.push(formatValueMap(valueMap))

  const wheel = useLifeAreaAssessmentStore().latestAssessment
  if (wheel) items.push(formatWheelOfLife(wheel))

  const shadow = useShadowBeliefsStore().latestBeliefs
  if (shadow) items.push(formatShadowBeliefs(shadow))

  const purpose = useTransformativePurposeStore().latestPurpose
  if (purpose) items.push(formatTransformativePurpose(purpose))

  const assessmentStore = useAssessmentStore()
  for (const assessmentId of ASSESSMENT_IDS) {
    const completed = assessmentStore.getLatestCompletedAttemptFromState(assessmentId)
    if (completed?.completedAt) {
      items.push(await formatAssessment(assessmentId, completed))
    }
  }

  items.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const snapshot = items.map((it) => it.body).join('\n\n')
  return { items, snapshot }
}

// ---------------------------------------------------------------------------
// Life areas snapshot
// ---------------------------------------------------------------------------

export interface LifeAreaSnapshotItem {
  id: string
  name: string
  body: string
}

export interface LifeAreasSnapshot {
  items: LifeAreaSnapshotItem[]
  /** Markdown blocks (one per active area) joined by blank lines, in `sortOrder` ascending. */
  snapshot: string
}

/**
 * Build the [LIFE AREAS] block: one markdown sub-block per active life area,
 * in `sortOrder` ascending. Inactive areas are excluded. Areas with an empty
 * `name` are skipped (data-integrity guard — emitting a headerless block is
 * worse than dropping the row).
 *
 * Synchronous: the life-area store is loaded at boot, so no DB round-trip is
 * needed here.
 */
export function buildLifeAreasSnapshot(): LifeAreasSnapshot {
  const lifeAreas = useLifeAreaStore()
    .lifeAreas.filter((a) => a.isActive && a.name.trim().length > 0)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const items: LifeAreaSnapshotItem[] = lifeAreas.map((area) => ({
    id: area.id,
    name: area.name,
    body: formatLifeArea(area),
  }))

  const snapshot = items.map((it) => it.body).join('\n\n')
  return { items, snapshot }
}

function formatLifeArea(a: LifeArea): string {
  const signalsBlock =
    a.reflectionSignals.length > 0
      ? `  Reflection signals:\n${a.reflectionSignals.map((s) => `    - ${s}`).join('\n')}`
      : ''
  const sections = [
    `- ${a.name}`,
    a.meaning ? `  Meaning: ${a.meaning}` : '',
    a.desiredState ? `  Desired state: ${a.desiredState}` : '',
    a.typicalRisks ? `  Risks: ${a.typicalRisks}` : '',
    signalsBlock,
  ].filter(Boolean)
  return sections.join('\n')
}

export const __test__ = {
  resolveScaleLabel,
  resolveValueLabel,
  formatValuesDiscovery,
  formatValueMap,
  formatWheelOfLife,
  formatShadowBeliefs,
  formatTransformativePurpose,
  formatGenericAssessment,
  formatPvq40Assessment,
  formatVlqAssessment,
  formatAssessment,
  formatLifeArea,
}
