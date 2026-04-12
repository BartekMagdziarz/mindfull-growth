import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import CompletionDots from '../CompletionDots.vue'
import type { TodayCompletionSlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

function makeSlot(state: TodayCompletionSlot['state'], label: string = ''): TodayCompletionSlot {
  return {
    dayRef: '2026-03-12' as DayRef,
    label,
    value: state === 'done' || state === 'today-done' ? 1 : undefined,
    isToday: state === 'today-pending' || state === 'today-done',
    isFuture: state === 'future',
    isScheduled: false,
    hasEntry: state === 'done' || state === 'today-done',
    state,
  }
}

describe('CompletionDots', () => {
  it('renders correct number of dot elements', () => {
    const slots = [makeSlot('done', 'Mo'), makeSlot('done', 'Tu'), makeSlot('future', 'Fr')]
    const { container } = render(CompletionDots, { props: { slots } })

    // Each slot renders a column (flex-col) with a dot + label
    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(3)
  })

  it('renders filled dot for done state', () => {
    const slots = [makeSlot('done', 'Mo')]
    const { container } = render(CompletionDots, { props: { slots } })

    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
    expect(dot?.getAttribute('style')).toContain('linear-gradient')
  })

  it('renders dashed border for future state', () => {
    const slots = [makeSlot('future', 'Fr')]
    const { container } = render(CompletionDots, { props: { slots } })

    const dot = container.querySelector('.border-dashed')
    expect(dot).toBeTruthy()
  })

  it('renders interactive button for today-pending', () => {
    const slots = [makeSlot('today-pending', 'Th')]
    const { getByRole } = render(CompletionDots, { props: { slots } })

    expect(getByRole('button', { name: 'Record today' })).toBeTruthy()
  })

  it('emits toggle on today dot click', async () => {
    const slots = [makeSlot('today-pending', 'Th')]
    const { getByRole, emitted } = render(CompletionDots, { props: { slots } })

    await getByRole('button', { name: 'Record today' }).click()
    expect(emitted().toggle).toBeTruthy()
  })

  it('renders day labels', () => {
    const slots = [makeSlot('done', 'Mo'), makeSlot('future', 'We')]
    const { container } = render(CompletionDots, { props: { slots } })

    expect(container.textContent).toContain('Mo')
    expect(container.textContent).toContain('We')
  })

  it('renders 7 dots at the boundary count', () => {
    const slots = Array.from({ length: 7 }, (_, i) =>
      makeSlot(i < 3 ? 'done' : 'future', ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][i]),
    )
    const { container } = render(CompletionDots, { props: { slots } })

    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(7)
  })

  it('renders a mix of all five states', () => {
    const slots = [
      makeSlot('done', 'Mo'),
      makeSlot('missed', 'Tu'),
      makeSlot('today-pending', 'We'),
      makeSlot('today-done', 'Th'),
      makeSlot('future', 'Fr'),
    ]
    const { container, getByRole } = render(CompletionDots, { props: { slots } })

    const columns = container.querySelectorAll('.flex.flex-col')
    expect(columns.length).toBe(5)
    // today-pending renders an interactive button
    expect(getByRole('button', { name: 'Record today' })).toBeTruthy()
    // done and today-done should render filled dots
    const filled = container.querySelectorAll('[style*="linear-gradient"]')
    expect(filled.length).toBe(2)
  })
})
