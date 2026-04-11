import { describe, expect, it } from 'vitest'
import type { MeasurementTarget } from '@/domain/planning'
import {
  resolveTodayVizType,
  type VisualizationDecisionInput,
} from '@/services/todayVisualizationRules'

const COUNT_TARGET: MeasurementTarget = {
  kind: 'count',
  operator: 'min',
  value: 3,
}

const VALUE_SUM_TARGET: MeasurementTarget = {
  kind: 'value',
  aggregation: 'sum',
  operator: 'gte',
  value: 120,
}

const VALUE_AVERAGE_TARGET: MeasurementTarget = {
  kind: 'value',
  aggregation: 'average',
  operator: 'gte',
  value: 7,
}

const VALUE_LAST_TARGET: MeasurementTarget = {
  kind: 'value',
  aggregation: 'last',
  operator: 'gte',
  value: 9,
}

const RATING_TARGET: MeasurementTarget = {
  kind: 'rating',
  aggregation: 'average',
  operator: 'gte',
  value: 4,
}

function measurement(
  input: Omit<VisualizationDecisionInput, 'kind'>,
): VisualizationDecisionInput {
  return { kind: 'measurement', ...input }
}

describe('resolveTodayVizType', () => {
  it('routes initiatives to the checkmark visualization', () => {
    expect(resolveTodayVizType({ kind: 'initiative' })).toBe('initiative-check')
  })

  it('routes completion entries to CompletionDots for every measurement panel', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_TARGET }),
      ),
    ).toBe('completion-dots')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'completion', target: COUNT_TARGET }),
      ),
    ).toBe('completion-dots')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_TARGET }),
      ),
    ).toBe('completion-dots')
  })

  it('routes counter entries to DailyBarsChart across all panels', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'counter', target: COUNT_TARGET }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'counter' }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'counter', target: COUNT_TARGET }),
      ),
    ).toBe('daily-bars')
  })

  it('routes value entries without a target to the shared line chart', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'value' }),
      ),
    ).toBe('value-line')
  })

  it('routes value + sum to DailyBarsChart for habit and key result panels', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_SUM_TARGET }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_SUM_TARGET }),
      ),
    ).toBe('daily-bars')
  })

  it('routes value + average to the shared line chart for habit and key result panels', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_AVERAGE_TARGET }),
      ),
    ).toBe('value-line')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_AVERAGE_TARGET }),
      ),
    ).toBe('value-line')
  })

  it('routes value + last to the shared line chart for habit and key result panels', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_LAST_TARGET }),
      ),
    ).toBe('value-line')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_LAST_TARGET }),
      ),
    ).toBe('value-line')
  })

  it('routes rating entries to DailyBarsChart for every panel', () => {
    // Story 3 will flip these to RatingSegmentedBars / RatingSmoothBar.
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_TARGET }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'rating' }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'rating', target: RATING_TARGET }),
      ),
    ).toBe('daily-bars')
  })
})
