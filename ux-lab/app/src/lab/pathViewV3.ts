import { computed, ref, type Ref } from 'vue'
import { pathCopy, weeks, type Sample } from '~lab/lab/shamePath'
import { flatSteps, RETURN_WEEK, type FlatStep } from '~lab/lab/pathViewV2'

/**
 * Path view v3 (2026-11-01, round 7): the phases as ONE horizontal strip
 * across the whole view, the open phase spilling into a field with its
 * steps, a description only on the current step, and the repeating
 * practices in a shape of their own (pills / discs), apart from the
 * one-off step tiles. Illustrative progress only — no scheduler, no store.
 */

/** Scene scenarios: the Lab samples plus "fresh" — enrolled, nothing done yet (the user's screenshot). */
export const sceneSamples = [
  { id: 'fresh', label: 'Pierwszy dzień (0/4)' },
  { id: 'mid', label: 'Połowa drogi' },
  { id: 'quiet', label: 'Cichy tydzień' },
  { id: 'paused', label: 'Pauza' },
  { id: 'completed', label: 'Po zakończeniu' },
  { id: 'return', label: 'Powrót' },
  { id: 'start', label: 'Przed zapisem' },
] as const
export type SceneSample = (typeof sceneSamples)[number]['id']

/** The Lab data helpers (stats, skills, cards) know only the original samples. */
export function dataSample(sample: SceneSample): Sample {
  return sample === 'fresh' ? 'start' : sample
}

export function initialDone(sample: SceneSample): number[] {
  switch (sample) {
    case 'start':
    case 'fresh':
      return []
    case 'completed':
    case 'return':
      return flatSteps.filter(step => step.week < RETURN_WEEK).map(step => step.index)
    default: {
      // mid · quiet · paused: weeks 1–3 done, first step of week 4 done.
      const firstOfWeek4 = flatSteps.find(step => step.week === 3)!.index
      return flatSteps.filter(step => step.index <= firstOfWeek4).map(step => step.index)
    }
  }
}

export type StepState = 'done' | 'current' | 'later'

export function usePathProgressV3(sample: Ref<SceneSample>) {
  const done = ref<Set<number>>(new Set(initialDone(sample.value)))
  const enrolled = computed(() => sample.value !== 'start')
  const closed = computed(() => sample.value === 'completed')

  const currentIndex = computed(() => {
    if (!enrolled.value || closed.value) return -1
    const scope = sample.value === 'return' ? flatSteps.filter(step => step.week === RETURN_WEEK) : flatSteps.filter(step => step.week < RETURN_WEEK)
    return scope.find(step => !done.value.has(step.index))?.index ?? -1
  })
  const current = computed(() => (currentIndex.value >= 0 ? flatSteps[currentIndex.value]! : null))
  const currentWeek = computed(() => current.value?.week ?? (closed.value ? -1 : 0))

  function stepState(index: number): StepState {
    if (done.value.has(index)) return 'done'
    return index === currentIndex.value ? 'current' : 'later'
  }
  function weekSteps(week: number) {
    return flatSteps.filter(step => step.week === week)
  }
  function weekCompletion(week: number) {
    const steps = weekSteps(week)
    return { done: steps.filter(step => done.value.has(step.index)).length, total: steps.length }
  }
  function weekState(week: number): StepState {
    const { done: count, total } = weekCompletion(week)
    if (currentWeek.value === week && !closed.value) return 'current'
    return total > 0 && count === total ? 'done' : 'later'
  }
  function complete(index: number) {
    if (index !== currentIndex.value) return
    done.value = new Set([...done.value, index])
  }
  const lastDone = computed(() => (done.value.size ? Math.max(...done.value) : -1))
  function undo(index: number) {
    if (index !== lastDone.value) return
    const next = new Set(done.value)
    next.delete(index)
    done.value = next
  }
  function restart() {
    done.value = new Set()
  }
  function reset() {
    done.value = new Set(initialDone(sample.value))
  }

  return { done, enrolled, closed, currentIndex, current, currentWeek, lastDone, stepState, weekSteps, weekCompletion, weekState, complete, undo, restart, reset }
}

/* ── Practices: what repeats beside the steps ────────────────────────────── */

export interface PracticeDef {
  slug: string
  title: string
  /** Rhythm in words — one note per practice, never two. */
  rhythm: string
  /** One sentence for the hover/tooltip; never on the surface. */
  what: string
  /** Catalog `startsAfterStep` / `endsAfterStep` (1-based step ordinals). */
  from: number
  to: number
  icon: string
  action: string
}

/** Mirrors programCatalog `shame-compassion.practices` (2026-11-01). */
export const practiceDefs: PracticeDef[] = [
  { slug: 'paced-breathing', title: 'Dłuższy wydech', rhythm: 'codziennie', what: 'Dwie, trzy minuty z wydechem dłuższym niż wdech. Wycisza pobudzenie, zanim podejdziesz do czegoś trudnego.', from: 0, to: 6, icon: 'mg-exercise-paced-breathing', action: 'Otwórz' },
  { slug: 'moment-shame', title: 'Momenty', rhythm: 'co 2 dni', what: 'Pięć dotknięć po trudnej chwili: która część przejęła ster, kiedy to zauważasz, co robisz zamiast, jak mocno.', from: 2, to: 13, icon: 'mg-exercise-shame-log', action: 'Zapisz' },
  { slug: 'self-compassion-break', title: 'Przerwa na współczucie', rhythm: 'co 2 dni', what: 'Dwadzieścia sekund oddechu i trzy kroki: co boli, nie tylko ja, co chcę sobie powiedzieć.', from: 6, to: 23, icon: 'mg-exercise-self-compassion-break', action: 'Otwórz' },
  { slug: 'shame-writing', title: 'Pisanie o wstydzie', rhythm: 'co 2 dni', what: 'Po trudnej chwili trzy akapity: nie tylko ja, życzliwość do siebie, dystans.', from: 14, to: 16, icon: 'mg-exercise-shame-writing', action: 'Otwórz' },
  { slug: 'positive-data-log', title: 'Dowody', rhythm: 'co 2 dni', what: 'Dopisujesz dowody na rozsądne wymaganie wobec siebie.', from: 17, to: 23, icon: 'mg-exercise-positive-data-log', action: 'Dopisz' },
]

/** Practices active at a given step ordinal (1-based; the catalog's starts/ends are step counts). */
export function practicesAt(completedSteps: number): PracticeDef[] {
  return practiceDefs.filter(p => completedSteps >= p.from && completedSteps < p.to)
}

export interface CollectionItem {
  def: PracticeDef
  /** Inside its rhythm window (the path asks for it) — otherwise it stays in the collection on demand. */
  active: boolean
}

/**
 * The growing collection (user, 2026-11-01): every practice the path has
 * handed over so far stays available as a tool; the ones the path currently
 * asks for carry their rhythm, the rest are "na żądanie". Nothing is shown
 * before the path hands it over.
 */
export function collectionAt(completedSteps: number): CollectionItem[] {
  return practiceDefs.filter(p => completedSteps >= p.from).map(def => ({ def, active: completedSteps < def.to }))
}

export interface TaskDef {
  key: string
  phase: string
  times: number
  title: string
  why: string
}

const taskCopy = pathCopy.tasks as Record<string, { title: string | { m: string; f: string }; why: string }>
const tg = (value: string | { m: string; f: string }) => (typeof value === 'string' ? value : value.m)

/** Mirrors programCatalog `shame-compassion.weeklyTasks` keys per phase. */
const taskPhases: [string, string, number][] = [
  ['nameShame', 'w1', 3], ['catchBody', 'w1', 3],
  ['soothingGesture', 'w2', 3], ['receiveKindness', 'w2', 2], ['kindAct', 'w2', 2],
  ['useResponse', 'w3', 3], ['unblendSay', 'w3', 3], ['friendTest', 'w3', 3],
  ['stayLonger', 'w4', 2], ['repairGuilt', 'w4', 1],
  ['noticeCritic', 'w5', 3], ['handOver', 'w5', 2],
  ['sayNo', 'w6', 1], ['readAloud', 'w6', 2], ['defendSelf', 'w6', 2],
  ['collectEvidence', 'w7', 3], ['breakDemand', 'w7', 1],
]
export const taskDefs: TaskDef[] = taskPhases.map(([key, phase, times]) => ({ key, phase, times, title: tg(taskCopy[key]?.title ?? key), why: taskCopy[key]?.why ?? '' }))

export function tasksFor(phaseKey: string): TaskDef[] {
  return taskDefs.filter(task => task.phase === phaseKey)
}

export const phaseTitle = (index: number) => weeks[index]!.title
export const phaseWhy = (index: number) => (index === RETURN_WEEK ? 'Wracasz do dwóch pomiarów i do listu, który napisałeś do siebie.' : weeks[index]!.why)

export { flatSteps, RETURN_WEEK }
export type { FlatStep }
