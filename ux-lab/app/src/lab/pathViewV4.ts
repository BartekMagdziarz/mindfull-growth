import { computed, type Ref } from 'vue'
import plExercises from '@product/locales/pl/exercises.json'
import { weeks } from '~lab/lab/shamePath'
import { flatSteps, MAIN_STEPS, RETURN_WEEK, type FlatStep } from '~lab/lab/pathViewV2'

/**
 * Path view v4 (2026-11-17, round 8): the thread of stations and three fields
 * of the open phase (handoff `ideas/design_handoff_widok_sciezki`, direction B,
 * round 2). Illustrative progress only — no scheduler, no store.
 *
 * The path is linear, so progress is ONE number: how many steps are done.
 * Deliberately independent of `pathViewV3.ts` (which still reads the weekly
 * tasks that the product is dropping).
 */

/* ── Scene states (handoff §6) ───────────────────────────────────────────── */

export interface SceneState {
  id: string
  label: string
  /** Steps completed when the scene opens (0–24). */
  done: number
  /** Phase opened on entry; default = the current one (Powrót once closed). */
  open?: number
}

export const sceneStates: SceneState[] = [
  { id: 'first', label: '1 · Pierwszy dzień (faza 1, cztery kroki)', done: 0 },
  { id: 'mid', label: '2 · Połowa drogi (faza 4)', done: 10 },
  { id: 'closed', label: '3 · Po zamknięciu (Powrót następny)', done: 24 },
  { id: 'peek-done', label: '4a · Zaglądanie: faza zrobiona (2)', done: 10, open: 1 },
  { id: 'peek-later', label: '4b · Zaglądanie: faza przyszła (6, dwa kroki)', done: 10, open: 5 },
  { id: 'two', label: '5a · Dwa kroki w toku (faza 3)', done: 7 },
  { id: 'four', label: '5b · Cztery kroki w toku (faza 8)', done: 20 },
  { id: 'optional', label: 'Krok opcjonalny (faza 5, „Pomiń”)', done: 14 },
]

export const buttonVariants = [
  { id: 'cloud', label: 'Chmura (rekomendowany)' },
  { id: 'ink', label: 'Atrament' },
  { id: 'fill', label: 'Wypełnienie (obecny kolor)' },
] as const
export type ButtonVariant = (typeof buttonVariants)[number]['id']

/* ── Copy proposed by the design (handoff §7) — NOT in programs.json ─────── */

/** One short sentence per step on the surface (≤ 72 chars), in program order. Proposed key: `steps.stepN.lead`. */
export const stepLead: string[] = [
  'Pomiar na start: jak traktujesz siebie w trudnych chwilach.',
  'Mierzysz trzy głosy, którymi odpowiadasz sobie, gdy coś nie wychodzi.',
  'Sprawdzasz, gdzie wstyd odzywa się najczęściej i jak na niego reagujesz.',
  'Własnymi słowami: co chcesz zmienić i po czym poznasz, że działa.',
  'Budujesz miejsce, do którego wrócisz, gdy będzie za dużo.',
  'Tworzysz w wyobraźni postać, od której łatwo przyjąć ciepło.',
  'Teraz ty jesteś współczuciem: postawa, głos i jedno zdanie.',
  'Układasz, co robisz, gdy wstyd uderza: znak, oddech, zdanie, mały krok.',
  'Bierzesz jeden moment i pytasz, o czym jest ten wstyd.',
  'Rozkładasz gorącą myśl „jestem…” oczami bliskiej osoby.',
  'Powtarzasz pomiar. To obraz zmiany, nie ocena.',
  'Sprawdzasz, czy praktyk nie jest za dużo.',
  'Wybierasz moment, w którym odezwał się Krytyk.',
  'Poznajesz Krytyka jako część, która chroni.',
  'Rozmawiasz z Krytykiem wprost; asystent gra jego głos.',
  'Piszesz do siebie list głosem współczującego ja.',
  'Szukasz zdania, którym stajesz w swojej obronie.',
  'Schodzisz od wymagania do przekonania o sobie.',
  'Sprawdzasz przewidywanie w małej, bezpiecznej sytuacji.',
  'Jesteś przez chwilę przy młodszej części, bez naprawiania.',
  'Trzeci pomiar: start, połowa, koniec.',
  'Drugi pomiar trzech głosów.',
  'Piszesz list do siebie na gorszy dzień.',
  'Wybierasz praktyki, które zostają, i ich rytm.',
  'Czwarty pomiar: co utrzymało się bez ścieżki.',
  'Trzeci pomiar trzech głosów.',
  'Czytasz list od siebie i wybierasz jeden mały ruch.',
]

/** Repeated measures drop their suffix on the closed card ("— w połowie drogi"); the full name stays in aria-label. */
export function shortTitle(step: FlatStep): string {
  return step.title.split(' — ')[0]!
}

/** Soft hyphens, so the longest words can break inside a 7 rem card or a narrow station. */
const softBreaks: [string, string][] = [
  ['Samowspółczucie', 'Samo­współczucie'],
  ['Współczując', 'Współ­czując'],
  ['Rozpoznanie', 'Rozpo­znanie'],
  ['spojrzenie', 'spoj­rzenie'],
  ['Utrwalenie', 'Utrwa­lenie'],
]
export function withSoftHyphens(title: string): string {
  return softBreaks.reduce((text, [word, broken]) => text.replace(word, broken), title)
}

/** Phase 4's "why" cut to one sentence so every description runs 2–3 lines (handoff §7; the locale has two sentences). */
const phaseWhyOverride: Record<number, string> = {
  3: 'Patrzysz na siebie oczami kogoś bliskiego i sprawdzasz, czy praktyk nie jest za dużo.',
}
export const phaseTitle = (index: number) => weeks[index]!.title
export const phaseWhy = (index: number) => phaseWhyOverride[index] ?? weeks[index]!.why

export const RETURN_ON = '27 gru'

/* ── Progress ────────────────────────────────────────────────────────────── */

export type StepState = 'done' | 'current' | 'later'
export type PhaseState = StepState | 'return'

export const phaseSteps = (phase: number) => flatSteps.filter(step => step.week === phase)

export function usePathProgressV4(done: Ref<number>) {
  const closed = computed(() => done.value >= MAIN_STEPS)
  /** Once the main run is closed nothing is "current": the return opens on its date. */
  const currentIndex = computed(() => (closed.value ? -1 : done.value))
  const currentPhase = computed(() => (closed.value ? RETURN_WEEK : flatSteps[done.value]!.week))

  const stepState = (index: number): StepState => (index < done.value ? 'done' : index === currentIndex.value ? 'current' : 'later')
  function phaseCompletion(phase: number) {
    const steps = phaseSteps(phase)
    return { done: steps.filter(step => step.index < done.value).length, total: steps.length }
  }
  function phaseState(phase: number): PhaseState {
    if (phase === RETURN_WEEK) return 'return'
    const { done: count, total } = phaseCompletion(phase)
    if (count === total) return 'done'
    return phase === currentPhase.value ? 'current' : 'later'
  }
  /** Exactly one card is open in a phase: its current step, otherwise the first one. */
  const defaultStep = (phase: number) => phaseSteps(phase).find(step => step.index === currentIndex.value)?.index ?? phaseSteps(phase)[0]!.index

  return { closed, currentIndex, currentPhase, stepState, phaseCompletion, phaseState, defaultStep }
}

/** Every step is an exercise, and every exercise has its own glyph (`mg-exercise-<slug>`). */
export const stepIcon = (step: FlatStep) => `mg-exercise-${step.slug}`

/** A step's state in words, for assistive tech (on the surface the well carries it). */
export const stepStateWord: Record<StepState, string> = { done: 'zrobiony', current: 'bieżący', later: 'przed Tobą' }

/* ── The thread's grid (handoff §2): 8 station columns · a gap · Powrót, of 1328 px ── */

export const STATION = 144 / 13.28
export const RETURN_LEFT = (8 * 144 + 48) / 13.28
export const RETURN_WIDTH = 128 / 13.28
export const stationLeft = (phase: number) => (phase === RETURN_WEEK ? RETURN_LEFT : phase * STATION)
export const stationWidth = (phase: number) => (phase === RETURN_WEEK ? RETURN_WIDTH : STATION)
export const stationCentre = (phase: number) => stationLeft(phase) + stationWidth(phase) / 2

/**
 * The axis under the stations: it starts under station 1, is solid up to station 8 and dissolves on the
 * way to Powrót. `reached` = where the walked part ends (the current station; station 8 once closed).
 * All values are percentages of the strip; `solid` and `reached` are also given along the axis itself.
 */
export function threadAxis(currentPhase: number, closed: boolean) {
  const left = stationCentre(0)
  const width = stationCentre(RETURN_WEEK) - left
  const last = stationCentre(7)
  const reached = stationCentre(closed ? 7 : currentPhase)
  return { left, width, solidTo: last, reachedTo: reached, solid: ((last - left) / width) * 100, reached: ((reached - left) / width) * 100 }
}

/* ── Practices: two per phase, never more. Decision 2026-11-21 (user): Momenty stay through the
   whole path and every phase brings ONE new practice (plan v2 of 2026-11-17; names from the catalog). ── */

export interface PracticeDef {
  slug: string
  title: string
  icon: string
  action: string
}

const cardTitles = plExercises.cards as Record<string, { title: string }>
const practice = (slug: string, card: string, action = 'Otwórz'): PracticeDef => ({ slug, title: cardTitles[card]?.title ?? slug, icon: `mg-exercise-${slug}`, action })

export const practiceDefs: Record<string, PracticeDef> = {
  moments: { slug: 'moment-shame', title: 'Momenty', icon: 'mg-exercise-shame-log', action: 'Zapisz' },
  breath: practice('paced-breathing', 'pacedBreathing'),
  place: practice('safe-place-return', 'safePlaceReturn'),
  rehearsal: practice('response-rehearsal', 'responseRehearsal'),
  pause: practice('self-compassion-break', 'selfCompassionBreak'),
  handover: practice('critic-handover', 'criticHandover'),
  writing: practice('shame-writing', 'shameWriting'),
  evidence: practice('positive-data-log', 'positiveDataLog', 'Dopisz'),
  people: practice('step-toward-people', 'stepTowardPeople'),
}

const ON_DEMAND = 'na żądanie'
/** The new practice of each phase (1–8); on the return the path asks again for the compassion break. Rhythms are illustrative (plan D2 is open). */
const second: [string, string][] = [['breath', 'codziennie'], ['place', 'co 2 dni'], ['rehearsal', 'co 2 dni'], ['pause', 'co 2 dni'], ['handover', 'co 2 dni'], ['writing', 'co 2 dni'], ['evidence', 'co 2 dni'], ['people', 'co 2 dni'], ['pause', 'co 3 dni']]
/** Momenty stay first through the whole path; on the return they are on demand. */
export const phasePractices: [string, string][][] = second.map((item, phase) => [['moments', phase === RETURN_WEEK ? ON_DEMAND : 'co 2 dni'], item])

/** now = the path asks for it in its rhythm · demand = handed over earlier, no longer asked for · later = the phase is still ahead. */
export type PracticeTileState = 'now' | 'demand' | 'later'
export interface PracticeTile {
  key: string
  def: PracticeDef
  rhythm: string
  state: PracticeTileState
}

export function practiceTiles(open: number, currentPhase: number): PracticeTile[] {
  const now = new Map(phasePractices[currentPhase]!)
  const ahead = open > currentPhase
  return phasePractices[open]!.map(([key, rhythm]) => {
    const shown = ahead ? rhythm : (now.get(key) ?? ON_DEMAND)
    return { key, def: practiceDefs[key]!, rhythm: shown, state: ahead ? 'later' : shown === ON_DEMAND ? 'demand' : 'now' }
  })
}

/** Lower card: what the path has already handed over and does not ask for right now (so nothing shows twice). */
export function onDemandPractices(currentPhase: number): PracticeDef[] {
  const now = new Set(phasePractices[currentPhase]!.map(([key]) => key))
  const handed: string[] = []
  phasePractices.slice(0, currentPhase + 1).forEach(list => list.forEach(([key]) => !handed.includes(key) && handed.push(key)))
  return handed.filter(key => !now.has(key)).map(key => practiceDefs[key]!)
}

export { flatSteps, MAIN_STEPS, RETURN_WEEK }
export type { FlatStep }
