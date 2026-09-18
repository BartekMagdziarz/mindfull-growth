import type { LabFixtureObject, LabFixtureScenario, LabPriority } from '@product/dev/richVerificationScenario'

// Wspólna warstwa obliczeń dla konceptów widoku działania (warianty 12–16).
// Wyłącznie czyste funkcje na fixture — zero repozytoriów i zero stanu.

export type Point = { x: number; y: number }

export const familyIcon: Record<LabFixtureObject['family'], string> = {
  goal: 'outlined_flag',
  keyResult: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  intention: 'gps_fixed',
}

export const priorityIcon: Record<string, string> = {
  movement: 'directions_run',
  stream: 'rocket_launch',
  relationships: 'favorite',
  learning: 'school',
}

export const WEEK_FOCUS_KEYS = ['kr-runs', 'kr-deep-work', 'habit-stretch']

export const WEEKDAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']

export function addDays(dayRef: string, amount: number): string {
  const date = new Date(`${dayRef}T12:00:00`)
  date.setDate(date.getDate() + amount)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function weekdayIndexMonday(dayRef: string): number {
  return (new Date(`${dayRef}T12:00:00`).getDay() + 6) % 7
}

export function shortDayLabel(dayRef: string): string {
  return WEEKDAY_SHORT[new Date(`${dayRef}T12:00:00`).getDay()]
}

export function getWeekNumber(dayRef: string): number {
  const [year, month, day] = dayRef.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7)
}

// --- pule obiektów -------------------------------------------------------------

export function activeObjects(fixture: LabFixtureScenario): LabFixtureObject[] {
  return fixture.objects.filter(item => item.status !== 'retired')
}

/** Obiekty, które wolno dołożyć do planu dnia: aktywne i osadzone (bez sierot bez celu/priorytetu). */
export function plannableObjects(fixture: LabFixtureScenario): LabFixtureObject[] {
  return activeObjects(fixture).filter(item => item.status !== 'orphan')
}

export function weeklyObjects(fixture: LabFixtureScenario): LabFixtureObject[] {
  return activeObjects(fixture).filter(item => item.cadence === 'weekly')
}

export function baseDayItems(fixture: LabFixtureScenario): LabFixtureObject[] {
  return weeklyObjects(fixture).filter(item => item.todayDone !== undefined || item.todayValue !== undefined)
}

export interface DayGroup {
  key: string
  label: string
  items: LabFixtureObject[]
}

const GROUPS: Array<{ key: string; label: string; families: LabFixtureObject['family'][] }> = [
  { key: 'intentions', label: 'Intencje tygodnia', families: ['intention'] },
  { key: 'goals', label: 'Cele i rezultaty', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', families: ['tracker'] },
]

export function groupDayItems(items: LabFixtureObject[]): DayGroup[] {
  return GROUPS
    .map(group => ({ key: group.key, label: group.label, items: items.filter(item => group.families.includes(item.family)) }))
    .filter(group => group.items.length > 0)
}

// --- kompas: priorytety + fokus tygodnia -----------------------------------------

export interface CompassTile {
  key: string
  kind: 'priority' | 'focus'
  icon: string
  title: string
  tone?: LabPriority['tone']
  hoverKey: string
}

export function compassTiles(fixture: LabFixtureScenario): CompassTile[] {
  const priorities: CompassTile[] = fixture.priorities.slice(0, 3).map(priority => ({
    key: `priority-${priority.key}`,
    kind: 'priority',
    icon: priorityIcon[priority.key] ?? 'explore',
    title: priority.title,
    tone: priority.tone,
    hoverKey: `priority:${priority.key}`,
  }))
  const focus: CompassTile[] = WEEK_FOCUS_KEYS
    .map(key => weeklyObjects(fixture).find(item => item.key === key))
    .filter((item): item is LabFixtureObject => Boolean(item))
    .map(item => ({
      key: `focus-${item.key}`,
      kind: 'focus',
      icon: familyIcon[item.family],
      title: item.title,
      hoverKey: `object:${item.key}`,
    }))
  return [...priorities, ...focus]
}

export function isRelated(item: LabFixtureObject, hoverKey: string | null): boolean {
  if (!hoverKey) return false
  if (hoverKey.startsWith('priority:')) return item.priorityKeys.includes(hoverKey.slice('priority:'.length))
  return item.key === hoverKey.slice('object:'.length)
}

// --- postęp do celu tygodnia -------------------------------------------------------

export function currentWeekPoint(fixture: LabFixtureScenario, item: LabFixtureObject) {
  return item.chart.find(point => point.periodRef === fixture.refs.currentWeek)
}

/** 0–1: uniwersalny postęp względem celu tygodnia (dla „≤” liczony jako zapas). */
export function weekTargetProgress(fixture: LabFixtureScenario, item: LabFixtureObject): number | null {
  const point = currentWeekPoint(fixture, item)
  if (!point || point.value === undefined || point.target === undefined || point.target <= 0) return null
  const capped = (item.targetLabel ?? '').includes('≤')
  if (capped) return Math.max(0, Math.min(1, 1 - point.value / (point.target * 1.6)))
  return Math.max(0, Math.min(1, point.value / point.target))
}

export function weekProgressLabel(fixture: LabFixtureScenario, item: LabFixtureObject): string | null {
  const point = currentWeekPoint(fixture, item)
  if (!point || point.value === undefined || point.target === undefined) return null
  return `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(point.value)}/${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(point.target)}`
}

// --- kalendarz: tydzień / miesiąc ---------------------------------------------------

export interface CalendarMarker {
  key: string
  kind: 'deadline' | 'ritual'
  icon: string
  title: string
  objectKey?: string
}

export interface CalendarCell {
  dayRef: string
  dayNumber: number
  weekdayLabel: string
  inMonth: boolean
  isToday: boolean
  isPast: boolean
  markers: CalendarMarker[]
}

/** Spreparowane terminy — w produkcie z Goal.targetDate / końca okresu intencji. */
export function deadlineMap(fixture: LabFixtureScenario): Record<string, string> {
  const today = fixture.refs.today
  return {
    'goal-mvp': addDays(today, 4),
    'intention-budget': addDays(today, 6),
    'goal-10k': addDays(today, 12),
  }
}

export function markersFor(fixture: LabFixtureScenario, dayRef: string): CalendarMarker[] {
  const markers: CalendarMarker[] = []
  const pool = activeObjects(fixture)
  for (const [objectKey, deadlineRef] of Object.entries(deadlineMap(fixture))) {
    if (deadlineRef !== dayRef) continue
    const object = pool.find(item => item.key === objectKey)
    if (!object) continue
    markers.push({ key: `deadline-${objectKey}`, kind: 'deadline', icon: familyIcon[object.family], title: object.title, objectKey })
  }
  // rytuały znaczymy tylko przy NAJBLIŻSZYM wystąpieniu — powtarzanie ich na
  // każdym poniedziałku robi z sygnału szum
  const isNextMonday = weekdayIndexMonday(dayRef) === 0 && dayRef > fixture.refs.today && dayRef <= addDays(fixture.refs.today, 7)
  if (isNextMonday) {
    markers.push({ key: `ritual-week-${dayRef}`, kind: 'ritual', icon: 'edit_calendar', title: `Zaplanuj tydzień T${getWeekNumber(dayRef)}` })
  }
  const isNextFirst = dayRef.endsWith('-01') && dayRef > fixture.refs.today && dayRef <= addDays(fixture.refs.today, 31)
  if (isNextFirst) {
    const monthLabel = new Intl.DateTimeFormat('pl-PL', { month: 'long' }).format(new Date(`${dayRef}T12:00:00`))
    markers.push({ key: `ritual-month-${dayRef}`, kind: 'ritual', icon: 'date_range', title: `Zaplanuj ${monthLabel}` })
  }
  return markers
}

/** Deterministyczne rozłożenie wystąpień na dni (w produkcie: przypisania planu tygodnia). */
export function syntheticPlanned(fixture: LabFixtureScenario, item: LabFixtureObject, dayRef: string): boolean {
  const point = currentWeekPoint(fixture, item)
  const target = Math.min(7, Math.max(1, Math.round(point?.target ?? 3)))
  const step = Math.max(1, Math.round(7 / target))
  const seed = weeklyObjects(fixture).findIndex(candidate => candidate.key === item.key)
  return (weekdayIndexMonday(dayRef) + Math.max(0, seed)) % step === 0
}



export function weekCells(fixture: LabFixtureScenario, options?: { forward?: boolean; offset?: number }): CalendarCell[] {
  // widok = orientacja w bieżącym tygodniu (offset przesuwa o pełne tygodnie);
  // celowanie = zawsze 7 dni w przód (bez tego w niedzielę nie byłoby żadnego dnia do wybrania)
  const start = options?.forward
    ? addDays(fixture.refs.today, 1)
    : addDays(fixture.refs.today, -weekdayIndexMonday(fixture.refs.today) + (options?.offset ?? 0) * 7)
  return Array.from({ length: 7 }, (_, offset) => buildCell(fixture, addDays(start, offset), true))
}

export function monthCells(fixture: LabFixtureScenario, options?: { offset?: number }): CalendarCell[] {
  const [baseYear, baseMonth] = fixture.refs.currentMonth.split('-').map(Number)
  const shifted = new Date(baseYear, baseMonth - 1 + (options?.offset ?? 0), 1)
  const year = shifted.getFullYear()
  const month = shifted.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const gridStart = addDays(firstDay, -weekdayIndexMonday(firstDay))
  const cells: CalendarCell[] = []
  for (let offset = 0; offset < 42; offset += 1) {
    const dayRef = addDays(gridStart, offset)
    const [cellYear, cellMonth] = dayRef.split('-').map(Number)
    cells.push(buildCell(fixture, dayRef, cellYear === year && cellMonth === month))
  }
  // ostatni rząd w całości spoza miesiąca → utnij
  return cells.slice(0, cells.slice(35).some(cell => cell.inMonth) ? 42 : 35)
}

export function monthTitle(fixture: LabFixtureScenario, offset = 0): string {
  const [baseYear, baseMonth] = fixture.refs.currentMonth.split('-').map(Number)
  const shifted = new Date(baseYear, baseMonth - 1 + offset, 1)
  const label = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(shifted)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function weekTitle(fixture: LabFixtureScenario, offset = 0): string {
  // krótko: sam numer tygodnia — zakres dat czyta się z komórek paska
  const monday = addDays(fixture.refs.today, -weekdayIndexMonday(fixture.refs.today) + offset * 7)
  return `T${getWeekNumber(monday)}`
}

function buildCell(fixture: LabFixtureScenario, dayRef: string, inMonth: boolean): CalendarCell {
  return {
    dayRef,
    dayNumber: Number(dayRef.slice(-2)),
    weekdayLabel: shortDayLabel(dayRef),
    inMonth,
    isToday: dayRef === fixture.refs.today,
    isPast: dayRef < fixture.refs.today,
    markers: markersFor(fixture, dayRef),
  }
}

// --- wykres obiektu w skali tygodnia (ta sama gramatyka co NextObjectChartCard
// w produkcie i karty planszy fokusu: kropki dni / słupki dni / linia z celem /
// pasmo „cały miesiąc”) -----------------------------------------------------------

export type ObjectWeekChartKind = 'dots' | 'bars' | 'line' | 'span'

export interface ObjectWeekChart {
  kind: ObjectWeekChartKind
  axisLabels: string[]
  cells: string[]
  bars: Array<{ height: number; current: boolean; empty: boolean }>
  line: Point[]
  targetY: number | null
  span: { status: string; fillPct: number }
  spanLabel: string
  summary: string
}

function statusLabelFor(point?: { status: FixtureStatusLike }): string {
  return point?.status === 'met' ? 'na celu' : point?.status === 'missed' ? 'do uwagi' : point?.status === 'no-target' ? 'obserwacja' : 'bez danych'
}
type FixtureStatusLike = 'met' | 'missed' | 'no-data' | 'no-target'

/** Stan wiersza „dziś” z draftu dnia — wykres musi zgadzać się z kontrolką obok. */
export interface LiveDayEntry { done: boolean; value: number }

export function objectWeekChart(fixture: LabFixtureScenario, item: LabFixtureObject, live?: LiveDayEntry): ObjectWeekChart {
  const week = fixture.weeks.find(entry => entry.weekRef === fixture.refs.currentWeek) ?? fixture.weeks.at(-1)!
  const axisLabels = week.days.map(day => day.shortLabel)
  const todayIndex = week.days.findIndex(day => day.dayRef === fixture.refs.today)
  const empty: ObjectWeekChart = {
    kind: 'dots',
    axisLabels,
    cells: [],
    bars: [],
    line: [],
    targetY: null,
    span: { status: 'empty', fillPct: 0 },
    spanLabel: 'cały miesiąc',
    summary: '',
  }

  // intencja tygodnia = jednorazowe zobowiązanie: pasmo „ten tydzień”,
  // nie siedem kropek (kropki sugerowałyby dzienną powtarzalność)
  if (item.family === 'intention') {
    const point = currentWeekPoint(fixture, item)
    const done = (point?.value ?? 0) >= (point?.target ?? 1)
    return {
      ...empty,
      kind: 'span',
      spanLabel: 'ten tydzień',
      span: { status: done ? 'met' : 'empty', fillPct: done ? 100 : 6 },
      summary: '',
    }
  }

  // kadencja miesięczna: pasmo całego miesiąca wypełnione wg statusu
  if (item.cadence === 'monthly') {
    const point = item.chart.find(entry => entry.periodRef === fixture.refs.currentMonth)
    return {
      ...empty,
      kind: 'span',
      span: {
        status: point && point.status !== 'no-data' ? point.status : 'empty',
        fillPct: point?.value === undefined ? 4 : Math.max(6, Math.min(100, (point.value / Math.max(1, point.target ?? point.value)) * 100)),
      },
      summary: `${statusLabelFor(point)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`,
    }
  }

  const point = currentWeekPoint(fixture, item)
  const value = Math.max(0, Math.round(point?.value ?? 0))
  const kind: ObjectWeekChartKind = item.entryMode === 'completion' || item.entryMode === 'multi-completion'
    ? 'dots'
    : item.entryMode === 'value' || item.entryMode === 'rating' ? 'line' : 'bars'
  const summary = `${statusLabelFor(point)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`

  if (kind === 'dots') {
    // dni przeszłe pozycyjnie (fixture nie ma historii per dzień); „dziś” zawsze ze stanu wiersza,
    // a wkład dzisiejszego wykonania z fixture nie liczy się podwójnie do przeszłości
    const pastValue = live ? Math.max(0, value - (item.todayDone ? 1 : 0)) : value
    const assigned = Math.min(7, Math.max(value, Math.round(point?.target ?? 0)))
    const cells = week.days.map((day, index) => {
      if (live && index === todayIndex) return live.done ? 'done' : 'assigned'
      if (day.dayRef > fixture.refs.today) return 'assigned'
      return index < pastValue ? 'done' : index < assigned ? 'missed' : 'unassigned'
    })
    return { ...empty, kind, cells, summary }
  }

  if (kind === 'bars') {
    const total = Math.max(1, value)
    const dailyScale = Math.max(1, Math.ceil(Math.max(value, point?.target ?? 0) / 4))
    const bars = week.days.map((day, index) => {
      if (live && index === todayIndex) {
        return { height: Math.max(10, Math.min(92, (live.value / dailyScale) * 82)), current: true, empty: live.value <= 0 }
      }
      return {
        height: Math.max(8, Math.min(92, (((index + 2) % 4) + 1) * (82 / total))),
        current: day.isToday,
        empty: day.dayRef > fixture.refs.today,
      }
    })
    return { ...empty, kind, bars, summary }
  }

  const sampleCount = Math.max(1, week.days.filter(day => day.dayRef <= fixture.refs.today).length)
  const center = point?.value ?? item.todayValue ?? 0
  const target = point?.target
  const max = Math.max(1, center + 1, target ?? 0, live?.value ?? 0)
  const line = Array.from({ length: sampleCount }, (_, index) => ({
    x: sampleCount === 1 ? 250 : Math.round(5 + index * (490 / (sampleCount - 1))),
    // ostatnia próbka = dzisiejszy wpis z wiersza (0 = brak wpisu → punkt na osi)
    y: Math.round(88 - ((live && index === sampleCount - 1 ? live.value : Math.max(0, center + ((index % 3) - 1) * 0.35)) / max) * 68),
  }))
  return {
    ...empty,
    kind,
    line,
    targetY: target === undefined ? null : Math.round(88 - (target / max) * 68),
    summary,
  }
}

// --- „Najbliżej”: nadchodzące terminy i rytuały jako spokojna lista ------------------

export interface UpcomingEntry {
  key: string
  icon: string
  title: string
  dateLabel: string
  dayRef: string
  kind: 'deadline' | 'ritual'
}

export function upcomingEntries(fixture: LabFixtureScenario, horizonDays = 21): UpcomingEntry[] {
  const entries: UpcomingEntry[] = []
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const dayRef = addDays(fixture.refs.today, offset)
    for (const marker of markersFor(fixture, dayRef)) {
      entries.push({
        key: `${marker.key}-${dayRef}`,
        icon: marker.icon,
        title: marker.title,
        dayRef,
        kind: marker.kind,
        dateLabel: offset === 0
          ? 'dziś'
          : `${shortDayLabel(dayRef).toLowerCase()} ${Number(dayRef.slice(-2))}`,
      })
    }
  }
  return entries
}

// --- rytm dnia: 14 dni wykonania ----------------------------------------------------

export function rhythmSeries(fixture: LabFixtureScenario): Array<{ dayRef: string; completion: number }> {
  const days = fixture.weeks
    .flatMap(week => week.days)
    .filter(day => day.dayRef <= fixture.refs.today)
    .sort((left, right) => left.dayRef.localeCompare(right.dayRef))
    .slice(-14)
  return days.map(day => ({ dayRef: day.dayRef, completion: day.completion }))
}

// --- gładka linia (wspólna gramatyka wykresów Lab-u) ---------------------------------

export function smoothPath(points: Point[], offset = 0): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y + offset}`
  const shifted = points.map(point => ({ x: point.x, y: point.y + offset }))
  const commands = [`M ${shifted[0].x.toFixed(1)} ${shifted[0].y.toFixed(1)}`]
  for (let index = 0; index < shifted.length - 1; index += 1) {
    const previous = shifted[Math.max(0, index - 1)]
    const current = shifted[index]
    const next = shifted[index + 1]
    const following = shifted[Math.min(shifted.length - 1, index + 2)]
    const controlOne = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 }
    const controlTwo = { x: next.x - (following.x - current.x) / 6, y: next.y - (following.y - current.y) / 6 }
    commands.push(`C ${controlOne.x.toFixed(1)} ${controlOne.y.toFixed(1)}, ${controlTwo.x.toFixed(1)} ${controlTwo.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`)
  }
  return commands.join(' ')
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)
}
