import { describe, expect, it } from 'vitest'
import type { MeasurementTarget } from '@/domain/planning'
import {
  resolveTodayVizType,
  type TodayVizType,
  type VisualizationDecisionInput,
} from '@/services/todayVisualizationRules'

// ---------------------------------------------------------------------------
// Target constants
// ---------------------------------------------------------------------------

const COUNT_SMALL: MeasurementTarget = { kind: 'count', operator: 'min', value: 3 }
const COUNT_BOUNDARY: MeasurementTarget = { kind: 'count', operator: 'min', value: 7 }
const COUNT_LARGE: MeasurementTarget = { kind: 'count', operator: 'min', value: 20 }
const VALUE_SUM: MeasurementTarget = { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 }
const VALUE_AVG: MeasurementTarget = { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 }
const VALUE_LAST: MeasurementTarget = { kind: 'value', aggregation: 'last', operator: 'gte', value: 9 }
const RATING_GTE: MeasurementTarget = { kind: 'rating', aggregation: 'average', operator: 'gte', value: 7 }
const RATING_LTE: MeasurementTarget = { kind: 'rating', aggregation: 'average', operator: 'lte', value: 3 }

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function measurement(
  input: Omit<VisualizationDecisionInput, 'kind'>,
): VisualizationDecisionInput {
  return { kind: 'measurement', ...input }
}

// ---------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------

type MatrixRow = {
  label: string
  input: VisualizationDecisionInput
  expected: TodayVizType
}

/**
 * Canonical matrix of every valid (cadence × panelType × entryMode × target)
 * combination and the expected chart type. If a future story changes a rule in
 * `resolveTodayVizType`, this table must be updated explicitly — no silent drift.
 */
const MATRIX: MatrixRow[] = [
  // ---- initiative (no axes) ----
  { label: 'initiative', input: { kind: 'initiative' }, expected: 'initiative-check' },

  // ---- completion ----
  // habit — count ≤ 7 → dots (cadence-independent)
  { label: 'weekly|habit|completion|count-3', input: measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_SMALL, cadence: 'weekly' }), expected: 'completion-dots' },
  { label: 'monthly|habit|completion|count-3', input: measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_SMALL, cadence: 'monthly' }), expected: 'completion-dots' },
  { label: 'weekly|habit|completion|count-7-boundary', input: measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_BOUNDARY, cadence: 'weekly' }), expected: 'completion-dots' },
  // habit — count > 7 → ring (cadence-independent)
  { label: 'weekly|habit|completion|count-20', input: measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_LARGE, cadence: 'weekly' }), expected: 'completion-ring' },
  { label: 'monthly|habit|completion|count-20', input: measurement({ panelType: 'habit', entryMode: 'completion', target: COUNT_LARGE, cadence: 'monthly' }), expected: 'completion-ring' },
  // keyResult — count ≤ 7 → dots
  { label: 'weekly|keyResult|completion|count-3', input: measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_SMALL, cadence: 'weekly' }), expected: 'completion-dots' },
  { label: 'monthly|keyResult|completion|count-3', input: measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_SMALL, cadence: 'monthly' }), expected: 'completion-dots' },
  // keyResult — count > 7 → ring
  { label: 'weekly|keyResult|completion|count-20', input: measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_LARGE, cadence: 'weekly' }), expected: 'completion-ring' },
  { label: 'monthly|keyResult|completion|count-20', input: measurement({ panelType: 'keyResult', entryMode: 'completion', target: COUNT_LARGE, cadence: 'monthly' }), expected: 'completion-ring' },
  // tracker — no target
  { label: 'weekly|tracker|completion|none', input: measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'weekly' }), expected: 'completion-dots' },
  { label: 'monthly|tracker|completion|none', input: measurement({ panelType: 'tracker', entryMode: 'completion', cadence: 'monthly' }), expected: 'summary-number' },

  // ---- rating ----
  { label: 'weekly|habit|rating|gte', input: measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_GTE, cadence: 'weekly' }), expected: 'rating-segmented' },
  { label: 'weekly|habit|rating|lte', input: measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_LTE, cadence: 'weekly' }), expected: 'rating-segmented' },
  { label: 'monthly|habit|rating|gte', input: measurement({ panelType: 'habit', entryMode: 'rating', target: RATING_GTE, cadence: 'monthly' }), expected: 'rating-smooth' },
  { label: 'weekly|keyResult|rating|gte', input: measurement({ panelType: 'keyResult', entryMode: 'rating', target: RATING_GTE, cadence: 'weekly' }), expected: 'rating-segmented' },
  { label: 'monthly|keyResult|rating|gte', input: measurement({ panelType: 'keyResult', entryMode: 'rating', target: RATING_GTE, cadence: 'monthly' }), expected: 'rating-smooth' },
  { label: 'weekly|tracker|rating|none', input: measurement({ panelType: 'tracker', entryMode: 'rating', cadence: 'weekly' }), expected: 'rating-segmented' },
  { label: 'monthly|tracker|rating|none', input: measurement({ panelType: 'tracker', entryMode: 'rating', cadence: 'monthly' }), expected: 'rating-smooth' },

  // ---- counter ----
  { label: 'weekly|habit|counter|count', input: measurement({ panelType: 'habit', entryMode: 'counter', target: COUNT_SMALL, cadence: 'weekly' }), expected: 'daily-bars' },
  { label: 'weekly|keyResult|counter|count', input: measurement({ panelType: 'keyResult', entryMode: 'counter', target: COUNT_SMALL, cadence: 'weekly' }), expected: 'daily-bars' },
  { label: 'weekly|tracker|counter|none', input: measurement({ panelType: 'tracker', entryMode: 'counter', cadence: 'weekly' }), expected: 'daily-bars' },
  { label: 'monthly|habit|counter|count', input: measurement({ panelType: 'habit', entryMode: 'counter', target: COUNT_SMALL, cadence: 'monthly' }), expected: 'counter-ring' },
  { label: 'monthly|keyResult|counter|count', input: measurement({ panelType: 'keyResult', entryMode: 'counter', target: COUNT_SMALL, cadence: 'monthly' }), expected: 'counter-ring' },
  { label: 'monthly|tracker|counter|none', input: measurement({ panelType: 'tracker', entryMode: 'counter', cadence: 'monthly' }), expected: 'summary-number' },

  // ---- value ----
  // sum target → bars (weekly) / counter-ring (monthly)
  { label: 'weekly|habit|value|sum', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_SUM, cadence: 'weekly' }), expected: 'daily-bars' },
  { label: 'monthly|habit|value|sum', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_SUM, cadence: 'monthly' }), expected: 'counter-ring' },
  { label: 'weekly|keyResult|value|sum', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_SUM, cadence: 'weekly' }), expected: 'daily-bars' },
  { label: 'monthly|keyResult|value|sum', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_SUM, cadence: 'monthly' }), expected: 'counter-ring' },
  // average target → line (weekly) / sparkline (monthly)
  { label: 'weekly|habit|value|average', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_AVG, cadence: 'weekly' }), expected: 'value-line' },
  { label: 'monthly|habit|value|average', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_AVG, cadence: 'monthly' }), expected: 'value-sparkline-summary' },
  { label: 'weekly|keyResult|value|average', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_AVG, cadence: 'weekly' }), expected: 'value-line' },
  { label: 'monthly|keyResult|value|average', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_AVG, cadence: 'monthly' }), expected: 'value-sparkline-summary' },
  // last target → line (weekly) / sparkline (monthly)
  { label: 'weekly|habit|value|last', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_LAST, cadence: 'weekly' }), expected: 'value-line' },
  { label: 'monthly|habit|value|last', input: measurement({ panelType: 'habit', entryMode: 'value', target: VALUE_LAST, cadence: 'monthly' }), expected: 'value-sparkline-summary' },
  { label: 'weekly|keyResult|value|last', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_LAST, cadence: 'weekly' }), expected: 'value-line' },
  { label: 'monthly|keyResult|value|last', input: measurement({ panelType: 'keyResult', entryMode: 'value', target: VALUE_LAST, cadence: 'monthly' }), expected: 'value-sparkline-summary' },
  // tracker — no target → line (weekly) / sparkline (monthly)
  { label: 'weekly|tracker|value|none', input: measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'weekly' }), expected: 'value-line' },
  { label: 'monthly|tracker|value|none', input: measurement({ panelType: 'tracker', entryMode: 'value', cadence: 'monthly' }), expected: 'value-sparkline-summary' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveTodayVizType — exhaustive matrix', () => {
  for (const row of MATRIX) {
    it(`routes ${row.label} → ${row.expected}`, () => {
      expect(resolveTodayVizType(row.input)).toBe(row.expected)
    })
  }

  it('covers all 10 viz types', () => {
    const covered = new Set(MATRIX.map(r => r.expected))
    expect(covered).toEqual(new Set([
      'initiative-check',
      'completion-dots',
      'completion-ring',
      'daily-bars',
      'value-line',
      'rating-segmented',
      'counter-ring',
      'value-sparkline-summary',
      'rating-smooth',
      'summary-number',
    ]))
  })
})
