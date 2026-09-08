/**
 * Pure projections for the rhythm calendar (ported from the UX Lab experiment
 * "05 · Rytm kierunków"): time units with two ranges (full / intersection with
 * the viewed period), presence, one series per entry mode, focus, reflection
 * and entries. No Vue and no repositories — only period helpers.
 *
 * The rules the Lab settled on and this port keeps:
 *  - marks and sums of dated records use the INTERSECTION with the viewed period,
 *  - a missing record is not a failure: undefined/null = no record, 0 = a recorded zero,
 *  - the mark kind follows entryMode + target + cadence,
 *  - effective target = base → month override → week override; a partial week has no target,
 *  - Σ only where the period value really is an aggregate of the cells.
 */
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import {
  addDaysToDayRef,
  getChildPeriods,
  getNextPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPeriodType,
  getPreviousPeriod,
  getWeekOverlappingMonths,
  isPeriodRef,
} from '@/utils/periods'
import type {
  RhythmAssignment,
  RhythmEmotionRecord,
  RhythmEntry,
  RhythmExerciseRecord,
  RhythmJournalRecord,
  RhythmMonthlyReflection,
  RhythmObject,
  RhythmPriority,
  RhythmScenario,
  RhythmTarget,
  RhythmWeeklyReflection,
} from './rhythmScenario'

export type Scale = 'year' | 'month' | 'week'
export type TimeState = 'past' | 'current' | 'future'
export type Presence = 'recorded' | 'planned-only' | 'empty'
export type MarkKind = 'slots' | 'day-slots' | 'checklist-slots' | 'bar-target' | 'point' | 'rating-point'
export type DaySlot = 'met' | 'partial' | 'none' | 'future' | 'outside'
export type EntryState = 'done' | 'skipped' | 'unrecorded' | 'planned' | 'cancelled'

export const SCALES: { id: Scale; label: string }[] = [
  { id: 'year', label: 'Rok' },
  { id: 'month', label: 'Miesiąc' },
  { id: 'week', label: 'Tydzień' },
]
export const AREAS = ['Ciało', 'Emocje', 'Działanie', 'Relacje'] as const
export const AREA_ICONS = ['accessibility_new', 'mood', 'bolt', 'group'] as const
/* Compass labels are the product's own (the Lab proposed "Zasady / Wpływ";
   the stored keys and meaning are unchanged, so that rename is a separate call). */
export const COMPASS = ['Balans', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość'] as const
export const FAMILY_LABEL: Record<RhythmObject['family'], string> = {
  goal: 'Cele', keyResult: 'Cele', habit: 'Nawyki', tracker: 'Trackery', intention: 'Intencje tygodnia',
}
export const TYPE_ORDER: RhythmObject['family'][] = ['keyResult', 'habit', 'tracker', 'intention']
export const MONTHS_PL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
export const MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
export const WEEKDAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

/* ------------------------------------------------------------------ jednostki czasu */

export interface Bounds { start: DayRef; end: DayRef }

export interface TimeUnit {
  /** Kanoniczny ref jednostki (tydzień / miesiąc / dzień). */
  ref: PeriodRef
  kind: 'month' | 'week' | 'day'
  label: string
  sublabel?: string
  fullBounds: Bounds
  visibleBounds: Bounds
  partial: boolean
  state: TimeState
  /** Miesiąc, którego dotyczy przecięcie (skala miesiąca) lub sama jednostka (rok). */
  monthRef: MonthRef
  /** Tydzień jednostki (skala miesiąca) lub tydzień dnia (skala tygodnia). */
  weekRef?: WeekRef
}

function dayNum(ref: string): number { return Number(ref.slice(8, 10)) }
function monthIndex(ref: string): number { return Number(ref.slice(5, 7)) - 1 }
function intersect(a: Bounds, b: Bounds): Bounds {
  return { start: (a.start > b.start ? a.start : b.start), end: (a.end < b.end ? a.end : b.end) }
}
function timeState(bounds: Bounds, clock: DayRef): TimeState {
  if (bounds.end < clock) return 'past'
  if (bounds.start > clock) return 'future'
  return 'current'
}

export function daysBetween(start: DayRef, end: DayRef): DayRef[] {
  const out: DayRef[] = []
  let cursor = start
  while (cursor <= end) {
    out.push(cursor)
    cursor = addDaysToDayRef(cursor, 1)
  }
  return out
}

export function rangeLabel(bounds: Bounds): string {
  const sm = monthIndex(bounds.start)
  const em = monthIndex(bounds.end)
  const s = String(dayNum(bounds.start)).padStart(2, '0')
  const e = String(dayNum(bounds.end)).padStart(2, '0')
  const mm = (i: number) => String(i + 1).padStart(2, '0')
  return sm === em ? `${s}–${e}.${mm(sm)}` : `${s}.${mm(sm)}–${e}.${mm(em)}`
}

export function periodTitle(scale: Scale, ref: string): string {
  if (scale === 'year') return ref
  if (scale === 'month') {
    const name = MONTHS_PL[monthIndex(ref)]
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${ref.slice(0, 4)}`
  }
  const b = getPeriodBounds(ref as PeriodRef)
  const sm = monthIndex(b.start)
  const em = monthIndex(b.end)
  if (sm === em) return `${dayNum(b.start)}–${dayNum(b.end)} ${MONTHS_GEN[sm]} ${b.end.slice(0, 4)}`
  return `${dayNum(b.start)} ${MONTHS_GEN[sm]} – ${dayNum(b.end)} ${MONTHS_GEN[em]} ${b.end.slice(0, 4)}`
}

export function dayTitle(dayRef: DayRef): string {
  return `${dayNum(dayRef)} ${MONTHS_GEN[monthIndex(dayRef)]} ${dayRef.slice(0, 4)}`
}
export function shortDate(dayRef: DayRef): string {
  return `${String(dayNum(dayRef)).padStart(2, '0')}.${dayRef.slice(5, 7)}`
}

export function unitsFor(scale: Scale, ref: string, clock: DayRef): TimeUnit[] {
  if (scale === 'month') {
    const monthRef = ref as MonthRef
    const mb = getPeriodBounds(monthRef)
    return getChildPeriods(monthRef).map(weekRef => {
      const fullBounds = getPeriodBounds(weekRef)
      const visibleBounds = intersect(fullBounds, mb)
      return {
        ref: weekRef, kind: 'week', label: rangeLabel(fullBounds), fullBounds, visibleBounds,
        partial: fullBounds.start !== visibleBounds.start || fullBounds.end !== visibleBounds.end,
        state: timeState(fullBounds, clock), monthRef, weekRef,
      }
    })
  }
  if (scale === 'year') {
    return getChildPeriods(ref as YearRef).map(monthRef => {
      const bounds = getPeriodBounds(monthRef)
      return { ref: monthRef, kind: 'month', label: MONTHS_SHORT[monthIndex(monthRef)], fullBounds: bounds, visibleBounds: bounds, partial: false, state: timeState(bounds, clock), monthRef }
    })
  }
  const weekRef = ref as WeekRef
  return getChildPeriods(weekRef).map((dayRef, index) => {
    const bounds = { start: dayRef, end: dayRef }
    return { ref: dayRef, kind: 'day', label: WEEKDAYS_SHORT[index], sublabel: String(dayNum(dayRef)), fullBounds: bounds, visibleBounds: bounds, partial: false, state: timeState(bounds, clock), monthRef: getPeriodRefsForDate(dayRef).month, weekRef }
  })
}

export function refForScale(dayRef: DayRef, scale: Scale): string {
  const refs = getPeriodRefsForDate(dayRef)
  return scale === 'year' ? refs.year : scale === 'month' ? refs.month : refs.week
}
export function shiftRef(ref: string, direction: -1 | 1): string {
  return direction > 0 ? getNextPeriod(ref as PeriodRef) : getPreviousPeriod(ref as PeriodRef)
}
export function isValidRef(scale: Scale, ref: string | undefined): ref is string {
  if (!ref || !isPeriodRef(ref)) return false
  return getPeriodType(ref as PeriodRef) === scale
}

/* ------------------------------------------------------------------ relacje */

export function objectByKey(s: RhythmScenario, key: string): RhythmObject | undefined {
  return s.objects.find(o => o.key === key)
}
export function priorityKeysOf(s: RhythmScenario, object: RhythmObject): string[] {
  if (object.priorityKeys.length) return object.priorityKeys
  const goal = object.goalKey ? objectByKey(s, object.goalKey) : undefined
  return goal?.priorityKeys ?? []
}
/** Serie = obiekty mierzalne (cel jest kontenerem). */
export function measurableObjects(s: RhythmScenario): RhythmObject[] {
  return s.objects.filter(o => o.family !== 'goal')
}
export function objectsForPriority(s: RhythmScenario, priorityKey: string): RhythmObject[] {
  return measurableObjects(s).filter(o => priorityKeysOf(s, o).includes(priorityKey))
}
export function objectsWithoutPriority(s: RhythmScenario): RhythmObject[] {
  return measurableObjects(s).filter(o => priorityKeysOf(s, o).length === 0)
}
export function goalTitle(s: RhythmScenario, object: RhythmObject): string | undefined {
  return object.goalKey ? objectByKey(s, object.goalKey)?.title : undefined
}

/* ------------------------------------------------------------------ przynależność do jednostki */

function inBounds(dayRef: DayRef, b: Bounds): boolean { return dayRef >= b.start && dayRef <= b.end }

export function entryInUnit(entry: RhythmEntry, unit: TimeUnit): boolean {
  return inBounds(entry.dayRef, unit.visibleBounds)
}

/** Przypisanie dotyczy jednostki: dzień w przecięciu; tydzień = ta sama/przecinająca się jednostka; miesiąc analogicznie. */
export function assignmentInUnit(a: RhythmAssignment, unit: TimeUnit): boolean {
  if (a.cancelled) return false
  switch (a.scope.kind) {
    case 'day':
      return inBounds(a.scope.ref, unit.visibleBounds)
    case 'week':
      if (unit.kind === 'week') return a.scope.ref === unit.ref
      if (unit.kind === 'month') return getWeekOverlappingMonths(a.scope.ref).includes(unit.monthRef)
      return getPeriodRefsForDate(unit.ref).week === a.scope.ref
    case 'month':
      if (unit.kind === 'month') return a.scope.ref === unit.ref
      return a.scope.ref === unit.monthRef
  }
}

/** Plan „zapala” komórkę tylko w swojej skali: przypisanie miesięczne nie jest planem konkretnego tygodnia (panel nadal je pokazuje jako „Na miesiąc”). */
export function assignmentPlansUnit(a: RhythmAssignment, unit: TimeUnit): boolean {
  if (a.scope.kind === 'month' && unit.kind !== 'month') return false
  if (a.scope.kind === 'week' && unit.kind === 'day') return false
  return assignmentInUnit(a, unit)
}

export function isRecorded(entry: RhythmEntry): boolean {
  if (entry.skipped) return false
  if (entry.checkedItemIds) return entry.checkedItemIds.length > 0
  return true
}

/* ------------------------------------------------------------------ obecność */

export interface CellProjection {
  unitRef: string
  presence: Presence
  recordIds: string[]
  assignmentIds: string[]
  state: TimeState
}

export function presenceCell(s: RhythmScenario, objects: RhythmObject[], unit: TimeUnit): CellProjection {
  // obecność liczy zapisy działań; zbiór złożony z samych obserwacji (np. typ Trackery) pokazuje ich zapisy
  const actionKeys = objects.filter(o => o.evidenceRole === 'action').map(o => o.key)
  const allKeys = new Set(objects.map(o => o.key))
  const keys = actionKeys.length ? new Set(actionKeys) : allKeys
  const records = s.entries.filter(e => keys.has(e.objectKey) && isRecorded(e) && entryInUnit(e, unit))
  const assignments = s.assignments.filter(a => allKeys.has(a.objectKey) && assignmentPlansUnit(a, unit))
  const recordIds = [...new Set(records.map(r => r.id))]
  const assignmentIds = [...new Set(assignments.map(a => a.id))]
  const presence: Presence = recordIds.length && unit.state !== 'future' ? 'recorded' : assignmentIds.length ? 'planned-only' : 'empty'
  return { unitRef: unit.ref, presence, recordIds, assignmentIds, state: unit.state }
}

export function presenceLabel(p: Presence): string {
  return p === 'recorded' ? 'Zapisane działanie' : p === 'planned-only' ? 'Plan bez zapisanego wykonania' : 'Brak planu i zapisanych działań'
}

/* ------------------------------------------------------------------ serie */

/** Granulacja serii: wartość na kolumnę (jednostka) albo na podjednostkę (dni w miesiącu, tygodnie w roku). */
export type Grain = 'unit' | 'fine'
export interface SeriesSample { ref: string; label: string; value: number | null; future: boolean }

export interface SeriesPoint {
  /** Podjednostki kolumny: dni w tygodniu, tygodnie (przecięte z miesiącem) w miesiącu. Null trzyma swoje miejsce. */
  samples?: SeriesSample[]
  unitRef: string
  state: TimeState
  partial: boolean
  value: number | null
  target: number | null
  /** Sloty (kind slots): liczba slotów i wypełnionych. */
  slotCount?: number
  doneCount?: number
  /** Sloty dni Pn–Nd (kind day-slots / checklist-slots). */
  daySlots?: DaySlot[]
  planned: boolean
  sourceIds: string[]
  entryDays: number
  readout: string
}

export interface SeriesProjection {
  objectKey: string
  label: string
  sublabel?: string
  unit?: string
  entryMode: RhythmObject['entryMode']
  cadence: RhythmObject['cadence']
  aggregation: 'sum' | 'average' | 'last' | 'count'
  operator?: 'min' | 'max' | 'gte' | 'lte'
  ratingScale?: { min: number; max: number }
  markKind: MarkKind
  evidenceRole: RhythmObject['evidenceRole']
  /** Σ — tylko gdy wartość okresu jest agregatem komórek (kadencja miesięczna w skali miesiąca). */
  periodTotal?: { value: number | null; target: number | null; readout: string }
  /**
   * Plan przypisany do całego oglądanego okresu (tydzień w skali tygodnia, miesiąc w skali miesiąca):
   * nie „bez dnia”, lecz „na cały tydzień” — pokazywany w kolumnie Σ jako sam ułamek (pełne zdanie w tooltipie). Pomijany, gdy Σ już mówi to samo.
   */
  periodPlan?: { count: number; value: number | null; target: number | null; status: PeriodPlanStatus; label: string; readout: string }
  points: SeriesPoint[]
  /** Wspólna skala słupków w grupie serii ustalana przez wywołującego. */
  maxValue: number
  /** Oś punktów: oceny = stała skala; value average/last = zakres wartości i celu z marginesem; słupki = 0..max. */
  axis: { min: number; max: number }
  /** Maksimum próbek podjednostek (słupki w granulacji drobnej). */
  fineMax: number
}

/** planned = przed nami / bez zapisu w trwającym okresie; partial = trwa, poniżej celu; done = cel spełniony (lub jakikolwiek zapis bez celu); short = zamknięty poniżej celu; unrecorded = zamknięty bez zapisu. */
export type PeriodPlanStatus = 'planned' | 'partial' | 'done' | 'short' | 'unrecorded'

/** Znaczniki, które mają sens w granulacji drobnej (linia albo słupki podjednostek). */
export function supportsFineGrain(markKind: MarkKind): boolean {
  return markKind === 'point' || markKind === 'rating-point' || markKind === 'bar-target'
}
export function isLineKind(markKind: MarkKind): boolean {
  return markKind === 'point' || markKind === 'rating-point'
}

/** Oś wiersza dla danej granulacji: oceny stałe; wartości = zakres danych i celów z marginesem; słupki 0..max. */
export function seriesAxis(series: SeriesProjection, grain: Grain): { min: number; max: number } {
  if (series.markKind === 'bar-target') {
    return { min: 0, max: Math.max(1, grain === 'fine' ? series.fineMax : series.maxValue) }
  }
  if (series.markKind === 'rating-point' || grain === 'fine') return series.axis
  const values = [...series.points.map(p => p.value), ...series.points.map(p => p.target)].filter((v): v is number => v !== null)
  if (!values.length) return series.axis
  const lo = Math.min(...values); const hi = Math.max(...values)
  const pad = hi === lo ? Math.max(1, Math.abs(hi) * 0.02) : (hi - lo) * 0.35
  return { min: lo - pad, max: hi + pad }
}

/** Podjednostki kolumny: tygodnie miesiąca (przecięcie), dni tygodnia; dzień nie ma podjednostek. */
export function subUnitsOf(unit: TimeUnit, clock: DayRef): { ref: string; label: string; bounds: Bounds }[] {
  if (unit.kind === 'month') return unitsFor('month', unit.ref, clock).map(u => ({ ref: u.ref, label: rangeLabel(u.visibleBounds), bounds: u.visibleBounds }))
  if (unit.kind === 'week') return daysBetween(unit.visibleBounds.start, unit.visibleBounds.end).map(d => ({ ref: d, label: shortDate(d), bounds: { start: d, end: d } }))
  return []
}

export function resolveMarkKind(object: RhythmObject, scale: Scale): MarkKind {
  const t = object.target
  switch (object.entryMode) {
    case 'completion':
      if (scale === 'year') return 'bar-target'
      return t?.kind === 'count' && t.value <= 7 && object.cadence === 'weekly' ? 'slots' : 'day-slots'
    case 'multi-completion':
      return scale === 'year' ? 'bar-target' : 'checklist-slots'
    case 'counter':
      return 'bar-target'
    case 'value':
      return t?.kind === 'value' && t.aggregation === 'sum' ? 'bar-target' : 'point'
    case 'rating':
      return 'rating-point'
  }
}

function aggregationOf(object: RhythmObject): SeriesProjection['aggregation'] {
  const t = object.target
  if (object.entryMode === 'completion' || object.entryMode === 'multi-completion') return 'count'
  if (object.entryMode === 'rating') return 'average'
  if (object.entryMode === 'counter') return 'sum'
  if (t?.kind === 'value') return t.aggregation
  return 'last'
}

export function effectiveTarget(s: RhythmScenario, object: RhythmObject, monthRef: MonthRef, weekRef?: WeekRef): RhythmTarget | undefined {
  const week = weekRef ? s.overrides.find(o => o.objectKey === object.key && o.scope.kind === 'week' && o.scope.ref === weekRef) : undefined
  if (week) return week.target
  const month = s.overrides.find(o => o.objectKey === object.key && o.scope.kind === 'month' && o.scope.ref === monthRef)
  return month?.target ?? object.target
}

function multiThreshold(object: RhythmObject): number {
  const items = object.multiItems ?? []
  const max = items.reduce((sum, i) => sum + i.weight, 0)
  const t = object.multiThreshold ?? max
  return Math.min(Math.max(1, t), Math.max(1, max))
}
function multiPoints(object: RhythmObject, entry: RhythmEntry): number {
  const weights = new Map((object.multiItems ?? []).map(i => [i.id, i.weight]))
  return (entry.checkedItemIds ?? []).reduce((sum, id) => sum + (weights.get(id) ?? 0), 0)
}
export function multiDayMet(object: RhythmObject, entry: RhythmEntry): boolean {
  return multiPoints(object, entry) >= multiThreshold(object)
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

function aggregate(object: RhythmObject, entries: RhythmEntry[]): number | null {
  const recorded = entries.filter(e => !e.skipped).sort((a, b) => a.dayRef.localeCompare(b.dayRef))
  const agg = aggregationOf(object)
  if (agg === 'count') {
    // brak wpisów = brak zapisu (null), nie zero wykonań
    if (!recorded.length) return null
    if (object.entryMode === 'multi-completion') return recorded.filter(e => multiDayMet(object, e)).length
    return recorded.length
  }
  const values = recorded.filter(e => typeof e.value === 'number').map(e => e.value as number)
  if (!values.length) return null
  if (agg === 'sum') return values.reduce((a, b) => a + b, 0)
  if (agg === 'average') return values.reduce((a, b) => a + b, 0) / values.length
  return values[values.length - 1]
}

function daySlotsFor(object: RhythmObject, unit: TimeUnit, entries: RhythmEntry[], clock: DayRef): DaySlot[] {
  return daysBetween(unit.fullBounds.start, unit.fullBounds.end).map(dayRef => {
    if (!inBounds(dayRef, unit.visibleBounds)) return 'outside'
    const dayEntries = entries.filter(e => e.dayRef === dayRef && !e.skipped)
    if (object.entryMode === 'multi-completion') {
      if (!dayEntries.length) return dayRef > clock ? 'future' : 'none'
      return dayEntries.some(e => multiDayMet(object, e)) ? 'met' : 'partial'
    }
    if (dayEntries.length) return 'met'
    return dayRef > clock ? 'future' : 'none'
  })
}

function targetValueFor(object: RhythmObject, s: RhythmScenario, unit: TimeUnit, scale: Scale): number | null {
  // intencja tygodnia żyje tylko w swoim tygodniu
  if (object.weekRef && unit.kind === 'week' && unit.ref !== object.weekRef) return null
  if (object.weekRef && unit.kind === 'month' && !getWeekOverlappingMonths(object.weekRef).includes(unit.monthRef)) return null
  if (scale === 'month') {
    if (object.cadence !== 'weekly' || unit.partial) return null
    return effectiveTarget(s, object, unit.monthRef, unit.weekRef)?.value ?? null
  }
  if (scale === 'year') {
    if (object.cadence !== 'monthly') return null
    return effectiveTarget(s, object, unit.monthRef)?.value ?? null
  }
  return null
}

function readoutFor(object: RhythmObject, value: number | null, target: number | null, point: { partial: boolean; planned: boolean; entryDays: number; state: TimeState }, operator?: string): string {
  const unitLabel = object.unit ? ` ${object.unit}` : ''
  if (value === null) {
    if (point.planned) return point.state === 'future' ? 'Plan' : 'Plan bez zapisanego wykonania'
    return 'Brak zapisu'
  }
  const limit = operator === 'max' || operator === 'lte'
  const base = target === null ? `${fmt(value)}${unitLabel}` : `${fmt(value)} / ${fmt(target)}${unitLabel}${limit ? ' (limit)' : ''}`
  const over = limit && target !== null && value > target ? ' · ponad limit' : ''
  const partial = point.partial ? ' · część tygodnia' : ''
  const days = object.target?.entryDays ? ` · ${point.entryDays} / ${object.target.entryDays.value} dni z wpisem` : ''
  return `${base}${over}${partial}${days}`
}

export function seriesFor(s: RhythmScenario, object: RhythmObject, units: TimeUnit[], scale: Scale, focusRef: string): SeriesProjection {
  const markKind = resolveMarkKind(object, scale)
  const operator = object.target?.kind === 'count' ? object.target.operator : object.target?.operator
  const allEntries = s.entries.filter(e => e.objectKey === object.key && e.dayRef <= s.clock)
  const allAssignments = s.assignments.filter(a => a.objectKey === object.key)

  const points: SeriesPoint[] = units.map(unit => {
    const entries = allEntries.filter(e => entryInUnit(e, unit))
    const assignments = allAssignments.filter(a => assignmentPlansUnit(a, unit))
    const value = unit.state === 'future' ? null : aggregate(object, entries)
    const target = targetValueFor(object, s, unit, scale)
    const entryDays = new Set(entries.filter(isRecorded).map(e => e.dayRef)).size
    const planned = assignments.length > 0
    const point: SeriesPoint = {
      unitRef: unit.ref, state: unit.state, partial: unit.partial, value, target, planned,
      sourceIds: [...entries.map(e => e.id), ...assignments.map(a => a.id)], entryDays,
      readout: '',
    }
    if (markKind === 'slots') {
      const done = value ?? 0
      point.doneCount = done
      point.slotCount = Math.max(target ?? 0, done, assignments.filter(a => a.scope.kind === 'day').length)
    }
    if (markKind === 'day-slots' || markKind === 'checklist-slots') {
      point.daySlots = daySlotsFor(object, unit, entries, s.clock)
    }
    if (supportsFineGrain(markKind)) {
      point.samples = subUnitsOf(unit, s.clock).map(slice => ({
        ref: slice.ref, label: slice.label, future: slice.bounds.start > s.clock,
        value: slice.bounds.start > s.clock ? null : aggregate(object, entries.filter(e => inBounds(e.dayRef, slice.bounds))),
      }))
    }
    point.readout = readoutFor(object, value, target, point, operator)
    return point
  })

  let periodTotal: SeriesProjection['periodTotal']
  if (scale === 'month' && object.cadence === 'monthly') {
    const monthRef = focusRef as MonthRef
    const bounds = getPeriodBounds(monthRef)
    const monthEntries = allEntries.filter(e => inBounds(e.dayRef, bounds))
    const value = aggregate(object, monthEntries)
    const target = effectiveTarget(s, object, monthRef)?.value ?? null
    const readout = readoutFor(object, value, target, { partial: false, planned: allAssignments.some(a => a.scope.kind === 'month' && a.scope.ref === monthRef), entryDays: new Set(monthEntries.map(e => e.dayRef)).size, state: timeState(bounds, s.clock) }, operator)
    periodTotal = { value, target, readout }
  }

  let periodPlan: SeriesProjection['periodPlan']
  if (scale !== 'year' && !periodTotal) {
    const scoped = allAssignments.filter(a => !a.cancelled && a.scope.kind === scale && a.scope.ref === focusRef)
    if (scoped.length) {
      const bounds = getPeriodBounds(focusRef as PeriodRef)
      const monthRef = scale === 'month' ? (focusRef as MonthRef) : getPeriodRefsForDate(addDaysToDayRef(bounds.start, 3)).month
      const value = aggregate(object, allEntries.filter(e => inBounds(e.dayRef, bounds)))
      // cel okresu tylko, gdy kadencja obiektu odpowiada skali (jak w komórkach)
      const target = (scale === 'week' ? object.cadence === 'weekly' : object.cadence === 'monthly')
        ? (effectiveTarget(s, object, monthRef, scale === 'week' ? (focusRef as WeekRef) : undefined)?.value ?? null)
        : null
      const state = timeState(bounds, s.clock)
      const limit = operator === 'max' || operator === 'lte'
      const met = value !== null && (target === null || (limit ? value <= target : value >= target))
      const status: PeriodPlanStatus = value === null
        ? (state === 'past' ? 'unrecorded' : 'planned')
        : met ? 'done' : state === 'past' ? 'short' : 'partial'
      const unitLabel = object.unit ? ` ${object.unit}` : ''
      const readout = value === null
        ? (state === 'past' ? 'bez zapisu' : 'w planie')
        : target === null ? `${fmt(value)}${unitLabel}` : `${fmt(value)} / ${fmt(target)}${unitLabel}${limit ? ' (limit)' : ''}`
      periodPlan = { count: scoped.length, value, target, status, label: scale === 'week' ? 'cały tydzień' : 'cały miesiąc', readout }
    }
  }

  const maxValue = Math.max(1, ...points.map(p => Math.max(p.value ?? 0, p.target ?? 0)))
  let axis = { min: 0, max: maxValue }
  if (markKind === 'rating-point' && object.ratingScale) axis = { ...object.ratingScale }
  else if (markKind === 'point') {
    const values = [...points.map(p => p.value), ...points.flatMap(p => (p.samples ?? []).map(sample => sample.value)), ...points.map(p => p.target), periodTotal?.target ?? null].filter((v): v is number => v !== null)
    if (values.length) {
      const lo = Math.min(...values); const hi = Math.max(...values)
      const pad = hi === lo ? Math.max(1, Math.abs(hi) * 0.02) : (hi - lo) * 0.35
      axis = { min: lo - pad, max: hi + pad }
    }
  }
  const fineMax = Math.max(1, ...points.flatMap(p => (p.samples ?? []).map(sample => sample.value ?? 0)))
  return {
    axis,
    fineMax,
    objectKey: object.key,
    label: object.title,
    sublabel: object.family === 'keyResult' ? goalTitle(s, object) : object.family === 'intention' ? 'intencja tygodnia' : undefined,
    unit: object.unit,
    entryMode: object.entryMode,
    cadence: object.cadence,
    aggregation: aggregationOf(object),
    operator,
    ratingScale: object.ratingScale,
    markKind,
    evidenceRole: object.evidenceRole,
    periodTotal,
    periodPlan,
    points,
    maxValue,
  }
}

/** Obiekty aktywne w okresie (przypisanie lub wpis w którejkolwiek jednostce). */
export function activeInPeriod(s: RhythmScenario, objects: RhythmObject[], units: TimeUnit[]): RhythmObject[] {
  return objects.filter(o =>
    s.entries.some(e => e.objectKey === o.key && units.some(u => entryInUnit(e, u)))
    || s.assignments.some(a => a.objectKey === o.key && units.some(u => assignmentInUnit(a, u))),
  )
}

/* ------------------------------------------------------------------ fokus */

export interface FocusProjection {
  unitRef: string
  priorityKeys: string[]
  source: 'month-plan' | 'week-plan-objects' | 'none'
}

export function focusForUnit(s: RhythmScenario, unit: TimeUnit): FocusProjection {
  if (unit.kind === 'month') {
    const plan = s.monthPlans.find(p => p.monthRef === unit.ref)
    return { unitRef: unit.ref, priorityKeys: plan?.topPriorityKeys ?? [], source: plan ? 'month-plan' : 'none' }
  }
  if (unit.kind === 'week') {
    const plan = s.weekPlans.find(p => p.weekRef === unit.ref)
    if (!plan) return { unitRef: unit.ref, priorityKeys: [], source: 'none' }
    const keys = new Set<string>()
    for (const key of plan.topObjectKeys) {
      const object = objectByKey(s, key)
      if (object) priorityKeysOf(s, object).forEach(k => keys.add(k))
    }
    return { unitRef: unit.ref, priorityKeys: [...keys], source: 'week-plan-objects' }
  }
  return { unitRef: unit.ref, priorityKeys: [], source: 'none' }
}

/** Kierunki okresu: fokus okresu (miesiąc: topPriorityKeys; rok: suma miesięcy), potem reszta aktywnych z relacjami. */
export function directionsForPeriod(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[]): { focus: RhythmPriority[]; rest: RhythmPriority[] } {
  const focusKeys: string[] = []
  const addKey = (k: string) => { if (!focusKeys.includes(k)) focusKeys.push(k) }
  if (scale === 'month') s.monthPlans.find(p => p.monthRef === ref)?.topPriorityKeys.forEach(addKey)
  else if (scale === 'year') s.monthPlans.filter(p => p.monthRef.startsWith(ref)).forEach(p => p.topPriorityKeys.forEach(addKey))
  else {
    const weekPlan = s.weekPlans.find(p => p.weekRef === ref)
    weekPlan?.topObjectKeys.forEach(k => { const o = objectByKey(s, k); if (o) priorityKeysOf(s, o).forEach(addKey) })
    const thursday = addDaysToDayRef(getPeriodBounds(ref as PeriodRef).start, 3)
    s.monthPlans.find(p => p.monthRef === getPeriodRefsForDate(thursday).month)?.topPriorityKeys.forEach(addKey)
  }
  const ordered = [...s.priorities].sort((a, b) => {
    const ai = focusKeys.indexOf(a.key); const bi = focusKeys.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  if (!focusKeys.length) {
    const withRelations = ordered.filter(p => p.status === 'active' && activeInPeriod(s, objectsForPriority(s, p.key), units).length)
    return { focus: withRelations.slice(0, 3), rest: ordered.filter(p => !withRelations.slice(0, 3).includes(p)) }
  }
  const focus = ordered.filter(p => focusKeys.includes(p.key))
  return { focus, rest: ordered.filter(p => !focusKeys.includes(p.key)) }
}

/* ------------------------------------------------------------------ refleksja */

export interface ReflectionProjection {
  unitRef: string
  exists: boolean
  status: 'done' | 'draft' | 'none'
  weekly?: RhythmWeeklyReflection
  monthly?: RhythmMonthlyReflection
}

export function reflectionForUnit(s: RhythmScenario, unit: TimeUnit): ReflectionProjection {
  if (unit.kind === 'week') {
    const r = s.weeklyReflections.find(x => x.weekRef === unit.ref)
    return { unitRef: unit.ref, exists: !!r, status: r?.status ?? 'none', weekly: r }
  }
  if (unit.kind === 'month') {
    const r = s.monthlyReflections.find(x => x.monthRef === unit.ref)
    return { unitRef: unit.ref, exists: !!r, status: r?.status ?? 'none', monthly: r }
  }
  return { unitRef: unit.ref, exists: false, status: 'none' }
}

/** Ocena własna oglądanego okresu — wiersz okresu (miesiąc: kompas, tydzień: Wysiłek/Stan). Rok: brak. */
export function ownReflection(s: RhythmScenario, scale: Scale, ref: string): ReflectionProjection | null {
  if (scale === 'month') {
    const r = s.monthlyReflections.find(x => x.monthRef === ref)
    return { unitRef: ref, exists: !!r, status: r?.status ?? 'none', monthly: r }
  }
  if (scale === 'week') {
    const r = s.weeklyReflections.find(x => x.weekRef === ref)
    return { unitRef: ref, exists: !!r, status: r?.status ?? 'none', weekly: r }
  }
  return null
}

/* ------------------------------------------------------------------ wpisy */

export type EntryKind = 'journal' | 'emotion' | 'exercise'
export const ENTRY_KINDS: { id: EntryKind; label: string; icon: string }[] = [
  { id: 'journal', label: 'Dziennik', icon: 'history_edu' },
  { id: 'emotion', label: 'Emocje', icon: 'mood' },
  { id: 'exercise', label: 'Ćwiczenia', icon: 'self_improvement' },
]

export interface EntriesProjection {
  unitRef: string
  any: boolean
  kinds: Record<EntryKind, { count: number; days: number; daySlots: boolean[] | null; daysInUnit: number }>
}

function recordsIn<T extends { dayRef: DayRef }>(list: T[], unit: TimeUnit): T[] {
  return list.filter(r => inBounds(r.dayRef, unit.visibleBounds))
}

export function entriesForUnit(s: RhythmScenario, unit: TimeUnit): EntriesProjection {
  const build = (list: { dayRef: DayRef }[]) => {
    const inUnit = recordsIn(list, unit)
    const days = new Set(inUnit.map(r => r.dayRef))
    const daySlots = unit.kind === 'week'
      ? daysBetween(unit.fullBounds.start, unit.fullBounds.end).map(d => days.has(d))
      : null
    return { count: inUnit.length, days: days.size, daySlots, daysInUnit: daysBetween(unit.visibleBounds.start, unit.visibleBounds.end).length }
  }
  const kinds = { journal: build(s.journal), emotion: build(s.emotions), exercise: build(s.exercises) }
  return { unitRef: unit.ref, any: kinds.journal.count + kinds.emotion.count + kinds.exercise.count > 0, kinds }
}

/* ------------------------------------------------------------------ panel */

export interface PanelActivity {
  id: string
  objectKey: string
  title: string
  sublabel?: string
  icon?: string
  dayRef?: DayRef
  scopeLabel?: string
  state: EntryState
  valueLabel?: string
  assignmentId?: string
  movable: boolean
}

export function entryStateLabel(state: EntryState): string {
  return state === 'done' ? 'Wykonane' : state === 'skipped' ? 'Pominięte' : state === 'unrecorded' ? 'Plan bez zapisu' : state === 'planned' ? 'Plan' : 'Anulowane'
}

function valueLabelFor(object: RhythmObject, entry: RhythmEntry): string | undefined {
  if (entry.skipped) return undefined
  if (object.entryMode === 'multi-completion') {
    const items = (object.multiItems ?? []).filter(i => entry.checkedItemIds?.includes(i.id)).map(i => i.label)
    return `${items.join(', ')}${multiDayMet(object, entry) ? '' : ' · bez progu'}`
  }
  if (typeof entry.value === 'number') {
    if (object.entryMode === 'rating') return `${fmt(entry.value)} / ${object.ratingScale?.max ?? 10}`
    return `${fmt(entry.value)}${object.unit ? ` ${object.unit}` : ''}`
  }
  return undefined
}

export function activitiesFor(s: RhythmScenario, objects: RhythmObject[], unit: TimeUnit): { dated: PanelActivity[]; scoped: PanelActivity[]; observations: PanelActivity[] } {
  const dated: PanelActivity[] = []
  const scoped: PanelActivity[] = []
  const observations: PanelActivity[] = []
  for (const object of objects) {
    const entries = s.entries.filter(e => e.objectKey === object.key && entryInUnit(e, unit))
    const assignments = s.assignments.filter(a => a.objectKey === object.key && assignmentInUnit(a, unit))
    const target = object.evidenceRole === 'observation' ? observations : dated
    for (const entry of entries) {
      target.push({ id: entry.id, objectKey: object.key, title: object.title, sublabel: goalTitle(s, object), icon: object.icon, dayRef: entry.dayRef, state: entry.skipped ? 'skipped' : 'done', valueLabel: valueLabelFor(object, entry), movable: false })
    }
    for (const a of assignments) {
      if (a.scope.kind === 'day') {
        if (entries.some(e => e.dayRef === a.scope.ref)) continue
        const pending = a.scope.ref >= s.clock
        dated.push({ id: a.id, objectKey: object.key, title: object.title, sublabel: goalTitle(s, object), icon: object.icon, dayRef: a.scope.ref, state: a.cancelled ? 'cancelled' : pending ? 'planned' : 'unrecorded', assignmentId: a.id, movable: a.scope.ref > s.clock && !a.cancelled })
      } else {
        const bounds = getPeriodBounds(a.scope.ref)
        const scopeLabel = a.scope.kind === 'week' ? `Na tydzień ${rangeLabel(bounds)}` : `Na miesiąc ${MONTHS_PL[monthIndex(a.scope.ref)]}`
        // status planu bez dnia wynika z jego własnego zakresu (tydzień/miesiąc), nie z oglądanej jednostki
        const hasEntries = s.entries.some(e => e.objectKey === object.key && isRecorded(e) && inBounds(e.dayRef, bounds))
        const pending = bounds.end >= s.clock
        scoped.push({ id: a.id, objectKey: object.key, title: object.title, sublabel: goalTitle(s, object), icon: object.icon, scopeLabel, state: a.cancelled ? 'cancelled' : hasEntries ? 'done' : pending ? 'planned' : 'unrecorded', assignmentId: a.id, movable: false })
      }
    }
  }
  const byDate = (a: PanelActivity, b: PanelActivity) => (a.dayRef ?? '').localeCompare(b.dayRef ?? '')
  return { dated: dated.sort(byDate), scoped, observations: observations.sort(byDate) }
}

export interface FocusDetail {
  priorities: RhythmPriority[]
  objects: { object: RhythmObject; priorityKeys: string[] }[]
  /** Obiekty fokusu tygodnia bez związku z priorytetami miesiąca (dryf, cicha lista). */
  drift: RhythmObject[]
  source: FocusProjection['source']
}

export function focusDetail(s: RhythmScenario, unit: TimeUnit): FocusDetail {
  const focus = focusForUnit(s, unit)
  const priorities = s.priorities.filter(p => focus.priorityKeys.includes(p.key))
  if (unit.kind === 'week') {
    const plan = s.weekPlans.find(p => p.weekRef === unit.ref)
    const monthTop = s.monthPlans.find(p => p.monthRef === unit.monthRef)?.topPriorityKeys ?? []
    const objects = (plan?.topObjectKeys ?? []).map(k => objectByKey(s, k)).filter((o): o is RhythmObject => !!o).map(object => ({ object, priorityKeys: priorityKeysOf(s, object) }))
    const drift = objects.filter(({ priorityKeys }) => !priorityKeys.some(k => monthTop.includes(k))).map(x => x.object)
    return { priorities, objects, drift, source: focus.source }
  }
  return { priorities, objects: [], drift: [], source: focus.source }
}

export function journalIn(s: RhythmScenario, unit: TimeUnit): RhythmJournalRecord[] { return recordsIn(s.journal, unit) }
export function emotionsIn(s: RhythmScenario, unit: TimeUnit): RhythmEmotionRecord[] { return recordsIn(s.emotions, unit) }
export function exercisesIn(s: RhythmScenario, unit: TimeUnit): RhythmExerciseRecord[] { return recordsIn(s.exercises, unit) }

export function truncate(text: string, max = 90): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

/* ------------------------------------------------------------------ statystyki okresu (podsumowanie) */

export interface Ratio { done: number; total: number }

/** Rodziny obiektów w podsumowaniu: cele (KR), nawyki, trackery, intencje. */
export type FamilyGroup = 'goal' | 'habit' | 'tracker' | 'intention'
export const FAMILY_GROUPS: { id: FamilyGroup; label: string; icon: string }[] = [
  { id: 'goal', label: 'Cele', icon: 'flag' },
  { id: 'habit', label: 'Nawyki', icon: 'repeat' },
  { id: 'tracker', label: 'Trackery', icon: 'monitoring' },
  { id: 'intention', label: 'Intencje', icon: 'lightbulb' },
]
function familyGroupOf(object: RhythmObject): FamilyGroup | null {
  return object.family === 'keyResult' ? 'goal' : object.family === 'habit' ? 'habit' : object.family === 'tracker' ? 'tracker' : object.family === 'intention' ? 'intention' : null
}

export interface FamilyStat extends Ratio {
  /** Aktywne obiekty rodziny w okresie. */
  objects: number
  /** Co liczy ułamek (może być kilka podstaw naraz): spełnione cele zamkniętych jednostek, zapisane działania z planu, jednostki z zapisem. */
  bases: CompletionBasis[]
}
export type CompletionBasis = 'targets' | 'actions' | 'presence' | 'none'
export interface PeriodStats {
  families: Record<FamilyGroup, FamilyStat>
  /** Refleksje zamkniętych jednostek podrzędnych (tygodnie w miesiącu, miesiące w roku); w tygodniu brak. */
  reflections: Ratio | null
}

function targetMet(value: number | null, target: number | null, operator?: string): boolean | null {
  if (value === null || target === null) return null
  return operator === 'max' || operator === 'lte' ? value <= target : value >= target
}

/** Pełny tydzień jako jednostka skali miesiąca (cel tygodniowy rozwiązywany jak w kolumnie miesiąca). */
function fullWeekUnit(weekRef: WeekRef, clock: DayRef): TimeUnit {
  const bounds = getPeriodBounds(weekRef)
  const monthRef = getPeriodRefsForDate(addDaysToDayRef(bounds.start, 3)).month
  return { ref: weekRef, kind: 'week', label: rangeLabel(bounds), fullBounds: bounds, visibleBounds: bounds, partial: false, state: timeState(bounds, clock), monthRef, weekRef }
}

/**
 * Wykonanie jednego obiektu w okresie:
 *  - z celem: spełnione / sprawdzane cele zamkniętych jednostek (tygodnie kadencji tygodniowej, miesiące miesięcznej);
 *    tydzień bez planu i bez zapisu nie jest sprawdzany (brak zapisu ≠ niewykonanie);
 *  - gdy nie ma jeszcze zamkniętej jednostki (bieżący tydzień): zapisane / zaplanowane działania dnia do zegara;
 *  - bez celu (obserwacje, nawyki bez celu): jednostki z zapisem / jednostki, które już się zaczęły.
 */
export function objectCompletion(s: RhythmScenario, object: RhythmObject, scale: Scale, ref: string, units: TimeUnit[]): { ratio: Ratio; basis: CompletionBasis } {
  const bounds = getPeriodBounds(ref as PeriodRef)
  const clock = s.clock
  const operator = object.target?.kind === 'count' ? object.target.operator : object.target?.operator
  if (object.target) {
    let met = 0
    let checked = 0
    if (object.cadence === 'weekly') {
      const weekRefs = new Set<WeekRef>()
      if (scale === 'week') weekRefs.add(ref as WeekRef)
      else for (const u of units) {
        if (u.kind === 'week') weekRefs.add(u.ref as WeekRef)
        else getChildPeriods(u.ref as MonthRef).forEach(w => weekRefs.add(w))
      }
      const weekUnits = [...weekRefs].map(w => fullWeekUnit(w, clock)).filter(u => u.state === 'past' && u.fullBounds.end >= bounds.start && u.fullBounds.start <= bounds.end)
      for (const u of weekUnits) {
        const series = seriesFor(s, object, [u], 'month', u.monthRef)
        const p = series.points[0]
        if (p.target === null || (!p.planned && p.value === null)) continue
        checked++
        if (targetMet(p.value, p.target, series.operator)) met++
      }
    } else {
      const monthRefs: MonthRef[] = scale === 'year' ? units.filter(u => u.state === 'past').map(u => u.ref as MonthRef) : scale === 'month' && timeState(bounds, clock) === 'past' ? [ref as MonthRef] : []
      for (const monthRef of monthRefs) {
        const series = seriesFor(s, object, unitsFor('month', monthRef, clock), 'month', monthRef)
        const t = series.periodTotal
        if (!t || t.target === null) continue
        const mb = getPeriodBounds(monthRef)
        const monthUnit: TimeUnit = { ref: monthRef, kind: 'month', label: '', fullBounds: mb, visibleBounds: mb, partial: false, state: timeState(mb, clock), monthRef }
        if (t.value === null && !s.assignments.some(a => a.objectKey === object.key && assignmentInUnit(a, monthUnit))) continue
        checked++
        if (targetMet(t.value, t.target, operator)) met++
      }
    }
    if (checked) return { ratio: { done: met, total: checked }, basis: 'targets' }
    /* bez zamkniętej jednostki: działania dnia z planu, które już się zaczęły */
    let planned = 0
    let done = 0
    for (const a of s.assignments) {
      if (a.cancelled || a.objectKey !== object.key || a.scope.kind !== 'day' || !inBounds(a.scope.ref, bounds) || a.scope.ref > clock) continue
      planned++
      if (s.entries.some(e => e.objectKey === object.key && isRecorded(e) && e.dayRef === a.scope.ref)) done++
    }
    if (planned) return { ratio: { done, total: planned }, basis: 'actions' }
    return { ratio: { done: 0, total: 0 }, basis: 'none' }
  }
  /* bez celu: obecność zapisu w jednostkach, które już się zaczęły */
  const started = units.filter(u => u.visibleBounds.start <= clock)
  const withEntry = started.filter(u => s.entries.some(e => e.objectKey === object.key && isRecorded(e) && entryInUnit(e, u))).length
  return { ratio: { done: withEntry, total: started.length }, basis: started.length ? 'presence' : 'none' }
}

export function periodStats(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[]): PeriodStats {
  const periodUnits = scale === 'week' ? [fullWeekUnit(ref as WeekRef, s.clock)] : units
  const objects = activeInPeriod(s, measurableObjects(s), periodUnits)
  const families = {} as Record<FamilyGroup, FamilyStat>
  for (const g of FAMILY_GROUPS) families[g.id] = { done: 0, total: 0, objects: 0, bases: [] }
  for (const object of objects) {
    const group = familyGroupOf(object)
    if (!group) continue
    const { ratio, basis } = objectCompletion(s, object, scale, ref, units)
    const f = families[group]
    f.objects++
    f.done += ratio.done
    f.total += ratio.total
    if (basis !== 'none' && !f.bases.includes(basis)) f.bases.push(basis)
  }

  let reflections: Ratio | null = null
  if (scale !== 'week') {
    const past = units.filter(u => u.state === 'past')
    reflections = { done: past.filter(u => reflectionForUnit(s, u).exists).length, total: past.length }
  }
  return { families, reflections }
}

/* ------------------------------------------------------------------ ocena okresu (główny element podsumowania) */

export interface PeriodRating {
  scale: Scale
  exists: boolean
  status: 'done' | 'draft' | 'none'
  /** Tydzień: Wysiłek i Stan per obszar (Ciało · Emocje · Działanie · Relacje). */
  effort?: (number | null)[]
  state?: (number | null)[]
  /** Miesiąc: kompas; rok: średnie osi kompasu z refleksji miesięcy. */
  compass?: (number | null)[]
  /** Liczba główna: tydzień = średni Stan, miesiąc/rok = średnia kompasu. */
  mean: number | null
  /** Tydzień: średni Wysiłek. */
  meanEffort?: number | null
  /** Rok: miesiące z refleksją / miesiące zamknięte. */
  months?: Ratio
}

function mean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

export function periodRating(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[]): PeriodRating {
  if (scale === 'year') {
    const past = units.filter(u => u.state === 'past')
    const records = past.map(u => reflectionForUnit(s, u).monthly).filter((r): r is RhythmMonthlyReflection => !!r)
    const compass = COMPASS.map((_, i) => mean(records.map(r => r.compass[i] ?? null)))
    return { scale, exists: records.length > 0, status: records.length ? 'done' : 'none', compass, mean: mean(compass), months: { done: records.length, total: past.length } }
  }
  const own = ownReflection(s, scale, ref)
  if (!own?.exists) return { scale, exists: false, status: 'none', mean: null }
  if (own.monthly) return { scale, exists: true, status: own.status, compass: own.monthly.compass, mean: mean(own.monthly.compass) }
  const w = own.weekly!
  return { scale, exists: true, status: own.status, effort: w.effort, state: w.state, mean: mean(w.state), meanEffort: mean(w.effort) }
}

/** Deduplikacja po id zapisu — obiekt widoczny pod dwoma priorytetami liczy się raz. */
export function uniqueRecordCount(cells: CellProjection[]): number {
  return new Set(cells.flatMap(c => c.recordIds)).size
}
