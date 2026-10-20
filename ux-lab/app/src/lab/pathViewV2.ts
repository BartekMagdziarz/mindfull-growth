import { computed, ref, type Ref } from 'vue'
import { pathCopy, weeks, type Sample } from '~lab/lab/shamePath'

const stepCopy = pathCopy.steps as Record<string, { intro: string; title?: string }>

/**
 * Path view v2 (2026-10-11): the journey as numbered rows with ONE state disc
 * on the right, steps as tiles with their own buttons, and a "co / po co"
 * sentence per step. Illustrative progress only — no scheduler, no store.
 */

/** Catalog `estimatedMinutes` per exercise (src/data/exerciseCatalog.ts). */
export const stepMinutes: Record<string, number> = {
  'scs-sf': 4,
  fscrs: 5,
  'shame-map': 7,
  'my-sign': 4,
  'safe-place': 7,
  'compassionate-image': 6,
  'compassionate-self': 6,
  'shame-response': 7,
  'shame-or-guilt': 5,
  'thought-record': 15,
  'dose-check': 3,
  trailhead: 10,
  'protector-appreciation': 10,
  'direct-access': 15,
  'compassionate-letter': 15,
  'defender-voice': 8,
  'core-beliefs': 15,
  'behavioral-experiment': 15,
  'exile-witnessing': 15,
  'letter-to-future-self': 12,
  'maintenance-plan': 4,
  'path-return': 6,
}

/**
 * "Po co ten krok?" — one sentence per step, in program order (27 steps).
 * Proposed copy for `programs.shame-compassion.steps.stepN.why`; the "co"
 * sentence is the existing `intro`.
 */
export const stepWhy: string[] = [
  'Bez punktu startu nie zobaczysz zmiany. Ten pomiar jest twoim punktem odniesienia na całą drogę.',
  'Wstyd podtrzymują trzy wewnętrzne głosy. Gdy je zmierzysz, wiesz, który najbardziej potrzebuje pracy.',
  'Wstyd łatwiej zauważyć, gdy znasz jego miejsca i swoje typowe reakcje. Mapa daje nazwy temu, co dotąd działo się samo.',
  'Własne zdanie o celu trzyma kierunek przez osiem tygodni i mówi, po czym poznasz, że ścieżka działa.',
  'Ciepło wobec siebie bywa trudne. Potrzebujesz miejsca, do którego wrócisz, gdy zrobi się za dużo.',
  'Łatwiej przyjąć ciepło od postaci niż wywołać je w sobie z niczego. Jej zdanie będzie wracało w kolejnych krokach.',
  'Postać była pomostem. Teraz uczysz się, jak samemu brzmieć ciepło wobec części, która się wstydzi.',
  'W chwili wstydu nie ma czasu na myślenie. Gotowy plan sprawia, że twoja odpowiedź wyprzedza część.',
  'Czyn, zdarzenie i wymaganie potrzebują innej odpowiedzi. Bez tego pytania wszystko traktujesz tak samo.',
  'Gorąca myśl „jestem…” brzmi jak fakt. Rozłożona na dowody traci siłę.',
  'Drugi punkt pokazuje kierunek, zanim dojdziesz do końca. To obraz, nie ocena.',
  'Ścieżka ma się mieścić w życiu. Lepiej mniej i regularnie niż dużo i wcale.',
  'Krytyk pokazuje się w konkretnych momentach. Jeden z nich jest drzwiami do rozmowy z tą częścią.',
  'Krytyk nie jest wrogiem, tylko ochroną, która wyrosła z lęku. Gdy wiesz, czego pilnuje, możesz przejąć od niego ster.',
  'Niektórym łatwiej usłyszeć część, gdy ma własny głos. Pomiń, jeśli nie czujesz, że to twoja droga.',
  'Pisanie spowalnia głos współczującego ja na tyle, by zostało coś, do czego da się wrócić.',
  'Współczucie to także stanowczość. Zdanie obronne wypowiedziane raz jest łatwiejsze w prawdziwej sytuacji.',
  'Pod wymaganiem siedzi przekonanie o sobie. Nowe przekonanie potrzebuje dowodów, które od teraz zbierasz.',
  'Przewidywanie „odrzucą mnie” sprawdza się dopiero w świecie. Mała sytuacja daje dowód, którego nie da ćwiczenie w głowie.',
  'Wstyd ma często stare źródło. Bycie przy nim bez naprawiania zmienia więcej niż argumenty — tylko w zgodzie z częściami, które chronią.',
  'Trzeci punkt domyka obraz: start, połowa, koniec. To twój dowód zmiany.',
  'Zobaczysz, czy uspokajanie urosło, a surowość i niechęć osłabły.',
  'Gorsze dni wrócą. List z dobrego dnia działa wtedy, gdy ciepła do siebie akurat brakuje.',
  'Bez decyzji praktyki wygasają. Wybierasz kilka, które zostają, i rytm, który się utrzyma.',
  'Czwarty pomiar mówi, co utrzymało się bez ścieżki.',
  'Trzeci pomiar głosów: co zostało z tego, co było ćwiczone.',
  'Powrót nie jest egzaminem. To spojrzenie, co pomaga na co dzień, i jeden mały ruch dalej.',
]

export interface FlatStep {
  index: number
  week: number
  slug: string
  title: string
  what: string
  why: string
  minutes: number
  optional: boolean
}

/** Every step of the path in order, with its week index (0–7, 8 = return). */
export const flatSteps: FlatStep[] = weeks.flatMap((week, wi) =>
  week.steps.map(step => ({ index: -1, week: wi, slug: step.slug, title: step.title, what: '', why: '', minutes: stepMinutes[step.slug] ?? 5, optional: Boolean(step.optional) }))
).map((step, index) => ({ ...step, index, what: stepCopy[`step${index + 1}`]?.intro ?? '', why: stepWhy[index] ?? '' }))

export const RETURN_WEEK = 8
export const MAIN_STEPS = flatSteps.filter(step => step.week < RETURN_WEEK).length

export type StepState = 'done' | 'current' | 'later'
export type WeekState = StepState

/** Which steps a sample has completed when the scene opens. */
export function initialDone(sample: Sample): number[] {
  switch (sample) {
    case 'start':
      return []
    case 'completed':
      return flatSteps.filter(step => step.week < RETURN_WEEK).map(step => step.index)
    case 'return':
      return flatSteps.filter(step => step.week < RETURN_WEEK).map(step => step.index)
    default: {
      // mid · quiet · paused: weeks 1–3 done, first step of week 4 done.
      const firstOfWeek4 = flatSteps.find(step => step.week === 3)!.index
      return flatSteps.filter(step => step.index <= firstOfWeek4).map(step => step.index)
    }
  }
}

export function usePathProgress(sample: Ref<Sample>) {
  const done = ref<Set<number>>(new Set(initialDone(sample.value)))
  const enrolled = computed(() => sample.value !== 'start')
  const closed = computed(() => sample.value === 'completed')

  /** First undone step, in the main run or — on the return — in the return week. */
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
  function weekState(week: number): WeekState {
    const { done: count, total } = weekCompletion(week)
    if (currentWeek.value === week && !closed.value) return 'current'
    return total > 0 && count === total ? 'done' : 'later'
  }
  /** Marks the current step done (or skips it); nothing else is markable. */
  function complete(index: number) {
    if (index !== currentIndex.value) return
    done.value = new Set([...done.value, index])
  }
  /** Only the most recent completion can be taken back — the path stays linear. */
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

/** Illustrative completion dates: week w starts 7 Sep 2026, a step every other day. */
export function doneDate(step: FlatStep): string {
  const date = new Date(2026, 8, 7 + step.week * 7 + (step.index - flatSteps.find(s => s.week === step.week)!.index) * 2, 12)
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}
