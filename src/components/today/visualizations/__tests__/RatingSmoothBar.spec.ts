import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import RatingSmoothBar from '../RatingSmoothBar.vue'
import type { TodayRatingSmoothData } from '@/services/todayChartData'

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

function fillWidth(container: Element): number {
  const fill = container.querySelector('[data-testid="rating-smooth-fill"]') as HTMLElement | null
  if (!fill) return 0
  const match = (fill.getAttribute('style') ?? '').match(/width:\s*([0-9.]+)%/)
  return match ? Number(match[1]) : 0
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

  it('renders a dash when there are no entries and hides the fill', () => {
    const { getByText, container } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 0, entryCount: 0 }) },
    })

    expect(getByText('—')).toBeTruthy()
    expect(container.querySelector('[data-testid="rating-smooth-fill"]')).toBeNull()
  })

  it('sets the fill width proportional to the value position in scale steps', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 5.5, scaleMin: 1, scaleMax: 10, entryCount: 5 }) },
    })

    // Step mapping: (5.5 - 1 + 1) / 10 = 0.55 → 55% width
    expect(fillWidth(container)).toBeCloseTo(55, 1)
  })

  it('renders the target marker when targetValue is within scale', () => {
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

  it('does not render the target marker when targetValue is undefined', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ targetValue: undefined }) },
    })

    expect(container.querySelector('[data-testid="rating-smooth-target"]')).toBeNull()
  })

  it('computes correct fill width for 1-5 scale', () => {
    const { container } = render(RatingSmoothBar, {
      props: { data: makeData({ averageValue: 3, scaleMin: 1, scaleMax: 5, entryCount: 4 }) },
    })

    // Step mapping: (3 - 1 + 1) / 5 = 0.6 → 60% width
    expect(fillWidth(container)).toBeCloseTo(60, 1)
  })

  it('uses sky palette when value at or above gte target', () => {
    const { container } = render(RatingSmoothBar, {
      props: {
        data: makeData({
          averageValue: 9,
          targetValue: 7,
          targetOperator: 'gte',
          entryCount: 5,
        }),
      },
    })

    const fill = container.querySelector('[data-testid="rating-smooth-fill"]') as HTMLElement
    expect(fill.getAttribute('style')).toMatch(/--sky-/)
  })

  it('uses rose palette when value below gte target', () => {
    const { container } = render(RatingSmoothBar, {
      props: {
        data: makeData({
          averageValue: 2,
          targetValue: 7,
          targetOperator: 'gte',
          entryCount: 5,
        }),
      },
    })

    const fill = container.querySelector('[data-testid="rating-smooth-fill"]') as HTMLElement
    expect(fill.getAttribute('style')).toMatch(/--rose-/)
  })

  it('renders the scale endpoints (min and max) as visible labels', () => {
    const { getByText } = render(RatingSmoothBar, {
      props: { data: makeData({ scaleMin: 1, scaleMax: 5, entryCount: 1 }) },
    })

    expect(getByText('1')).toBeTruthy()
    expect(getByText('5')).toBeTruthy()
  })
})
