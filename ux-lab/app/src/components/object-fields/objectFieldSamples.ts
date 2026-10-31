import type { DayRef } from '@product/domain/period'
import type { ObjectWindow } from '@product/utils/objectWindow'
import type { FieldChartPoint } from './FieldChart.vue'

/**
 * Object library cards for the "fields on object cards" experiment
 * (2026-10-11). Titles, facts and chart shapes follow the user's screenshots
 * from verify (Medytacja, Blok treningowy Paź26) and the rich-v1 profile.
 */
export interface FieldChartSample {
  kind: 'bars' | 'gauge'
  points: FieldChartPoint[]
  scaleMax?: number
}

export interface FieldKrSample {
  id: string
  title: string
  meta: string[]
  chart: FieldChartSample
}

export interface FieldCardSample {
  id: string
  kind: 'habit' | 'tracker' | 'goal'
  icon?: string
  title: string
  priorityIds: string[]
  lifeAreaIds: string[]
  /** Assigned weeks for the meta line ("29 cze – 11 paź"); omitted = "na stałe" or nothing. */
  periods?: string[]
  isPermanent?: boolean
  meta?: string[]
  chart?: FieldChartSample
  window?: ObjectWindow
  start?: string
  end?: { label: string; hint?: string }
  krs?: FieldKrSample[]
}

/** Twelve consecutive app weeks (W29–W40) ending on the week of the 11.10.2026 screenshots. */
const TWELVE_WEEKS = Array.from({ length: 12 }, (_, i) => `2026-W${String(29 + i).padStart(2, '0')}`)

export const PRIORITY_OPTIONS = [
  { id: 'p-move', label: 'Regularny ruch i kondycja', icon: 'directions_run' },
  { id: 'p-calm', label: 'Spokojna głowa', icon: 'self_improvement' },
]

export const LIFE_AREA_OPTIONS = [
  { id: 'la-body', label: 'Zdrowie i ciało', icon: 'directions_run' },
  { id: 'la-mind', label: 'Równowaga', icon: 'air' },
  { id: 'la-sleep', label: 'Sen i regeneracja', icon: 'bedtime' },
]

/** Completion counts against a weekly "co najmniej n"; 0 = nothing logged. */
function counts(values: number[], target: number | number[]): FieldChartPoint[] {
  return values.map((actual, i) => {
    const goal = Array.isArray(target) ? target[i] : target
    if (actual === 0) return { target: goal, status: 'no-data' }
    return { actual, target: goal, status: actual >= goal ? 'met' : 'missed' }
  })
}

export const MEDITATION: FieldCardSample = {
  id: 'meditation',
  kind: 'habit',
  icon: 'self_improvement',
  title: 'Medytacja',
  priorityIds: [],
  lifeAreaIds: ['la-mind'],
  isPermanent: true,
  meta: ['Tygodniowy', 'Wykonanie', 'Co najmniej 3'],
  chart: { kind: 'bars', points: counts([3, 1, 4, 3, 1, 2, 0, 1, 5, 4, 3, 2], 3) },
}

export const SLEEP: FieldCardSample = {
  id: 'sleep',
  kind: 'tracker',
  icon: 'bedtime',
  title: 'Jakość snu',
  priorityIds: ['p-calm'],
  lifeAreaIds: ['la-sleep'],
  periods: TWELVE_WEEKS,
  meta: ['Tygodniowy', 'Ocena 1–10'],
  chart: {
    kind: 'gauge',
    scaleMax: 10,
    points: [6.5, 7, 5.5, 8, 7.5, 6, 0, 8.5, 7, 6.5, 7.5, 8].map((actual) =>
      actual === 0 ? { status: 'no-data' } : { actual, status: 'no-target' },
    ),
  },
}

export const TRAINING_BLOCK: FieldCardSample = {
  id: 'training-block',
  kind: 'goal',
  title: 'Blok treningowy Paź26',
  priorityIds: ['p-move'],
  lifeAreaIds: ['la-body'],
  periods: ['2026-W40', '2026-W41', '2026-W42', '2026-W43'],
  window: { start: '2026-10-04' as DayRef, end: '2026-11-01' as DayRef, progress: 0.25, state: 'running', daysToEnd: 21 },
  start: '4 paź',
  end: { label: '1 lis', hint: 'za 3 tyg.' },
  krs: [
    { id: 'strength', title: 'Trening siłowy', meta: ['Tygodniowy', 'Wykonanie', 'Co najmniej 2'], chart: { kind: 'bars', points: counts([0, 2], 2) } },
    { id: 'cardio', title: 'Trening cardio', meta: ['Tygodniowy', 'Wykonanie', 'Co najmniej 3'], chart: { kind: 'bars', points: counts([0, 1], 3) } },
  ],
}

export const TEN_K: FieldCardSample = {
  id: 'ten-k',
  kind: 'goal',
  icon: 'directions_run',
  title: 'Przebiec 10 km bez zatrzymania',
  priorityIds: ['p-move'],
  lifeAreaIds: ['la-body'],
  periods: ['2026-W35', '2026-W36', '2026-W37', '2026-W38', '2026-W39', '2026-W40'],
  window: { start: '2026-09-01' as DayRef, end: '2026-11-29' as DayRef, progress: 0.45, state: 'running', daysToEnd: 49 },
  start: '1 wrz',
  end: { label: '29 lis', hint: 'za 7 tyg.' },
  krs: [
    { id: 'runs', title: 'Biegać 3 razy w tygodniu', meta: ['Tygodniowy', 'Wykonanie', 'Co najmniej 3'], chart: { kind: 'bars', points: counts([3, 2, 3, 4, 1, 3], 3) } },
    { id: 'long-run', title: 'Najdłuższy bieg w tygodniu', meta: ['Tygodniowy', 'Wartość', 'Co najmniej 5–7 km'], chart: { kind: 'bars', points: counts([4, 5.5, 6, 5, 7, 7.5], [5, 5, 6, 6, 7, 7]) } },
    { id: 'stretch', title: 'Rozciąganie po biegu', meta: ['Tygodniowy', 'Wykonanie', 'Co najmniej 3'], chart: { kind: 'bars', points: counts([2, 3, 3, 1, 3, 4], 3) } },
  ],
}

export const GOALS = { 'training-block': TRAINING_BLOCK, 'ten-k': TEN_K } as const
export type GoalSampleId = keyof typeof GOALS
