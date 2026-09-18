/**
 * Scenariusz `priority-month-v1` dla eksperymentu „05 · Rytm kierunków”.
 *
 * Jawne rekordy (bez generatorów i hashowania pustych okresów). Fikcyjne dane do oceny
 * interfejsu — nie historia użytkownika ani zalecenia treningowe. Osobny profil od rich-v1.
 *
 * Model odzwierciedla produkt tylko w tym, co potrzebne do projekcji: plan (przypisania)
 * jest oddzielony od wpisów, cele mają kaskadę override, KR dziedziczy priorytety celu.
 * Stany `skipped`/`cancelled` NIE istnieją w produkcie dla miar — tu są symulacją
 * (pytanie do portu, patrz plan §05).
 */
import type { DayRef, MonthRef, WeekRef } from '@product/domain/period'
import { getPeriodBounds, getPeriodRefsForDate } from '@product/utils/periods'

export const PRIORITY_SCENARIO_ID = 'priority-month-v1'

export type SampleId = 'closed' | 'current' | 'sparse' | 'empty' | 'boundary' | 'year' | 'history'
export const SAMPLE_IDS: readonly SampleId[] = ['closed', 'current', 'sparse', 'empty', 'boundary', 'year', 'history']

export type EntryMode = 'completion' | 'counter' | 'value' | 'rating' | 'multi-completion'
export type Cadence = 'weekly' | 'monthly'
export type Family = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'intention'
export type EvidenceRole = 'action' | 'observation'

export type Target =
  | { kind: 'count'; operator: 'min' | 'max'; value: number; entryDays?: { operator: 'min' | 'max'; value: number } }
  | { kind: 'value'; aggregation: 'sum' | 'average' | 'last'; operator: 'gte' | 'lte'; value: number; entryDays?: { operator: 'min' | 'max'; value: number } }
  | { kind: 'rating'; aggregation: 'average'; operator: 'gte' | 'lte'; value: number; entryDays?: { operator: 'min' | 'max'; value: number } }

export interface ScenarioPriority {
  key: string
  title: string
  /** Material Symbols name (jak `Priority.icon` w produkcie). */
  icon: string
  status: 'active' | 'paused' | 'closed'
}

export interface ScenarioBlock {
  key: string
  title: string
  priorityKey: string
  start: DayRef
  end: DayRef
}

export interface MultiItem { id: string; label: string; weight: number }

export interface ScenarioObject {
  key: string
  title: string
  family: Family
  /** KR: cel-rodzic (priorytety dziedziczone). */
  goalKey?: string
  /** Blok (cel z zakresem) — dla serii Formy. */
  blockKey?: string
  priorityKeys: string[]
  entryMode: EntryMode
  cadence: Cadence
  target?: Target
  unit?: string
  evidenceRole: EvidenceRole
  ratingScale?: { min: number; max: number }
  multiItems?: MultiItem[]
  multiThreshold?: number
  /** Intencje tygodnia żyją tylko w swoim tygodniu. */
  weekRef?: WeekRef
  icon?: string
  status?: 'open' | 'retired'
}

export type AssignmentScope = { kind: 'day'; ref: DayRef } | { kind: 'week'; ref: WeekRef } | { kind: 'month'; ref: MonthRef }

export interface ScenarioAssignment {
  id: string
  objectKey: string
  scope: AssignmentScope
  /** Symulacja — produkt nie ma anulowanego przypisania. */
  cancelled?: boolean
}

export interface ScenarioEntry {
  id: string
  objectKey: string
  dayRef: DayRef
  /** 0 nie jest brakiem; undefined = brak wartości (completion / multi). */
  value?: number
  checkedItemIds?: string[]
  /** Symulacja stanu „jawnie pominięte”. */
  skipped?: boolean
}

export interface ScenarioTargetOverride {
  objectKey: string
  scope: { kind: 'week'; ref: WeekRef } | { kind: 'month'; ref: MonthRef }
  target: Target
}

export interface WeeklyReflectionRecord {
  weekRef: WeekRef
  status: 'done' | 'draft'
  /** Ciało · Emocje · Działanie · Relacje, 1–5. */
  effort: (number | null)[]
  state: (number | null)[]
  demands: (number | null)[]
  anchors: { good: string; hard: string; lessons: string }
}

export interface MonthlyReflectionRecord {
  monthRef: MonthRef
  status: 'done' | 'draft'
  /** Balans · Sens · Rozwój · Zasady · Wpływ, 1–5. */
  compass: (number | null)[]
  anchors: { proud: string; challenges: string; growth: string }
  priorityVerdicts: { priorityKey: string; effort: number | null; verdict: 'continue' | 'adjust' | 'pause' | 'drop' }[]
}

export interface JournalRecord { id: string; dayRef: DayRef; time: string; title?: string; excerpt: string; emotionWords: string[]; tagCount: number }
export interface EmotionRecord { id: string; dayRef: DayRef; time: string; words: { label: string; intensity: number }[]; pleasant: boolean; note?: string }
export interface ExerciseRecord { id: string; dayRef: DayRef; title: string; programStep?: string }

export interface MonthPlanRecord { monthRef: MonthRef; topPriorityKeys: string[] }
export interface WeekPlanRecord { weekRef: WeekRef; topObjectKeys: string[] }

export interface PriorityScenario {
  id: typeof PRIORITY_SCENARIO_ID
  sample: SampleId
  /** Dzień zegara scenariusza („dziś”). */
  clock: DayRef
  /** Okres startowy widoku dla tego wariantu. */
  initial: { scale: 'year' | 'month' | 'week'; ref: string }
  priorities: ScenarioPriority[]
  blocks: ScenarioBlock[]
  objects: ScenarioObject[]
  assignments: ScenarioAssignment[]
  entries: ScenarioEntry[]
  overrides: ScenarioTargetOverride[]
  weeklyReflections: WeeklyReflectionRecord[]
  monthlyReflections: MonthlyReflectionRecord[]
  journal: JournalRecord[]
  emotions: EmotionRecord[]
  exercises: ExerciseRecord[]
  yearPlans?: { yearRef: string; motif: string; narrative: string; topPriorityKeys: string[] }[]
  monthPlans: MonthPlanRecord[]
  weekPlans: WeekPlanRecord[]
}

/* ------------------------------------------------------------------ helpers */

const day = (value: string): DayRef => value as DayRef
const month = (value: string): MonthRef => value as MonthRef
const weekOf = (dayRef: string): WeekRef => getPeriodRefsForDate(dayRef).week
const feb = (d: number): DayRef => day(`2027-02-${String(d).padStart(2, '0')}`)

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

function dayAssignments(objectKey: string, days: DayRef[]): ScenarioAssignment[] {
  return days.map(ref => ({ id: `${objectKey}@${ref}`, objectKey, scope: { kind: 'day', ref } }))
}
function weekAssignments(objectKey: string, weeks: WeekRef[]): ScenarioAssignment[] {
  return weeks.map(ref => ({ id: `${objectKey}@${ref}`, objectKey, scope: { kind: 'week', ref } }))
}
function monthAssignments(objectKey: string, months: MonthRef[]): ScenarioAssignment[] {
  return months.map(ref => ({ id: `${objectKey}@${ref}`, objectKey, scope: { kind: 'month', ref } }))
}
function completionEntries(objectKey: string, days: DayRef[]): ScenarioEntry[] {
  return days.map(dayRef => ({ id: nextId(objectKey), objectKey, dayRef }))
}
function valueEntries(objectKey: string, pairs: [DayRef, number][]): ScenarioEntry[] {
  return pairs.map(([dayRef, value]) => ({ id: nextId(objectKey), objectKey, dayRef, value }))
}
function multiEntries(objectKey: string, pairs: [DayRef, string[]][]): ScenarioEntry[] {
  return pairs.map(([dayRef, checkedItemIds]) => ({ id: nextId(objectKey), objectKey, dayRef, checkedItemIds }))
}

/* ------------------------------------------------------------------ luty 2027 */

const FEB = month('2027-02')
const FEB_WEEKS = [weekOf('2027-02-01'), weekOf('2027-02-08'), weekOf('2027-02-15'), weekOf('2027-02-22')]
const MAR_WEEKS = [weekOf('2027-03-01'), weekOf('2027-03-08'), weekOf('2027-03-15'), weekOf('2027-03-22'), weekOf('2027-03-29')]
const APR_WEEKS = [weekOf('2027-04-05'), weekOf('2027-04-12'), weekOf('2027-04-19'), weekOf('2027-04-26')]

const priorities: ScenarioPriority[] = [
  { key: 'fitness', title: 'Forma fizyczna', icon: 'fitness_center', status: 'active' },
  { key: 'support', title: 'Przygotowanie do ciąży', icon: 'favorite', status: 'active' },
  { key: 'craft', title: 'Rzemiosło zawodowe', icon: 'architecture', status: 'active' },
]

const blocks: ScenarioBlock[] = [
  { key: 'block-winter', title: 'Blok zimowy', priorityKey: 'fitness', start: day('2027-01-11'), end: day('2027-02-28') },
  { key: 'block-spring', title: 'Blok wiosenny', priorityKey: 'fitness', start: day('2027-03-01'), end: day('2027-04-30') },
]

const objects: ScenarioObject[] = [
  // Forma — blok zimowy
  { key: 'goal-winter', title: 'Blok zimowy', family: 'goal', blockKey: 'block-winter', priorityKeys: ['fitness'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'strength', title: 'Trening siłowy', family: 'keyResult', goalKey: 'goal-winter', blockKey: 'block-winter', priorityKeys: [], entryMode: 'completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 2 }, unit: 'sesje', evidenceRole: 'action', icon: 'fitness_center' },
  { key: 'cardio', title: 'Cardio', family: 'keyResult', goalKey: 'goal-winter', blockKey: 'block-winter', priorityKeys: [], entryMode: 'value', cadence: 'weekly', target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 150 }, unit: 'min', evidenceRole: 'action', icon: 'directions_run' },
  { key: 'weight', title: 'Waga', family: 'keyResult', goalKey: 'goal-winter', blockKey: 'block-winter', priorityKeys: [], entryMode: 'value', cadence: 'monthly', target: { kind: 'value', aggregation: 'last', operator: 'lte', value: 80 }, unit: 'kg', evidenceRole: 'action', icon: 'monitor_weight' },
  // Forma — blok wiosenny (plan)
  { key: 'goal-spring', title: 'Blok wiosenny', family: 'goal', blockKey: 'block-spring', priorityKeys: ['fitness'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'strength-2', title: 'Trening siłowy', family: 'keyResult', goalKey: 'goal-spring', blockKey: 'block-spring', priorityKeys: [], entryMode: 'completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 3 }, unit: 'sesje', evidenceRole: 'action', icon: 'fitness_center' },
  { key: 'cardio-2', title: 'Cardio', family: 'keyResult', goalKey: 'goal-spring', blockKey: 'block-spring', priorityKeys: [], entryMode: 'value', cadence: 'weekly', target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 }, unit: 'min', evidenceRole: 'action', icon: 'directions_run' },
  // Forma — intencja tygodnia 4
  { key: 'energy', title: 'Energia po treningu', family: 'intention', priorityKeys: ['fitness'], entryMode: 'rating', cadence: 'weekly', target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 }, ratingScale: { min: 1, max: 5 }, evidenceRole: 'action', weekRef: FEB_WEEKS[3], icon: 'bolt' },
  // Przygotowanie do ciąży
  { key: 'goal-support', title: 'Ustalone wsparcie', family: 'goal', priorityKeys: ['support'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'org-task', title: 'Sprawa organizacyjna', family: 'keyResult', goalKey: 'goal-support', priorityKeys: [], entryMode: 'completion', cadence: 'monthly', target: { kind: 'count', operator: 'min', value: 1 }, unit: 'raz', evidenceRole: 'action', icon: 'task_alt' },
  { key: 'talk', title: 'Rozmowa o wsparciu', family: 'intention', priorityKeys: ['support'], entryMode: 'completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 1, entryDays: { operator: 'min', value: 1 } }, unit: 'raz', evidenceRole: 'action', weekRef: FEB_WEEKS[0], icon: 'forum' },
  // Bez priorytetu
  { key: 'morning', title: 'Poranek', family: 'habit', priorityKeys: [], entryMode: 'multi-completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 5 }, unit: 'dni', evidenceRole: 'action', multiItems: [{ id: 'water', label: 'Woda', weight: 1 }, { id: 'stretch', label: 'Rozciąganie', weight: 1 }, { id: 'plan', label: 'Plan dnia', weight: 1 }], multiThreshold: 2, icon: 'wb_twilight' },
  { key: 'evening', title: 'Wieczór', family: 'habit', priorityKeys: [], entryMode: 'multi-completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 5 }, unit: 'dni', evidenceRole: 'action', multiItems: [{ id: 'screens', label: 'Bez ekranów', weight: 1 }, { id: 'read', label: 'Czytanie', weight: 1 }], multiThreshold: 2, icon: 'bedtime' },
  { key: 'coffee', title: 'Kawy', family: 'habit', priorityKeys: [], entryMode: 'counter', cadence: 'weekly', target: { kind: 'count', operator: 'max', value: 10 }, unit: 'kaw', evidenceRole: 'action', icon: 'coffee' },
  { key: 'sleep', title: 'Sen', family: 'tracker', priorityKeys: [], entryMode: 'rating', cadence: 'weekly', ratingScale: { min: 1, max: 10 }, evidenceRole: 'observation', icon: 'bedtime' },
]

const morningItems = ['water', 'stretch', 'plan']

function buildAssignments(): ScenarioAssignment[] {
  return [
    ...dayAssignments('strength', [2, 5, 9, 12, 16, 19, 23, 26].map(feb)),
    ...dayAssignments('cardio', [3, 6, 10, 13, 17, 20, 24, 27].map(feb)),
    ...monthAssignments('weight', [FEB]),
    ...monthAssignments('org-task', [FEB]),
    ...weekAssignments('talk', [FEB_WEEKS[0]]),
    ...weekAssignments('energy', [FEB_WEEKS[3]]),
    ...weekAssignments('coffee', FEB_WEEKS),
    ...weekAssignments('morning', FEB_WEEKS),
    ...weekAssignments('evening', FEB_WEEKS),
    // blok wiosenny: jawny plan bez wykonań
    ...weekAssignments('strength-2', [...MAR_WEEKS, ...APR_WEEKS]),
    ...weekAssignments('cardio-2', [...MAR_WEEKS, ...APR_WEEKS]),
  ]
}

function buildEntries(): ScenarioEntry[] {
  return [
    ...completionEntries('strength', [2, 5, 9, 12, 16, 23, 26].map(feb)),
    { id: 'strength-skip-19', objectKey: 'strength', dayRef: feb(19), skipped: true },
    ...valueEntries('cardio', [[feb(3), 80], [feb(6), 75], [feb(10), 70], [feb(13), 70], [feb(18), 70], [feb(24), 75], [feb(27), 75]]),
    ...valueEntries('weight', [[feb(3), 81.2], [feb(17), 80.6], [feb(27), 80.1]]),
    ...valueEntries('coffee', [
      [feb(1), 2], [feb(2), 1], [feb(3), 2], [feb(4), 1], [feb(5), 2], [feb(6), 1],
      [feb(8), 2], [feb(9), 2], [feb(10), 2], [feb(11), 2], [feb(12), 2], [feb(13), 2],
      [feb(15), 2], [feb(16), 2], [feb(17), 1], [feb(18), 1], [feb(19), 2],
      [feb(22), 2], [feb(23), 1], [feb(24), 2], [feb(25), 1], [feb(26), 2], [feb(27), 2],
    ]),
    ...valueEntries('sleep', [[feb(2), 7], [feb(4), 6], [feb(9), 6], [feb(11), 6], [feb(20), 3], [feb(23), 7], [feb(25), 7]]),
    ...valueEntries('energy', [[feb(23), 4], [feb(26), 3]]),
    ...completionEntries('talk', [feb(6)]),
    ...completionEntries('org-task', [feb(18)]),
    ...multiEntries('morning', [1, 2, 4, 8, 9, 12, 15, 16, 22, 23, 25, 26].map(d => [feb(d), morningItems] as [DayRef, string[]])),
    { id: 'morning-partial-17', objectKey: 'morning', dayRef: feb(17), checkedItemIds: ['water'] },
    ...multiEntries('evening', [1, 3, 5, 8, 10, 12, 15, 16, 22, 23, 24, 26, 28].map(d => [feb(d), ['screens', 'read']] as [DayRef, string[]])),
  ]
}

const weeklyReflections: WeeklyReflectionRecord[] = [
  { weekRef: FEB_WEEKS[0], status: 'done', effort: [3, 3, 4, 3], state: [4, 3, 3, 4], demands: [3, 2, 3, 3], anchors: { good: 'Dwa treningi i rozmowa o wsparciu odbyły się zgodnie z planem.', hard: 'Wieczory były długie, rutyna wieczorna wypadała późno.', lessons: 'Krótsza rutyna wieczorna jest lepsza niż żadna.' } },
  { weekRef: FEB_WEEKS[1], status: 'done', effort: [4, 3, 3, 4], state: [3, 4, 3, 4], demands: [3, 3, 4, 3], anchors: { good: 'Regularność treningów mimo napiętego tygodnia.', hard: 'Za dużo kawy w dni pracy.', lessons: 'Decyzja: skrócić rutynę wieczorną do dwóch pozycji.' } },
  { weekRef: FEB_WEEKS[3], status: 'done', effort: [3, 3, 3, 4], state: [4, 4, 3, 4], demands: [2, 3, 3, 3], anchors: { good: 'Powrót do krótkiej rutyny wieczornej i pełny tydzień treningów.', hard: 'Poniedziałek bez energii po słabszym tygodniu.', lessons: 'Po przerwie wracam od jednego treningu, nie od całego planu.' } },
]

const monthlyReflections: MonthlyReflectionRecord[] = [
  {
    monthRef: FEB,
    status: 'done',
    compass: [3, 4, 3, 4, 3],
    anchors: {
      proud: 'Z powrotu po słabszym trzecim tygodniu bez wyrzutów sumienia.',
      challenges: 'Utrzymanie rutyny wieczornej w długie dni.',
      growth: 'Skrócona rutyna działa lepiej niż ambitna, której nie robię.',
    },
    priorityVerdicts: [
      { priorityKey: 'fitness', effort: 4, verdict: 'continue' },
      { priorityKey: 'support', effort: 3, verdict: 'adjust' },
    ],
  },
]

const journal: JournalRecord[] = [
  { id: 'j-1', dayRef: feb(6), time: '21:10', title: 'Rozmowa o wsparciu', excerpt: 'Uzgodniliśmy, że jedną sprawę organizacyjną przejmuję ja. Ulga, że to nazwane.', emotionWords: ['ulga', 'spokój'], tagCount: 2 },
  { id: 'j-2', dayRef: feb(13), time: '20:40', excerpt: 'Skracam rutynę wieczorną do dwóch rzeczy. Lepiej dwie zrobione niż cztery odkładane.', emotionWords: ['zdecydowanie'], tagCount: 1 },
  { id: 'j-3', dayRef: feb(20), time: '22:05', excerpt: 'W tym tygodniu miałem mniej przestrzeni. Chcę wrócić od jednego treningu.', emotionWords: ['zmęczenie', 'nadzieja'], tagCount: 1 },
  { id: 'j-4', dayRef: feb(27), time: '19:30', title: 'Koniec bloku', excerpt: 'Blok zimowy domknięty. Siedem z ośmiu sesji, cardio poniżej planu, ale bez przerwy dłuższej niż tydzień.', emotionWords: ['duma', 'spokój'], tagCount: 3 },
]

const emotions: EmotionRecord[] = [
  { id: 'e-1', dayRef: feb(2), time: '18:20', words: [{ label: 'energia', intensity: 4 }], pleasant: true },
  { id: 'e-2', dayRef: feb(6), time: '21:00', words: [{ label: 'ulga', intensity: 4 }, { label: 'czułość', intensity: 3 }], pleasant: true },
  { id: 'e-3', dayRef: feb(9), time: '07:40', words: [{ label: 'spokój', intensity: 3 }], pleasant: true },
  { id: 'e-4', dayRef: feb(12), time: '17:15', words: [{ label: 'napięcie', intensity: 3 }], pleasant: false, note: 'Za dużo spraw naraz.' },
  { id: 'e-5', dayRef: feb(16), time: '19:00', words: [{ label: 'zmęczenie', intensity: 4 }], pleasant: false },
  { id: 'e-6', dayRef: feb(18), time: '13:30', words: [{ label: 'przytłoczenie', intensity: 3 }, { label: 'niepokój', intensity: 2 }], pleasant: false },
  { id: 'e-7', dayRef: feb(20), time: '22:00', words: [{ label: 'smutek', intensity: 2 }, { label: 'nadzieja', intensity: 3 }], pleasant: false },
  { id: 'e-8', dayRef: feb(23), time: '18:45', words: [{ label: 'satysfakcja', intensity: 4 }], pleasant: true },
  { id: 'e-9', dayRef: feb(27), time: '19:20', words: [{ label: 'duma', intensity: 4 }, { label: 'spokój', intensity: 4 }], pleasant: true },
]

const exercises: ExerciseRecord[] = [
  { id: 'x-1', dayRef: feb(4), title: 'Drzewo zmartwień' },
  { id: 'x-2', dayRef: feb(7), title: 'Oddech 4-7-8' },
  { id: 'x-3', dayRef: feb(24), title: 'Dziennik wdzięczności', programStep: 'Ścieżka „Spokojny wieczór” · krok 3' },
]

const monthPlans: MonthPlanRecord[] = [
  { monthRef: month('2027-01'), topPriorityKeys: ['fitness', 'craft'] },
  { monthRef: FEB, topPriorityKeys: ['fitness', 'support'] },
  { monthRef: month('2027-03'), topPriorityKeys: ['fitness'] },
  { monthRef: month('2027-04'), topPriorityKeys: ['fitness'] },
]

const weekPlans: WeekPlanRecord[] = [
  { weekRef: FEB_WEEKS[0], topObjectKeys: ['strength', 'cardio', 'talk'] },
  { weekRef: FEB_WEEKS[1], topObjectKeys: ['strength', 'cardio'] },
  { weekRef: FEB_WEEKS[2], topObjectKeys: ['strength', 'org-task'] },
  { weekRef: FEB_WEEKS[3], topObjectKeys: ['strength', 'cardio', 'energy'] },
]

/* ------------------------------------------------------------------ wrzesień 2026 (boundary) */

function buildBoundary(): Partial<PriorityScenario> {
  const sep = (d: number) => day(`2026-09-${String(d).padStart(2, '0')}`)
  const firstWeek = weekOf('2026-08-31')
  const lastWeek = weekOf('2026-09-28')
  const sepWeeks = [firstWeek, weekOf('2026-09-07'), weekOf('2026-09-14'), weekOf('2026-09-21'), lastWeek]
  return {
    clock: day('2026-10-05'),
    initial: { scale: 'month', ref: '2026-09' },
    blocks: [{ key: 'block-autumn', title: 'Blok jesienny', priorityKey: 'fitness', start: day('2026-08-31'), end: day('2026-10-04') }],
    objects: objects.filter(o => ['goal-winter', 'strength', 'cardio', 'morning', 'sleep'].includes(o.key)).map(o => o.blockKey ? { ...o, blockKey: 'block-autumn' } : o),
    assignments: [
      ...dayAssignments('strength', [day('2026-08-31'), sep(2), sep(7), sep(9), sep(14), sep(16), sep(21), sep(23), sep(28), sep(30)]),
      // plan tygodniowy bez dnia — tydzień graniczny 28.09–04.10
      ...weekAssignments('cardio', [lastWeek, firstWeek]),
      ...weekAssignments('morning', sepWeeks),
    ],
    entries: [
      ...completionEntries('strength', [day('2026-08-31'), sep(2), sep(7), sep(14), sep(21), sep(30), day('2026-10-01')]),
      ...valueEntries('cardio', [[day('2026-09-01'), 60], [sep(10), 70], [sep(17), 70], [day('2026-10-01'), 65]]),
      ...multiEntries('morning', [1, 2, 8, 9, 15, 22, 29, 30].map(d => [sep(d), morningItems] as [DayRef, string[]])),
      ...valueEntries('sleep', [[sep(3), 6], [sep(17), 7]]),
    ],
    weeklyReflections: [{ weekRef: weekOf('2026-09-07'), status: 'done', effort: [3, 3, 3, 3], state: [3, 3, 3, 3], demands: [3, 3, 3, 3], anchors: { good: 'Równy tydzień.', hard: '—', lessons: '—' } }],
    monthlyReflections: [],
    journal: [{ id: 'jb-1', dayRef: day('2026-09-30'), time: '20:00', excerpt: 'Ostatni trening bloku wypadł w środę, cardio przeniesione na czwartek (już październik).', emotionWords: ['spokój'], tagCount: 0 }],
    emotions: [{ id: 'eb-1', dayRef: day('2026-10-01'), time: '18:00', words: [{ label: 'satysfakcja', intensity: 3 }], pleasant: true }],
    exercises: [],
    monthPlans: [{ monthRef: month('2026-09'), topPriorityKeys: ['fitness'] }, { monthRef: month('2026-10'), topPriorityKeys: ['fitness', 'craft'] }],
    weekPlans: sepWeeks.map(weekRef => ({ weekRef, topObjectKeys: ['strength'] })),
  }
}

/* ------------------------------------------------------------------ styczeń 2026 – kwiecień 2027 (history) */

/** Deterministyczny generator (LCG) — te same dane przy każdym zbudowaniu próbki. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function addDays(ref: DayRef, n: number): DayRef {
  const d = new Date(`${ref}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10) as DayRef
}
/** 0 = poniedziałek … 6 = niedziela. */
function weekday(ref: DayRef): number {
  return (new Date(`${ref}T12:00:00Z`).getUTCDay() + 6) % 7
}
function eachDay(start: DayRef, end: DayRef): DayRef[] {
  const out: DayRef[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}
function mondays(start: DayRef, end: DayRef): DayRef[] {
  return eachDay(start, end).filter(d => weekday(d) === 0)
}
function monthsBetween(start: MonthRef, end: MonthRef): MonthRef[] {
  const out: MonthRef[] = []
  let [y, m] = start.split('-').map(Number)
  while (true) {
    const ref = month(`${y}-${String(m).padStart(2, '0')}`)
    out.push(ref)
    if (ref >= end) break
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

const HISTORY_CLOCK = day('2027-04-28')
const HISTORY_START = day('2026-01-01')

/** Obiekty widoczne tylko w próbce history: blok bazowy 2026, cel wagi, rzemiosło, spacer. */
const HISTORY_BLOCKS: ScenarioBlock[] = [
  { key: 'block-base', title: 'Blok bazowy 2026', priorityKey: 'fitness', start: day('2026-01-05'), end: day('2026-12-20') },
]
const HISTORY_OBJECTS: ScenarioObject[] = [
  { key: 'goal-base', title: 'Blok bazowy 2026', family: 'goal', blockKey: 'block-base', priorityKeys: ['fitness'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'strength-0', title: 'Trening siłowy', family: 'keyResult', goalKey: 'goal-base', blockKey: 'block-base', priorityKeys: [], entryMode: 'completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 2 }, unit: 'sesje', evidenceRole: 'action', icon: 'fitness_center' },
  { key: 'cardio-0', title: 'Cardio', family: 'keyResult', goalKey: 'goal-base', blockKey: 'block-base', priorityKeys: [], entryMode: 'value', cadence: 'weekly', target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 }, unit: 'min', evidenceRole: 'action', icon: 'directions_run' },
  { key: 'goal-weight', title: 'Waga poniżej 80 kg', family: 'goal', priorityKeys: ['fitness'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'goal-craft', title: 'Portfolio', family: 'goal', priorityKeys: ['craft'], entryMode: 'completion', cadence: 'monthly', evidenceRole: 'action', icon: 'flag' },
  { key: 'deep-work', title: 'Głęboka praca', family: 'keyResult', goalKey: 'goal-craft', priorityKeys: [], entryMode: 'counter', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 8 }, unit: 'h', evidenceRole: 'action', icon: 'timer' },
  { key: 'reading', title: 'Czytanie fachowe', family: 'keyResult', goalKey: 'goal-craft', priorityKeys: [], entryMode: 'completion', cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 2 }, unit: 'sesje', evidenceRole: 'action', icon: 'menu_book' },
  { key: 'walk', title: 'Spacer', family: 'habit', priorityKeys: [], entryMode: 'completion', cadence: 'weekly', evidenceRole: 'action', icon: 'directions_walk' },
]

const JOURNAL_POOL = [
  'Tydzień bez wielkich zrywów, ale każda rzecz z planu ruszyła choć raz.',
  'Trening wieczorem zamiast rano — łatwiej dotrzymać, gorzej ze snem.',
  'Za dużo kawy w środku tygodnia. Chcę wrócić do dwóch dziennie.',
  'Rozmowa o wsparciu domknięta na spokojnie. Ulga.',
  'Waga stoi, ale cardio idzie równo. Ciało dogania z opóźnieniem.',
  'Krótsza rutyna poranna działa lepiej niż pełna, której nie robię.',
  'Blok wiosenny wymaga trzech treningów; trzeci wypada najczęściej w sobotę.',
  'Dwa dni bez planu i od razu mniej ruchu. Plan jest dla mnie rusztowaniem.',
  'Głęboka praca przed południem, spacer po obiedzie — ten układ mi służy.',
  'Czytanie fachowe wypada, gdy zostawiam książkę na biurku, nie w torbie.',
]
const EMOTION_POOL: { label: string; pleasant: boolean }[] = [
  { label: 'spokój', pleasant: true }, { label: 'energia', pleasant: true }, { label: 'satysfakcja', pleasant: true },
  { label: 'zmęczenie', pleasant: false }, { label: 'napięcie', pleasant: false }, { label: 'nadzieja', pleasant: true },
  { label: 'przytłoczenie', pleasant: false }, { label: 'duma', pleasant: true },
]
const EXERCISE_POOL = ['Oddech 4-7-8', 'Drzewo zmartwień', 'Dziennik wdzięczności', 'Skan ciała']

/**
 * Szesnaście miesięcy ciągłych danych (01.01.2026 → zegar 28.04.2027) do oceny wykresów z wypełnionymi
 * kolumnami i pełnego roku 2026. Luty 2027 zostaje jawny (z bazy), pozostałe miesiące są generowane
 * deterministycznie. Blok bazowy 05.01–20.12.2026 (2× siła, cardio 150), blok zimowy od 11.01.2027,
 * blok wiosenny od 01.03.2027. Rzemiosło: głęboka praca 8 h i czytanie 2× tygodniowo. Rodzaje znaczników: sloty (siła, czytanie), dni (spacer, sprawa),
 * checklista (poranek, wieczór), słupki (cardio, kawy, głęboka praca), punkt (waga), ocena (sen, energia).
 */
function buildHistory(): Partial<PriorityScenario> {
  const random = rng(20270428)
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
  const chance = (p: number) => random() < p
  const range = (lo: number, hi: number) => lo + random() * (hi - lo)
  const febStart = day('2027-02-01')
  const febEnd = day('2027-02-28')
  const inFeb = (d: DayRef) => d >= febStart && d <= febEnd
  const days = eachDay(HISTORY_START, HISTORY_CLOCK).filter(d => !inFeb(d))

  const assignments: ScenarioAssignment[] = []
  const entries: ScenarioEntry[] = []
  const journalOut: JournalRecord[] = []
  const emotionsOut: EmotionRecord[] = []
  const exercisesOut: ExerciseRecord[] = []
  const weekly: WeeklyReflectionRecord[] = []
  const monthly: MonthlyReflectionRecord[] = []
  const weekPlansOut: WeekPlanRecord[] = []
  const monthPlansOut: MonthPlanRecord[] = []

  const baseStart = day('2026-01-05')
  const baseEnd = day('2026-12-20')
  const winterStart = day('2027-01-11')
  const springStart = day('2027-03-01')
  const plan = (d: DayRef) =>
    d >= springStart ? { strength: 'strength-2', cardio: 'cardio-2', strengthDays: [0, 3, 5], cardioDays: [1, 4] }
    : d >= winterStart ? { strength: 'strength', cardio: 'cardio', strengthDays: [0, 3], cardioDays: [2, 5] }
    : d >= baseStart && d <= baseEnd ? { strength: 'strength-0', cardio: 'cardio-0', strengthDays: [0, 3], cardioDays: [2, 5] }
    : null
  /* sezonowość: lato = więcej ruchu i spacerów, listopad = dołek */
  const season = (d: DayRef) => { const m = Number(d.slice(5, 7)); return m >= 5 && m <= 8 ? 1 : m === 11 ? -1 : 0 }

  for (const d of days) {
    const wd = weekday(d)
    const p = plan(d)
    const s = season(d)
    if (p) {
      if (p.strengthDays.includes(wd)) {
        assignments.push({ id: `${p.strength}@${d}`, objectKey: p.strength, scope: { kind: 'day', ref: d } })
        if (d <= HISTORY_CLOCK && chance(0.84 + s * 0.06)) entries.push({ id: nextId(p.strength), objectKey: p.strength, dayRef: d })
      }
      if (p.cardioDays.includes(wd)) {
        assignments.push({ id: `${p.cardio}@${d}`, objectKey: p.cardio, scope: { kind: 'day', ref: d } })
        if (d <= HISTORY_CLOCK && chance(0.78 + s * 0.08)) entries.push({ id: nextId(p.cardio), objectKey: p.cardio, dayRef: d, value: Math.round(range(45 + s * 10, 95 + s * 10) / 5) * 5 })
      }
    }
    if (d > HISTORY_CLOCK) continue
    // kawy: dni robocze 1–3, weekend rzadziej
    if (wd < 5 || chance(0.5)) entries.push({ id: nextId('coffee'), objectKey: 'coffee', dayRef: d, value: wd < 5 ? Math.floor(range(1, 4)) : 1 })
    // sen: ~4 wpisy tygodniowo, 4–9
    if (chance(0.55)) entries.push({ id: nextId('sleep'), objectKey: 'sleep', dayRef: d, value: Math.max(3, Math.min(9, Math.round(range(4.5, 8.5) + (wd >= 5 ? 0.6 : 0)))) })
    // poranek / wieczór: ~5 dni w tygodniu, czasem częściowo
    if (chance(0.72)) entries.push({ id: nextId('morning'), objectKey: 'morning', dayRef: d, checkedItemIds: chance(0.8) ? morningItems : ['water'] })
    if (chance(0.68)) entries.push({ id: nextId('evening'), objectKey: 'evening', dayRef: d, checkedItemIds: chance(0.85) ? ['screens', 'read'] : ['read'] })
    // spacer: bez celu, częściej latem
    if (chance(0.45 + s * 0.2)) entries.push({ id: nextId('walk'), objectKey: 'walk', dayRef: d })
    // rzemiosło: głęboka praca w dni robocze (1–3 h), czytanie wt/czw/nd
    if (wd < 5 && chance(0.7)) entries.push({ id: nextId('deep-work'), objectKey: 'deep-work', dayRef: d, value: Math.floor(range(1, 5)) })
    if ([1, 3, 6].includes(wd) && chance(0.65)) entries.push({ id: nextId('reading'), objectKey: 'reading', dayRef: d })
  }

  // waga: co 5–8 dni, trend spadkowy z szumem (86 → 81,4 w 2026; luty z bazy: 81,2 → 80,1)
  let cursor = HISTORY_START
  const dayIndex = (d: DayRef) => (new Date(`${d}T12:00:00Z`).getTime() - new Date(`${HISTORY_START}T12:00:00Z`).getTime()) / 86400000
  while (cursor <= HISTORY_CLOCK) {
    if (!inFeb(cursor)) {
      const t = dayIndex(cursor)
      const trend = cursor < febStart ? 86.2 - t * (4.8 / 396) : 80.0 - (t - 424) * (0.9 / 58)
      entries.push({ id: nextId('weight'), objectKey: 'weight', dayRef: cursor, value: Math.round((trend + range(-0.3, 0.3)) * 10) / 10 })
    }
    cursor = addDays(cursor, Math.floor(range(5, 9)))
  }

  // miesiące: przypisania miesięczne (waga, sprawa), plan miesiąca, refleksja
  for (const monthRef of monthsBetween(month('2026-01'), month('2027-04'))) {
    if (monthRef === FEB) continue
    const mStart = day(`${monthRef}-01`)
    assignments.push({ id: `weight@${monthRef}`, objectKey: 'weight', scope: { kind: 'month', ref: monthRef } })
    assignments.push({ id: `org-task@${monthRef}`, objectKey: 'org-task', scope: { kind: 'month', ref: monthRef } })
    const taskDay = addDays(mStart, Math.floor(range(3, 26)))
    if (taskDay <= HISTORY_CLOCK && chance(0.8)) entries.push({ id: nextId('org-task'), objectKey: 'org-task', dayRef: taskDay })
    if (monthRef < month('2027-01')) {
      const m = Number(monthRef.slice(5, 7))
      monthPlansOut.push({ monthRef, topPriorityKeys: m % 3 === 0 ? ['fitness', 'support'] : ['fitness', 'craft'] })
    }
    if (getPeriodBounds(monthRef).end < HISTORY_CLOCK && chance(0.9)) {
      const c = () => Math.max(1, Math.min(5, Math.round(range(2.5, 4.5))))
      monthly.push({ monthRef, status: 'done', compass: [c(), c(), c(), c(), c()], anchors: { proud: pick(JOURNAL_POOL), challenges: pick(JOURNAL_POOL), growth: pick(JOURNAL_POOL) }, priorityVerdicts: [{ priorityKey: 'fitness', effort: c(), verdict: 'continue' }, { priorityKey: 'craft', effort: c(), verdict: chance(0.7) ? 'continue' : 'adjust' }] })
    }
  }

  // tygodnie: przypisania tygodniowe, refleksje, plany, dziennik, emocje, ćwiczenia
  const weekStarts = mondays(addDays(HISTORY_START, -6), HISTORY_CLOCK)
  weekStarts.forEach((monday, index) => {
    const weekRef = weekOf(monday)
    const sunday = addDays(monday, 6)
    if (monday >= febStart && monday <= febEnd) return
    for (const key of ['coffee', 'morning', 'evening', 'walk', 'deep-work', 'reading']) {
      assignments.push({ id: `${key}@${weekRef}`, objectKey: key, scope: { kind: 'week', ref: weekRef } })
    }
    const p = plan(addDays(monday, 3))
    const top = p ? [p.strength, p.cardio, ...(chance(0.4) ? ['deep-work'] : ['morning'])] : ['morning', 'evening', 'deep-work']
    weekPlansOut.push({ weekRef, topObjectKeys: top })
    if (sunday <= HISTORY_CLOCK && chance(0.85)) {
      const r = () => Math.max(1, Math.min(5, Math.round(range(2.4, 4.6))))
      weekly.push({ weekRef, status: chance(0.9) ? 'done' : 'draft', effort: [r(), r(), r(), r()], state: [r(), r(), r(), r()], demands: [r(), r(), r(), r()], anchors: { good: pick(JOURNAL_POOL), hard: pick(JOURNAL_POOL), lessons: pick(JOURNAL_POOL) } })
    }
    const jDay = addDays(monday, Math.floor(range(0, 7)))
    if (jDay <= HISTORY_CLOCK && jDay >= HISTORY_START) journalOut.push({ id: `jh-${index}`, dayRef: jDay, time: '20:30', excerpt: pick(JOURNAL_POOL), emotionWords: [pick(EMOTION_POOL).label], tagCount: Math.floor(range(0, 3)) })
    for (let k = 0; k < 2; k++) {
      const eDay = addDays(monday, Math.floor(range(0, 7)))
      const word = pick(EMOTION_POOL)
      if (eDay <= HISTORY_CLOCK && eDay >= HISTORY_START) emotionsOut.push({ id: `eh-${index}-${k}`, dayRef: eDay, time: '18:00', words: [{ label: word.label, intensity: Math.floor(range(2, 5)) }], pleasant: word.pleasant })
    }
    if (index % 2 === 0) {
      const xDay = addDays(monday, Math.floor(range(0, 7)))
      if (xDay <= HISTORY_CLOCK && xDay >= HISTORY_START) exercisesOut.push({ id: `xh-${index}`, dayRef: xDay, title: pick(EXERCISE_POOL) })
    }
  })

  return {
    clock: HISTORY_CLOCK,
    initial: { scale: 'year', ref: '2026' },
    blocks: [...HISTORY_BLOCKS, ...blocks],
    objects: [...HISTORY_OBJECTS, ...objects.map(o => (o.key === 'weight' ? { ...o, goalKey: 'goal-weight', blockKey: undefined } : { ...o }))],
    assignments,
    entries,
    weeklyReflections: weekly,
    monthlyReflections: monthly,
    journal: journalOut,
    emotions: emotionsOut,
    exercises: exercisesOut,
    yearPlans: [
      { yearRef: '2026', motif: 'Fundament', narrative: 'Rok budowania podstaw: regularny ruch bez wyśrubowanych celów, spokojna praca nad portfolio i rutyny, które przeżyją gorsze tygodnie.', topPriorityKeys: ['fitness', 'craft'] },
    ],
    monthPlans: monthPlansOut,
    weekPlans: weekPlansOut,
  }
}

/* ------------------------------------------------------------------ builder */

export function buildPriorityScenario(sample: SampleId = 'closed'): PriorityScenario {
  seq = 0
  const base: PriorityScenario = {
    id: PRIORITY_SCENARIO_ID,
    sample,
    clock: day('2027-03-01'),
    initial: { scale: 'month', ref: '2027-02' },
    priorities: priorities.map(p => ({ ...p })),
    blocks: blocks.map(b => ({ ...b })),
    objects: objects.map(o => ({ ...o })),
    assignments: buildAssignments(),
    entries: buildEntries(),
    overrides: [],
    weeklyReflections: weeklyReflections.map(r => ({ ...r })),
    monthlyReflections: monthlyReflections.map(r => ({ ...r })),
    journal: journal.map(j => ({ ...j })),
    emotions: emotions.map(e => ({ ...e })),
    exercises: exercises.map(x => ({ ...x })),
    yearPlans: [{ yearRef: '2027', motif: 'Miejsce na ważne sprawy', narrative: 'Chcę utrzymać regularny ruch i zostawić przestrzeń na przygotowanie do ciąży. Zakres działań może się zmieniać; zależy mi na powracaniu do tego, co ważne.', topPriorityKeys: ['fitness', 'support'] }],
    monthPlans: monthPlans.map(p => ({ ...p })),
    weekPlans: weekPlans.map(p => ({ ...p })),
  }

  switch (sample) {
    case 'closed':
      return base
    case 'year':
      return { ...base, initial: { scale: 'year', ref: '2027' } }
    case 'current': {
      const clock = feb(15)
      return {
        ...base,
        clock,
        entries: base.entries.filter(e => e.dayRef <= clock),
        journal: base.journal.filter(j => j.dayRef <= clock),
        emotions: base.emotions.filter(e => e.dayRef <= clock),
        exercises: base.exercises.filter(x => x.dayRef <= clock),
        weeklyReflections: base.weeklyReflections.filter(r => r.weekRef < weekOf(clock)),
        monthlyReflections: [],
      }
    }
    case 'sparse': {
      // Usunięte wybrane zapisy i refleksje, zachowane przypisania. Brak zapisu obok jawnego
      // skipped (19.02) i jawnego zera trackera (kawy 21.02 = 0).
      const removed = new Set(['cardio', 'weight'])
      return {
        ...base,
        entries: [
          ...base.entries.filter(e => !(removed.has(e.objectKey) && e.dayRef >= feb(8) && e.dayRef <= feb(21)) && !(e.objectKey === 'strength' && e.dayRef === feb(16))),
          { id: 'coffee-zero-21', objectKey: 'coffee', dayRef: feb(21), value: 0 },
        ],
        weeklyReflections: base.weeklyReflections.filter(r => r.weekRef !== FEB_WEEKS[0]),
        journal: base.journal.filter(j => j.id !== 'j-2'),
      }
    }
    case 'empty':
      return {
        ...base,
        yearPlans: [],
        assignments: [],
        entries: [],
        weeklyReflections: [],
        monthlyReflections: [],
        journal: [],
        emotions: [],
        exercises: [],
        monthPlans: [{ monthRef: FEB, topPriorityKeys: ['fitness', 'support'] }],
        weekPlans: [],
      }
    case 'boundary':
      return { ...base, ...buildBoundary(), yearPlans: [], sample } as PriorityScenario
    case 'history': {
      const h = buildHistory()
      return {
        ...base,
        clock: h.clock!,
        initial: h.initial!,
        blocks: h.blocks!,
        objects: h.objects!,
        assignments: [...base.assignments, ...h.assignments!],
        entries: [...base.entries, ...h.entries!],
        weeklyReflections: [...base.weeklyReflections, ...h.weeklyReflections!],
        monthlyReflections: [...base.monthlyReflections, ...h.monthlyReflections!],
        journal: [...base.journal, ...h.journal!],
        emotions: [...base.emotions, ...h.emotions!],
        exercises: [...base.exercises, ...h.exercises!],
        yearPlans: [...h.yearPlans!, ...(base.yearPlans ?? [])],
        monthPlans: [...h.monthPlans!, ...base.monthPlans],
        weekPlans: [...base.weekPlans, ...h.weekPlans!],
      }
    }
  }
}

export function isSampleId(value: unknown): value is SampleId {
  return typeof value === 'string' && (SAMPLE_IDS as readonly string[]).includes(value)
}

/** Etykieta pod kontrolkami Labu: „Scenariusz przykładowy · priority-month-v1 · [zegar]”. */
export function scenarioLabel(scenario: PriorityScenario): string {
  return `Scenariusz przykładowy · ${scenario.id} · ${scenario.sample} · zegar ${scenario.clock}`
}
