import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { LoadStatePair } from '@/domain/loadState'
import { weekPointLabel, type AreaSeries } from '@/domain/loadStateSeries'
import { REFLECTION_MATRIX_AREAS, type LifeAreaKey } from '@/domain/reflectionMatrix'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject } from '@/services/measurementProgress'
import { multiCompletionDayPoints } from '@/services/measurementProgress'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'

/**
 * Pure view-model helpers for the quiet ritual (UX Lab variant "02 · Spokojny
 * rytuał"). Everything here is a projection over already-loaded planning state
 * — no repository or service calls — so the ritual's reading of the week/month
 * can be unit-tested without a database.
 */

export const SUBJECT_ICON: Record<MeasurementSubjectType, string> = {
  keyResult: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  weeklyIntention: 'gps_fixed',
}

export const SUBJECT_LABEL: Record<MeasurementSubjectType, string> = {
  keyResult: 'Rezultat',
  habit: 'Nawyk',
  tracker: 'Tracker',
  weeklyIntention: 'Intencja',
}

const WEEKDAY_SHORT = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'niedz']
const WEEKDAY_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

export interface QuietDay {
  dayRef: DayRef
  /** Index within the week, Monday = 0. */
  index: number
  shortLabel: string
  fullLabel: string
  dayNumber: string
  isFuture: boolean
  isToday: boolean
}

export function quietWeekDays(weekRef: WeekRef, todayDayRef: DayRef): QuietDay[] {
  return (getChildPeriods(weekRef) as DayRef[]).map((dayRef, index) => ({
    dayRef,
    index,
    shortLabel: WEEKDAY_SHORT[index],
    fullLabel: WEEKDAY_FULL[index],
    dayNumber: String(Number(dayRef.slice(8, 10))),
    isFuture: dayRef > todayDayRef,
    isToday: dayRef === todayDayRef,
  }))
}

export interface QuietWeekSlot {
  weekRef: WeekRef
  /** "T14" */
  label: string
  /** "30 mar – 5 kwi" */
  range: string
  /** The week reaches outside the month it is shown in. */
  partial: boolean
}

/**
 * Load/state series per area over the month's weeks from the reflection bundle
 * details; weeks without a reflection are gaps.
 */
export function quietMonthAreaSeries(
  weeks: readonly { weekRef: WeekRef }[],
  details: readonly { weekRef: WeekRef; loadState: Record<LifeAreaKey, LoadStatePair> }[],
): AreaSeries {
  const byWeek = new Map(details.map(detail => [detail.weekRef, detail.loadState]))
  return Object.fromEntries(
    REFLECTION_MATRIX_AREAS.map(area => [
      area.key,
      weeks.map(({ weekRef }) => {
        const pair = byWeek.get(weekRef)?.[area.key]
        return { weekRef, label: weekPointLabel(weekRef), load: pair?.load ?? null, state: pair?.state ?? null }
      }),
    ]),
  ) as AreaSeries
}

export function quietMonthWeeks(monthRef: MonthRef): QuietWeekSlot[] {
  const monthBounds = getPeriodBounds(monthRef)
  return (getChildPeriods(monthRef) as WeekRef[]).map(weekRef => {
    const bounds = getPeriodBounds(weekRef)
    return {
      weekRef,
      label: `T${weekRef.slice(-2)}`,
      range: `${formatDay(bounds.start)} – ${formatDay(bounds.end)}`,
      partial: bounds.start < monthBounds.start || bounds.end > monthBounds.end,
    }
  })
}

export function formatDay(dayRef: string): string {
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(new Date(`${dayRef}T12:00:00`))
}

export function weekRangeTitle(weekRef: WeekRef): string {
  const bounds = getPeriodBounds(weekRef)
  return `${formatDay(bounds.start)} – ${formatDay(bounds.end)}`
}

export function monthTitle(monthRef: MonthRef): string {
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(`${monthRef}-15T12:00:00`))
}

export function formatQuietNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}

/** Polish plural: 1 / 2–4 / 5+ (with the 12–14 exception). */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (count === 1) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

// ---------------------------------------------------------------------------
// Weekly review evidence table
// ---------------------------------------------------------------------------

export interface QuietEvidenceCell {
  dayRef: DayRef
  /** null = no entry that day. Never coerced to 0 — a missing record is not a zero. */
  value: number | null
  planned: boolean
  future: boolean
}

export interface QuietEvidenceRow {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  icon: string
  entryMode: MeasurementEntryMode
  cells: QuietEvidenceCell[]
  /** Row read-out, e.g. "3 / 5", "śr. 3,4 / 5" or "Brak zapisów". */
  result: string
  /** Scale ceiling for the small in-cell bars (ratings use their own scale). */
  cellMax: number
}

export interface QuietEvidenceInput {
  key: string
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  icon?: string
  actualValue?: number
  target?: MeasurementTarget
}

/**
 * One row per object, one cell per day of the week. Values come from the raw
 * daily entries (completion = 1, multi-completion = checked points, otherwise
 * the recorded value); `planned` marks the days the plan had asked for.
 */
export function buildQuietEvidenceRows(
  items: QuietEvidenceInput[],
  rawEntries: DailyMeasurementEntry[],
  assignments: MeasurementDayAssignment[],
  weekRef: WeekRef,
  todayDayRef: DayRef,
): QuietEvidenceRow[] {
  const days = quietWeekDays(weekRef, todayDayRef)
  return items.map(item => {
    const cells: QuietEvidenceCell[] = days.map(day => {
      const entry = rawEntries.find(
        candidate =>
          candidate.subjectType === item.subjectType &&
          candidate.subjectId === item.subject.id &&
          candidate.dayRef === day.dayRef,
      )
      return {
        dayRef: day.dayRef,
        value: entry ? entryValue(item.subject, entry) : null,
        planned: assignments.some(
          assignment =>
            assignment.subjectType === item.subjectType &&
            assignment.subjectId === item.subject.id &&
            assignment.dayRef === day.dayRef,
        ),
        future: day.isFuture,
      }
    })
    const recorded = cells.filter(cell => cell.value !== null).map(cell => cell.value as number)
    return {
      key: item.key,
      subjectType: item.subjectType,
      subjectId: item.subject.id,
      title: item.subject.title,
      icon: item.icon ?? SUBJECT_ICON[item.subjectType],
      entryMode: item.subject.entryMode,
      cells,
      result: evidenceResultLabel(item, recorded),
      cellMax: cellScale(item, recorded),
    }
  })
}

function entryValue(subject: MeasureableSubject, entry: DailyMeasurementEntry): number | null {
  if (subject.entryMode === 'completion') return 1
  if (subject.entryMode === 'multi-completion') return multiCompletionDayPoints(subject, entry)
  return entry.value ?? null
}

function cellScale(item: QuietEvidenceInput, recorded: number[]): number {
  if (item.subject.entryMode === 'rating') return item.subject.ratingScale ?? 5
  return Math.max(1, ...recorded)
}

function evidenceResultLabel(item: QuietEvidenceInput, recorded: number[]): string {
  if (item.actualValue === undefined && !recorded.length) return 'Brak zapisów'
  const value = item.actualValue ?? recorded.reduce((sum, entry) => sum + entry, 0)
  const target = item.target?.value
  const prefix = item.target && item.target.kind !== 'count' && item.target.aggregation === 'average' ? 'śr. ' : ''
  if (target === undefined) return `${prefix}${formatQuietNumber(value)}`
  return `${prefix}${formatQuietNumber(value)} / ${formatQuietNumber(target)}`
}

// ---------------------------------------------------------------------------
// Free tags per life area (stored inside the reflection's promptResponses)
// ---------------------------------------------------------------------------

/** Prompt-response key holding an area's free tags. */
export function areaTagKey(areaKey: string): string {
  return `tags:${areaKey}`
}

/** Tags are newline-separated inside one prompt response (the input is single-line). */
export function parseTags(raw: string | undefined): string[] {
  return (raw ?? '')
    .split('\n')
    .map(tag => tag.trim())
    .filter(Boolean)
}

export function serializeTags(tags: string[]): string {
  return tags.join('\n')
}

export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim().replace(/\s+/g, ' ')
  if (!tag) return tags
  if (tags.some(existing => existing.toLocaleLowerCase('pl') === tag.toLocaleLowerCase('pl'))) return tags
  return [...tags, tag]
}
