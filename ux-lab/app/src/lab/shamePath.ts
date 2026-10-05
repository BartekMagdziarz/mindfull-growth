import type { MicroExerciseEntry } from '@product/domain/microExercises'
import { momentsProgress, weekRefsEndingAt } from '@product/domain/momentsProgress'
import type { WeekRef } from '@product/domain/period'
import { getPeriodRefsForDate } from '@product/utils/periods'
import plPrograms from '@product/locales/pl/programs.json'
import knowledgeCopy from '@product/locales/pl/programKnowledge.json'
import { orderedKnowledgeCards } from '@product/data/programKnowledge'

// Illustrative records only. No repositories, scheduler or user database.
// The week/step structure mirrors programCatalog v3 (27 steps, w1…w8 + return).
export const pathCopy = plPrograms['shame-compassion']
export const samples = [
  { id: 'mid', label: 'Połowa drogi' },
  { id: 'start', label: 'Początek' },
  { id: 'quiet', label: 'Cichy tydzień' },
  { id: 'paused', label: 'Pauza' },
  { id: 'completed', label: 'Po zakończeniu' },
  { id: 'return', label: 'Powrót' },
] as const
export type Sample = (typeof samples)[number]['id']
export type Surface = 'dashboard' | 'reflection' | 'today'

export interface PathStep {
  title: string
  slug: string
  optional?: boolean
  minutes: string
}
const step = (title: string, slug: string, minutes = '5–10 min', optional = false): PathStep => ({
  title,
  slug,
  minutes,
  optional,
})
export const steps: PathStep[][] = [
  [
    step('Współczucie dla siebie', 'scs-sf', '3 min'),
    step('Jak traktuję siebie', 'fscrs', '4 min'),
    step('Mapa wstydu', 'shame-map', '10–15 min'),
    step('Mój znak', 'my-sign', '5 min'),
  ],
  [
    step('Bezpieczne miejsce', 'safe-place', '8 min'),
    step('Obraz współczujący', 'compassionate-image', '10 min'),
    step('Współczujące ja', 'compassionate-self', '8 min'),
  ],
  [step('Odpowiedź na wstyd', 'shame-response', '10 min'), step('O czym jest ten wstyd?', 'shame-or-guilt', '8 min')],
  [
    step('Rejestr myśli', 'thought-record', '10–15 min'),
    step('Współczucie dla siebie · połowa', 'scs-sf', '3 min'),
    step('Czy dawka pasuje', 'dose-check', '3 min'),
  ],
  [
    step('Punkt wejścia', 'trailhead', '10 min'),
    step('Docenienie protektora', 'protector-appreciation', '10 min'),
    step('Rozmowa z częścią', 'direct-access', '15 min', true),
  ],
  [step('List współczucia', 'compassionate-letter', '15–20 min'), step('Głos obronny', 'defender-voice', '8 min')],
  [
    step('Przekonania kluczowe', 'core-beliefs', '15 min'),
    step('Eksperyment behawioralny', 'behavioral-experiment', '10 min'),
    step('Świadkowanie', 'exile-witnessing', '20 min', true),
  ],
  [
    step('Współczucie dla siebie · koniec', 'scs-sf', '3 min'),
    step('Jak traktuję siebie · koniec', 'fscrs', '4 min'),
    step('List do siebie na później', 'letter-to-future-self', '10 min'),
    step('Plan podtrzymania', 'maintenance-plan', '10 min'),
  ],
  [
    step('Współczucie dla siebie · powrót', 'scs-sf', '3 min'),
    step('Jak traktuję siebie · powrót', 'fscrs', '4 min'),
    step('Co zostało, co wróciło', 'path-return', '8 min'),
  ],
]
export const phaseKeys = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'return'] as const
export const weeks = phaseKeys.map((key, i) => ({
  key,
  number: i + 1,
  ...pathCopy.phases[key],
  steps: steps[i]!,
}))
export const totalSteps = steps.slice(0, 8).reduce((sum, list) => sum + list.length, 0)

export const partLabels = ['Ukrywający', 'Krytyk', 'Oskarżyciel', 'Unikający']
export const partKeys = ['withdraw', 'attackSelf', 'attackOthers', 'avoid'] as const
export const noticingLabels = ['W trakcie', 'Po chwili', 'Po godzinach', 'Dopiero później']
export const noticingKeys = ['during', 'soon', 'hours', 'later'] as const

export const allWeekRefs = weekRefsEndingAt(getPeriodRefsForDate(new Date('2026-11-01T12:00:00')).week, 8)
export const weekNumber = (weekRef: WeekRef) => allWeekRefs.indexOf(weekRef) + 1

const counts = [5, 7, 6, 6, 5, 6, 4, 5]
const partOrder = ['withdraw', 'attackSelf', 'attackOthers', 'avoid', 'none'] as const
export const entries: MicroExerciseEntry[] = counts.flatMap((count, wi) =>
  Array.from({ length: count }, (_, j) => {
    const date = new Date(2026, 8, 7 + wi * 7 + j, 12)
    const createdAt = date.toISOString()
    // Later weeks: "no part took the wheel" shows up more often.
    const compass = j < Math.floor(wi / 2) ? 'none' : partOrder[(j + wi) % 4]!
    return {
      id: `example-${wi}-${j}`,
      exerciseSlug: 'moments',
      createdAt,
      updatedAt: createdAt,
      responses: {
        kind: 'shame',
        hadMoment: 'yes',
        compass,
        noticed: noticingKeys[Math.max(0, (j % 4) - Math.floor(wi / 3))]!,
        response: j < Math.min(count, wi + 2) ? ['breath', 'unblend'] : ['nothing'],
        // Krytyk takes the wheel hardest, Unikający most softly; strength eases over the weeks.
        strength: Math.max(1, Math.min(5, ({ withdraw: 4, attackSelf: 5, attackOthers: 4, avoid: 3, none: 2 }[compass] ?? 3) - Math.floor(wi / 3))),
        ...(j % 2 === 0 ? { criticSaid: 'Powinienem był wiedzieć.' } : {}),
        ...(j < wi + 1
          ? {
              kindVoice: [
                'Nie muszę wiedzieć wszystkiego, żeby być częścią rozmowy.',
                'To mój Krytyk mówi. Mogę go wysłuchać i zostać.',
                'Jeden błąd nie opowiada całej historii o mnie.',
              ][j % 3]!,
            }
          : {}),
      },
    }
  })
)
export const ownEntries: MicroExerciseEntry[] = [
  {
    id: 'image',
    exerciseSlug: 'compassionate-image',
    createdAt: '2026-09-16T12:00:00Z',
    updatedAt: '2026-09-16T12:00:00Z',
    responses: { message: 'Jesteś człowiekiem i to boli. Jestem z tobą.' },
  },
  {
    id: 'response',
    exerciseSlug: 'shame-response',
    createdAt: '2026-09-23T12:00:00Z',
    updatedAt: '2026-09-23T12:00:00Z',
    responses: {
      sentence: 'Nie muszę tego naprawiać w tej sekundzie.',
      unblendSentence: 'To moja część, nie cały ja.',
    },
  },
]
/** Weeks the enrollment has lived through in the sample (oldest first). */
export function weeksLived(sample: Sample): number {
  return sample === 'start' ? 1 : sample === 'completed' || sample === 'return' ? 8 : 4
}
export function statsFor(sample: Sample) {
  const refs = allWeekRefs.slice(0, weeksLived(sample))
  const records =
    sample === 'start' ? [] : sample === 'quiet' ? entries.filter(e => e.createdAt < '2026-09-28') : entries
  return momentsProgress(records, refs, sample === 'quiet' ? { [refs[3]!]: 4 } : {})
}
export function cardsFor(phaseKey: string) {
  return orderedKnowledgeCards('shame-compassion', phaseKey).map(card => ({
    ...card,
    ...knowledgeCopy[card.i18nKey as keyof typeof knowledgeCopy],
  }))
}
export const sentenceSources = {
  image: 'Obraz współczujący',
  self: 'Współczujące ja',
  response: 'Odpowiedź na wstyd',
  unblend: 'Odmieszanie',
  moment: 'Moment',
  defender: 'Głos obronny',
}

/**
 * "Umiejętności": the two instruments read as skills. Every row is oriented
 * so that movement to the RIGHT is movement toward the goal — rows where
 * less is better are flipped and say so in their label.
 */
export interface SkillRow {
  key: string
  label: string
  instrument: 'SCS-SF' | 'FSCRS'
  min: number
  max: number
  lessIsBetter: boolean
  /** start · połowa · koniec · powrót (null = not measured yet) */
  points: [number | null, number | null, number | null, number | null]
}
export const skillColumns = ['Start', 'Połowa', 'Koniec', 'Powrót']
export function skillsFor(sample: Sample): SkillRow[] {
  const closed = sample === 'completed' || sample === 'return'
  const mid = sample !== 'start'
  const ret = sample === 'return'
  const pick = (start: number, half: number | null, end: number, back: number): SkillRow['points'] => [
    sample === 'start' ? null : start,
    mid && half !== null ? half : null,
    closed ? end : null,
    ret ? back : null,
  ]
  return [
    { key: 'scs', label: 'Współczucie dla siebie', instrument: 'SCS-SF', min: 1, max: 5, lessIsBetter: false, points: pick(2.2, 2.9, 3.4, 3.3) },
    { key: 'reassured', label: 'Uspokajam siebie', instrument: 'FSCRS', min: 0, max: 4, lessIsBetter: false, points: pick(1.7, null, 2.8, 2.7) },
    { key: 'inadequate', label: 'Mniej „nieadekwatnego ja”', instrument: 'FSCRS', min: 0, max: 4, lessIsBetter: true, points: pick(3.1, null, 2.4, 2.5) },
    { key: 'hated', label: 'Mniej „znienawidzonego ja”', instrument: 'FSCRS', min: 0, max: 4, lessIsBetter: true, points: pick(1.4, null, 0.8, 0.9) },
  ]
}
