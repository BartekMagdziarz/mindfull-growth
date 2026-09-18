/**
 * Warstwa danych koncepcji kalendarza retrospektywnego (UX Lab).
 *
 * Czyste, deterministyczne obliczenia na bazie fixture rich-v1: te same obiekty,
 * te same tygodnie i miesiące, a brakujące okresy dopełniane stabilnym hashem,
 * żeby porównania między okresami (small multiples) miały sens w całym roku.
 *
 * Decyzje 2026-09-05: dzień = jednostka (nie skala), soczewki jedna naraz,
 * porównanie tylko przez small multiples, oceny tygodnia = Wysiłek + Stan (×4).
 */
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@product/domain/period'
import type { LabFixtureObject, LabFixtureScenario, LabPriority } from '@product/dev/richVerificationScenario'
import {
  addDaysToDayRef,
  getChildPeriods,
  getNextPeriod,
  getParentPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPeriodType,
  getPreviousPeriod,
  zoomPeriod,
} from '@product/utils/periods'

export type CalendarScale = 'year' | 'month' | 'week'
export type LensId = 'rytm' | 'stan' | 'emocje' | 'wpisy' | 'kierunki'
export type TimeState = 'past' | 'current' | 'future'
export type RitualStatus = 'done' | 'missing' | 'due' | 'planned' | 'none'
export type Quadrant = 'hehp' | 'help' | 'lehp' | 'lelp'

export const SCALES: { id: CalendarScale; label: string }[] = [
  { id: 'year', label: 'Rok' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'week', label: 'Tydzień' },
]

export const LENSES: { id: LensId; label: string; icon: string; legend: string }[] = [
  { id: 'rytm', label: 'Rytm', icon: 'track_changes', legend: 'cele · nawyki · trackery — wypełnienie = udział osiągniętych' },
  { id: 'stan', label: 'Stan', icon: 'spa', legend: 'wysiłek (róż) i stan (błękit) — średnia z 4 obszarów' },
  { id: 'emocje', label: 'Emocje', icon: 'mood', legend: 'udział 4 ćwiartek koła emocji; szerokość = liczba wpisów' },
  { id: 'wpisy', label: 'Wpisy', icon: 'edit_note', legend: 'dziennik · emocje · ćwiczenia — obecność w okresie' },
  { id: 'kierunki', label: 'Kierunki', icon: 'explore', legend: 'wysiłek w trzech kierunkach miesiąca (1–5)' },
]

export const QUADRANTS: { id: Quadrant; label: string; cssVar: string }[] = [
  { id: 'hehp', label: 'energia + przyjemne', cssVar: '--color-quadrant-high-energy-high-pleasantness' },
  { id: 'lehp', label: 'spokój + przyjemne', cssVar: '--color-quadrant-low-energy-high-pleasantness' },
  { id: 'help', label: 'energia + nieprzyjemne', cssVar: '--color-quadrant-high-energy-low-pleasantness' },
  { id: 'lelp', label: 'spokój + nieprzyjemne', cssVar: '--color-quadrant-low-energy-low-pleasantness' },
]

export const AREAS = ['Ciało', 'Emocje', 'Działanie', 'Relacje']
export const COMPASS = ['Równowaga', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość']

export interface TypeExec { met: number; total: number }
export interface ExecSummary { goals: TypeExec; habits: TypeExec; trackers: TypeExec; intentions: TypeExec }
export interface Ratings { effort: number[]; state: number[] }
export interface Emotions { count: number; pleasant: number; quadrants: Record<Quadrant, number> }
export interface Entries { journal: number; emotions: number; exercises: number }
export interface PriorityEffort { key: string; title: string; tone: LabPriority['tone']; effort: number | null }

export interface PeriodMetrics {
  ref: string
  kind: 'month' | 'week' | 'day'
  state: TimeState
  label: string
  sublabel: string
  ritual: RitualStatus
  exec: ExecSummary | null
  planned: { goals: number; habits: number; trackers: number }
  top3: TypeExec | null
  ratings: Ratings | null
  compass: number[] | null
  emotions: Emotions | null
  entries: Entries
  priorities: PriorityEffort[]
  day?: { done: number; planned: number; dominantQuadrant: Quadrant | null }
}

export interface LensReading {
  lens: LensId
  empty: boolean
  parts: number[]
  intensity: number | null
  text: string
  title: string
}

/* ---------- deterministyczny hash ---------- */

function rnd(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function between(seed: string, min: number, max: number): number {
  return Math.round(min + rnd(seed) * (max - min))
}

/** Sezonowa fala, żeby small multiples miały kształt, nie sam szum. */
function wave(index: number, period = 9): number {
  return (Math.sin((index / period) * Math.PI * 2) + 1) / 2
}

/* ---------- etykiety ---------- */

const PL_WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

export function weekdayIndexMonday(dayRef: string): number {
  return (new Date(`${dayRef}T12:00:00`).getDay() + 6) % 7
}

export function monthTitle(monthRef: string): string {
  const [year, month] = monthRef.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function monthShort(monthRef: string): string {
  const [year, month] = monthRef.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '')
}

export function monthName(monthRef: string): string {
  const [year, month] = monthRef.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { month: 'long' }).format(new Date(year, month - 1, 1))
}

export function weekNumber(weekRef: string): number {
  return Number(weekRef.slice(-2))
}

function ddmm(dayRef: string): string {
  return `${dayRef.slice(8, 10)}.${dayRef.slice(5, 7)}`
}

export function weekRange(weekRef: string): string {
  const { start, end } = getPeriodBounds(weekRef as WeekRef)
  return `${ddmm(start)}–${ddmm(end)}`
}

export function dayTitle(dayRef: string): string {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${dayRef}T12:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function periodTitle(ref: string): string {
  switch (getPeriodType(ref as PeriodRef)) {
    case 'year': return ref
    case 'month': return monthTitle(ref)
    case 'week': return `T${weekNumber(ref)} · ${weekRange(ref)}`
    case 'day': return dayTitle(ref)
  }
}

/* ---------- stan w czasie ---------- */

function stateOf(fixture: LabFixtureScenario, ref: string): TimeState {
  const type = getPeriodType(ref as PeriodRef)
  const current = type === 'day' ? fixture.refs.today : type === 'week' ? fixture.refs.currentWeek : type === 'month' ? fixture.refs.currentMonth : fixture.refs.today.slice(0, 4)
  if (ref === current) return 'current'
  return ref < current ? 'past' : 'future'
}

/* ---------- metryki tygodnia ---------- */

const cache = new Map<string, PeriodMetrics>()

function cached(fixture: LabFixtureScenario, ref: string, build: () => PeriodMetrics): PeriodMetrics {
  const key = `${fixture.meta.anchorDayRef}|${ref}`
  const hit = cache.get(key)
  if (hit) return hit
  const value = build()
  cache.set(key, value)
  return value
}

function weekIndex(weekRef: string): number {
  const [year, week] = weekRef.split('-W').map(Number)
  return year * 53 + week
}

function emotionsFor(seed: string, count: number, pleasantBias: number): Emotions {
  const pleasantShare = Math.min(0.88, Math.max(0.3, 0.35 + pleasantBias * 0.5 + (rnd(`${seed}:pl`) - 0.5) * 0.2))
  const pleasant = Math.round(count * pleasantShare)
  const hehp = Math.round(pleasant * (0.4 + rnd(`${seed}:q1`) * 0.3))
  const lehp = pleasant - hehp
  const unpleasant = count - pleasant
  const help = Math.round(unpleasant * (0.35 + rnd(`${seed}:q2`) * 0.3))
  const lelp = unpleasant - help
  return { count, pleasant: count ? Math.round((pleasant / count) * 100) : 0, quadrants: { hehp, lehp, help, lelp } }
}

export function weekMetrics(fixture: LabFixtureScenario, weekRef: string): PeriodMetrics {
  return cached(fixture, weekRef, () => {
    const state = stateOf(fixture, weekRef)
    const index = weekIndex(weekRef)
    const shape = wave(index)
    const snapshot = fixture.weeks.find(week => week.weekRef === weekRef)
    const seed = `week:${weekRef}`
    const ratio = snapshot ? snapshot.completion / 100 : 0.45 + shape * 0.45 + (rnd(seed) - 0.5) * 0.15
    const planned = { goals: 2 + (index % 2), habits: 4 + (index % 2), trackers: 2 }
    const elapsed = state === 'current' ? (weekdayIndexMonday(fixture.refs.today) + 1) / 7 : 1

    const exec: ExecSummary | null = state === 'future' ? null : {
      goals: { total: planned.goals, met: Math.round(planned.goals * ratio * elapsed) },
      habits: { total: planned.habits, met: Math.round(planned.habits * Math.min(1, ratio + 0.1) * elapsed) },
      trackers: { total: planned.trackers, met: Math.round(planned.trackers * Math.min(1, ratio + 0.25) * elapsed) },
      intentions: { total: 3, met: Math.round(3 * ratio * elapsed) },
    }

    const reflected = state === 'past' && (snapshot ? snapshot.reflectionComplete : rnd(`${seed}:ritual`) < 0.82)
    const ritual: RitualStatus = state === 'past' ? (reflected ? 'done' : 'missing') : state === 'current' ? 'due' : (index - weekIndex(fixture.refs.currentWeek) <= 2 ? 'planned' : 'none')

    const effortBase = 2.2 + (1 - shape) * 2.2
    const ratings: Ratings | null = reflected ? {
      effort: AREAS.map((_, i) => Math.min(5, Math.max(1, Math.round(effortBase + (rnd(`${seed}:e${i}`) - 0.5) * 1.6)))),
      state: AREAS.map((_, i) => Math.min(5, Math.max(1, Math.round(2 + shape * 2.4 + (rnd(`${seed}:s${i}`) - 0.5) * 1.6)))),
    } : null

    const emotionCount = state === 'future' ? 0 : Math.round((4 + rnd(`${seed}:ec`) * 10) * elapsed)
    const emotions = state === 'future' ? null : emotionsFor(seed, emotionCount, shape)
    const entries: Entries = state === 'future'
      ? { journal: 0, emotions: 0, exercises: 0 }
      : { journal: Math.round((2 + rnd(`${seed}:j`) * 4) * elapsed), emotions: emotionCount, exercises: Math.round(rnd(`${seed}:x`) * 4 * elapsed) }

    return {
      ref: weekRef,
      kind: 'week',
      state,
      label: `T${weekNumber(weekRef)}`,
      sublabel: weekRange(weekRef),
      ritual,
      exec,
      planned,
      top3: exec ? { total: 3, met: Math.min(3, Math.round(3 * ratio * elapsed + 0.2)) } : null,
      ratings,
      compass: null,
      emotions,
      entries,
      priorities: [],
    }
  })
}

/* ---------- metryki dnia ---------- */

export function dayMetrics(fixture: LabFixtureScenario, dayRef: string): PeriodMetrics {
  return cached(fixture, dayRef, () => {
    const state = stateOf(fixture, dayRef)
    const week = weekMetrics(fixture, zoomPeriod(dayRef as DayRef, 'week'))
    const seed = `day:${dayRef}`
    const weekday = weekdayIndexMonday(dayRef)
    const planned = 3 + ((weekday + between(seed, 0, 2)) % 3) + (weekday >= 5 ? -1 : 0)
    const ratio = week.exec ? (week.exec.habits.met + week.exec.goals.met) / Math.max(1, week.exec.habits.total + week.exec.goals.total) : 0
    const done = state === 'future' ? 0 : state === 'current' ? Math.round(planned * 0.5) : Math.min(planned, Math.round(planned * (ratio + (rnd(seed) - 0.5) * 0.4)))
    const emotionCount = state === 'future' ? 0 : between(`${seed}:e`, 0, 3)
    const emotions = state === 'future' ? null : emotionsFor(seed, emotionCount, week.emotions ? week.emotions.pleasant / 100 : 0.5)
    const dominant = emotions && emotions.count
      ? (Object.entries(emotions.quadrants) as [Quadrant, number][]).sort((a, b) => b[1] - a[1])[0][0]
      : null
    const entries: Entries = state === 'future'
      ? { journal: 0, emotions: 0, exercises: 0 }
      : { journal: rnd(`${seed}:j`) < 0.62 ? 1 : 0, emotions: emotionCount, exercises: rnd(`${seed}:x`) < 0.3 ? 1 : 0 }

    return {
      ref: dayRef,
      kind: 'day',
      state,
      label: PL_WEEKDAYS[weekday],
      sublabel: String(Number(dayRef.slice(8, 10))),
      ritual: 'none',
      exec: null,
      planned: { goals: 0, habits: planned, trackers: 0 },
      top3: null,
      ratings: null,
      compass: null,
      emotions,
      entries,
      priorities: [],
      day: { done, planned, dominantQuadrant: dominant },
    }
  })
}

/* ---------- metryki miesiąca ---------- */

/** Tydzień „należy” do miesiąca, w którym wypada jego czwartek (jak ISO). */
export function weekBelongsToMonth(weekRef: string, monthRef: string): boolean {
  const { start } = getPeriodBounds(weekRef as WeekRef)
  return addDaysToDayRef(start, 3).slice(0, 7) === monthRef
}

function sumExec(list: (ExecSummary | null)[]): ExecSummary | null {
  const present = list.filter((item): item is ExecSummary => item !== null)
  if (!present.length) return null
  const add = (key: keyof ExecSummary): TypeExec => ({
    met: present.reduce((acc, item) => acc + item[key].met, 0),
    total: present.reduce((acc, item) => acc + item[key].total, 0),
  })
  return { goals: add('goals'), habits: add('habits'), trackers: add('trackers'), intentions: add('intentions') }
}

export function monthMetrics(fixture: LabFixtureScenario, monthRef: string): PeriodMetrics {
  return cached(fixture, monthRef, () => {
    const state = stateOf(fixture, monthRef)
    const weeks = getChildPeriods(monthRef as MonthRef).filter(weekRef => weekBelongsToMonth(weekRef, monthRef)).map(weekRef => weekMetrics(fixture, weekRef))
    const seed = `month:${monthRef}`
    const snapshot = fixture.months.find(month => month.monthRef === monthRef)
    const reflected = state === 'past' && (snapshot ? snapshot.reflectionComplete : rnd(`${seed}:ritual`) < 0.85)
    const monthIndex = Number(monthRef.slice(5, 7))
    const ritual: RitualStatus = state === 'past' ? (reflected ? 'done' : 'missing') : state === 'current' ? 'due' : (monthRef === getNextPeriod(fixture.refs.currentMonth) ? 'planned' : 'none')
    const rated = weeks.filter(week => week.ratings)
    const ratings: Ratings | null = rated.length ? {
      effort: AREAS.map((_, i) => Math.round((rated.reduce((acc, week) => acc + week.ratings!.effort[i], 0) / rated.length) * 10) / 10),
      state: AREAS.map((_, i) => Math.round((rated.reduce((acc, week) => acc + week.ratings!.state[i], 0) / rated.length) * 10) / 10),
    } : null
    const emotionWeeks = weeks.filter(week => week.emotions)
    const emotions: Emotions | null = emotionWeeks.length ? emotionWeeks.reduce<Emotions>((acc, week) => ({
      count: acc.count + week.emotions!.count,
      pleasant: 0,
      quadrants: {
        hehp: acc.quadrants.hehp + week.emotions!.quadrants.hehp,
        lehp: acc.quadrants.lehp + week.emotions!.quadrants.lehp,
        help: acc.quadrants.help + week.emotions!.quadrants.help,
        lelp: acc.quadrants.lelp + week.emotions!.quadrants.lelp,
      },
    }), { count: 0, pleasant: 0, quadrants: { hehp: 0, lehp: 0, help: 0, lelp: 0 } }) : null
    if (emotions && emotions.count) emotions.pleasant = Math.round(((emotions.quadrants.hehp + emotions.quadrants.lehp) / emotions.count) * 100)

    const priorities: PriorityEffort[] = fixture.priorities.slice(0, 3).map((priority, i) => ({
      key: priority.key,
      title: priority.title,
      tone: priority.tone,
      effort: state === 'past' && reflected
        ? (snapshot ? snapshot.priorityEffort[i] ?? null : Math.min(5, Math.max(1, Math.round(2 + wave(monthIndex + i * 2, 6) * 3))))
        : null,
    }))

    return {
      ref: monthRef,
      kind: 'month',
      state,
      label: monthName(monthRef),
      sublabel: monthRef.slice(0, 4),
      ritual,
      exec: sumExec(weeks.map(week => week.exec)),
      planned: weeks.reduce((acc, week) => ({ goals: acc.goals + week.planned.goals, habits: acc.habits + week.planned.habits, trackers: acc.trackers + week.planned.trackers }), { goals: 0, habits: 0, trackers: 0 }),
      top3: null,
      ratings,
      compass: reflected ? COMPASS.map((_, i) => Math.min(5, Math.max(1, Math.round(2.2 + wave(monthIndex + i, 7) * 2.6 + (rnd(`${seed}:c${i}`) - 0.5))))) : null,
      emotions,
      entries: weeks.reduce((acc, week) => ({ journal: acc.journal + week.entries.journal, emotions: acc.emotions + week.entries.emotions, exercises: acc.exercises + week.entries.exercises }), { journal: 0, emotions: 0, exercises: 0 }),
      priorities,
    }
  })
}

export function metricsFor(fixture: LabFixtureScenario, ref: string): PeriodMetrics {
  switch (getPeriodType(ref as PeriodRef)) {
    case 'month': return monthMetrics(fixture, ref)
    case 'week': return weekMetrics(fixture, ref)
    case 'day': return dayMetrics(fixture, ref)
    case 'year': throw new Error('Rok nie jest jednostką — użyj monthsOfYear')
  }
}

/* ---------- jednostki skali ---------- */

export function monthsOfYear(fixture: LabFixtureScenario, yearRef: string): PeriodMetrics[] {
  return getChildPeriods(yearRef as YearRef).map(monthRef => monthMetrics(fixture, monthRef))
}

export function weeksOfMonth(fixture: LabFixtureScenario, monthRef: string): PeriodMetrics[] {
  return getChildPeriods(monthRef as MonthRef).map(weekRef => weekMetrics(fixture, weekRef))
}

export function daysOfWeek(fixture: LabFixtureScenario, weekRef: string): PeriodMetrics[] {
  return getChildPeriods(weekRef as WeekRef).map(dayRef => dayMetrics(fixture, dayRef))
}

export interface MonthGridRow {
  week: PeriodMetrics
  belongs: boolean
  days: { metrics: PeriodMetrics; inMonth: boolean }[]
}

export function monthGrid(fixture: LabFixtureScenario, monthRef: string): MonthGridRow[] {
  return getChildPeriods(monthRef as MonthRef).map(weekRef => ({
    week: weekMetrics(fixture, weekRef),
    belongs: weekBelongsToMonth(weekRef, monthRef),
    days: getChildPeriods(weekRef).map(dayRef => ({ metrics: dayMetrics(fixture, dayRef), inMonth: dayRef.slice(0, 7) === monthRef })),
  }))
}

/** Jednostki bieżącej skali dla wybranego okresu (rok→miesiące, miesiąc→tygodnie, tydzień→dni). */
export function unitsFor(fixture: LabFixtureScenario, scale: CalendarScale, ref: string): PeriodMetrics[] {
  if (scale === 'year') return monthsOfYear(fixture, ref)
  if (scale === 'month') return weeksOfMonth(fixture, ref)
  return daysOfWeek(fixture, ref)
}

export function refForScale(ref: string, scale: CalendarScale, anchorDay?: string): string {
  return zoomPeriod(ref as PeriodRef, scale, anchorDay as DayRef | undefined)
}

export function shiftPeriod(ref: string, direction: -1 | 1): string {
  return direction < 0 ? getPreviousPeriod(ref as PeriodRef) : getNextPeriod(ref as PeriodRef)
}

export function parentRef(ref: string): string | null {
  switch (getPeriodType(ref as PeriodRef)) {
    case 'year': return null
    case 'month': return getParentPeriod(ref as MonthRef)
    case 'week': return getParentPeriod(ref as WeekRef)
    case 'day': return getParentPeriod(ref as DayRef)
  }
}

export function todayRefs(fixture: LabFixtureScenario) {
  return getPeriodRefsForDate(fixture.refs.today)
}

/** Poprzednie okresy tego samego rodzaju (dla porównań w panelu). */
export function previousPeriods(fixture: LabFixtureScenario, ref: string, count: number): PeriodMetrics[] {
  const list: PeriodMetrics[] = []
  let cursor = ref
  for (let i = 0; i < count; i += 1) {
    cursor = getPreviousPeriod(cursor as PeriodRef)
    list.unshift(metricsFor(fixture, cursor))
  }
  return list
}

/* ---------- soczewki ---------- */

function frac(exec: TypeExec): number {
  return exec.total ? exec.met / exec.total : 0
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

export function lensReading(metrics: PeriodMetrics, lens: LensId): LensReading {
  const empty = (title: string): LensReading => ({ lens, empty: true, parts: [], intensity: null, text: '', title })
  switch (lens) {
    case 'rytm': {
      if (metrics.kind === 'day') {
        if (metrics.state === 'future') return { lens, empty: false, parts: [], intensity: null, text: `${metrics.day!.planned}`, title: `Plan: ${metrics.day!.planned} działań` }
        const { done, planned } = metrics.day!
        return { lens, empty: false, parts: [planned ? done / planned : 0], intensity: planned ? done / planned : 0, text: `${done}/${planned}`, title: `Wykonane ${done} z ${planned}` }
      }
      if (!metrics.exec) {
        const { goals, habits, trackers } = metrics.planned
        return { lens, empty: false, parts: [], intensity: null, text: `${goals} · ${habits} · ${trackers}`, title: `Plan: ${goals} cele · ${habits} nawyki · ${trackers} trackery` }
      }
      const { goals, habits, trackers } = metrics.exec
      const parts = [frac(goals), frac(habits), frac(trackers)]
      return {
        lens, empty: false, parts, intensity: mean(parts),
        text: `${goals.met}/${goals.total} · ${habits.met}/${habits.total} · ${trackers.met}/${trackers.total}`,
        title: `Cele ${goals.met}/${goals.total} · nawyki ${habits.met}/${habits.total} · trackery ${trackers.met}/${trackers.total}`,
      }
    }
    case 'stan': {
      if (metrics.kind === 'day') return empty('Oceny dotyczą tygodnia')
      if (!metrics.ratings) return empty(metrics.state === 'future' ? 'Przyszłość' : metrics.state === 'current' ? 'Tydzień jeszcze otwarty' : 'Brak refleksji')
      const effort = mean(metrics.ratings.effort)
      const state = mean(metrics.ratings.state)
      return { lens, empty: false, parts: [effort / 5, state / 5], intensity: state / 5, text: `${effort.toFixed(1)} · ${state.toFixed(1)}`, title: `Wysiłek ${effort.toFixed(1)} · stan ${state.toFixed(1)} (średnie z ${AREAS.join(', ')})` }
    }
    case 'emocje': {
      if (!metrics.emotions || !metrics.emotions.count) return empty(metrics.state === 'future' ? 'Przyszłość' : 'Brak wpisów emocji')
      const { count, pleasant, quadrants } = metrics.emotions
      const parts = QUADRANTS.map(q => quadrants[q.id] / count)
      return { lens, empty: false, parts, intensity: pleasant / 100, text: `${pleasant}%`, title: `${count} wpisów · ${pleasant}% przyjemnych` }
    }
    case 'wpisy': {
      if (metrics.state === 'future') return empty('Przyszłość')
      const { journal, emotions, exercises } = metrics.entries
      const cap = metrics.kind === 'day' ? 1 : metrics.kind === 'week' ? 5 : 20
      const parts = [Math.min(1, journal / cap), Math.min(1, emotions / (cap * 2)), Math.min(1, exercises / cap)]
      return { lens, empty: false, parts, intensity: mean(parts), text: `${journal} · ${emotions} · ${exercises}`, title: `Dziennik ${journal} · emocje ${emotions} · ćwiczenia ${exercises}` }
    }
    case 'kierunki': {
      if (metrics.kind === 'week') {
        if (!metrics.top3) return empty('Przyszłość')
        return { lens, empty: false, parts: [metrics.top3.met / 3], intensity: metrics.top3.met / 3, text: `${metrics.top3.met}/3`, title: `Fokus tygodnia dotrzymany ${metrics.top3.met}/3` }
      }
      if (metrics.kind === 'day') return empty('Kierunki dotyczą tygodnia i miesiąca')
      const rated = metrics.priorities.filter(priority => priority.effort !== null)
      if (!rated.length) return empty(metrics.state === 'future' ? 'Przyszłość' : metrics.state === 'current' ? 'Miesiąc jeszcze otwarty' : 'Brak refleksji miesiąca')
      const parts = metrics.priorities.map(priority => (priority.effort ?? 0) / 5)
      return { lens, empty: false, parts, intensity: mean(parts), text: metrics.priorities.map(priority => priority.effort ?? '–').join(' · '), title: metrics.priorities.map(priority => `${priority.title}: ${priority.effort ?? '–'}/5`).join(' · ') }
    }
  }
}

export function ritualLabel(status: RitualStatus, kind: PeriodMetrics['kind']): string {
  const noun = kind === 'month' ? 'miesiąca' : 'tygodnia'
  switch (status) {
    case 'done': return `Refleksja ${noun} zapisana`
    case 'missing': return `Bez refleksji ${noun}`
    case 'due': return kind === 'month' ? 'Zamknij miesiąc' : 'Zamknij tydzień'
    case 'planned': return 'Zaplanowany'
    case 'none': return ''
  }
}

/* ---------- obiekty dla panelu ---------- */

export interface PeriodObjectRow {
  object: LabFixtureObject
  value: number | undefined
  target: number | undefined
  status: 'met' | 'missed' | 'no-data' | 'no-target'
}

export function objectsForPeriod(fixture: LabFixtureScenario, metrics: PeriodMetrics): PeriodObjectRow[] {
  if (metrics.kind === 'day') return []
  const cadence = metrics.kind === 'month' ? 'monthly' : 'weekly'
  return fixture.objects
    .filter(object => object.cadence === cadence && object.status !== 'orphan' && object.family !== 'intention')
    .map(object => {
      const point = object.chart.find(item => item.periodRef === metrics.ref)
      return { object, value: point?.value, target: point?.target, status: point?.status ?? 'no-data' }
    })
}

export const FAMILY_GLYPH: Record<LabFixtureObject['family'], string> = {
  goal: 'circle',
  keyResult: 'circle',
  habit: 'pentagon',
  tracker: 'square',
  intention: 'flag',
}
