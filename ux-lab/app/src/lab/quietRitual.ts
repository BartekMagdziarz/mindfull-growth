import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'

export interface RitualPlacement {
  days: string[]
  wholeWeek: boolean
}
export interface RitualTarget {
  value: number
  operator: 'min' | 'max'
  entryDays: number | null
}
export interface QuietDraft {
  selected: string[]
  removedKeys: string[]
  intentions: LabFixtureObject[]
  placements: Record<string, RitualPlacement>
  targets: Record<string, RitualTarget>
  /** Keyed by `${areaIndex}:${axis}`; null = not rated. */
  ratings: Record<string, number | null>
  /** Free tags per life area (`${areaIndex}:tags`); no default vocabulary. */
  tags: Record<string, string[]>
  /** Axes the user has touched at least once; the previous-week ghost only shows before that. */
  touched: Record<string, boolean>
  comments: Record<string, string>
  anchors: string[]
  journal: string
  completed: boolean
}

// Session-only Lab state. A workbench reset uses a new revision key; no product storage.
export const useQuietRitualStore = defineStore('quiet-weekly-ritual', () => {
  const drafts = reactive<Record<string, QuietDraft>>({})
  // Tags typed anywhere in this Lab session; offered as suggestions in other areas/weeks.
  const recentTags = reactive<string[]>([])
  function rememberTag(tag: string) {
    const index = recentTags.indexOf(tag)
    if (index >= 0) recentTags.splice(index, 1)
    recentTags.unshift(tag)
    if (recentTags.length > 12) recentTags.length = 12
  }
  function getDraft(
    key: string,
    days: string[],
    items: LabFixtureObject[],
    busy = false
  ): QuietDraft {
    if (!drafts[key])
      drafts[key] = {
        selected: ['kr-runs', 'kr-deep-work', 'habit-stretch'],
        removedKeys: [],
        intentions: [],
        placements: {
          'kr-runs': { days: [days[0], days[2], days[5]], wholeWeek: false },
          'kr-deep-work': { days: [days[0], days[1], days[3], days[4]], wholeWeek: false },
          'habit-stretch': { days: [], wholeWeek: true },
          ...(busy
            ? {
                'habit-reading': { days: [days[0], days[2], days[4]], wholeWeek: false },
                'habit-dinner': { days: [days[0], days[3], days[5]], wholeWeek: false },
                'tracker-sleep': {
                  days: [days[0], days[1], days[2], days[3], days[4]],
                  wholeWeek: false,
                },
                'tracker-coffee': { days: [days[0], days[2]], wholeWeek: false },
                'intention-budget': { days: [days[0]], wholeWeek: false },
                'kr-distance': { days: [], wholeWeek: true },
                'kr-sleep': { days: [], wholeWeek: true },
                'tracker-evening': { days: [], wholeWeek: true },
              }
            : {}),
        },
        targets: Object.fromEntries(
          items.map(item => [
            item.key,
            {
              value: Number(item.targetLabel?.match(/\d+/)?.[0] ?? 1),
              operator: item.targetLabel?.includes('≤') ? 'max' : 'min',
              entryDays: null,
            },
          ])
        ),
        ratings: {},
        tags: {},
        touched: {},
        comments: {},
        anchors: ['', '', ''],
        journal: '',
        completed: false,
      }
    return drafts[key]
  }
  return { drafts, getDraft, recentTags, rememberTag }
})

export function toggleDay(placement: RitualPlacement, day: string): RitualPlacement {
  return {
    wholeWeek: false,
    days: placement.days.includes(day)
      ? placement.days.filter(d => d !== day)
      : [...placement.days, day],
  }
}
export function isPlaced(placement?: RitualPlacement): boolean {
  return Boolean(placement?.wholeWeek || placement?.days.length)
}

// Explicit illustrative daily sample for this experiment (rich-v1 supplies names/periods).
// Every displayed total is calculated from these same records. null ≠ recorded zero.
export const ritualEvidence: Record<
  string,
  {
    values: Array<number | null>
    planned: number[]
    target?: number
    unit?: string
    average?: boolean
  }
> = {
  'kr-runs': { values: [1, null, 1, null, null, 1, null], planned: [0, 2, 5], target: 3 },
  'kr-deep-work': { values: [1, 1, null, 1, null, null, null], planned: [0, 1, 3, 4], target: 4 },
  'habit-stretch': { values: [1, 1, 1, null, 1, 1, null], planned: [0, 1, 2, 3, 4], target: 5 },
  'habit-dinner': { values: [null, 1, null, 1, null, null, null], planned: [1, 3, 6], target: 3 },
  'intention-budget': {
    values: [null, null, null, null, null, null, null],
    planned: [],
    target: 1,
  },
  'tracker-sleep': { values: [3, 4, null, 2, 3, 5, 4], planned: [], average: true },
  'tracker-coffee': { values: [2, 1, 0, null, 2, 1, 1], planned: [], unit: 'kaw' },
  'tracker-evening': { values: [null, null, null, null, null, null, null], planned: [] },
}
export function evidenceResult(key: string): number | null {
  const evidence = ritualEvidence[key]
  const values = evidence?.values.filter((value): value is number => value !== null) ?? []
  if (!values.length) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return evidence.average ? sum / values.length : sum
}

// Illustrative journal/emotion detail for the review step and the journal context.
// Counts per day come from the rich-v1 week snapshot; these lists only give them names.
export type RitualQuadrant =
  | 'high-energy-high-pleasantness'
  | 'high-energy-low-pleasantness'
  | 'low-energy-high-pleasantness'
  | 'low-energy-low-pleasantness'
export const ritualQuadrants: RitualQuadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
]
export const quadrantLabel: Record<RitualQuadrant, string> = {
  'high-energy-high-pleasantness': 'Energia · przyjemne',
  'high-energy-low-pleasantness': 'Energia · nieprzyjemne',
  'low-energy-high-pleasantness': 'Spokój · przyjemne',
  'low-energy-low-pleasantness': 'Spokój · nieprzyjemne',
}
const emotionCycle: Array<{ name: string; quadrant: RitualQuadrant }> = [
  { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' },
  { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' },
  { name: 'Radość', quadrant: 'high-energy-high-pleasantness' },
  { name: 'Zmęczenie', quadrant: 'low-energy-low-pleasantness' },
  { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' },
  { name: 'Wdzięczność', quadrant: 'low-energy-high-pleasantness' },
  { name: 'Frustracja', quadrant: 'high-energy-low-pleasantness' },
  { name: 'Zapał', quadrant: 'high-energy-high-pleasantness' },
  { name: 'Smutek', quadrant: 'low-energy-low-pleasantness' },
  { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' },
]
const journalCycle = [
  'Poranek bez pośpiechu',
  'Rozmowa, która została w głowie',
  'Za dużo zakładek',
  'Wieczór z książką',
]
export function dayEmotionSample(dayIndex: number, count: number) {
  return Array.from({ length: count }, (_, n) => emotionCycle[(dayIndex * 2 + n) % emotionCycle.length])
}
export function dayJournalSample(dayIndex: number, count: number) {
  return Array.from({ length: count }, (_, n) => journalCycle[(dayIndex + n) % journalCycle.length])
}
export const ritualExerciseSample = ['Drzewo zmartwień', 'Zapis myśli']

// Denser reflection sample (`sample=busy`): a day can hold all four quadrants at once.
export const busyEmotionDays: Array<Array<{ name: string; quadrant: RitualQuadrant }>> = [
  [
    { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' },
    { name: 'Radość', quadrant: 'high-energy-high-pleasantness' },
    { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' },
    { name: 'Zmęczenie', quadrant: 'low-energy-low-pleasantness' },
  ],
  [
    { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' },
    { name: 'Frustracja', quadrant: 'high-energy-low-pleasantness' },
    { name: 'Stres', quadrant: 'high-energy-low-pleasantness' },
  ],
  [
    { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' },
    { name: 'Wdzięczność', quadrant: 'low-energy-high-pleasantness' },
    { name: 'Radość', quadrant: 'high-energy-high-pleasantness' },
  ],
  [
    { name: 'Zmęczenie', quadrant: 'low-energy-low-pleasantness' },
    { name: 'Smutek', quadrant: 'low-energy-low-pleasantness' },
    { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' },
    { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' },
    { name: 'Radość', quadrant: 'high-energy-high-pleasantness' },
    { name: 'Zapał', quadrant: 'high-energy-high-pleasantness' },
  ],
  [
    { name: 'Zapał', quadrant: 'high-energy-high-pleasantness' },
    { name: 'Radość', quadrant: 'high-energy-high-pleasantness' },
  ],
  [{ name: 'Spokój', quadrant: 'low-energy-high-pleasantness' }],
  [],
]

// Illustrative previous-week ratings (`${areaIndex}:${axis}`), shown as a faint ghost outline
// on an untouched bar. Areas: 0 Ciało, 1 Emocje, 2 Działanie, 3 Relacje.
export const previousWeekRatings: Record<string, number> = {
  '0:effort': 3,
  '0:state': 4,
  '1:effort': 2,
  '1:state': 3,
  '2:effort': 4,
  '2:state': 3,
  '3:effort': 3,
  '3:state': 4,
}
