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
  switch (target.kind) {
    case 'count':
      return `${operator} ${value}`
    case 'value': {
      const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
      return `${aggregation} ${operator} ${value}`
    }
    case 'rating': {
      const aggregation = t('planning.objects.targetAggregations.average')
      return `${aggregation} ${operator} ${value}`
    }
  }
}
