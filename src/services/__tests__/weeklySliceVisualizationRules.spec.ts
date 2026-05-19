import { describe, expect, it } from 'vitest'
import type { MeasurementTarget } from '@/domain/planning'
import {
  resolveWeeklySliceVizType,
  type VisualizationDecisionInput,
} from '@/services/todayVisualizationRules'

const COUNT_TARGET_SMALL: MeasurementTarget = { kind: 'count', operator: 'min', value: 3 }
const COUNT_TARGET_LARGE: MeasurementTarget = { kind: 'count', operator: 'min', value: 20 }
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

describe('resolveWeeklySliceVizType', () => {
  it('routes initiatives to the checkmark visualization', () => {
    expect(resolveWeeklySliceVizType({ kind: 'initiative' })).toBe('initiative-check')
  })

  describe('completion entries', () => {
    it('routes small count target (weekly) to completion-dots', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'completion',
            target: COUNT_TARGET_SMALL,
            cadence: 'weekly',
          }),
        ),
      ).toBe('completion-dots')
    })

    it('routes LARGE count target (monthly) to completion-dots — differs from Today which uses completion-ring', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'completion',
            target: COUNT_TARGET_LARGE,
            cadence: 'monthly',
          }),
        ),
      ).toBe('completion-dots')
    })

    it('routes tracker (no target, monthly) to completion-dots — differs from Today which uses summary-number', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'monthly' }),
        ),
      ).toBe('completion-dots')
    })

    it('routes tracker (no target, weekly) to completion-dots', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'weekly' }),
        ),
      ).toBe('completion-dots')
    })
  })

  describe('rating entries', () => {
    it('routes weekly rating to rating-segmented', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'rating',
            target: RATING_TARGET,
            cadence: 'weekly',
          }),
        ),
      ).toBe('rating-segmented')
    })

    it('routes monthly rating to rating-segmented — differs from Today which uses rating-smooth', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'keyResult',
            entryMode: 'rating',
            target: RATING_TARGET,
            cadence: 'monthly',
          }),
        ),
      ).toBe('rating-segmented')
    })

    it('routes monthly rating tracker (no target) to rating-segmented', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'rating', cadence: 'monthly' }),
        ),
      ).toBe('rating-segmented')
    })
  })

  describe('counter entries', () => {
    it('routes weekly counter (count target) to daily-bars', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'counter',
            target: COUNT_TARGET_SMALL,
            cadence: 'weekly',
          }),
        ),
      ).toBe('daily-bars')
    })

    it('routes monthly counter (count target) to daily-bars — differs from Today which uses counter-ring', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'counter',
            target: COUNT_TARGET_LARGE,
            cadence: 'monthly',
          }),
        ),
      ).toBe('daily-bars')
    })

    it('routes monthly counter tracker (no target) to daily-bars — differs from Today which uses summary-number', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'counter', cadence: 'monthly' }),
        ),
      ).toBe('daily-bars')
    })
  })

  describe('value entries', () => {
    it('routes value-sum target (weekly) to daily-bars', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'keyResult',
            entryMode: 'value',
            target: VALUE_SUM_TARGET,
            cadence: 'weekly',
          }),
        ),
      ).toBe('daily-bars')
    })

    it('routes value-sum target (monthly) to daily-bars — differs from Today which uses counter-ring', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'keyResult',
            entryMode: 'value',
            target: VALUE_SUM_TARGET,
            cadence: 'monthly',
          }),
        ),
      ).toBe('daily-bars')
    })

    it('routes value-avg target (any cadence) to value-line', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'value',
            target: VALUE_AVG_TARGET,
            cadence: 'weekly',
          }),
        ),
      ).toBe('value-line')
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'value',
            target: VALUE_AVG_TARGET,
            cadence: 'monthly',
          }),
        ),
      ).toBe('value-line')
    })

    it('routes value-last target (any cadence) to value-line', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({
            panelType: 'habit',
            entryMode: 'value',
            target: VALUE_LAST_TARGET,
            cadence: 'monthly',
          }),
        ),
      ).toBe('value-line')
    })

    it('routes value tracker (no target, monthly) to value-line — differs from Today (value-sparkline-summary)', () => {
      expect(
        resolveWeeklySliceVizType(
          measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'monthly' }),
        ),
      ).toBe('value-line')
    })
  })
})
