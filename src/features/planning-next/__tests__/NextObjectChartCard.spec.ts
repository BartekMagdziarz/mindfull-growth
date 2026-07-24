import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NextObjectChartCard from '../NextObjectChartCard.vue'
import type { NextObjectChartPoint } from '../nextObjectChart'

const points: NextObjectChartPoint[] = [
  { key: 'one', label: 'Pn', value: 1, status: 'met' },
  { key: 'two', label: 'Wt', value: 2, status: 'no-target', current: true },
  { key: 'three', label: 'Śr', status: 'no-data', future: true },
]

function mountCard(overrides: Partial<InstanceType<typeof NextObjectChartCard>['$props']> = {}) {
  return mount(NextObjectChartCard, {
    props: {
      icon: 'flag',
      title: 'Przykładowy obiekt',
      summary: '2/3 w okresie',
      entryMode: 'completion',
      cadence: 'weekly',
      scale: 'week',
      points,
      ...overrides,
    },
  })
}

describe('NextObjectChartCard', () => {
  it('renders organic completion states with period labels', () => {
    const wrapper = mountCard()

    expect(wrapper.findAll('.next-object-card__dots i')).toHaveLength(3)
    expect(wrapper.find('.next-object-card__dots i.done').exists()).toBe(true)
    expect(wrapper.find('.next-object-card__dots i.pending').exists()).toBe(true)
    expect(wrapper.find('.next-object-card__labels').text()).toContain('Pn')
  })

  it('uses columns for counters and a line with target for value objects', () => {
    const bars = mountCard({ entryMode: 'counter' })
    const line = mountCard({ entryMode: 'value', targetValue: 3 })

    expect(bars.findAll('.next-object-card__bars i')).toHaveLength(3)
    expect(line.find('.next-object-card__line').exists()).toBe(true)
    expect(line.find('.next-object-card__target').exists()).toBe(true)
  })

  it('uses the whole-month span for monthly cadence objects', () => {
    const wrapper = mountCard({ scale: 'month', cadence: 'monthly', actualValue: 2, targetValue: 4 })

    expect(wrapper.find('.next-object-card__chart--span').exists()).toBe(true)
    expect(wrapper.find('.next-object-card__span-track i').attributes('style')).toContain('50%')
  })
})
