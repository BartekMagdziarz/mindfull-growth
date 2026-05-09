import type { MeasurementTarget } from '@/domain/planning'

type Translator = (key: string, params?: Record<string, string | number>) => string

function formatComparisonOperator(operator: 'gte' | 'lte'): string {
  return operator === 'gte' ? '>=' : '<='
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

export function formatMeasurementTargetSummary(target: MeasurementTarget, t: Translator): string {
  const value = formatMeasurementValue(target.value)
  switch (target.kind) {
    case 'count': {
      const operator = t(`planning.objects.targetOperators.${target.operator}`)
      return `${operator} ${value}`
    }
    case 'value': {
      const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
      const operator = formatComparisonOperator(target.operator)
      return `${aggregation} ${operator} ${value}`
    }
    case 'rating': {
      const aggregation = t('planning.objects.targetAggregations.average')
      const operator = formatComparisonOperator(target.operator)
      return `${aggregation} ${operator} ${value}`
    }
  }
}
