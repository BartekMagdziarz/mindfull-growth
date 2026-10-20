import { computed, reactive, ref, type Ref } from 'vue'
import type { MicroExerciseEntry } from '@product/domain/microExercises'
import { momentsProgress, UNLOGGED_BUCKETS, type MomentsWeekStats, type ShamePartKey } from '@product/domain/momentsProgress'
import type { DayRef, WeekRef } from '@product/domain/period'
import { getPeriodBounds } from '@product/utils/periods'
import { allWeekRefs } from '~lab/lab/shamePath'

/**
 * The "Ścieżka" step of the weekly reflection (shame path), round 1,
 * 2026-10-11 — the user's screenshot of week 2 ("Oparcie") with the task
 * "Po trudnym momencie zrób dla siebie to, co zrobiłbyś dla przyjaciela".
 *
 * Three things this module settles so the scene can be honest:
 * 1. a task counts a DAY only when the Moment says the task happened
 *    (`TASK_RULES`), not whenever any Moment was saved (today's bridge);
 * 2. "moments you did not log" become up to two backfilled Moments with a
 *    day and a part (`noticed: 'later'`), the count bucket stays as the
 *    fallback for what is not remembered;
 * 3. a quiet week still draws the estimate (the product's chart hides it).
 */

export const samples = [
  { id: 'logged', label: 'Oparcie (T3) · dwa Momenty zapisane, jeden z zadaniem' },
  { id: 'quiet', label: 'Oparcie (T3) · nic nie zapisane (jak na zrzucie)' },
  { id: 'declined', label: 'Oparcie (T3) · zadanie odłożone na ten tydzień' },
] as const
export type Sample = (typeof samples)[number]['id']

/** Momenty answers to "Co zrobiłeś — zamiast albo zaraz po?" (programs/exerciseWizards.json), plus the proposed new ones. */
export interface ResponseOption { key: string; label: string; proposed?: boolean }
export const RESPONSE_OPTIONS: ResponseOption[] = [
  { key: 'breath', label: 'Oddech' },
  { key: 'named', label: 'Nazwanie wstydu' },
  { key: 'unblend', label: '„To część, nie ja”' },
  { key: 'question', label: 'Pytanie „o czym jest?”' },
  { key: 'sentence', label: 'Zdanie od współczującej postaci' },
  { key: 'defend', label: 'Zdanie obronne' },
  { key: 'contact', label: 'Ruch w stronę kontaktu' },
  { key: 'repair', label: 'Naprawa' },
  { key: 'test', label: 'Pytanie o bliską osobę' },
  { key: 'kindAct', label: 'Coś dla siebie, jak dla przyjaciela', proposed: true },
  { key: 'gesture', label: 'Dłoń na sercu', proposed: true },
  { key: 'stayed', label: 'Minuta dłużej', proposed: true },
  { key: 'thanked', label: 'Podziękowanie Krytykowi', proposed: true },
  { key: 'nothing', label: 'Nic, tym razem' },
]
export const responseLabel = (key: string) => RESPONSE_OPTIONS.find(option => option.key === key)?.label ?? key

/**
 * How a Moment counts a day of the week's task. `any` = any move other than
 * "nothing" (the plan tasks); `options` = at least one of these answers;
 * `part` = additionally the part that took the wheel. Tasks without a Moment
 * anchor (receiveKindness, sayNo, readAloud) are ticked in Plan Dnia only.
 */
export interface TaskRule { any?: true; options?: string[]; part?: ShamePartKey }
export interface WeekTask { key: string; phase: string; title: string; why: string; times: number; rule?: TaskRule; newOption?: string }
export const TASKS: WeekTask[] = [
  { key: 'nameShame', phase: 'w1', title: 'Nazwij wstyd w chwili, gdy się pojawia', why: 'Nazwany wstyd traci część siły.', times: 3, rule: { options: ['named'] } },
  { key: 'catchBody', phase: 'w1', title: 'Złap wstyd po sygnale z ciała, zanim nazwie go myśl', why: 'Ciało jest szybsze niż krytyk.', times: 3, rule: { options: ['named'] } },
  { key: 'soothingGesture', phase: 'w2', title: 'Gdy przyjdzie wstyd, połóż dłoń na sercu i zrób dwa spokojne oddechy', why: 'Ciepły dotyk i dłuższy wydech uspokajają układ zagrożenia szybciej niż myśli.', times: 3, rule: { options: ['gesture'] }, newOption: 'gesture' },
  { key: 'receiveKindness', phase: 'w2', title: 'Przyjmij od kogoś życzliwość i nie odbijaj jej', why: 'Współczucie od innych to łatwiejszy strumień niż do siebie.', times: 2 },
  { key: 'kindAct', phase: 'w2', title: 'Po trudnym momencie zrób dla siebie to, co zrobiłbyś dla przyjaciela', why: 'Ciepło do siebie łatwiej zrobić niż powiedzieć.', times: 2, rule: { options: ['kindAct'] }, newOption: 'kindAct' },
  { key: 'useResponse', phase: 'w3', title: 'Użyj planu na trudną chwilę, gdy wstyd się pojawi', why: 'Plan działa dopiero wtedy, gdy go użyjesz na gorąco.', times: 3, rule: { any: true } },
  { key: 'unblendSay', phase: 'w3', title: 'Powiedz sobie w chwili wstydu: to moja część, nie ja', why: 'Odmieszanie zostawia w tobie kogoś, kto może wysłuchać części i nie odejść.', times: 3, rule: { options: ['unblend'] } },
  { key: 'friendTest', phase: 'w3', title: 'Przy jednym momencie wstydu zapytaj: czy ktoś bliski na moim miejscu też powinien się wstydzić?', why: 'Jeśli nie, to cudze wymaganie. Pytanie odbiera mu władzę.', times: 3, rule: { options: ['test'] } },
  { key: 'stayLonger', phase: 'w4', title: 'Zostań w sytuacji minutę dłużej, zamiast się wycofać', why: 'Wstyd każe zniknąć. Minuta dłużej pokazuje, że nic się nie dzieje.', times: 2, rule: { options: ['stayed'] }, newOption: 'stayed' },
  { key: 'repairGuilt', phase: 'w4', title: 'Przy jednej sytuacji winy zrób realną naprawę', why: 'Wina domyka się przez naprawę, a wstyd przez ukrycie.', times: 1, rule: { options: ['repair'] } },
  { key: 'noticeCritic', phase: 'w5', title: 'Zauważ Krytyka i nazwij go po imieniu', why: 'Nazwany Krytyk to część, a nie prawda o tobie.', times: 3, rule: { options: ['named', 'unblend'], part: 'attackSelf' } },
  { key: 'handOver', phase: 'w5', title: 'Podziękuj Krytykowi i powiedz, że przejmujesz ster', why: 'Krytyk chroni. Podziękowanie zdejmuje z niego wartę bez walki.', times: 2, rule: { options: ['thanked'], part: 'attackSelf' }, newOption: 'thanked' },
  { key: 'defendSelf', phase: 'w6', title: 'Odpowiedz Krytykowi zdaniem obronnym', why: 'Stanowcza strona współczucia.', times: 2, rule: { options: ['defend'] } },
  { key: 'tellSafePerson', phase: 'w7', title: 'Powiedz bezpiecznej osobie o jednym wstydzie', why: 'Wstyd żyje w ukryciu.', times: 1, rule: { options: ['contact'] } },
  { key: 'askQuestion', phase: 'w7', title: 'Zadaj pytanie, zamiast udawać, że wiesz', why: 'Mały akt niedoskonałości w kontakcie.', times: 2, rule: { options: ['question', 'contact'] } },
  { key: 'keepResponse', phase: 'w8', title: 'Użyj swojej odpowiedzi na wstyd bez zaglądania do planu', why: 'Plan stał się twój.', times: 3, rule: { any: true } },
]
/** The tasks the scene can switch between (the week-2 choice plus one from week 3). */
export const SCENE_TASKS = ['kindAct', 'soothingGesture', 'receiveKindness', 'friendTest'] as const
export const taskByKey = (key: string) => TASKS.find(task => task.key === key)!

const picked = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

/** Does this Moment count as a day of `task`? Today's bridge says yes to every Moment; this is the proposed rule. */
export function countsTowardTask(entry: MicroExerciseEntry, task: WeekTask): boolean {
  if (!task.rule) return false
  if (entry.responses.hadMoment !== 'yes') return false
  const response = picked(entry.responses.response)
  if (task.rule.part && entry.responses.compass !== task.rule.part) return false
  if (task.rule.any) return response.some(item => item !== 'nothing')
  return (task.rule.options ?? []).some(option => response.includes(option))
}

export const BACKFILL_LIMIT = 2
export const DAY_LETTERS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
export const PART_CHOICES: ShamePartKey[] = ['none', 'avoid', 'withdraw', 'attackSelf', 'attackOthers']
/** The short answer set offered when backfilling (the full list stays in Momenty). */
export const BACKFILL_RESPONSES = ['breath', 'unblend', 'kindAct', 'contact', 'nothing']

export interface Backfill { id: string; day: DayRef; part: ShamePartKey; response: string[] }

export const PREVIOUS_WEEK: WeekRef = allWeekRefs[0]!
export const THIS_WEEK: WeekRef = allWeekRefs[1]!

function addDays(day: DayRef, n: number): DayRef {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + n)
  return date.toISOString().slice(0, 10) as DayRef
}
export const weekDays = (weekRef: WeekRef): DayRef[] => {
  const { start } = getPeriodBounds(weekRef)
  return Array.from({ length: 7 }, (_, i) => addDays(start as DayRef, i))
}
export const dayLetter = (day: DayRef): string => {
  const index = weekDays(THIS_WEEK).indexOf(day)
  return index >= 0 ? DAY_LETTERS[index]! : DAY_LETTERS[(new Date(`${day}T12:00:00`).getDay() + 6) % 7]!
}

function moment(id: string, day: DayRef, compass: ShamePartKey, response: string[], extra: Record<string, unknown> = {}): MicroExerciseEntry {
  const createdAt = `${day}T18:30:00.000Z`
  return {
    id,
    exerciseSlug: 'moments',
    createdAt,
    updatedAt: createdAt,
    responses: { kind: 'shame', hadMoment: 'yes', compass, noticed: 'soon', response, strength: 3, ...extra },
  }
}

const prevDays = weekDays(PREVIOUS_WEEK)
const thisDays = weekDays(THIS_WEEK)
/** Last week: three Moments, the Critic twice. */
export const previousWeekEntries: MicroExerciseEntry[] = [
  moment('prev-1', prevDays[1]!, 'attackSelf', ['breath'], { situation: 'Pomyłka w mailu do całego zespołu.', criticSaid: 'Powinienem był sprawdzić.', strength: 4 }),
  moment('prev-2', prevDays[3]!, 'withdraw', ['nothing'], { situation: 'Nie odezwałem się na spotkaniu.', noticed: 'hours' }),
  moment('prev-3', prevDays[5]!, 'attackSelf', ['named', 'unblend'], { situation: 'Spóźnienie po raz trzeci.', strength: 3 }),
]
/** This week (sample `logged`): two Moments — one with the task done, one with nothing. */
export const thisWeekEntries: MicroExerciseEntry[] = [
  moment('this-1', thisDays[1]!, 'attackSelf', ['breath', 'kindAct'], { situation: 'Zapomniałem o urodzinach siostry.', noticed: 'during', kindVoice: 'Zadzwoń dziś, to wystarczy.', strength: 4 }),
  moment('this-2', thisDays[3]!, 'avoid', ['nothing'], { situation: 'Scrollowanie zamiast odpisać na trudną wiadomość.', noticed: 'later', strength: 2 }),
]

export const BUCKETS = ['few', 'several', 'many'] as const
export const bucketLabel: Record<string, string> = { none: 'żaden', few: '1–2', several: '3–5', many: 'więcej' }

export function useWeekReflection(sample: Ref<Sample>, taskKey: Ref<string>) {
  const backfills = ref<Backfill[]>([])
  /** 'none' | bucket id | null (unanswered). */
  const bucket = ref<string | null>(null)
  const answers = reactive({ outcome: '', severity: null as number | null, phase: '' })
  const stay = ref(false)
  const previousSeverity = 4

  const task = computed(() => taskByKey(taskKey.value))
  const declined = computed(() => sample.value === 'declined')
  const logged = computed(() => (sample.value === 'quiet' ? [] : thisWeekEntries))
  const backfilledEntries = computed(() =>
    backfills.value.map(item => moment(item.id, item.day, item.part, item.response, { noticed: 'later', backfilled: 'yes' })),
  )
  const weekEntries = computed(() => [...logged.value, ...backfilledEntries.value])
  const stats = computed<MomentsWeekStats[]>(() =>
    momentsProgress(
      [...previousWeekEntries, ...weekEntries.value],
      [PREVIOUS_WEEK, THIS_WEEK],
      bucket.value && bucket.value !== 'none' ? { [THIS_WEEK]: UNLOGGED_BUCKETS[bucket.value]! } : {},
    ),
  )
  /** Backfilled Moments per part this week — the chart hatches them. */
  const backfilledByPart = computed(() => {
    const counts: Record<ShamePartKey, number> = { none: 0, avoid: 0, withdraw: 0, attackSelf: 0, attackOthers: 0 }
    for (const item of backfills.value) counts[item.part] += 1
    return counts
  })
  /** Days the task counts, by the proposed rule — logged and backfilled Moments alike. */
  const taskDays = computed(() => {
    if (declined.value) return []
    const days = new Set<DayRef>()
    for (const entry of weekEntries.value) if (countsTowardTask(entry, task.value)) days.add(entry.createdAt.slice(0, 10) as DayRef)
    return [...days].sort()
  })
  /** What today's bridge would show: every Moment of the week is a day of the task. */
  const bridgeDays = computed(() => {
    if (declined.value) return []
    return [...new Set(weekEntries.value.map(entry => entry.createdAt.slice(0, 10) as DayRef))].sort()
  })
  const canBackfill = computed(() => backfills.value.length < BACKFILL_LIMIT)

  function addBackfill(day: DayRef, part: ShamePartKey, response: string[]) {
    if (!canBackfill.value) return false
    backfills.value = [...backfills.value, { id: `backfill-${backfills.value.length + 1}-${day}`, day, part, response: response.length ? response : ['nothing'] }]
    if (bucket.value === 'none') bucket.value = null
    return true
  }
  function removeBackfill(id: string) {
    backfills.value = backfills.value.filter(item => item.id !== id)
  }
  function setBucket(value: string | null) {
    bucket.value = bucket.value === value ? null : value
    if (value === 'none') backfills.value = []
  }
  function reset() {
    backfills.value = []
    bucket.value = null
    answers.outcome = ''
    answers.severity = null
    answers.phase = ''
    stay.value = false
  }

  return { task, declined, logged, weekEntries, backfills, backfilledByPart, bucket, stats, taskDays, bridgeDays, canBackfill, answers, stay, previousSeverity, addBackfill, removeBackfill, setBucket, reset }
}
