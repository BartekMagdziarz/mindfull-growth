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

/* ── Practices: Momenty through the whole path and ONE new practice per phase (user, 2026-11-21).
   The states mirror the shipped rule (`practiceStepWindow` / `isPracticeWindowOpen` in
   src/domain/program.ts, docs P12) — the path decides by steps done, not by the open phase. ── */

export interface PracticeDef {
  slug: string
  title: string
  icon: string
  action: string
}

const cardTitles = plExercises.cards as Record<string, { title: string }>
const practice = (slug: string, card: string, action = 'Otwórz'): PracticeDef => ({ slug, title: cardTitles[card]?.title ?? slug, icon: `mg-exercise-${slug}`, action })

export const momentsDef: PracticeDef = { slug: 'moment-shame', title: 'Momenty', icon: 'mg-exercise-shame-log', action: 'Zapisz' }
/** The user's own rhythm after the close: the second tile of Powrót. */
export const maintenanceDef: PracticeDef = { slug: 'maintenance-plan', title: 'Plan podtrzymania', icon: 'mg-exercise-maintenance-plan', action: 'Otwórz' }
/** The new practice of each phase 1–8, in catalog order (`shame-compassion.practices`, `phaseKey` w1…w8). */
export const phasePracticeDefs: PracticeDef[] = [
  practice('paced-breathing', 'pacedBreathing'),
  practice('safe-place-return', 'safePlaceReturn'),
  practice('response-rehearsal', 'responseRehearsal'),
  practice('self-compassion-break', 'selfCompassionBreak'),
  practice('critic-handover', 'criticHandover'),
  practice('shame-writing', 'shameWriting'),
  practice('positive-data-log', 'positiveDataLog', 'Dopisz'),
  practice('step-toward-people', 'stepTowardPeople'),
]

/** now = the path puts it into the day plan · demand = handed over, no longer asked for · later = not handed over yet. */
export type PracticeTileState = 'now' | 'demand' | 'later'
export const practiceStateWord: Record<PracticeTileState, string> = { now: 'w rytmie', demand: 'na żądanie', later: 'jeszcze nie' }
export interface PracticeTile {
  def: PracticeDef
  state: PracticeTileState
}

/** Momenty start after the shame map (catalog `startsAfterStep: 2`: the current step index must be beyond 2). */
export const MOMENTS_AFTER_STEP = 2
const phaseStart = (phase: number) => phaseSteps(phase)[0]!.index

/** Momenty: not yet → in rhythm from the fourth step on → on demand once the path is closed. */
export function momentsState(done: number): PracticeTileState {
  if (done >= MAIN_STEPS) return 'demand'
  return done > MOMENTS_AFTER_STEP ? 'now' : 'later'
}

/**
 * A phase practice opens once ITS phase's first step is done and closes once the NEXT phase's first
 * step is done; the first phase's practice runs from the enrollment. So while the first step of
 * phase n is still ahead, the practice of phase n − 1 keeps running. A closed path asks for nothing.
 */
export function phasePracticeState(phase: number, done: number): PracticeTileState {
  if (done >= MAIN_STEPS) return 'demand'
  if (phase > 0 && done <= phaseStart(phase)) return 'later'
  return done > phaseStart(phase + 1) ? 'demand' : 'now'
}

/** The phase practice the path is asking for right now (none once closed). */
export function runningPhasePractice(done: number): number {
  return phasePracticeDefs.findIndex((_, phase) => phasePracticeState(phase, done) === 'now')
}

/**
 * The two tiles of the "Praktyki" field. Momenty are always first, in their real state. The second
 * tile is the open phase's own practice — except in the CURRENT phase before its first step, where
 * the field shows what the path asks for now: the previous phase's practice, still running.
 * Powrót has no practice of its own; its second tile is the maintenance plan.
 */
export function practiceTiles(open: number, done: number): PracticeTile[] {
  const moments: PracticeTile = { def: momentsDef, state: momentsState(done) }
  if (open === RETURN_WEEK) return [moments, { def: maintenanceDef, state: done >= MAIN_STEPS ? 'now' : 'later' }]
  const own = phasePracticeState(open, done)
  const running = runningPhasePractice(done)
  const isCurrent = done < MAIN_STEPS && flatSteps[done]!.week === open
  if (isCurrent && own === 'later' && running >= 0) return [moments, { def: phasePracticeDefs[running]!, state: 'now' }]
  return [moments, { def: phasePracticeDefs[open]!, state: own }]
}

/** The collection ("Na żądanie" / "Zostaje z Tobą"): every practice handed over and not asked for now, in catalog order. */
export function onDemandPractices(done: number): PracticeDef[] {
  const list = phasePracticeDefs.filter((_, phase) => phasePracticeState(phase, done) === 'demand')
  return momentsState(done) === 'demand' ? [momentsDef, ...list] : list
}

export { flatSteps, MAIN_STEPS, RETURN_WEEK }
export type { FlatStep }
