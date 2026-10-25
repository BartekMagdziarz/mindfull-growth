import { describe, expect, it } from 'vitest'
import {
  formatMeasurementSentence,
  formatMeasurementTargetSummary,
} from '@/utils/measurementTargetFormat'

const MESSAGES: Record<string, string> = {
  'planning.objects.targetOperators.min': 'Co najmniej',
  'planning.objects.targetOperators.max': 'Co najwyżej',
  'planning.objects.targetOperators.gte': 'Co najmniej',
  'planning.objects.targetOperators.lte': 'Co najwyżej',
  'planning.objects.targetAggregations.sum': 'Suma',
  'planning.objects.targetAggregations.average': 'Średnia',
  'planning.objects.targetAggregations.last': 'Ostatnia wartość',
  'planning.objects.targetSentence.entryDaysUnit': 'dni',
  'planning.objects.targetSentence.op.min': 'co najmniej',
  'planning.objects.targetSentence.op.max': 'co najwyżej',
  'planning.objects.targetSentence.op.gte': 'co najmniej',
  'planning.objects.targetSentence.op.lte': 'co najwyżej',
  'planning.objects.targetSentence.agg.sum': 'suma',
  'planning.objects.targetSentence.agg.average': 'średnia',
  'planning.objects.targetSentence.agg.last': 'ostatnia wartość',
  'planning.objects.targetSentence.perWeek': 'w tygodniu',
  'planning.objects.targetSentence.perMonth': 'w miesiącu',
  'planning.objects.targetSentence.timesUnit': 'razy',
  'planning.objects.targetSentence.ratingOutOf': 'na {max}',
  'planning.objects.targetSentence.thresholdAllRead': 'komplet elementów',
  'planning.objects.form.multiItems.thresholdOfPoints': 'z {max} pkt',
  'planning.objects.form.multiItems.thresholdOfItems': 'z {max} elementów',
}

const t = (key: string, params?: Record<string, string | number>): string => {
  const raw = MESSAGES[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))
}

describe('formatMeasurementTargetSummary', () => {
  it('formats targets without an entryDays condition unchanged', () => {
    expect(formatMeasurementTargetSummary({ kind: 'count', operator: 'min', value: 3 }, t)).toBe(
      'Co najmniej 3'
    )
    expect(
      formatMeasurementTargetSummary(
        { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
        t
      )
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
        t
      )
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
        t
      )
    ).toBe('Suma Co najmniej 100 · ≤ 3 dni')
  })
})

describe('formatMeasurementSentence', () => {
  it('reads a completion target as times per period', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'completion',
          target: { kind: 'count', operator: 'min', value: 3 },
          cadence: 'weekly',
        },
        t
      )
    ).toBe('co najmniej 3 razy w tygodniu')
  })

  it('reads a counter without a unit and a monthly cadence', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'counter',
          target: { kind: 'count', operator: 'max', value: 10 },
          cadence: 'monthly',
        },
        t
      )
    ).toBe('co najwyżej 10 w miesiącu')
  })

  it('reads a value target with its aggregation in lowercase', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'value',
          target: { kind: 'value', aggregation: 'last', operator: 'lte', value: 80 },
          cadence: 'weekly',
        },
        t
      )
    ).toBe('ostatnia wartość co najwyżej 80 w tygodniu')
  })

  it('reads a rating target with the scale and the days clause', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'rating',
          target: {
            kind: 'rating',
            aggregation: 'average',
            operator: 'gte',
            value: 3,
            entryDays: { operator: 'min', value: 5 },
          },
          cadence: 'weekly',
          ratingScale: 5,
        },
        t
      )
    ).toBe('średnia co najmniej 3 na 5 · co najmniej 5 dni w tygodniu')
  })

  it('reads a checklist with the default threshold as a full set', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'multi-completion',
          target: { kind: 'count', operator: 'min', value: 4 },
          cadence: 'weekly',
          multi: { threshold: undefined, weightSum: 3, allWeightsOne: true },
        },
        t
      )
    ).toBe('komplet elementów · co najmniej 4 dni w tygodniu')
  })

  it('reads a checklist with a points threshold', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'multi-completion',
          target: { kind: 'count', operator: 'min', value: 4 },
          cadence: 'weekly',
          multi: { threshold: 3, weightSum: 4, allWeightsOne: false },
        },
        t
      )
    ).toBe('3 z 4 pkt · co najmniej 4 dni w tygodniu')
  })

  it('formats fractional values without trailing zeros', () => {
    expect(
      formatMeasurementSentence(
        {
          entryMode: 'value',
          target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7.5 },
          cadence: 'weekly',
        },
        t
      )
    ).toBe('średnia co najmniej 7.5 w tygodniu')
  })
})
