import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import RatingSegmentedBars from '../RatingSegmentedBars.vue'
import type { TodayDaySlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

function makeSlot(
  dayRef: string,
  value: number | undefined,
  overrides: Partial<TodayDaySlot> = {},
): TodayDaySlot {
  return {
    dayRef: dayRef as DayRef,
    label: 'Mo',
    value,
    isToday: false,
    isFuture: false,
    isScheduled: false,
    hasEntry: value !== undefined,
    ...overrides,
  }
}

function valueBars(container: Element): SVGRectElement[] {
  // Each scheduled slot now renders a single value bar (or an empty baseline).
  // Filter the bars by their height — the baseline is a flat 2px strip.
  return Array.from(container.querySelectorAll('svg rect')).filter((r) => {
    const h = Number((r as SVGRectElement).getAttribute('height'))
    return Number.isFinite(h) && h > 2
  }) as SVGRectElement[]
}

function baselineBars(container: Element): SVGRectElement[] {
  return Array.from(container.querySelectorAll('svg rect')).filter((r) => {
    return Number((r as SVGRectElement).getAttribute('height')) === 2
  }) as SVGRectElement[]
}

describe('RatingSegmentedBars', () => {
  it('renders one SVG per slot when none are scheduled', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
      makeSlot('2026-03-10', 7, { label: 'Tu' }),
      makeSlot('2026-03-11', undefined, { label: 'We' }),
      makeSlot('2026-03-12', 3, { label: 'Th' }),
    ]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    // 4 visible cells, no shared gradient SVG anymore.
    expect(container.querySelectorAll('svg').length).toBe(4)
  })

  it('filters to scheduled slots when any are scheduled', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { isScheduled: true, label: 'Mo' }),
      makeSlot('2026-03-10', undefined, { isScheduled: false, label: 'Tu' }),
      makeSlot('2026-03-11', 4, { isScheduled: true, label: 'We' }),
      makeSlot('2026-03-12', undefined, { isScheduled: false, label: 'Th' }),
      makeSlot('2026-03-13', 6, { isScheduled: true, label: 'Fr' }),
    ]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(container.querySelectorAll('svg').length).toBe(3)
  })

  it('renders a single value bar per recorded slot', () => {
    const slots = [makeSlot('2026-03-09', 7, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(valueBars(container).length).toBe(1)
    expect(baselineBars(container).length).toBe(0)
  })

  it('renders a baseline strip for a slot without a value', () => {
    const slots = [makeSlot('2026-03-09', undefined, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(valueBars(container).length).toBe(0)
    expect(baselineBars(container).length).toBe(1)
  })

  it('uses the rose palette for values below the target (gte)', () => {
    const slots = [makeSlot('2026-03-09', 2, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 7, targetOperator: 'gte' },
    })

    const bar = valueBars(container)[0]
    expect(bar.getAttribute('fill')).toMatch(/--rose-/)
  })

  it('uses the sky palette for values at or above the target (gte)', () => {
    const slots = [makeSlot('2026-03-09', 9, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 7, targetOperator: 'gte' },
    })

    const bar = valueBars(container)[0]
    expect(bar.getAttribute('fill')).toMatch(/--sky-/)
  })

  it('uses the sky palette across the full scale when no target is provided', () => {
    const slots = [
      makeSlot('2026-03-09', 2, { label: 'Mo' }),
      makeSlot('2026-03-10', 9, { label: 'Tu' }),
    ]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    for (const bar of valueBars(container)) {
      expect(bar.getAttribute('fill')).toMatch(/--sky-/)
    }
  })

  it('renders a target tick line when targetValue is provided', () => {
    const slots = [makeSlot('2026-03-09', 5, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 8, targetOperator: 'gte' },
    })

    const lines = container.querySelectorAll('svg line')
    expect(lines.length).toBe(1)
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('3 2')
  })

  it('does not render a target tick when targetValue is undefined', () => {
    const slots = [makeSlot('2026-03-09', 5, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(container.querySelectorAll('svg line').length).toBe(0)
  })

  it('does not render a target tick when targetValue is outside the scale', () => {
    const slots = [makeSlot('2026-03-09', 5, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 42 },
    })

    expect(container.querySelectorAll('svg line').length).toBe(0)
  })

  it('respects custom scaleMin and scaleMax', () => {
    const slots = [makeSlot('2026-03-09', 3, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, scaleMin: 1, scaleMax: 5 },
    })

    expect(valueBars(container).length).toBe(1)
  })

  it('renders the day label below each cell', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
      makeSlot('2026-03-10', 7, { label: 'Tu' }),
    ]
    const { getByText } = render(RatingSegmentedBars, { props: { slots } })

    expect(getByText('Mo')).toBeTruthy()
    expect(getByText('Tu')).toBeTruthy()
  })

  it('gives the lowest rating (1 on a 1-5 scale) a visible bar height', () => {
    // Regression: previously `(value - scaleMin) / span` produced ratio 0 for
    // value=scaleMin, making the lowest rating render the same 2px baseline
    // as a slot with no entry. With step-based mapping the lowest rating
    // gets 1/5 = 20% of the chart height.
    const lowestRating = [makeSlot('2026-03-09', 1, { label: 'Mo' })]
    const lowestEmpty = [makeSlot('2026-03-09', undefined, { label: 'Mo' })]
    const { container: lowestC } = render(RatingSegmentedBars, {
      props: { slots: lowestRating, scaleMin: 1, scaleMax: 5 },
    })
    const { container: emptyC } = render(RatingSegmentedBars, {
      props: { slots: lowestEmpty, scaleMin: 1, scaleMax: 5 },
    })

    const lowestH = Number(valueBars(lowestC)[0].getAttribute('height'))
    const emptyBaselines = Array.from(emptyC.querySelectorAll('svg rect')).map((r) =>
      Number((r as SVGRectElement).getAttribute('height')),
    )

    expect(lowestH).toBeGreaterThan(8)
    expect(emptyBaselines).toContain(2)
  })

  it('uses the sky palette for values at or below the target (lte)', () => {
    const slots = [makeSlot('2026-03-09', 2, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 4, targetOperator: 'lte' },
    })

    const bar = valueBars(container)[0]
    expect(bar.getAttribute('fill')).toMatch(/--sky-/)
  })

  it('uses the rose palette for values above the target (lte)', () => {
    const slots = [makeSlot('2026-03-09', 8, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, {
      props: { slots, targetValue: 4, targetOperator: 'lte' },
    })

    const bar = valueBars(container)[0]
    expect(bar.getAttribute('fill')).toMatch(/--rose-/)
  })
})
