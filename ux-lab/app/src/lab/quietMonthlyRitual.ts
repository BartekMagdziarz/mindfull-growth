import { defineStore } from 'pinia'
import type { RitualQuadrant } from './quietRitual'
import { reactive } from 'vue'
import type { LabFixtureObject, LabPriority } from '@product/dev/richVerificationScenario'
import type { MonthRef } from '@product/domain/period'
import { getChildPeriods, getPeriodBounds } from '@product/utils/periods'

export type Verdict = '' | 'continue' | 'adjust' | 'pause' | 'drop'
export interface MonthPlacement {
  weeks: string[]
  wholeMonth: boolean
}
export interface MonthTarget {
  value: number
  operator: 'min' | 'max'
  distribution: 'auto' | 'manual'
  weeks: Record<string, number>
  entryDays: number | null
}
export interface MonthAssessment {
  effort: number | null
  verdict: Verdict
  note: string
  progress: string[]
  risk: string[]
}
export interface MonthlyDraft {
  directions: string[]
  support: string[]
  placements: Record<string, MonthPlacement>
  targets: Record<string, MonthTarget>
  assessments: Record<string, MonthAssessment>
  ratings: Record<string, number | null>
  touched: Record<string, boolean>
  anchors: string[]
  journal: string
  completed: boolean
}
export const verdictLabels: Record<Verdict, string> = {
  '': 'Bez decyzji',
  continue: 'Kontynuuj',
  adjust: 'Dostosuj',
  pause: 'Wstrzymaj',
  drop: 'Porzuć',
}
export const compass = [
  { key: 'balance', label: 'Balans', hint: 'Miejsce na działanie i odpoczynek.' },
  { key: 'purpose', label: 'Sens', hint: 'Kontakt z tym, co naprawdę ważne.' },
  { key: 'growth', label: 'Rozwój', hint: 'Uczenie się i poszerzanie możliwości.' },
  {
    key: 'coherence',
    label: 'Zasady',
    hint: 'Spójność działań z własnymi wartościami i kierunkami.',
  },
  { key: 'agency', label: 'Wpływ', hint: 'Poczucie wyboru i możliwości działania.' },
]
export const monthlyAnchors = ['Z czego jestem dumny', 'Największe wyzwania', 'Jak się rozwinąłem']
export function monthWeeks(month: string) {
  return getChildPeriods(month as MonthRef).map(weekRef => {
    const bounds = getPeriodBounds(weekRef)
    const fmt = (day: string) =>
      new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(
        new Date(`${day}T12:00:00`)
      )
    return {
      weekRef,
      label: `T${weekRef.split('-W')[1]}`,
      range: `${fmt(bounds.start)} – ${fmt(bounds.end)}`,
    }
  })
}
export function validMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, m - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
export function canPlan(item: LabFixtureObject) {
  return (
    !['goal', 'intention'].includes(item.family) &&
    item.status !== 'retired' &&
    item.status !== 'orphan'
  )
}
export function hasPlacement(p?: MonthPlacement) {
  return Boolean(p?.wholeMonth || p?.weeks.length)
}
export function toggleMonthWeek(p: MonthPlacement, week: string, weeks: string[]): MonthPlacement {
  const selected = p.wholeMonth ? weeks : p.weeks
  return {
    wholeMonth: false,
    weeks: selected.includes(week) ? selected.filter(w => w !== week) : [...selected, week],
  }
}
export function summable(item: LabFixtureObject) {
  return (
    item.cadence === 'monthly' &&
    Boolean(item.targetLabel) &&
    item.entryMode !== 'rating' &&
    !/śred|average|ostat/i.test(item.targetLabel ?? '')
  )
}
export function weekValue(
  target: MonthTarget,
  placement: MonthPlacement,
  week: string,
  weeks: string[]
) {
  const active = weeks.filter(w => placement.wholeMonth || placement.weeks.includes(w))
  if (!active.includes(week)) return 0
  if (target.distribution === 'manual') return target.weeks[week] ?? 0
  const total = Math.max(0, Math.round(target.value))
  return Math.floor(total / active.length) + (active.indexOf(week) < total % active.length ? 1 : 0)
}
export const useQuietMonthlyRitualStore = defineStore('quiet-monthly-ritual', () => {
  const drafts = reactive<Record<string, MonthlyDraft>>({})
  function getDraft(
    key: string,
    priorities: LabPriority[],
    objects: LabFixtureObject[],
    weeks: string[],
    sample = ''
  ) {
    if (!drafts[key]) {
      const candidates = objects.filter(canPlan)
      const support =
        sample === 'empty'
          ? []
          : sample === 'gentle'
            ? ['gentle-conversation', 'gentle-reflection']
            : (sample === 'busy'
                ? candidates.filter(o => o.family !== 'tracker')
                : candidates.filter(o =>
                    ['kr-runs', 'kr-functions', 'habit-stretch', 'habit-dinner'].includes(o.key)
                  )
              ).map(o => o.key)
      drafts[key] = {
        directions: sample === 'empty' ? [] : priorities.slice(0, 3).map(p => p.key),
        support,
        placements: Object.fromEntries(
          candidates.map((o, i) => [
            o.key,
            {
              wholeMonth: support.includes(o.key) && i === 2,
              weeks:
                support.includes(o.key) && i !== 2 ? weeks.filter((_, j) => (i + j) % 3 !== 2) : [],
            },
          ])
        ),
        targets: Object.fromEntries(
          candidates
            .filter(o => o.targetLabel && o.family !== 'tracker')
            .map(o => [
              o.key,
              {
                value: Number(o.targetLabel!.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') ?? 1),
                operator: o.targetLabel!.includes('≤') ? 'max' : 'min',
                distribution: 'auto',
                weeks: {},
                entryDays: null,
              },
            ])
        ),
        assessments: Object.fromEntries(
          priorities.map(p => [
            p.key,
            { effort: null, verdict: '', note: '', progress: [], risk: [] },
          ])
        ),
        ratings: {},
        touched: {},
        anchors: ['', '', ''],
        journal: '',
        completed: false,
      }
    }
    return drafts[key]
  }
  return { drafts, getDraft }
})

// Explicit illustrative records for the month experiment; never reconstructed from counts.
// Dates belong to the chosen month and are listed in the Lab research notes.
export const monthlyContextSample: Array<{
  day: string
  journal: string
  exercise: string
  emotions: Array<{ name: string; quadrant: RitualQuadrant }>
}> = [
  {
    day: '03',
    journal: 'Mniej pośpiechu na początek miesiąca',
    exercise: '',
    emotions: [{ name: 'Spokój', quadrant: 'low-energy-high-pleasantness' as const }],
  },
  {
    day: '11',
    journal: 'Rozmowa o tym, czego teraz potrzebujemy',
    exercise: 'Drzewo zmartwień',
    emotions: [
      { name: 'Napięcie', quadrant: 'high-energy-low-pleasantness' as const },
      { name: 'Wdzięczność', quadrant: 'low-energy-high-pleasantness' as const },
    ],
  },
  {
    day: '18',
    journal: 'Zostawiam więcej miejsca na odpoczynek',
    exercise: '',
    emotions: [
      { name: 'Zmęczenie', quadrant: 'low-energy-low-pleasantness' as const },
      { name: 'Radość', quadrant: 'high-energy-high-pleasantness' as const },
    ],
  },
  {
    day: '25',
    journal: 'Małe rzeczy, które chcę zachować',
    exercise: 'Zapis myśli',
    emotions: [
      { name: 'Zapał', quadrant: 'high-energy-high-pleasantness' as const },
      { name: 'Spokój', quadrant: 'low-energy-high-pleasantness' as const },
    ],
  },
]

export const gentlePriority: LabPriority = {
  key: 'gentle-preparation',
  title: 'Dążenie do zajścia w ciążę',
  whyNow: 'Miejsce na wspólne przygotowanie bez presji wyniku.',
  desiredDirection:
    'Więcej spokoju, poczucia przygotowania i bliskości. W tym miesiącu wystarczy mały zakres wsparcia.',
  progressSignals: [
    'Mamy jasność co do najbliższego kroku',
    'Potrafimy rozmawiać bez presji wyniku',
  ],
  riskSignals: ['Przygotowania wypierają odpoczynek'],
  tone: 'blue',
}
export const gentleObjects: LabFixtureObject[] = [
  {
    key: 'gentle-conversation',
    family: 'keyResult',
    title: 'Porozmawiać o potrzebnym wsparciu',
    cadence: 'monthly',
    entryMode: 'completion',
    targetLabel: '1 / miesiąc',
    priorityKeys: ['gentle-preparation', 'relationships'],
    chart: [],
  },
  {
    key: 'gentle-reflection',
    family: 'habit',
    title: 'Chwila na refleksję tygodniową',
    cadence: 'weekly',
    entryMode: 'completion',
    targetLabel: '1 / tydzień',
    priorityKeys: [],
    chart: [],
  },
]
