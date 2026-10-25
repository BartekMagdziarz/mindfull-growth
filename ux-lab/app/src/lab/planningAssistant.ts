export type PlannerSample = 'reading' | 'portfolio' | 'week'
export type PlannerKind = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'weeklyIntention'
export type PlannerMode = 'completion' | 'counter' | 'value' | 'rating' | 'multi-completion'
export interface PlannerObject {
  id: string
  kind: PlannerKind
  parentId?: string
  title: string
  description: string
  selected: boolean
  entryMode: PlannerMode
  cadence: 'weekly' | 'monthly'
  target: number
  operator: 'min' | 'max'
  aggregation: 'sum' | 'average' | 'last'
  ratingMin: number
  ratingMax: number
  items: string[]
  dailyThreshold: number
  startDate: string
  endDate: string
  days: number[]
  successDefinition: string
}
export const plannerSamples = {
  reading: {
    label: 'Czytanie',
    icon: 'book',
    prompt: 'Chcę wrócić do czytania. 20 minut, trzy razy w tygodniu.',
    question: 'W trzy różne dni czy trzy sesje?',
    answers: ['Trzy różne dni', 'Trzy sesje'],
    reply: 'Zacznijmy od dwóch tygodni.',
  },
  portfolio: {
    label: 'Portfolio',
    icon: 'work_outline',
    prompt: 'Chcę przygotować portfolio do końca listopada.',
    question: 'Po czym poznasz, że jest gotowe?',
    answers: ['Dwa projekty i publikacja', 'Najpierw jeden projekt'],
    reply: 'Jeden cel, dwa konkretne rezultaty.',
  },
  week: {
    label: 'Mała próba',
    icon: 'spa',
    prompt: 'Chcę zrobić w tym tygodniu trochę miejsca dla siebie.',
    question: 'Co byłoby małym, dobrym początkiem?',
    answers: ['Spacer bez telefonu', 'Spokojny wieczór'],
    reply: 'Spróbujmy tylko w tym tygodniu.',
  },
} as const

function object(
  id: string,
  kind: PlannerKind,
  title: string,
  patch: Partial<PlannerObject> = {}
): PlannerObject {
  return {
    id,
    kind,
    title,
    description: '',
    selected: true,
    entryMode: 'completion',
    cadence: 'weekly',
    target: 3,
    operator: 'min',
    aggregation: 'sum',
    ratingMin: 1,
    ratingMax: 5,
    items: ['Pierwszy krok', 'Drugi krok'],
    dailyThreshold: 2,
    startDate: '2026-10-26',
    endDate: '2026-11-08',
    days: [],
    successDefinition: '',
    ...patch,
  }
}
export function createPlannerExample(sample: PlannerSample, answerIndex = 0): PlannerObject[] {
  if (sample === 'reading')
    return [
      object('reading', 'habit', 'Czytanie przez 20 minut', {
        description: 'Odhaczam po co najmniej 20 minutach czytania.',
        entryMode: answerIndex === 1 ? 'counter' : 'completion',
      }),
      object('focus', 'tracker', 'Koncentracja po czytaniu', {
        selected: false,
        entryMode: 'rating',
        description: '1 — trudno się skupić · 5 — pełne skupienie.',
      }),
    ]
  if (sample === 'portfolio')
    return [
      object('portfolio', 'goal', 'Opublikować portfolio', {
        endDate: '2026-11-30',
        successDefinition: 'Dwa opisane projekty i działająca strona portfolio.',
        description: 'Małe portfolio, które mogę pokazać przy rozmowie o pracy.',
      }),
      object(
        'case-studies',
        'keyResult',
        answerIndex === 1 ? 'Opisać jeden projekt' : 'Opisać dwa projekty',
        {
          parentId: 'portfolio',
          target: answerIndex === 1 ? 1 : 2,
          entryMode: 'counter',
          cadence: 'monthly',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          description: 'Projekt ma opis problemu, mojego wkładu i efektu.',
        }
      ),
      object('publish', 'keyResult', 'Opublikować stronę', {
        parentId: 'portfolio',
        target: 1,
        cadence: 'monthly',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        description: 'Strona jest dostępna pod publicznym adresem i działa na telefonie.',
      }),
    ]
  return [
    object(
      'small-step',
      'weeklyIntention',
      answerIndex === 1 ? 'Spokojny wieczór dla siebie' : 'Spacer bez telefonu',
      {
        target: 2,
        endDate: '2026-11-01',
        description:
          answerIndex === 1
            ? 'Pół godziny bez pracy i nadrabiania zaległości.'
            : 'Co najmniej 15 minut spaceru, telefon zostaje w kieszeni.',
      }
    ),
  ]
}
export const plannerKindLabels: Record<PlannerKind, string> = {
  goal: 'Cel',
  keyResult: 'Rezultat',
  habit: 'Nawyk',
  tracker: 'Tracker',
  weeklyIntention: 'Intencja',
}
export const plannerIcons: Record<PlannerKind, string> = {
  goal: 'mg-goal',
  keyResult: 'mg-result',
  habit: 'mg-habit',
  tracker: 'show_chart',
  weeklyIntention: 'mg-intention',
}
export function plannerMeasurementSentence(item: PlannerObject): string {
  if (item.kind === 'goal') return item.successDefinition || 'Doprecyzuj, po czym poznasz sukces.'
  const period = item.cadence === 'weekly' ? 'tydzień' : 'miesiąc'
  if (item.kind === 'tracker') {
    if (item.entryMode === 'rating')
      return `Ocena ${item.ratingMin}–${item.ratingMax} · bez targetu`
    return `${{ completion: 'Odhaczenie', counter: 'Licznik', value: 'Wartość', rating: 'Ocena', 'multi-completion': 'Lista' }[item.entryMode]} · bez targetu`
  }
  const comparison = item.operator === 'min' ? 'Co najmniej' : 'Co najwyżej'
  if (item.entryMode === 'completion')
    return `${comparison} ${item.target} ${item.target === 1 ? 'dzień' : item.target < 5 ? 'dni' : 'dni'} / ${period}`
  if (item.entryMode === 'counter')
    return `${comparison} ${item.target} ${item.target === 1 ? 'wykonanie' : item.target < 5 ? 'wykonania' : 'wykonań'} / ${period}`
  if (item.entryMode === 'multi-completion')
    return `${comparison} ${item.target} dni z zaliczeniem / ${period}`
  const aggregation =
    item.entryMode === 'rating'
      ? 'Średnia'
      : { sum: 'Suma', average: 'Średnia', last: 'Ostatni wynik' }[item.aggregation]
  return `${aggregation} ${item.operator === 'min' ? '≥' : '≤'} ${item.target} / ${period}`
}
export function plannerDate(value: string): string {
  if (!validDate(value)) return '—'
  return new Intl.DateTimeFormat('pl', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${value}T12:00:00Z`)
  )
}
function validDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`)
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
export function plannerScheduleSentence(item: PlannerObject): string {
  if (item.kind === 'goal') return `Do ${plannerDate(item.endDate)}`
  const range = `${plannerDate(item.startDate)} – ${plannerDate(item.endDate)}`
  return `${range} · ${item.days.length ? item.days.map(d => ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'][d]).join(', ') : 'elastycznie'}`
}
/** Selected children must keep their parent; toggling a parent selects its group. */
export function selectPlannerObject(
  objects: PlannerObject[],
  id: string,
  selected: boolean
): string | undefined {
  const item = objects.find(item => item.id === id)
  if (!item) return
  item.selected = selected
  if (item.kind === 'goal')
    for (const child of objects.filter(child => child.parentId === id)) child.selected = selected
  if (selected && item.parentId) {
    const parent = objects.find(parent => parent.id === item.parentId)
    if (parent && !parent.selected) {
      parent.selected = true
      return 'Wybrano również cel tego rezultatu.'
    }
  }
}
export function plannerObjectError(
  item: PlannerObject,
  objects: PlannerObject[]
): string | undefined {
  if (!item.title.trim()) return 'Nadaj nazwę.'
  if (!validDate(item.startDate) || !validDate(item.endDate) || item.startDate > item.endDate)
    return 'Sprawdź zakres dat.'
  if (item.kind === 'weeklyIntention') {
    const start = new Date(`${item.startDate}T12:00:00Z`)
    const end = new Date(`${item.endDate}T12:00:00Z`)
    if (start.getUTCDay() !== 1 || end.getTime() - start.getTime() !== 6 * 86400000)
      return 'Intencja obejmuje jeden tydzień, od poniedziałku do niedzieli.'
  }
  if (item.kind === 'goal') {
    if (!item.successDefinition.trim()) return 'Doprecyzuj sukces.'
    if (!objects.some(child => child.parentId === item.id && child.selected))
      return 'Wybierz przynajmniej jeden rezultat.'
    return
  }
  if (item.parentId && !objects.some(parent => parent.id === item.parentId && parent.selected))
    return 'Wybierz cel tego rezultatu.'
  if (item.kind !== 'tracker') {
    if (
      !Number.isFinite(item.target) ||
      item.target < 0 ||
      (['completion', 'counter', 'multi-completion'].includes(item.entryMode) &&
        !Number.isInteger(item.target))
    )
      return 'Sprawdź wartość targetu.'
    if (
      ['completion', 'multi-completion'].includes(item.entryMode) &&
      item.cadence === 'weekly' &&
      item.target > 7
    )
      return 'Tydzień ma najwyżej 7 dni.'
  }
  if (item.entryMode === 'rating') {
    if (
      !Number.isInteger(item.ratingMin) ||
      !Number.isInteger(item.ratingMax) ||
      item.ratingMin < 1 ||
      item.ratingMax <= item.ratingMin
    )
      return 'Sprawdź zakres skali.'
    if (item.kind !== 'tracker' && (item.target < item.ratingMin || item.target > item.ratingMax))
      return 'Target musi mieścić się w skali.'
  }
  if (item.entryMode === 'multi-completion') {
    if (!item.items.length || item.items.length > 8 || item.items.some(label => !label.trim()))
      return 'Uzupełnij elementy listy (maks. 8).'
    if (
      !Number.isInteger(item.dailyThreshold) ||
      item.dailyThreshold < 1 ||
      item.dailyThreshold > item.items.length
    )
      return 'Sprawdź próg zaliczenia dnia.'
  }
}
export function plannerSelectionErrors(objects: PlannerObject[]) {
  const selected = objects.filter(item => item.selected)
  if (!selected.length) return ['Wybierz coś do planu.']
  return selected.flatMap(item => {
    const error = plannerObjectError(item, objects)
    return error ? [`${item.title || 'Bez nazwy'}: ${error}`] : []
  })
}
