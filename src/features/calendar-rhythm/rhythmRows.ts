/**
 * Board rows as a pure function of the UI state (ported from the Lab): tabela pokazuje jedno „spojrzenie” naraz
 * (kierunek, rodzina obiektów, fokus podokresów, oceny podokresów albo wpisy), wybierane listą
 * w rogu osi. Lista opcji zależy od okresu: tylko kierunki i rodziny z aktywnością.
 */
import {
  ENTRY_KINDS,
  FAMILY_LABEL,
  TYPE_ORDER,
  activeInPeriod,
  directionsForPeriod,
  entriesForUnit,
  focusForUnit,
  measurableObjects,
  objectsForPriority,
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

export type ViewGroup = 'Kierunki' | 'Obiekty' | 'Okres'
export interface ViewOption { id: string; label: string; icon: string; group: ViewGroup }

const FAMILY_ICON: Record<RhythmObject['family'], string> = { goal: 'flag', keyResult: 'flag', habit: 'repeat', tracker: 'monitoring', intention: 'lightbulb' }
/** Kafel rodziny w podsumowaniu → spojrzenie tabeli. */
export const FAMILY_VIEW: Record<FamilyGroup, string> = { goal: 'type:keyResult', habit: 'type:habit', tracker: 'type:tracker', intention: 'type:intention' }

export type BoardRow =
  | { kind: 'focus-lane'; id: string; priority: RhythmPriority; focused: boolean[] }
  | { kind: 'series'; id: string; series: SeriesProjection; scaleMax: number }
  | { kind: 'observations-label'; id: string }
  | { kind: 'reflection-units'; id: string; cells: ReflectionProjection[] }
  | { kind: 'entries-kind'; id: string; kindId: EntryKind; label: string; icon: string; cells: EntriesProjection[] }
  | { kind: 'more'; id: string; label: string }
  | { kind: 'note'; id: string; text: string }

export interface RowsUi { moreSeries: string | null }

const MAX_SERIES = 3

/** Opcje listy spojrzeń dla okresu: kierunki (fokus najpierw, potem aktywne), fokus podokresów, rodziny z aktywnością, oceny, wpisy. */
export function viewOptions(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[]): ViewOption[] {
  const { focus, rest } = directionsForPeriod(s, scale, ref, units)
  const withActivity = (p: RhythmPriority) => activeInPeriod(s, objectsForPriority(s, p.key), units).length > 0
  const directions = [...focus, ...rest.filter(withActivity)]
  const out: ViewOption[] = directions.map(p => ({ id: `dir:${p.key}`, label: p.title, icon: p.icon, group: 'Kierunki' }))
  if (scale !== 'week') out.push({ id: 'focus', label: scale === 'month' ? 'Fokus tygodni' : 'Fokus miesięcy', icon: 'star', group: 'Kierunki' })
  const active = activeInPeriod(s, measurableObjects(s), units)
  for (const family of TYPE_ORDER) {
    if (active.some(o => o.family === family)) out.push({ id: `type:${family}`, label: FAMILY_LABEL[family], icon: FAMILY_ICON[family], group: 'Obiekty' })
  }
  if (scale !== 'week') out.push({ id: 'reflection', label: scale === 'month' ? 'Oceny tygodni' : 'Oceny miesięcy', icon: 'history_edu', group: 'Okres' })
  out.push({ id: 'entries', label: 'Wpisy', icon: 'edit_note', group: 'Okres' })
  return out
}

/** Żądane spojrzenie, jeśli ma sens w okresie; inaczej pierwsze z listy (fokus okresu). Wybór w URL zostaje „lepki” między okresami. */
export function resolveView(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[], requested: string | null): string {
  const options = viewOptions(s, scale, ref, units)
  if (requested && options.some(o => o.id === requested)) return requested
  return options[0]?.id ?? 'entries'
}

export function viewLabel(s: RhythmScenario, view: string): string {
  if (view.startsWith('dir:')) return s.priorities.find(p => p.key === view.slice(4))?.title ?? 'Kierunek'
  if (view.startsWith('type:')) return FAMILY_LABEL[view.slice(5) as RhythmObject['family']] ?? 'Obiekty'
  return view === 'focus' ? 'Fokus' : view === 'reflection' ? 'Oceny' : 'Wpisy'
}

function seriesRows(s: RhythmScenario, objects: RhythmObject[], units: TimeUnit[], scale: Scale, ref: string, parentId: string, ui: RowsUi): BoardRow[] {
  const actions = objects.filter(o => o.evidenceRole === 'action')
  const observations = objects.filter(o => o.evidenceRole === 'observation')
  const showAll = ui.moreSeries === parentId
  const visibleActions = showAll ? actions : actions.slice(0, MAX_SERIES)
  const all = [...visibleActions, ...(showAll || !actions.length ? observations : [])].map(o => seriesFor(s, o, units, scale, ref))
  // wspólna skala słupków w obrębie tej samej jednostki miary
  const maxByUnit = new Map<string, number>()
  for (const series of all) {
    if (series.markKind !== 'bar-target') continue
    const key = series.unit ?? series.objectKey
    maxByUnit.set(key, Math.max(maxByUnit.get(key) ?? 1, series.maxValue))
  }
  const rows: BoardRow[] = []
  let observationHeader = false
  for (const series of all) {
    if (series.evidenceRole === 'observation' && !observationHeader) {
      rows.push({ kind: 'observations-label', id: `${parentId}:obs` })
      observationHeader = true
    }
    rows.push({ kind: 'series', id: `obj:${series.objectKey}`, series, scaleMax: series.markKind === 'bar-target' ? (maxByUnit.get(series.unit ?? series.objectKey) ?? series.maxValue) : series.maxValue })
  }
  const collapsible = actions.length > MAX_SERIES || (actions.length > 0 && observations.length > 0)
  if (!collapsible) return rows
  if (showAll) rows.push({ kind: 'more', id: `${parentId}:more`, label: 'Zwiń pozostałe' })
  else rows.push({ kind: 'more', id: `${parentId}:more`, label: `Pozostałe działania (${actions.length - visibleActions.length + observations.length})` })
  return rows
}

export function buildRows(s: RhythmScenario, scale: Scale, ref: string, units: TimeUnit[], view: string, ui: RowsUi): BoardRow[] {
  if (view.startsWith('dir:')) {
    const active = activeInPeriod(s, objectsForPriority(s, view.slice(4)), units)
    if (!active.length) return [{ kind: 'note', id: `${view}:empty`, text: 'Brak działań w tym okresie.' }]
    return seriesRows(s, active, units, scale, ref, view, ui)
  }
  if (view.startsWith('type:')) {
    const active = activeInPeriod(s, measurableObjects(s).filter(o => o.family === view.slice(5)), units)
    if (!active.length) return [{ kind: 'note', id: `${view}:empty`, text: 'Brak obiektów tego rodzaju w tym okresie.' }]
    // rodzina pokazuje wszystkie swoje obiekty — lista jest już zawężona
    return seriesRows(s, active, units, scale, ref, view, { moreSeries: view })
  }
  if (view === 'focus') {
    if (scale === 'week') return [{ kind: 'note', id: 'focus:week', text: 'Fokus tygodnia jest w podsumowaniu nad tabelą.' }]
    const candidates = s.priorities.filter(p => units.some(u => focusForUnit(s, u).priorityKeys.includes(p.key)))
    if (!candidates.length) return [{ kind: 'note', id: 'focus:empty', text: 'Brak zapisanego fokusu w tym okresie.' }]
    return candidates.map(priority => ({ kind: 'focus-lane', id: `focus:${priority.key}`, priority, focused: units.map(u => focusForUnit(s, u).priorityKeys.includes(priority.key)) }))
  }
  if (view === 'reflection') {
    if (scale === 'week') return [{ kind: 'note', id: 'reflection:week', text: 'Ocena tygodnia jest w podsumowaniu nad tabelą.' }]
    return [{ kind: 'reflection-units', id: 'reflection:units', cells: units.map(u => reflectionForUnit(s, u)) }]
  }
  const entries = units.map(u => entriesForUnit(s, u))
  return ENTRY_KINDS.map(kind => ({ kind: 'entries-kind', id: `entries:${kind.id}`, kindId: kind.id, label: kind.label, icon: kind.icon, cells: entries }))
}
