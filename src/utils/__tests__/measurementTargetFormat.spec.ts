import { describe, expect, it } from 'vitest'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'

const MESSAGES: Record<string, string> = {
  'planning.objects.targetOperators.min': 'Co najmniej',
  'planning.objects.targetOperators.max': 'Co najwyżej',
  'planning.objects.targetOperators.gte': 'Co najmniej',
  'planning.objects.targetOperators.lte': 'Co najwyżej',
  'planning.objects.targetAggregations.sum': 'Suma',
  'planning.objects.targetAggregations.average': 'Średnia',
  'planning.objects.targetAggregations.last': 'Ostatnia wartość',
  'planning.objects.targetSentence.entryDaysUnit': 'dni',
}

const t = (key: string): string => MESSAGES[key] ?? key

describe('formatMeasurementTargetSummary', () => {
  it('formats targets without an entryDays condition unchanged', () => {
    expect(
      formatMeasurementTargetSummary({ kind: 'count', operator: 'min', value: 3 }, t),
    ).toBe('Co najmniej 3')
    expect(
      formatMeasurementTargetSummary(
        { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
        t,
      ),
    ).toBe('Średnia Co najmniej 3')
  })

  it('appends a symbolic min entry-days suffix', () => {
    expect(
      formatMeasurementTargetSummary(
        {
          kind: 'rating',
          aggregation: 'average',
          operator: 'gte',
          value: 3,
          entryDays: { operator: 'min', value: 5 },
        },
        t,
      ),
    ).toBe('Średnia Co najmniej 3 · ≥ 5 dni')
  })

  it('appends a symbolic max entry-days suffix', () => {
    expect(
      formatMeasurementTargetSummary(
        {
          kind: 'value',
          aggregation: 'sum',
          operator: 'gte',
          value: 100,
          entryDays: { operator: 'max', value: 3 },
        },
        t,
      ),
    ).toBe('Suma Co najmniej 100 · ≤ 3 dni')
  })
})
