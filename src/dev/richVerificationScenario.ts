import type { DayRef, MonthRef, WeekRef, YearRef } from '../domain/period'
import {
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPreviousPeriod,
} from '../utils/periods'

export const RICH_SCENARIO_ID = 'rich-v1' as const
export const RICH_SCENARIO_VERSION = 3
export const RICH_CLOSED_MONTHS = 6
export const RICH_CLOSED_WEEKS = 16

export type FixtureStatus = 'met' | 'missed' | 'no-data' | 'no-target'
export type LabViewId =
  | 'today'
  | 'calendar-year'
  | 'calendar-month'
  | 'calendar-week'
  | 'ritual-week'
  | 'ritual-month'
  | 'ritual-year'

export interface FixtureMeta {
  profileId: typeof RICH_SCENARIO_ID
  version: number
  anchorDayRef: DayRef
  generatedAt: string
  closedMonths: number
  closedWeeks: number
}

export interface PeriodPreset {
  id: string
  label: string
  description: string
  periodRef: DayRef | MonthRef | WeekRef | YearRef
  baselinePath: string
  state: 'current' | 'closed' | 'partial'
}

export interface LabChartPoint {
  periodRef: string
  label: string
  value?: number
  target?: number
  status: FixtureStatus
}

export interface LabPriority {
  key: string
  title: string
  whyNow: string
  desiredDirection: string
  progressSignals: string[]
  riskSignals: string[]
  tone: 'blue' | 'mint' | 'lavender' | 'amber'
}

export interface LabFixtureObject {
  key: string
  family: 'goal' | 'keyResult' | 'habit' | 'tracker' | 'intention'
  title: string
  cadence: 'weekly' | 'monthly'
  entryMode: 'completion' | 'counter' | 'value' | 'rating' | 'multi-completion'
  targetLabel?: string
  priorityKeys: string[]
  contribution?: string
  todayValue?: number
  todayDone?: boolean
  status?: 'open' | 'retired' | 'orphan'
  chart: LabChartPoint[]
}

export interface LabWeekDay {
  dayRef: DayRef
  shortLabel: string
  dayNumber: string
  completion: number
  journalCount: number
  emotionCount: number
  isToday: boolean
}

export interface LabWeekSnapshot {
  weekRef: WeekRef
  rangeLabel: string
  completion: number
  dimensions: number[]
  days: LabWeekDay[]
  reflectionComplete: boolean
  note: string
}

export interface LabMonthSnapshot {
  monthRef: MonthRef
  label: string
  completion: number
  priorityEffort: number[]
  weeks: LabWeekSnapshot[]
  reflectionComplete: boolean
  reflectionPartial: boolean
}

export interface LabRitualData {
  weeklySteps: string[]
  monthlySteps: string[]
  weeklyRatings: number[]
  monthlyRatings: Array<number | null>
  anchors: string[]
  weeklyJournal: string
  monthlyJournal: string
}

export interface LabFixtureScenario {
  meta: FixtureMeta
  refs: {
    today: DayRef
    currentWeek: WeekRef
    previousWeek: WeekRef
    currentMonth: MonthRef
    previousMonth: MonthRef
  }
  presets: Record<LabViewId, PeriodPreset[]>
  priorities: LabPriority[]
  objects: LabFixtureObject[]
  weeks: LabWeekSnapshot[]
  months: LabMonthSnapshot[]
  ritual: LabRitualData
}

export interface LabVariantDefinition {
  id: string
  label: string
  description: string
  status: 'reference' | 'experiment' | 'external'
}

export interface LabViewDefinition {
  id: LabViewId
  label: string
  description: string
  icon: string
  presets: PeriodPreset[]
  variants: LabVariantDefinition[]
}

export type VerifyBridgeRequest =
  | { type: 'mindful-growth:verify:status-request'; requestId: string }
  | { type: 'mindful-growth:verify:reset-request'; requestId: string }

export type VerifyBridgeResponse =
  | {
      type: 'mindful-growth:verify:status'
      requestId: string
      ready: boolean
      meta: FixtureMeta
    }
  | {
      type: 'mindful-growth:verify:reset-result'
      requestId: string
      ok: boolean
      meta: FixtureMeta
      error?: string
    }

const PRIORITIES: LabPriority[] = [
  {
    key: 'movement',
    title: 'Regularny ruch i kondycja',
    whyNow: 'Po zimie czuję wyraźny spadek formy, a energia przekłada się na wszystko inne.',
    desiredDirection: 'Ruch 4–5 razy w tygodniu jako oczywisty element dnia.',
    progressSignals: ['Biegam bez zadyszki', 'Lepszy sen'],
    riskSignals: ['Odpuszczanie po intensywnym dniu pracy'],
    tone: 'blue',
  },
  {
    key: 'stream',
    title: 'Dowieźć projekt Strumień',
    whyNow: 'Najbliższe miesiące decydują o tym, czy projekt wejdzie do użycia.',
    desiredDirection: 'Stabilne, cotygodniowe przyrosty zamiast zrywów.',
    progressSignals: ['Regularne wydania funkcji'],
    riskSignals: ['Rozpraszanie się pobocznymi pomysłami'],
    tone: 'lavender',
  },
  {
    key: 'relationships',
    title: 'Obecność dla bliskich',
    whyNow: 'Praca łatwo zjada wieczory — chcę to odwrócić, zanim stanie się normą.',
    desiredDirection: 'Wspólne wieczory i weekendy bez ekranów.',
    progressSignals: ['Wspólne kolacje kilka razy w tygodniu'],
    riskSignals: ['Telefon przy stole'],
    tone: 'mint',
  },
  {
    key: 'learning',
    title: 'Codzienna nauka',
    whyNow: 'Mała, codzienna dawka nauki daje mi poczucie kierunku.',
    desiredDirection: 'Czytanie i kursy jako stały poranny rytuał.',
    progressSignals: ['Skończone książki i rozdziały kursów'],
    riskSignals: ['Scrollowanie zamiast czytania'],
    tone: 'amber',
  },
]

function toDate(dayRef: string): Date {
  return new Date(`${dayRef}T12:00:00`)
}

function toDayRef(date: Date): DayRef {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as DayRef
}

function addDays(dayRef: DayRef, amount: number): DayRef {
  const date = toDate(dayRef)
  date.setDate(date.getDate() + amount)
  return toDayRef(date)
}

function periodLabel(periodRef: string): string {
  if (/^\d{4}-\d{2}$/.test(periodRef)) {
    const [year, month] = periodRef.split('-').map(Number)
    return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1),
    )
  }
  return periodRef.replace('-W', ' · tydz. ')
}

function shortMonth(periodRef: string): string {
  const [year, month] = periodRef.split('-').map(Number)
  return new Intl.DateTimeFormat('pl-PL', { month: 'short' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '')
}

function weekRangeLabel(start: DayRef, end: DayRef): string {
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })
    .formatRange(toDate(start), toDate(end))
}

function previousPeriods<T extends MonthRef | WeekRef>(current: T, count: number): T[] {
  const periods: T[] = []
  let cursor = current
  for (let index = 0; index < count; index += 1) {
    cursor = getPreviousPeriod(cursor) as T
    periods.unshift(cursor)
  }
  return periods
}

function chartForPeriods(periods: string[], phase: number, target?: number): LabChartPoint[] {
  return periods.map((periodRef, index) => {
    const cycle = (index + phase) % 4
    const status: FixtureStatus = cycle === 2 ? 'missed' : cycle === 3 ? 'no-data' : target ? 'met' : 'no-target'
    const value = status === 'no-data' ? undefined : target ? Math.max(1, target + (status === 'met' ? (index % 3) : -2)) : 2 + ((index + phase) % 5)
    return {
      periodRef,
      label: periodRef.includes('-W') ? periodRef.slice(6) : shortMonth(periodRef),
      value,
      target,
      status,
    }
  })
}

function buildWeek(
  weekRef: WeekRef,
  todayRef: DayRef,
  index: number,
  state: 'closed' | 'current' | 'future',
): LabWeekSnapshot {
  const current = state === 'current'
  const start = getPeriodBounds(weekRef).start as DayRef
  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
  const days = dayNames.map((shortLabel, dayIndex) => {
    const dayRef = addDays(start, dayIndex)
    const future = dayRef > todayRef
    return {
      dayRef,
      shortLabel,
      dayNumber: dayRef.slice(-2),
      completion: future ? 0 : 38 + ((index * 11 + dayIndex * 13) % 61),
      journalCount: future ? 0 : (index + dayIndex) % 3 === 0 ? 1 : 0,
      emotionCount: future ? 0 : (index + dayIndex) % 2 === 0 ? 2 : 1,
      isToday: dayRef === todayRef,
    }
  })

  return {
    weekRef,
    rangeLabel: weekRangeLabel(start, addDays(start, 6)),
    completion: state === 'future' ? 0 : current ? 54 : 58 + ((index * 7) % 35),
    dimensions: Array.from({ length: 12 }, (_, dimension) => 2 + ((index + dimension) % 4)),
    days,
    reflectionComplete: state === 'closed',
    note: state === 'current'
      ? 'Tydzień jest w toku — refleksja odblokuje się w sobotę.'
      : state === 'future'
        ? 'Tydzień jest zaplanowany, ale jeszcze się nie rozpoczął.'
        : ['Dobry rytm poranków.', 'Mniej znaczyło więcej.', 'Za mało przestrzeni na regenerację.'][index % 3],
  }
}

function buildObjects(weekRefs: WeekRef[], monthRefs: MonthRef[]): LabFixtureObject[] {
  const weekly = (phase: number, target?: number) => chartForPeriods(weekRefs.slice(-12), phase, target)
  const monthly = (phase: number, target?: number) => chartForPeriods(monthRefs.slice(-6), phase, target)
  return [
    { key: 'goal-10k', family: 'goal', title: 'Przebiec 10 km bez zatrzymania', cadence: 'monthly', entryMode: 'completion', targetLabel: 'Do 30 września', priorityKeys: ['movement'], contribution: 'Daje konkretny dowód odbudowy kondycji.', chart: monthly(0, 1) },
    { key: 'kr-runs', family: 'keyResult', title: 'Biegi 3 razy w tygodniu', cadence: 'weekly', entryMode: 'completion', targetLabel: '3× / tydzień', priorityKeys: ['movement'], todayDone: true, contribution: 'Buduje regularność potrzebną do swobodnego biegu na 10 km.', chart: weekly(0, 3) },
    { key: 'kr-distance', family: 'keyResult', title: '15 km tygodniowo', cadence: 'weekly', entryMode: 'value', targetLabel: '≥ 15 km', priorityKeys: ['movement'], todayValue: 6, contribution: 'Stopniowo zwiększa tolerowany tygodniowy kilometraż.', chart: weekly(1, 15) },
    { key: 'kr-deep-work', family: 'keyResult', title: 'Cztery sesje deep work w tygodniu', cadence: 'weekly', entryMode: 'completion', targetLabel: '4 sesje', priorityKeys: ['stream'], todayDone: false, contribution: 'Chroni czas na regularne przyrosty projektu.', chart: weekly(2, 4) },
    { key: 'habit-stretch', family: 'habit', title: 'Poranne rozciąganie', cadence: 'weekly', entryMode: 'completion', targetLabel: '5× / tydzień', priorityKeys: ['movement'], todayDone: true, contribution: 'Obniża próg wejścia w ruch i pomaga utrzymać ciągłość.', chart: weekly(1, 5) },
    { key: 'habit-dinner', family: 'habit', title: 'Wspólna kolacja', cadence: 'weekly', entryMode: 'completion', targetLabel: '3× / tydzień', priorityKeys: ['relationships'], todayDone: false, contribution: 'Tworzy regularną przestrzeń obecności bez dodatkowego planowania.', chart: weekly(2, 3) },
    { key: 'habit-reading', family: 'habit', title: 'Czytanie 20 minut', cadence: 'weekly', entryMode: 'completion', targetLabel: '4× / tydzień', priorityKeys: ['learning'], todayDone: true, contribution: 'Zamienia ogólny kierunek nauki w małą codzienną praktykę.', chart: weekly(0, 4) },
    { key: 'habit-routine', family: 'habit', title: 'Poranna rutyna', cadence: 'weekly', entryMode: 'rating', targetLabel: 'Śr. ≥ 3 oraz 5 dni', priorityKeys: ['movement'], todayValue: 4, contribution: 'Pokazuje, czy poranki realnie wspierają energię.', chart: weekly(3, 3) },
    { key: 'habit-checklist', family: 'habit', title: 'Poranna checklista', cadence: 'weekly', entryMode: 'multi-completion', targetLabel: '4 dni', priorityKeys: ['movement'], todayValue: 3, contribution: 'Łączy kilka małych zachowań w czytelny rytuał startu dnia.', chart: weekly(2, 4) },
    { key: 'habit-coffee-max', family: 'habit', title: 'Maksymalnie 10 kaw w tygodniu', cadence: 'weekly', entryMode: 'counter', targetLabel: '≤ 10', priorityKeys: ['movement'], todayValue: 2, contribution: 'Pomaga zauważać koszt zmęczenia zamiast maskować go kofeiną.', chart: weekly(1, 10) },
    { key: 'habit-monthly-move', family: 'habit', title: 'Ruch: 12 dni w miesiącu', cadence: 'monthly', entryMode: 'completion', targetLabel: '12 dni', priorityKeys: ['movement'], todayDone: true, contribution: 'Chroni rytm także w tygodniach o nierównym obciążeniu.', chart: monthly(0, 12) },
    { key: 'habit-retired', family: 'habit', title: 'Prasa poranna (wycofane)', cadence: 'weekly', entryMode: 'completion', targetLabel: '2× / tydzień', priorityKeys: [], status: 'retired', chart: weekly(3, 2) },
    { key: 'tracker-sleep', family: 'tracker', title: 'Jakość snu', cadence: 'weekly', entryMode: 'rating', priorityKeys: ['movement'], todayValue: 4, contribution: 'Daje sygnał, czy rosnąca aktywność wspiera regenerację.', chart: weekly(0) },
    { key: 'tracker-coffee', family: 'tracker', title: 'Kawy w ciągu dnia', cadence: 'weekly', entryMode: 'counter', priorityKeys: [], todayValue: 2, chart: weekly(1) },
    { key: 'tracker-evening', family: 'tracker', title: 'Wieczorne wyciszenie', cadence: 'weekly', entryMode: 'multi-completion', priorityKeys: ['movement', 'relationships'], todayValue: 1, contribution: 'Łączy regenerację z obecnością dla bliskich, a nie tylko z wynikiem.', chart: weekly(2) },
    { key: 'intention-budget', family: 'intention', title: 'Zaplanować budżet miesiąca', cadence: 'weekly', entryMode: 'completion', targetLabel: 'Na ten tydzień', priorityKeys: ['stream'], todayDone: false, contribution: 'Zamyka otwartą decyzję blokującą dalszy etap projektu.', chart: weekly(0, 1) },
    { key: 'kr-orphan', family: 'keyResult', title: 'Rezultat bez aktywnego celu', cadence: 'weekly', entryMode: 'completion', targetLabel: '2× / tydzień', priorityKeys: [], status: 'orphan', chart: weekly(2, 2) },
    { key: 'goal-mvp', family: 'goal', title: 'Wydać MVP aplikacji', cadence: 'monthly', entryMode: 'completion', targetLabel: 'Pierwsi użytkownicy', priorityKeys: ['stream'], contribution: 'Daje rzeczywisty kontakt z użytkownikami zamiast dalszego planowania w próżni.', chart: monthly(1, 1) },
    { key: 'goal-orphan', family: 'goal', title: 'Cel zarchiwizowany w trakcie', cadence: 'monthly', entryMode: 'completion', priorityKeys: [], status: 'orphan', chart: monthly(3, 1) },
    { key: 'kr-functions', family: 'keyResult', title: 'Dwie funkcje miesięcznie', cadence: 'monthly', entryMode: 'counter', targetLabel: '2 / miesiąc', priorityKeys: ['stream'], contribution: 'Przekłada wydanie produktu na małe, regularne przyrosty.', chart: monthly(1, 2) },
    { key: 'kr-sleep', family: 'keyResult', title: 'Średnio 7 godzin snu', cadence: 'weekly', entryMode: 'value', targetLabel: 'Śr. ≥ 7 h', priorityKeys: ['movement'], contribution: 'Pilnuje, aby ruch i praca nie odbywały się kosztem regeneracji.', chart: weekly(2, 7) },
    { key: 'kr-weight', family: 'keyResult', title: 'Utrzymać wagę poniżej 80 kg mimo sezonu urlopowego i rodzinnych obiadów', cadence: 'weekly', entryMode: 'value', targetLabel: '≤ 80 kg', priorityKeys: ['movement'], contribution: 'Pokazuje długofalową stabilność bez presji codziennego wyniku.', chart: weekly(3, 80) },
    { key: 'habit-gaming', family: 'habit', title: 'Granie wieczorem', cadence: 'weekly', entryMode: 'rating', targetLabel: 'Śr. ≥ 3 oraz ≤ 3 dni', priorityKeys: ['learning'], contribution: 'Chroni odpoczynek, ale ogranicza wypieranie snu i czytania.', chart: weekly(2, 3) },
    { key: 'habit-deep-clean', family: 'habit', title: 'Głębokie porządki', cadence: 'monthly', entryMode: 'multi-completion', targetLabel: '4 elementy', priorityKeys: ['relationships'], contribution: 'Zmniejsza domowy chaos i uwalnia spokojniejszą przestrzeń dla bliskich.', chart: monthly(2, 4) },
  ]
}

export function buildRichVerificationScenario(anchor: Date | DayRef = new Date()): LabFixtureScenario {
  const anchorDate = typeof anchor === 'string' ? toDate(anchor) : anchor
  const refs = getPeriodRefsForDate(anchorDate)
  const pastWeeks = previousPeriods(refs.week, RICH_CLOSED_WEEKS)
  const pastMonths = previousPeriods(refs.month, RICH_CLOSED_MONTHS)
  const allWeekRefs = [...pastWeeks, refs.week]
  const allMonthRefs = [...pastMonths, refs.month]
  const weeks = allWeekRefs.map((weekRef, index) => buildWeek(
    weekRef,
    refs.day,
    index,
    weekRef === refs.week ? 'current' : 'closed',
  ))
  const weekLookup = new Map(weeks.map(week => [week.weekRef, week]))
  const monthWeek = (weekRef: WeekRef): LabWeekSnapshot => {
    const existing = weekLookup.get(weekRef)
    if (existing) return existing
    const state = weekRef < refs.week ? 'closed' : weekRef === refs.week ? 'current' : 'future'
    const stableIndex = Number(weekRef.slice(-2)) || 0
    const snapshot = buildWeek(weekRef, refs.day, stableIndex, state)
    weekLookup.set(weekRef, snapshot)
    return snapshot
  }
  const months = allMonthRefs.map((monthRef, monthIndex) => {
    const monthWeeks = getChildPeriods(monthRef).map(monthWeek)
    const current = monthRef === refs.month
    return {
      monthRef,
      label: periodLabel(monthRef),
      completion: current ? 51 : 61 + ((monthIndex * 6) % 31),
      priorityEffort: [2 + (monthIndex % 3), 3 + (monthIndex % 2), 2 + ((monthIndex + 1) % 3)],
      weeks: monthWeeks,
      reflectionComplete: !current,
      reflectionPartial: monthRef === pastMonths.at(-1),
    }
  })
  const previousWeek = pastWeeks.at(-1)!
  const previousMonth = pastMonths.at(-1)!

  const presets: Record<LabViewId, PeriodPreset[]> = {
    today: [
      { id: 'current', label: 'Dzisiaj', description: 'Mieszanka wykonanych i otwartych działań.', periodRef: refs.day, baselinePath: `/today/${refs.day}`, state: 'current' },
    ],
    'calendar-year': [
      { id: 'current', label: 'Bieżący rok', description: 'Miesiące zamknięte, miesiąc w toku i spokojne puste stany przyszłości.', periodRef: refs.year, baselinePath: `/calendar/year/${refs.year}`, state: 'current' },
    ],
    'calendar-month': [
      { id: 'current', label: 'Bieżący miesiąc', description: 'Plan w toku, bez zamkniętej refleksji.', periodRef: refs.month, baselinePath: `/calendar/stream/${refs.month}`, state: 'current' },
      { id: 'closed', label: 'Zamknięty miesiąc', description: 'Pełne dane i częściowa refleksja jakościowa.', periodRef: previousMonth, baselinePath: `/calendar/stream/${previousMonth}`, state: 'partial' },
    ],
    'calendar-week': [
      { id: 'current', label: 'Bieżący tydzień', description: 'Realistyczny tydzień w toku.', periodRef: refs.week, baselinePath: `/calendar/stream/${refs.week}`, state: 'current' },
      { id: 'closed', label: 'Zamknięty tydzień', description: 'Pełne wykonanie i refleksja.', periodRef: previousWeek, baselinePath: `/calendar/stream/${previousWeek}`, state: 'closed' },
    ],
    'ritual-week': [
      { id: 'plan', label: 'Planowanie', description: 'Bieżący tydzień z zablokowaną częścią refleksyjną.', periodRef: refs.week, baselinePath: `/calendar/week/${refs.week}?action=plan`, state: 'current' },
      { id: 'reflect', label: 'Refleksja', description: 'Zamknięty tydzień ze wszystkimi krokami.', periodRef: previousWeek, baselinePath: `/calendar/week/${previousWeek}?action=reflect`, state: 'closed' },
    ],
    'ritual-month': [
      { id: 'plan', label: 'Planowanie', description: 'Bieżący miesiąc i rozłożenie pracy na tygodnie.', periodRef: refs.month, baselinePath: `/calendar/month/${refs.month}?action=plan`, state: 'current' },
      { id: 'reflect', label: 'Refleksja', description: 'Zamknięty miesiąc, werdykty i podsumowanie.', periodRef: previousMonth, baselinePath: `/calendar/month/${previousMonth}?action=reflect`, state: 'closed' },
    ],
    'ritual-year': [
      { id: 'plan', label: 'Planowanie', description: 'Sześć istniejących etapów rocznego planowania w nowej gramatyce wizualnej.', periodRef: refs.year, baselinePath: `/calendar/year/${refs.year}?action=plan`, state: 'current' },
    ],
  }

  return {
    meta: {
      profileId: RICH_SCENARIO_ID,
      version: RICH_SCENARIO_VERSION,
      anchorDayRef: refs.day,
      generatedAt: `${refs.day}T12:00:00.000Z`,
      closedMonths: RICH_CLOSED_MONTHS,
      closedWeeks: RICH_CLOSED_WEEKS,
    },
    refs: { today: refs.day, currentWeek: refs.week, previousWeek, currentMonth: refs.month, previousMonth },
    presets,
    priorities: PRIORITIES.map(priority => ({ ...priority, progressSignals: [...priority.progressSignals], riskSignals: [...priority.riskSignals] })),
    objects: buildObjects(allWeekRefs, allMonthRefs),
    weeks,
    months,
    ritual: {
      weeklySteps: ['Plan', 'Dni', 'Przegląd', 'Ciało', 'Emocje', 'Działanie', 'Relacje', 'Kotwice', 'Dziennik'],
      monthlySteps: ['Priorytety', 'Tygodnie', 'Ocena kierunków', 'Kompas', 'Kotwice', 'Dziennik'],
      weeklyRatings: [4, 3, 4, 3, 4, 3, 5, 4, 3, 4, 3, 4],
      monthlyRatings: [4, 4, 3, null, null],
      anchors: ['Co naprawdę pomogło?', 'Co kosztowało za dużo?', 'Co chcę skorygować?'],
      weeklyJournal: 'Tydzień o dwóch prędkościach: mocny początek i spokojniejsza końcówka. Najbardziej pomogło trzymanie się porannego planu.',
      monthlyJournal: 'Miesiąc konsekwencji: ruch i nauka weszły w rytm, a praca wymagała korekty. Najważniejsza lekcja — planować mniej, ale konkretniej.',
    },
  }
}

export function fixtureMarkerValue(meta: FixtureMeta): string {
  return `${meta.profileId}:${meta.version}:${meta.anchorDayRef}`
}
