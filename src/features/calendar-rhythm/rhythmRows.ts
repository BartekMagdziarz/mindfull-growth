/**
 * Board rows as a pure function of the UI state (ported from the Lab): tabela pokazuje jedno „spojrzenie” naraz
 * (kierunek, rodzina obiektów, fokus podokresów, oceny podokresów albo wpisy), wybierane listą
 * w rogu osi. Lista opcji zależy od okresu: tylko kierunki i rodziny z aktywnością.
 */
import type { PeriodRef } from '@/domain/period'
import type { WeekPoint } from '@/domain/loadStateSeries'
import type { LifeAreaKey } from '@/domain/reflectionMatrix'
import {
  AREAS,
  AREA_ICONS,
  AREA_KEYS,
  ENTRY_KINDS,
  areaSeriesFor,
  unitWeekRefs,
  yearWeekRefs,
  FAMILY_LABEL,
  TYPE_ORDER,
  activeInPeriod,
  directionsForPeriod,
  entriesForUnit,
  focusForUnit,
  measurableObjects,
  objectsForPriority,
  ownReflection,
  reflectionForUnit,
  seriesFor,
  type EntriesProjection,
  type EntryKind,
  type FamilyGroup,
  type ReflectionProjection,
  type Scale,
  type SeriesProjection,
  type TimeUnit,
} from './rhythmProjections'
import type { RhythmObject, RhythmPriority, RhythmScenario } from './rhythmScenario'
import { getPeriodBounds } from '@/utils/periods'

export type ViewGroup = 'Kierunki' | 'Obiekty' | 'Okres'
export interface ViewOption {
  id: string
  label: string
  icon: string
  group: ViewGroup
}

const FAMILY_ICON: Record<RhythmObject['family'], string> = {
  goal: 'flag',
  keyResult: 'flag',
  habit: 'repeat',
  tracker: 'monitoring',
  intention: 'lightbulb',
}
/** Kafel rodziny w podsumowaniu → spojrzenie tabeli. */
export const FAMILY_VIEW: Record<FamilyGroup, string> = {
  goal: 'type:keyResult',
  habit: 'type:habit',
  tracker: 'type:tracker',
  intention: 'type:intention',
}

export type BoardRow =
  | { kind: 'focus-lane'; id: string; priority: RhythmPriority; focused: boolean[] }
  | { kind: 'series'; id: string; series: SeriesProjection; scaleMax: number }
  | { kind: 'observations-label'; id: string }
  /** Nagłówek grupy wierszy (np. „Fokus tygodnia”). */
  | { kind: 'sublabel'; id: string; text: string }
  /** Tydzień / miesiąc: treść refleksji okresu zamiast wierszy — oś jednostek się wtedy nie rysuje. */
  | { kind: 'reflection-own'; id: string; reflection: ReflectionProjection; future: boolean }
  | { kind: 'reflection-units'; id: string; cells: ReflectionProjection[] }
  /** Obciążenie i stan jednego obszaru jako wstęga nad tygodniami okresu. */
  | {
      kind: 'reflection-area'
      id: string
      area: LifeAreaKey
      label: string
      icon: string
      points: WeekPoint[]
    }
  | {
      kind: 'entries-kind'
      id: string
      kindId: EntryKind
      label: string
      icon: string
      cells: EntriesProjection[]
    }
  | { kind: 'more'; id: string; label: string }
  | { kind: 'note'; id: string; text: string }

export interface RowsUi {
  moreSeries: string | null
}

const MAX_SERIES = 3

/**
 * Opcje listy spojrzeń dla okresu. Te same identyfikatory znaczą to samo w każdej skali:
 * `focus` = fokus oglądanego okresu (tydzień: obiekty z planu, miesiąc: kierunki z planu) — spojrzenie domyślne;
 * `focus-units` = fokus podokresów; `reflection` = treść refleksji okresu; `ratings` = oceny podokresów.
 * Rok nie ma własnego fokusu ani refleksji w tabeli (motyw roku zostaje w podsumowaniu).
 */
export function viewOptions(
  s: RhythmScenario,
  scale: Scale,
  ref: string,
  units: TimeUnit[]
): ViewOption[] {
  const { focus, rest } = directionsForPeriod(s, scale, ref, units)
  const withActivity = (p: RhythmPriority) =>
    activeInPeriod(s, objectsForPriority(s, p.key), units).length > 0
  const directions = [...focus, ...rest.filter(withActivity)]
  const out: ViewOption[] = []
  if (scale !== 'year')
    out.push({
      id: 'focus',
      label: scale === 'week' ? 'Fokus tygodnia' : 'Fokus miesiąca',
      icon: 'star',
      group: 'Kierunki',
    })
  out.push(
    ...directions.map(
      (p): ViewOption => ({ id: `dir:${p.key}`, label: p.title, icon: p.icon, group: 'Kierunki' })
    )
  )
  if (scale !== 'week')
    out.push({
      id: 'focus-units',
      label: scale === 'month' ? 'Fokus tygodni' : 'Fokus miesięcy',
      icon: 'star',
      group: 'Kierunki',
    })
  const active = activeInPeriod(s, measurableObjects(s), units)
  for (const family of TYPE_ORDER) {
    if (active.some(o => o.family === family))
      out.push({
        id: `type:${family}`,
        label: FAMILY_LABEL[family],
        icon: FAMILY_ICON[family],
        group: 'Obiekty',
      })
  }
  if (scale !== 'year')
    out.push({
      id: 'reflection',
      label: scale === 'week' ? 'Refleksja' : 'Refleksja miesiąca',
      icon: 'history_edu',
      group: 'Okres',
    })
  if (scale !== 'week')
    out.push({
      id: 'ratings',
      label: scale === 'month' ? 'Oceny tygodni' : 'Oceny miesięcy',
      icon: 'monitoring',
      group: 'Okres',
    })
  out.push({ id: 'entries', label: 'Wpisy', icon: 'edit_note', group: 'Okres' })
  return out
}

/** Żądane spojrzenie, jeśli ma sens w okresie; inaczej pierwsze z listy (fokus okresu). Wybór w URL zostaje „lepki” między okresami. */
export function resolveView(
  s: RhythmScenario,
  scale: Scale,
  ref: string,
  units: TimeUnit[],
  requested: string | null
): string {
  const options = viewOptions(s, scale, ref, units)
  if (requested && options.some(o => o.id === requested)) return requested
  return options[0]?.id ?? 'entries'
}

export function viewLabel(s: RhythmScenario, view: string): string {
  if (view.startsWith('dir:'))
    return s.priorities.find(p => p.key === view.slice(4))?.title ?? 'Kierunek'
  if (view.startsWith('type:'))
    return FAMILY_LABEL[view.slice(5) as RhythmObject['family']] ?? 'Obiekty'
  return view === 'focus' || view === 'focus-units'
    ? 'Fokus'
    : view === 'reflection'
      ? 'Refleksja'
      : view === 'ratings'
        ? 'Oceny'
        : 'Wpisy'
}

/** Wspólna skala słupków w obrębie tej samej jednostki miary. */
function sharedScaleMax(all: SeriesProjection[]): (series: SeriesProjection) => number {
  const maxByUnit = new Map<string, number>()
  for (const series of all) {
    if (series.markKind !== 'bar-target') continue
    const key = series.unit ?? series.objectKey
    maxByUnit.set(key, Math.max(maxByUnit.get(key) ?? 1, series.maxValue))
  }
  return series =>
    series.markKind === 'bar-target'
      ? (maxByUnit.get(series.unit ?? series.objectKey) ?? series.maxValue)
      : series.maxValue
}

function seriesRows(
  s: RhythmScenario,
  objects: RhythmObject[],
  units: TimeUnit[],
  scale: Scale,
  ref: string,
  parentId: string,
  ui: RowsUi
): BoardRow[] {
  const actions = objects.filter(o => o.evidenceRole === 'action')
  const observations = objects.filter(o => o.evidenceRole === 'observation')
  const showAll = ui.moreSeries === parentId
  const visibleActions = showAll ? actions : actions.slice(0, MAX_SERIES)
  const all = [...visibleActions, ...(showAll || !actions.length ? observations : [])].map(o =>
    seriesFor(s, o, units, scale, ref)
  )
  const scaleMax = sharedScaleMax(all)
  const rows: BoardRow[] = []
  let observationHeader = false
  for (const series of all) {
    if (series.evidenceRole === 'observation' && !observationHeader) {
      rows.push({ kind: 'observations-label', id: `${parentId}:obs` })
      observationHeader = true
    }
    // id z rodzicem: ten sam obiekt może stać pod dwoma kierunkami fokusu miesiąca
    rows.push({
      kind: 'series',
      id: `${parentId}:obj:${series.objectKey}`,
      series,
      scaleMax: scaleMax(series),
    })
  }
  const collapsible = actions.length > MAX_SERIES || (actions.length > 0 && observations.length > 0)
  if (!collapsible) return rows
  if (showAll) rows.push({ kind: 'more', id: `${parentId}:more`, label: 'Zwiń pozostałe' })
  else
    rows.push({
      kind: 'more',
      id: `${parentId}:more`,
      label: `Pozostałe działania (${actions.length - visibleActions.length + observations.length})`,
    })
  return rows
}

/** Fokus tygodnia: obiekty z planu tygodnia w kolejności planu, wszystkie naraz (bez „Pozostałych” — reszta jest w innych spojrzeniach). */
function weekFocusRows(s: RhythmScenario, units: TimeUnit[], ref: string): BoardRow[] {
  const keys = s.weekPlans.find(p => p.weekRef === ref)?.topObjectKeys ?? []
  const measurable = measurableObjects(s)
  const objects = keys.flatMap(key => measurable.filter(o => o.key === key))
  if (!objects.length)
    return [
      {
        kind: 'note',
        id: 'focus:empty',
        text: 'Brak wybranego fokusu tygodnia — pozostałe obiekty są w innych spojrzeniach listy.',
      },
    ]
  const series = objects.map(o => seriesFor(s, o, units, 'week', ref))
  const scaleMax = sharedScaleMax(series)
  return [
    { kind: 'sublabel', id: 'focus:label', text: 'Fokus tygodnia' },
    ...series.map(
      (x): BoardRow => ({
        kind: 'series',
        id: `focus:obj:${x.objectKey}`,
        series: x,
        scaleMax: scaleMax(x),
      })
    ),
  ]
}

/** Fokus miesiąca: kierunki z planu miesiąca, każdy jako nagłówek z własnymi działaniami (3 + „Pozostałe”, jak w spojrzeniu kierunku). */
function monthFocusRows(s: RhythmScenario, units: TimeUnit[], ref: string, ui: RowsUi): BoardRow[] {
  const keys = s.monthPlans.find(p => p.monthRef === ref)?.topPriorityKeys ?? []
  const priorities = keys.flatMap(key => s.priorities.filter(p => p.key === key))
  if (!priorities.length)
    return [
      {
        kind: 'note',
        id: 'focus:empty',
        text: 'Brak wybranego fokusu miesiąca — kierunki i obiekty są w innych spojrzeniach listy.',
      },
    ]
  return priorities.flatMap((priority): BoardRow[] => {
    const parentId = `focus:${priority.key}`
    const active = activeInPeriod(s, objectsForPriority(s, priority.key), units)
    const head: BoardRow = { kind: 'sublabel', id: `${parentId}:label`, text: priority.title }
    if (!active.length)
      return [head, { kind: 'note', id: `${parentId}:empty`, text: 'Brak działań w tym okresie.' }]
    return [head, ...seriesRows(s, active, units, 'month', ref, parentId, ui)]
  })
}

export function buildRows(
  s: RhythmScenario,
  scale: Scale,
  ref: string,
  units: TimeUnit[],
  view: string,
  ui: RowsUi
): BoardRow[] {
  if (view.startsWith('dir:')) {
    const active = activeInPeriod(s, objectsForPriority(s, view.slice(4)), units)
    if (!active.length)
      return [{ kind: 'note', id: `${view}:empty`, text: 'Brak działań w tym okresie.' }]
    return seriesRows(s, active, units, scale, ref, view, ui)
  }
  if (view.startsWith('type:')) {
    const active = activeInPeriod(
      s,
      measurableObjects(s).filter(o => o.family === view.slice(5)),
      units
    )
    if (!active.length)
      return [
        { kind: 'note', id: `${view}:empty`, text: 'Brak obiektów tego rodzaju w tym okresie.' },
      ]
    // rodzina pokazuje wszystkie swoje obiekty — lista jest już zawężona
    return seriesRows(s, active, units, scale, ref, view, { moreSeries: view })
  }
  if (view === 'focus') {
    if (scale === 'week') return weekFocusRows(s, units, ref)
    return monthFocusRows(s, units, ref, ui)
  }
  if (view === 'focus-units') {
    const candidates = s.priorities.filter(p =>
      units.some(u => focusForUnit(s, u).priorityKeys.includes(p.key))
    )
    if (!candidates.length)
      return [{ kind: 'note', id: 'focus:empty', text: 'Brak zapisanego fokusu w tym okresie.' }]
    return candidates.map(priority => ({
      kind: 'focus-lane',
      id: `focus:${priority.key}`,
      priority,
      focused: units.map(u => focusForUnit(s, u).priorityKeys.includes(priority.key)),
    }))
  }
  if (view === 'reflection') {
    return [
      {
        kind: 'reflection-own',
        id: 'reflection:own',
        reflection: ownReflection(s, scale, ref)!,
        future: getPeriodBounds(ref as PeriodRef).start > s.clock,
      },
    ]
  }
  if (view === 'ratings') {
    // Obszary jako wstęgi (miesiąc: tygodnie kolumn; rok: wszystkie tygodnie roku na całej szerokości), rok dodatkowo kompas miesięcy.
    const weekRefs = scale === 'month' ? unitWeekRefs(units) : yearWeekRefs(ref)
    const series = areaSeriesFor(s, weekRefs)
    const rows: BoardRow[] = AREA_KEYS.map((area, i) => ({
      kind: 'reflection-area',
      id: `ratings:${area}`,
      area,
      label: AREAS[i],
      icon: AREA_ICONS[i],
      points: series[area],
    }))
    if (scale === 'year')
      rows.push({
        kind: 'reflection-units',
        id: 'ratings:units',
        cells: units.map(u => reflectionForUnit(s, u)),
      })
    return rows
  }
  const entries = units.map(u => entriesForUnit(s, u))
  return ENTRY_KINDS.map(kind => ({
    kind: 'entries-kind',
    id: `entries:${kind.id}`,
    kindId: kind.id,
    label: kind.label,
    icon: kind.icon,
    cells: entries,
  }))
}
