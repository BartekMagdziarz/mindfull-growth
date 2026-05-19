import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import DailyBarsChart from '../DailyBarsChart.vue'
import type { TodayDaySlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

function makeSlot(dayRef: string, value: number | undefined, overrides: Partial<TodayDaySlot> = {}): TodayDaySlot {
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

describe('DailyBarsChart', () => {
  it('renders correct number of bars', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
      makeSlot('2026-03-10', 3, { label: 'Tu' }),
      makeSlot('2026-03-11', undefined, { label: 'We' }),
    ]
    const { container } = render(DailyBarsChart, { props: { slots } })

    // 2 data bars + 1 no-data dash = 3 rects total (inside <g>)
    const rects = container.querySelectorAll('g > rect')
    expect(rects.length).toBe(3)
  })

  it('highlights today bar', () => {
    const slots = [
      makeSlot('2026-03-12', 7, { isToday: true, label: 'Th' }),
    ]
    const { container } = render(DailyBarsChart, { props: { slots } })

    // Today gets an extra highlight rect
    const rects = container.querySelectorAll('g > rect')
    expect(rects.length).toBe(2) // data bar + highlight
  })

  it('renders day labels', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
    ]
    const { container } = render(DailyBarsChart, { props: { slots } })

    // Labels moved out of the SVG into a sibling HTML row so they render at
    // the same 11px size as the rest of the Today overview tiles.
    const label = container.querySelector('.day-label')
    expect(label?.textContent?.trim()).toBe('Mo')
  })

  it('renders a slot without a value as a no-data dash rect', () => {
    const slots = [
      makeSlot('2026-03-09', undefined, { label: 'Mo', hasEntry: false }),
    ]
    const { container } = render(DailyBarsChart, { props: { slots } })

    const rects = container.querySelectorAll('g > rect')
    // No-data slot gets a thin dash rect (height ~2) instead of a data bar
    expect(rects.length).toBe(1)
    const height = Number(rects[0].getAttribute('height'))
    expect(height).toBeLessThanOrEqual(3)
  })

  it('renders error gradient when periodStatus is missed', () => {
    const slots = [
      makeSlot('2026-03-09', 5, { label: 'Mo' }),
    ]
    const { container } = render(DailyBarsChart, {
      props: { slots, periodStatus: 'missed' },
    })

    const rects = container.querySelectorAll('g > rect')
    // The data bar should use the missed gradient fill (url(#dbars-missed-...))
    const fill = rects[0].getAttribute('fill')
    expect(fill).toContain('missed')
  })
})
