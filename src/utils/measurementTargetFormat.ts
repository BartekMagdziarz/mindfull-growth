import type { MeasurementTarget } from '@/domain/planning'

type Translator = (key: string, params?: Record<string, string | number>) => string

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export function formatMeasurementTargetSummary(target: MeasurementTarget, t: Translator): string {
  const value = formatMeasurementValue(target.value)
  // Operators render as words ("Co najmniej / Co najwyżej") for every kind, matching the
  // inline target editor — no more >= / <= notation in user-facing summaries.
  const operator = t(`planning.objects.targetOperators.${target.operator}`)
  let base: string
  switch (target.kind) {
    case 'count':
      base = `${operator} ${value}`
      break
    case 'value': {
      const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
      base = `${aggregation} ${operator} ${value}`
      break
    }
    case 'rating': {
      const aggregation = t('planning.objects.targetAggregations.average')
      base = `${aggregation} ${operator} ${value}`
      break
    }
  }

  const entryDays = target.entryDays
  if (!entryDays) {
    return base
  }
  // The condition stays symbolic ("· ≥ 5 dni") to keep the summary compact.
  const symbol = entryDays.operator === 'min' ? '≥' : '≤'
  return `${base} · ${symbol} ${entryDays.value} ${t('planning.objects.targetSentence.entryDaysUnit')}`
}
