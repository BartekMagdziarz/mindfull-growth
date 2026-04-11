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

function cellRects(container: Element): SVGRectElement[] {
  // Every per-cell SVG contains the `segmentCount` segment rects. The shared
  // gradient SVG at the top of the component has no <rect> children.
  return Array.from(container.querySelectorAll('svg rect')) as SVGRectElement[]
}

function filledRects(container: Element): SVGRectElement[] {
  return cellRects(container).filter(r => {
    const fill = r.getAttribute('fill')
    return fill !== null && fill !== 'transparent' && fill !== 'none'
  })
}

function emptyRects(container: Element): SVGRectElement[] {
  return cellRects(container).filter(r => r.getAttribute('fill') === 'transparent')
}

describe('RatingSegmentedBars', () => {
  it('renders one cell per slot when none are scheduled', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
      makeSlot('2026-03-10', 7, { label: 'Tu' }),
      makeSlot('2026-03-11', undefined, { label: 'We' }),
      makeSlot('2026-03-12', 3, { label: 'Th' }),
    ]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    // 4 visible cells + 1 shared gradient SVG = 5 svgs total
    expect(container.querySelectorAll('svg').length).toBe(5)
    // 4 cells × 10 segments = 40 rects
    expect(cellRects(container).length).toBe(40)
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

    // 3 scheduled cells + 1 shared gradient svg
    expect(container.querySelectorAll('svg').length).toBe(4)
    expect(cellRects(container).length).toBe(30)
  })

  it('fills the bottom N segments for a slot with value N on a 1-10 scale', () => {
    const slots = [makeSlot('2026-03-09', 7, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(filledRects(container).length).toBe(7)
    expect(emptyRects(container).length).toBe(3)
  })

  it('leaves every segment empty for a slot without a value', () => {
    const slots = [makeSlot('2026-03-09', undefined, { label: 'Mo' })]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    expect(filledRects(container).length).toBe(0)
    expect(emptyRects(container).length).toBe(10)
  })

  it('renders a dashed outline for future slots', () => {
    const slots = [
      makeSlot('2026-03-12', undefined, { isFuture: true, label: 'Th' }),
    ]
    const { container } = render(RatingSegmentedBars, { props: { slots } })

    const dashed = emptyRects(container).filter(
      r => r.getAttribute('stroke-dasharray') === '2 2',
    )
    expect(dashed.length).toBe(10)
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

    // 5 segments total (scaleMax - scaleMin + 1)
    expect(cellRects(container).length).toBe(5)
    // 3 of them filled
    expect(filledRects(container).length).toBe(3)
    expect(emptyRects(container).length).toBe(2)
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
})
