import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/vue'
import AggregateBar from '../AggregateBar.vue'
import type { TodayAggregateData } from '@/services/todayChartData'

function makeData(overrides: Partial<TodayAggregateData> = {}): TodayAggregateData {
  return {
    currentValue: 15,
    targetValue: 20,
    scaleMax: 20,
    operator: 'min',
    aggregation: 'sum',
    status: 'in-progress',
    hoverLabel: '15 / target: >=20',
    ...overrides,
  }
}

describe('AggregateBar', () => {
  it('renders fill bar with correct width', () => {
    const { container } = render(AggregateBar, { props: { data: makeData() } })

    const fill = container.querySelector('.h-full.rounded-full')
    expect(fill).toBeTruthy()
    // 15/20 = 75%
    expect(fill?.getAttribute('style')).toContain('width: 75%')
  })

  it('renders tick mark', () => {
    const { container } = render(AggregateBar, { props: { data: makeData() } })

    const tick = container.querySelector('.w-0\\.5')
    expect(tick).toBeTruthy()
    // Target tick at 20/20 = 100%
    expect(tick?.getAttribute('style')).toContain('left: 100%')
  })

  it('shows value label', () => {
    const { container } = render(AggregateBar, { props: { data: makeData() } })

    expect(container.textContent).toContain('15')
  })

  it('applies met status color', () => {
    const { container } = render(AggregateBar, {
      props: { data: makeData({ status: 'met', currentValue: 22, scaleMax: 22 }) },
    })

    const fill = container.querySelector('.h-full.rounded-full')
    expect(fill?.classList.toString()).toContain('primary')
  })

  it('applies missed status color', () => {
    const { container } = render(AggregateBar, {
      props: { data: makeData({ status: 'missed' }) },
    })

    const fill = container.querySelector('.h-full.rounded-full')
    expect(fill?.classList.toString()).toContain('error')
  })

  it('renders hover label as title', () => {
    const { container } = render(AggregateBar, { props: { data: makeData() } })

    const wrapper = container.firstElementChild
    expect(wrapper?.getAttribute('title')).toBe('15 / target: >=20')
  })
})
