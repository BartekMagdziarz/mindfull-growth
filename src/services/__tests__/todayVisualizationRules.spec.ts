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

const COUNT_TARGET_LARGE: MeasurementTarget = {
  kind: 'count',
  operator: 'min',
  value: 20,
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

const RATING_TARGET_LTE: MeasurementTarget = {
  kind: 'rating',
  aggregation: 'average',
  operator: 'lte',
  value: 3,
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

  it('routes completion entries with small count targets to CompletionDots', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_TARGET }),
      ),
    ).toBe('completion-dots')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_TARGET }),
      ),
    ).toBe('completion-dots')
  })

  it('routes completion entries with count targets > 7 to CompletionRing', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_TARGET_LARGE }),
      ),
    ).toBe('completion-ring')

    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'completion',
          target: { kind: 'count', operator: 'min', value: 8 },
        }),
      ),
    ).toBe('completion-ring')
  })

  it('routes count target of exactly 7 to CompletionDots (boundary)', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'completion',
          target: { kind: 'count', operator: 'min', value: 7 },
        }),
      ),
    ).toBe('completion-dots')
  })

  it('routes completion tracker (no target) to CompletionDots on weekly cadence', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'weekly' }),
      ),
    ).toBe('completion-dots')
  })

  it('routes counter entries with targets to DailyBarsChart on weekly cadence', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'counter', target: COUNT_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'counter', cadence: 'weekly' }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'counter', target: COUNT_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('daily-bars')
  })

  it('routes value tracker (no target) to the shared line chart on weekly cadence', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'weekly' }),
      ),
    ).toBe('value-line')
  })

  it('routes value + sum to DailyBarsChart for habit and key result panels on weekly', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_SUM_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('daily-bars')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_SUM_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('daily-bars')
  })

  it('routes value + average to the shared line chart on weekly', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_AVERAGE_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('value-line')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_AVERAGE_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('value-line')
  })

  it('routes value + last to the shared line chart on weekly', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_LAST_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('value-line')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_LAST_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('value-line')
  })

  it('routes rating entries to RatingSegmentedBars on weekly cadence', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('rating-segmented')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'rating', cadence: 'weekly' }),
      ),
    ).toBe('rating-segmented')

    expect(
      resolveTodayVizType(
        measurement({ panelType: 'keyResult', entryMode: 'rating', target: RATING_TARGET, cadence: 'weekly' }),
      ),
    ).toBe('rating-segmented')
  })

  it('routes rating + lte target to RatingSegmentedBars on weekly', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_TARGET_LTE, cadence: 'weekly' }),
      ),
    ).toBe('rating-segmented')
  })
})

describe('resolveTodayVizType — monthly cadence', () => {
  it('routes monthly counter habit with count target to CounterRing', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'counter',
          target: { kind: 'count', operator: 'min', value: 50 },
          cadence: 'monthly',
        }),
      ),
    ).toBe('counter-ring')
  })

  it('routes monthly counter tracker (no target) to SummaryNumber', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'counter', cadence: 'monthly' }),
      ),
    ).toBe('summary-number')
  })

  it('routes monthly counter keyResult with count target to CounterRing', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'keyResult',
          entryMode: 'counter',
          target: { kind: 'count', operator: 'min', value: 100 },
          cadence: 'monthly',
        }),
      ),
    ).toBe('counter-ring')
  })

  it('routes monthly value habit with value-sum target to CounterRing', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'value',
          target: VALUE_SUM_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('counter-ring')
  })

  it('routes monthly value habit with value-average target to ValueSparklineSummary', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'value',
          target: VALUE_AVERAGE_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('value-sparkline-summary')
  })

  it('routes monthly value habit with value-last target to ValueSparklineSummary', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'value',
          target: VALUE_LAST_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('value-sparkline-summary')
  })

  it('routes monthly value tracker (no target) to ValueSparklineSummary', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'monthly' }),
      ),
    ).toBe('value-sparkline-summary')
  })

  it('routes monthly value keyResult with value-sum target to CounterRing', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'keyResult',
          entryMode: 'value',
          target: VALUE_SUM_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('counter-ring')
  })

  it('routes monthly value keyResult with value-average target to ValueSparklineSummary', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'keyResult',
          entryMode: 'value',
          target: VALUE_AVERAGE_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('value-sparkline-summary')
  })

  it('routes monthly rating habit with rating target to RatingSmoothBar', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'rating',
          target: RATING_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('rating-smooth')
  })

  it('routes monthly rating tracker (no target) to RatingSmoothBar', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'rating', cadence: 'monthly' }),
      ),
    ).toBe('rating-smooth')
  })

  it('routes monthly rating keyResult with rating target to RatingSmoothBar', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'keyResult',
          entryMode: 'rating',
          target: RATING_TARGET,
          cadence: 'monthly',
        }),
      ),
    ).toBe('rating-smooth')
  })

  it('routes monthly completion tracker (no target) to SummaryNumber', () => {
    expect(
      resolveTodayVizType(
        measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'monthly' }),
      ),
    ).toBe('summary-number')
  })

  it('routes monthly completion habit with count target 3 to CompletionDots (story 4 rule wins)', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'completion',
          target: { kind: 'count', operator: 'min', value: 3 },
          cadence: 'monthly',
        }),
      ),
    ).toBe('completion-dots')
  })

  it('routes monthly completion habit with count target 20 to CompletionRing (story 4 rule wins)', () => {
    expect(
      resolveTodayVizType(
        measurement({
          panelType: 'habit',
          entryMode: 'completion',
          target: COUNT_TARGET_LARGE,
          cadence: 'monthly',
        }),
      ),
    ).toBe('completion-ring')
  })
})
