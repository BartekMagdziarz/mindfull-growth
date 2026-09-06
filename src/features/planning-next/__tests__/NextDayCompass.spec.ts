import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Priority } from '@/domain/planning'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import NextDayCompass from '../NextDayCompass.vue'

const priorities = ['Ruch', 'Strumień', 'Bliscy'].map((title, index) => ({ id: `p${index}`, title, years: ['2026'], status: 'active', lifeAreaIds: [], progressSignals: [], riskSignals: [], createdAt: '', updatedAt: '' })) as unknown as Priority[]
const focus = { kind: 'measurement', key: 'habit:h1', panelType: 'habit', subject: { title: 'Rozciąganie' }, priorityIds: [] } as unknown as TodayMeasurementItem

describe('NextDayCompass', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders month directions then week focuses, with blue/lavender/rose tones only', () => {
    const wrapper = mount(NextDayCompass, { props: { priorities, focusItems: [focus], selectedKey: null } })
    const tiles = wrapper.findAll('.next-day-compass__tile')

    expect(tiles.map(tile => tile.find('small').text())).toEqual(['Ruch', 'Strumień', 'Bliscy', 'Rozciąganie'])
    expect(tiles.slice(0, 3).map(tile => tile.classes().find(cls => cls.startsWith('tone-')))).toEqual(['tone-blue', 'tone-lavender', 'tone-rose'])
    expect(wrapper.html()).not.toMatch(/mint|amber/)
  })

  it('emits hover previews and pin selections with compass keys', async () => {
    const wrapper = mount(NextDayCompass, { props: { priorities, focusItems: [focus], selectedKey: 'priority:p1' } })
    const tiles = wrapper.findAll('.next-day-compass__tile')

    expect(tiles[1].attributes('aria-pressed')).toBe('true')
    await tiles[0].trigger('mouseenter')
    await tiles[3].trigger('click')
    await wrapper.find('.next-day-compass__tiles').trigger('mouseleave')

    expect(wrapper.emitted('hover')).toEqual([['priority:p0'], [null]])
    expect(wrapper.emitted('select')).toEqual([['object:habit:h1']])
  })
})
