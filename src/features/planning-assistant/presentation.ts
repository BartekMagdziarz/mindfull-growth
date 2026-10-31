import type { PlannerObject, PlannerKind } from '@/domain/planningAssistant'
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
    return `${{ completion: 'Odhaczenie', counter: 'Licznik', value: 'Wartość', rating: 'Ocena', 'multi-completion': 'Checklista' }[item.entryMode]} · bez targetu`
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
