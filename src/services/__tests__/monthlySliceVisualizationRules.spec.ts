import { describe, expect, it } from 'vitest'
import type { MeasurementTarget } from '@/domain/planning'
import {
  resolveMonthlySliceVizType,
  type VisualizationDecisionInput,
} from '@/services/todayVisualizationRules'

const COUNT_TARGET: MeasurementTarget = { kind: 'count', operator: 'min', value: 3 }
const VALUE_SUM_TARGET: MeasurementTarget = {
  kind: 'value',
  aggregation: 'sum',
  operator: 'gte',
  value: 120,
}
const VALUE_AVG_TARGET: MeasurementTarget = {
  kind: 'value',
  aggregation: 'average',
  operator: 'gte',
  value: 7,
}

function measurement(input: Omit<VisualizationDecisionInput, 'kind'>): VisualizationDecisionInput {
  return { kind: 'measurement', ...input }
}

describe('resolveMonthlySliceVizType', () => {
  it('routes initiatives to the checkmark visualization', () => {
    expect(resolveMonthlySliceVizType({ kind: 'initiative' })).toBe('initiative-check')
  })

  it('routes completion entries to monthly-completion-bars regardless of cadence', () => {
    for (const cadence of ['weekly', 'monthly'] as const) {
      expect(
        resolveMonthlySliceVizType(
          measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_TARGET, cadence }),
        ),
      ).toBe('monthly-completion-bars')
    }
  })

  it('routes completion-tracker without target to monthly-completion-bars too', () => {
    expect(
      resolveMonthlySliceVizType(
        measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'weekly' }),
      ),
    ).toBe('monthly-completion-bars')
  })

  it('routes rating entries to rating-segmented (no monthly variant)', () => {
    for (const cadence of ['weekly', 'monthly'] as const) {
      expect(
        resolveMonthlySliceVizType(
          measurement({ panelType: 'habit', entryMode: 'rating', cadence }),
        ),
      ).toBe('rating-segmented')
    }
  })

  it('routes counter entries to daily-bars (the week-slot variant of bars)', () => {
    for (const cadence of ['weekly', 'monthly'] as const) {
      expect(
        resolveMonthlySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'counter', target: COUNT_TARGET, cadence }),
        ),
      ).toBe('daily-bars')
    }
  })

  it('routes value+sum to daily-bars and value+avg to value-line', () => {
    expect(
      resolveMonthlySliceVizType(
        measurement({
          panelType: 'tracker',
          entryMode: 'value',
          target: VALUE_SUM_TARGET,
          cadence: 'weekly',
        }),
      ),
    ).toBe('daily-bars')
    expect(
      resolveMonthlySliceVizType(
        measurement({
          panelType: 'tracker',
          entryMode: 'value',
          target: VALUE_AVG_TARGET,
          cadence: 'weekly',
        }),
      ),
    ).toBe('value-line')
  })

  it('routes value entries without target to value-line', () => {
    expect(
      resolveMonthlySliceVizType(
        measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'weekly' }),
      ),
    ).toBe('value-line')
  })
})
