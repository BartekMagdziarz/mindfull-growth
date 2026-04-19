import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import CompletionDots from '../CompletionDots.vue'
import type { TodayCompletionSlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

function makeSlot(state: TodayCompletionSlot['state'], label: string = ''): TodayCompletionSlot {
  return {
    dayRef: '2026-03-12' as DayRef,
    label,
    value: state === 'done' ? 1 : undefined,
    isToday: false,
    isFuture: state === 'future',
    isScheduled: false,
    hasEntry: state === 'done',
    state,
  }
}

describe('CompletionDots', () => {
  it('renders correct number of dot elements', () => {
    const slots = [makeSlot('done', 'Mo'), makeSlot('done', 'Tu'), makeSlot('future', 'Fr')]
    const { container } = render(CompletionDots, { props: { slots } })

    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(3)
  })

  it('renders filled gradient dot for done state', () => {
    const slots = [makeSlot('done', 'Mo')]
    const { container } = render(CompletionDots, { props: { slots } })

    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
    expect(dot?.getAttribute('style')).toContain('linear-gradient')
  })

  it('renders filled red dot for missed state', () => {
    const slots = [makeSlot('missed', 'Tu')]
    const { container } = render(CompletionDots, { props: { slots } })

    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
    expect(dot?.getAttribute('style')).toContain('color-error')
    // Filled, not bordered
    expect(dot?.getAttribute('style')).toContain('background')
  })

  it('renders dashed border for future state', () => {
    const slots = [makeSlot('future', 'Fr')]
    const { container } = render(CompletionDots, { props: { slots } })

    const dot = container.querySelector('.border-dashed')
    expect(dot).toBeTruthy()
  })

  it('renders day labels', () => {
    const slots = [makeSlot('done', 'Mo'), makeSlot('future', 'We')]
    const { container } = render(CompletionDots, { props: { slots } })

    expect(container.textContent).toContain('Mo')
    expect(container.textContent).toContain('We')
  })

  it('renders 6 history dots (target minus today)', () => {
    const slots = Array.from({ length: 6 }, (_, i) =>
      makeSlot(i < 3 ? 'done' : 'future', ['Mo', 'Tu', 'We', 'Fr', 'Sa', 'Su'][i]),
    )
    const { container } = render(CompletionDots, { props: { slots } })

    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(6)
  })

  it('renders a mix of done, missed, and future states', () => {
    const slots = [
      makeSlot('done', 'Mo'),
      makeSlot('missed', 'Tu'),
      makeSlot('done', 'We'),
      makeSlot('future', 'Fr'),
      makeSlot('future', 'Sa'),
    ]
    const { container } = render(CompletionDots, { props: { slots } })

    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(5)
    // Two done dots render with gradient
    const filled = container.querySelectorAll('[style*="linear-gradient"]')
    expect(filled.length).toBe(2)
    // One missed dot rendered with error background
    const missed = container.querySelectorAll('[style*="color-error"]')
    expect(missed.length).toBe(1)
  })

  it('does not render any interactive buttons', () => {
    const slots = [makeSlot('done', 'Mo'), makeSlot('future', 'Fr')]
    const { queryByRole } = render(CompletionDots, { props: { slots } })

    expect(queryByRole('button')).toBeNull()
  })
})
