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

    const text = container.querySelector('text')
    expect(text?.textContent?.trim()).toBe('Mo')
  })
})
