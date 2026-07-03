/**
 * Real-data layer for the "Strumień" (Stream) calendar ribbon.
 *
 * Replaces the old deterministic demo generator. Each loader maps a real period
 * to the same view-model shapes the cards consume (so the components are
 * unchanged):
 *   - rings  → goal/habit/weekly-intention attainment (met-ratio),
 *   - month-card life-area bars → the user's real Life Areas (per-area execution),
 *   - week-card 4×3 matrix (life areas × Demands/Actions/State) → weekly-reflection ratings,
 *   - day-card journal/emotions → journal entries + emotion logs.
 *
 * Pure metric helpers are exported for unit tests; the async loaders pull from
 * the same cached query services / Pinia stores the classic calendar uses.
 */
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import {
  buildMeasurementSummary,
  type MeasurementPeriodRef,
  type MeasureableSubject,
} from '@/services/measurementProgress'
import {
  getCalendarYearSummary,
  type CalendarYearMonthSummary,
  type YearMonthPillData,
} from '@/services/calendarViewQueries'
import { getMonthPlanningBundle, getWeekPlanningBundle } from '@/services/planningStateQueries'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { MATRIX_SECTIONS, REFLECTION_MATRIX_AREAS } from '@/domain/reflectionMatrix'
import { divergingRatingColor } from '@/utils/ratingGradient'
import {
  dayTimeState,
  monthTimeState,
  spanTimeState,
  todayDayRef,
  type PeriodTimeState,
  type StreamBarVM,
  type StreamDayVM,
  type StreamEmotionSegment,
  type StreamMatrixRowVM,
  type StreamMonthVM,
  type StreamPriorityVM,
  type StreamRingVM,
  type StreamWeekVM,
} from './streamModel'

interface ActiveSubject {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
}

const RING_DEFS: { key: StreamRingVM['key']; icon: string }[] = [
  { key: 'goals', icon: 'flag' },
  { key: 'habits', icon: 'task_alt' },
  { key: 'intentions', icon: 'target' },
]

const DAY_RING_DEFS: { key: StreamRingVM['key']; icon: string }[] = [
  { key: 'goals', icon: 'flag' },
  { key: 'habits', icon: 'task_alt' },
]

const QUADRANT_ORDER: Quadrant[] = [
  'high-energy-high-pleasantness',
  'low-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-low-pleasantness',
]

const QUADRANT_COLOR: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'var(--color-quadrant-high-energy-high-pleasantness)',
  'low-energy-high-pleasantness': 'var(--color-quadrant-low-energy-high-pleasantness)',
  'high-energy-low-pleasantness': 'var(--color-quadrant-high-energy-low-pleasantness)',
  'low-energy-low-pleasantness': 'var(--color-quadrant-low-energy-low-pleasantness)',
}

// --- pure metric helpers (exported for tests) --------------------------------

/** Integer percentage of num/den, or null when there is nothing to measure. */
export function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 100)
}

/** Average of the non-null values, or null when none are present. */
export function nonNullMean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length === 0) return null
  return nums.reduce((sum, v) => sum + v, 0) / nums.length
}

/**
 * A year-summary pill → its 0..1 attainment, or null for no-data. `maxWeeks`
 * caps the weekly denominator to elapsed weeks so a current month isn't diluted
 * by its not-yet-started weeks (which can never be "met").
 */
export function pillFraction(pill: YearMonthPillData, maxWeeks?: number): number | null {
  if (pill.cadence === 'monthly') {
    if (pill.monthlyStatus === 'met') return 1
    if (pill.monthlyStatus === 'missed') return 0
    return null
  }
  const total = maxWeeks === undefined ? pill.weeksTotal ?? 0 : Math.min(pill.weeksTotal ?? 0, maxWeeks)
  if (total > 0) return Math.min(pill.weeksMet ?? 0, total) / total
  return null
}

/** A 1–5 weekly-reflection rating → a 0..1 bar height, or null when unrated. */
export function ratingToValue(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined) return null
  return Math.max(0, Math.min(1, rating / 5))
}

export function quadrantSegments(counts: Record<Quadrant, number>): StreamEmotionSegment[] {
  return QUADRANT_ORDER.filter((q) => counts[q] > 0).map((q) => ({
    color: QUADRANT_COLOR[q],
    weight: counts[q],
  }))
}

function emptyQuadrantCounts(): Record<Quadrant, number> {
  return {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }
}

/**
 * The week-card 4×3 reflection matrix (life-area rows × Demands/Actions/State
 * columns) from a week's reflection (undefined ⇒ all cells empty). The Demands
 * column is value-inverted so rose reads "strain" across the whole card while
 * sky reads "ease/wellbeing".
 */
export function matrixFromReflection(
  reflection: WeeklyReflection | undefined,
): StreamMatrixRowVM[] {
  return REFLECTION_MATRIX_AREAS.map((area) => ({
    areaKey: area.key,
    icon: area.icon,
    cells: MATRIX_SECTIONS.map((section) => {
      const rating = reflection ? (reflection[area.fields[section]] as number | null) : null
      return {
        section,
        rating,
        color: divergingRatingColor(rating, { invert: section === 'demands' }),
      }
    }),
  }))
}

/**
 * goals/habits/intentions rings for a month/week period: attainment (met-ratio
 * across evaluated objects) per subject kind — weekly intentions carry a target
 * like habits, so all three are met/missed ratios. Future periods carry no
 * execution data, so all three read "—".
 */
export function ringsForPeriod(
  subjects: ActiveSubject[],
  entries: DailyMeasurementEntry[],
  periodRef: MeasurementPeriodRef,
  timeState: PeriodTimeState,
  asOfDayRef: DayRef,
): StreamRingVM[] {
  if (timeState === 'future') {
    return RING_DEFS.map((d) => ({ key: d.key, icon: d.icon, pct: null, planOnly: true }))
  }

  let goalMet = 0
  let goalEval = 0
  let habitMet = 0
  let habitEval = 0
  let intentionMet = 0
  let intentionEval = 0

  for (const { subjectType, subject } of subjects) {
    const summary = buildMeasurementSummary(subject, entries, periodRef, asOfDayRef)
    if (subjectType === 'keyResult') {
      if (summary.evaluationStatus === 'met') {
        goalEval++
        goalMet++
      } else if (summary.evaluationStatus === 'missed') {
        goalEval++
      }
    } else if (subjectType === 'habit') {
      if (summary.evaluationStatus === 'met') {
        habitEval++
        habitMet++
      } else if (summary.evaluationStatus === 'missed') {
        habitEval++
      }
    } else if (subjectType === 'weeklyIntention') {
      if (summary.evaluationStatus === 'met') {
        intentionEval++
        intentionMet++
      } else if (summary.evaluationStatus === 'missed') {
        intentionEval++
      }
    }
  }

  return [
    { key: 'goals', icon: 'flag', pct: pct(goalMet, goalEval), planOnly: false, num: goalMet, den: goalEval },
    { key: 'habits', icon: 'task_alt', pct: pct(habitMet, habitEval), planOnly: false, num: habitMet, den: habitEval },
    {
      key: 'intentions',
      icon: 'target',
      pct: pct(intentionMet, intentionEval),
      planOnly: false,
      num: intentionMet,
      den: intentionEval,
    },
  ]
}

/** Per-day goal/habit rings = engagement (objects with an entry that day). */
export function dayRings(
  krIds: Set<string>,
  habitIds: Set<string>,
  dayEntries: DailyMeasurementEntry[],
  timeState: PeriodTimeState,
): StreamRingVM[] {
  if (timeState === 'future') {
    return DAY_RING_DEFS.map((d) => ({ key: d.key, icon: d.icon, pct: null, planOnly: true }))
  }
  const krWithEntry = new Set(
    dayEntries.filter((e) => e.subjectType === 'keyResult' && krIds.has(e.subjectId)).map((e) => e.subjectId),
  )
  const habitWithEntry = new Set(
    dayEntries.filter((e) => e.subjectType === 'habit' && habitIds.has(e.subjectId)).map((e) => e.subjectId),
  )
  return [
    {
      key: 'goals',
      icon: 'flag',
      pct: pct(krWithEntry.size, krIds.size),
      planOnly: false,
      num: krWithEntry.size,
      den: krIds.size,
    },
    {
      key: 'habits',
      icon: 'task_alt',
      pct: pct(habitWithEntry.size, habitIds.size),
      planOnly: false,
      num: habitWithEntry.size,
      den: habitIds.size,
    },
  ]
}

const YEAR_RING_DEFS: { key: StreamRingVM['key']; icon: string }[] = [
  { key: 'goals', icon: 'flag' },
  { key: 'habits', icon: 'task_alt' },
]

/**
 * Goals + Habits rings for a year-view month card, from the year summary pills.
 * (Intentions are week-scoped, so there is no third ring here.) Each goal contributes once
 * (the mean of its KR pills), then goals are averaged — so a goal with many KRs
 * doesn't dominate.
 */
export function yearMonthRings(
  monthSummary: CalendarYearMonthSummary,
  timeState: PeriodTimeState,
  elapsedWeeks: number,
): StreamRingVM[] {
  if (timeState === 'future') {
    return YEAR_RING_DEFS.map((d) => ({ key: d.key, icon: d.icon, pct: null, planOnly: true }))
  }
  const goalMean = nonNullMean(
    monthSummary.goalGroups.map((g) => nonNullMean(g.pills.map((p) => pillFraction(p, elapsedWeeks)))),
  )
  const habitMean = nonNullMean(
    monthSummary.habitGroups.map((h) => pillFraction(h.pill, elapsedWeeks)),
  )
  return [
    { key: 'goals', icon: 'flag', pct: goalMean === null ? null : Math.round(goalMean * 100), planOnly: false, mean: true },
    { key: 'habits', icon: 'task_alt', pct: habitMean === null ? null : Math.round(habitMean * 100), planOnly: false, mean: true },
  ]
}

// The 5 monthly-reflection dimensions, in display order. `field` is the rating
// field on MonthlyReflection; `key` is the i18n key under
// `planning.reflection.monthly.dimensions.*` (resolved by the card).
const MONTHLY_DIMENSIONS: { key: string; field: keyof MonthlyReflection }[] = [
  { key: 'balance', field: 'balanceRating' },
  { key: 'purpose', field: 'purposeRating' },
  { key: 'growth', field: 'growthRating' },
  { key: 'coherence', field: 'coherenceRating' },
  { key: 'agency', field: 'agencyRating' },
]

/** Year-view month-card bars = the month's 5 monthly-reflection dimension ratings. */
export function monthlyDimensionBars(
  reflection: MonthlyReflection | undefined,
  timeState: PeriodTimeState,
): StreamBarVM[] {
  return MONTHLY_DIMENSIONS.map((dim) => ({
    key: dim.key,
    value:
      timeState === 'future'
        ? null
        : ratingToValue(reflection ? (reflection[dim.field] as number | null) : null),
  }))
}

// Month top-3 priorities for the year ribbon. Resolves `MonthPlan.topPriorityIds`
// to titles/icons and colours each ring by the priority's effort self-rating from
// monthly reflection. Always returns exactly 3 slots so the ribbon rows stay
// aligned; unfilled slots are `empty` (rendered as a "—"). Pure → unit-tested.
export function monthPriorities(
  topPriorityIds: string[] | undefined,
  prioritiesById: Map<string, { title: string; icon?: string }>,
  effortFor: (priorityId: string) => number | null,
): StreamPriorityVM[] {
  const slots: StreamPriorityVM[] = []
  for (const id of (topPriorityIds ?? []).slice(0, 3)) {
    const priority = prioritiesById.get(id)
    if (!priority) continue
    slots.push({
      key: id,
      empty: false,
      name: priority.title,
      icon: priority.icon || 'flag',
      rating: effortFor(id),
    })
  }
  while (slots.length < 3) {
    slots.push({ key: `empty-${slots.length}`, empty: true, name: '', icon: '', rating: null })
  }
  return slots
}

/** Number of the month's weeks that have already ended by `today`. */
function elapsedWeeksInMonth(monthRef: MonthRef, today: DayRef): number {
  return getChildPeriods(monthRef).filter((weekRef) => getPeriodBounds(weekRef).end <= today).length
}

// --- async loaders -----------------------------------------------------------

export async function loadStreamYear(yearRef: YearRef): Promise<StreamMonthVM[]> {
  const today = todayDayRef()
  const todayMonthRef = getPeriodRefsForDate(today).month

  const [summary, monthlyReflections, monthPlans, priorities, objectReflections] = await Promise.all([
    getCalendarYearSummary(yearRef),
    structuredReflectionDexieRepository.listMonthly(),
    periodPlanDexieRepository.listMonthPlans(),
    priorityDexieRepository.listAll(),
    reflectionDexieRepository.listPeriodObjectReflections(),
  ])
  const reflectionByMonth = new Map(monthlyReflections.map((r) => [r.monthRef, r]))
  const planByMonth = new Map(monthPlans.map((p) => [p.monthRef, p]))
  const prioritiesById = new Map(priorities.map((p) => [p.id, p]))
  const effortByKey = new Map<string, number | null>()
  for (const r of objectReflections) {
    if (r.periodType === 'month' && r.subjectType === 'priority') {
      effortByKey.set(`${r.periodRef}:${r.subjectId}`, r.effort ?? null)
    }
  }

  return summary.months.map((monthSummary, monthIndex) => {
    const timeState = monthTimeState(monthSummary.monthRef, todayMonthRef)
    const elapsedWeeks = elapsedWeeksInMonth(monthSummary.monthRef, today)
    return {
      monthRef: monthSummary.monthRef,
      monthIndex,
      timeState,
      isCurrent: timeState === 'current',
      areas: monthlyDimensionBars(reflectionByMonth.get(monthSummary.monthRef), timeState),
      rings: yearMonthRings(monthSummary, timeState, elapsedWeeks),
      priorities: monthPriorities(
        planByMonth.get(monthSummary.monthRef)?.topPriorityIds,
        prioritiesById,
        (priorityId) => effortByKey.get(`${monthSummary.monthRef}:${priorityId}`) ?? null,
      ),
    }
  })
}

export async function loadStreamMonth(monthRef: MonthRef): Promise<StreamWeekVM[]> {
  const today = todayDayRef()
  const weekRefs = getChildPeriods(monthRef) as WeekRef[]
  // Weekly intentions are week-scoped, so the month bundle never carries them —
  // load each week's list separately for the intentions ring.
  const [bundle, weeklyReflections, intentionsPerWeek] = await Promise.all([
    getMonthPlanningBundle(monthRef),
    structuredReflectionDexieRepository.getWeeklyForMonth(monthRef),
    Promise.all(weekRefs.map((weekRef) => weeklyIntentionDexieRepository.listByWeek(weekRef))),
  ])

  const reflectionByWeek = new Map(weeklyReflections.map((r) => [r.weekRef, r]))
  const monthSubjects: ActiveSubject[] = bundle.cadencedItems.map((i) => ({
    subjectType: i.subjectType,
    subject: i.subject,
  }))

  return weekRefs.map((weekRef, weekIndex) => {
    const bounds = getPeriodBounds(weekRef)
    const timeState = spanTimeState(bounds.start, bounds.end, today)
    const subjects: ActiveSubject[] = [
      ...monthSubjects,
      ...intentionsPerWeek[weekIndex]
        .filter((subject) => subject.isActive)
        .map((subject) => ({ subjectType: 'weeklyIntention' as const, subject })),
    ]
    return {
      weekRef,
      weekNumber: Number(weekRef.slice(-2)),
      startDayRef: bounds.start,
      endDayRef: bounds.end,
      timeState,
      isCurrent: timeState === 'current',
      matrix: matrixFromReflection(reflectionByWeek.get(weekRef)),
      rings: ringsForPeriod(subjects, bundle.rawEntries, weekRef, timeState, today),
    }
  })
}

export async function loadStreamWeek(weekRef: WeekRef): Promise<StreamDayVM[]> {
  const today = todayDayRef()
  const weekEnd = getPeriodBounds(weekRef).end as DayRef
  const bundle = await getWeekPlanningBundle(weekRef, weekEnd)

  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  await Promise.all([
    journalStore.ensureLoaded(),
    emotionLogStore.ensureLoaded(),
    emotionStore.isLoaded ? Promise.resolve() : emotionStore.loadEmotions(),
  ])

  const krIds = new Set(
    bundle.relevant.cadencedItems.filter((i) => i.subjectType === 'keyResult').map((i) => i.subject.id),
  )
  const habitIds = new Set(
    bundle.relevant.cadencedItems.filter((i) => i.subjectType === 'habit').map((i) => i.subject.id),
  )

  const journalEntries = journalStore.sortedEntries
  const logs = emotionLogStore.sortedLogs

  return getChildPeriods(weekRef).map((dayRef, weekdayIndex) => {
    const timeState = dayTimeState(dayRef, today)
    const isFuture = timeState === 'future'
    const dayStart = `${dayRef}T00:00:00.000Z`
    const dayEnd = `${dayRef}T23:59:59.999Z`

    const journalWritten =
      !isFuture && journalEntries.some((e) => e.createdAt >= dayStart && e.createdAt <= dayEnd)

    const dayLogs = isFuture ? [] : logs.filter((l) => l.createdAt >= dayStart && l.createdAt <= dayEnd)
    const counts = emptyQuadrantCounts()
    for (const log of dayLogs) {
      for (const emotionId of log.emotionIds) {
        const emotion = emotionStore.getEmotionById(emotionId)
        if (emotion) counts[getQuadrant(emotion)]++
      }
    }

    const dayEntries = bundle.rawEntries.filter((e) => e.dayRef === dayRef)

    return {
      dayRef,
      weekdayIndex,
      dayNumber: Number(dayRef.slice(-2)),
      isToday: timeState === 'current',
      isFuture,
      journalWritten,
      emotionCount: dayLogs.length,
      emotionSegments: quadrantSegments(counts),
      rings: dayRings(krIds, habitIds, dayEntries, timeState),
    }
  })
}
