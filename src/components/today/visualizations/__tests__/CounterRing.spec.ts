import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import CounterRing from '../CounterRing.vue'
import type { TodayCounterRingData } from '@/services/todayChartData'

const RADIUS = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function makeData(overrides: Partial<TodayCounterRingData> = {}): TodayCounterRingData {
  return {
    current: 15,
    target: 30,
    status: 'in-progress',
    operator: 'min',
    ...overrides,
  }
}

function progressStroke(container: Element): SVGCircleElement | null {
  return container.querySelector('.counter-ring__progress') as SVGCircleElement | null
}

describe('CounterRing', () => {
  it('renders the current number and denominator in the center', () => {
    const { getByText, getByRole } = render(CounterRing, {
      props: { data: makeData({ current: 15, target: 30 }) },
    })

    expect(getByText('15')).toBeTruthy()
    expect(getByText('/ 30')).toBeTruthy()
    expect(getByRole('img', { name: '15 of 30' })).toBeTruthy()
  })

  it('sets the progress arc dasharray from the current/target ratio', () => {
    const { container } = render(CounterRing, {
      props: { data: makeData({ current: 24, target: 30 }) },
    })

    const circle = progressStroke(container)
    const [filled] = (circle?.getAttribute('stroke-dasharray') ?? '0 0').split(' ').map(Number)

    expect(filled).toBeCloseTo(CIRCUMFERENCE * 0.8, 4)
  })

  it('uses primary stroke at full opacity when status is met', () => {
    const { container } = render(CounterRing, {
      props: { data: makeData({ current: 30, target: 30, status: 'met' }) },
    })

    const circle = progressStroke(container)
    expect(circle?.getAttribute('stroke')).toBe('rgb(var(--neo-chart-primary-end))')
    expect(circle?.getAttribute('stroke-opacity')).toBe('1')
  })

  it('switches to error stroke when status is missed', () => {
    const { container } = render(CounterRing, {
      props: { data: makeData({ current: 5, target: 30, status: 'missed' }) },
    })

    const circle = progressStroke(container)
    expect(circle?.getAttribute('stroke')).toBe('rgb(var(--color-error))')
  })

  it('dims the arc on in-progress status', () => {
    const { container } = render(CounterRing, {
      props: { data: makeData({ current: 10, target: 30, status: 'in-progress' }) },
    })

    const circle = progressStroke(container)
    expect(circle?.getAttribute('stroke-opacity')).toBe('0.6')
  })

  it('switches to error color and caps arc on max-operator overflow', () => {
    const { container } = render(CounterRing, {
      props: {
        data: makeData({ current: 12, target: 8, status: 'missed', operator: 'max' }),
      },
    })

    const circle = progressStroke(container)
    expect(circle?.getAttribute('stroke')).toBe('rgb(var(--color-error))')
    const [filled] = (circle?.getAttribute('stroke-dasharray') ?? '0 0').split(' ').map(Number)
    expect(filled).toBeCloseTo(CIRCUMFERENCE, 4)
  })
})
