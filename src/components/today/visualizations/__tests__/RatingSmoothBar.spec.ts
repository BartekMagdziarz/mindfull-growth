import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import RatingSmoothBar from '../RatingSmoothBar.vue'
import type { TodayRatingSmoothData } from '@/services/todayChartData'

const CELL_W = 14
const CELL_H = 52

function makeData(overrides: Partial<TodayRatingSmoothData> = {}): TodayRatingSmoothData {
  return {
    averageValue: 7,
    scaleMin: 1,
    scaleMax: 10,
    entryCount: 10,
    targetValue: undefined,
    targetOperator: undefined,
    status: undefined,
    ...overrides,
  }
}

describe('RatingSmoothBar', () => {
  it('renders the average value formatted to one decimal', () => {
    const { getByText } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 7.3, entryCount: 8 }) },
    })

    expect(getByText('7.3')).toBeTruthy()
  })

  it('renders the entry count sublabel', () => {
    const { getByText } = render(RatingSmoothBar, {
      props: { data: makeData({ entryCount: 12 }) },
    })

    expect(getByText(/12\s+entries/)).toBeTruthy()
  })

  it('renders a dash when there are no entries', () => {
    const { getByText } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 0, entryCount: 0 }) },
    })

    expect(getByText('—')).toBeTruthy()
  })

  it('sets the fill rect height proportional to averageValue / scaleMax', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 5.5, scaleMin: 1, scaleMax: 10, entryCount: 5 }) },
    })

    const fill = container.querySelector('[data-testid="rating-smooth-fill"]')
    expect(fill).not.toBeNull()
    // (5.5 - 1) / (10 - 1) = 0.5; fillHeight = (52 - 2) * 0.5 = 25
    const height = Number(fill?.getAttribute('height'))
    expect(height).toBeCloseTo(25, 1)
  })

  it('renders the target tick when targetValue is within scale', () => {
    const { container } = render(RatingSmoothBar, {
      props: {
        data: makeData({
          averageValue: 6,
          targetValue: 7,
          targetOperator: 'gte',
          entryCount: 10,
        }),
      },
    })

    expect(container.querySelector('[data-testid="rating-smooth-target"]')).not.toBeNull()
  })

  it('does not render the target tick when targetValue is undefined', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ targetValue: undefined }) },
    })

    expect(container.querySelector('[data-testid="rating-smooth-target"]')).toBeNull()
  })

  it('renders inside the expected SVG viewport dimensions', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData() },
    })

    const svg = container.querySelector('svg[role="img"]')
    expect(svg?.getAttribute('width')).toBe(String(CELL_W))
    expect(svg?.getAttribute('height')).toBe(String(CELL_H))
  })

  it('computes correct fill height for 1-5 scale', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 3, scaleMin: 1, scaleMax: 5, entryCount: 4 }) },
    })

    const fill = container.querySelector('[data-testid="rating-smooth-fill"]')
    // (3 - 1) / (5 - 1) = 0.5; fillHeight = (52 - 2) * 0.5 = 25
    const height = Number(fill?.getAttribute('height'))
    expect(height).toBeCloseTo(25, 1)
  })

  it('renders target tick with lte operator', () => {
    const { container } = render(RatingSmoothBar, {
      props: {
        data: makeData({
          averageValue: 2,
          targetValue: 4,
          targetOperator: 'lte',
          entryCount: 5,
        }),
      },
    })

    expect(container.querySelector('[data-testid="rating-smooth-target"]')).not.toBeNull()
  })
})
