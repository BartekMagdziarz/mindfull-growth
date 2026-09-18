import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import NextDayUpcoming from '../NextDayUpcoming.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/composables/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      `${key.split('.').at(-1)}${params ? `:${JSON.stringify(params)}` : ''}`,
    locale: ref('pl-PL'),
  }),
}))

const TODAY = '2026-03-12' as DayRef

function ritual(
  dayRef: string,
  state: 'due' | 'done',
  action: 'plan' | 'reflect',
  weekRef: string
): DayMarker {
  return {
    key: `ritual:week:${action}:${weekRef}`,
    kind: 'ritual',
    dayRef: dayRef as DayRef,
    state,
    ritual: 'week',
    action,
    weekRef: weekRef as WeekRef,
  }
}

const entries: DayMarker[] = [
  ritual('2026-03-08', 'done', 'reflect', '2026-W09'),
  ritual('2026-03-09', 'due', 'plan', '2026-W10'),
  ritual('2026-03-16', 'due', 'plan', '2026-W11'),
  { ...ritual('2026-03-16', 'done', 'plan', '2026-W11'), key: 'ritual:week:plan:2026-W11:done' },
  ritual('2026-03-23', 'due', 'plan', '2026-W12'),
  ritual('2026-03-30', 'due', 'plan', '2026-W13'),
]

function mountList(list: DayMarker[] = entries, limit = 4) {
  return mount(NextDayUpcoming, {
    props: { entries: list, todayRef: TODAY, limit },
    global: { stubs: { AppIcon: true } },
  })
}

describe('NextDayUpcoming', () => {
  it('splits into a front list (overdue + upcoming) and a folded past section', () => {
    const wrapper = mountList()
    const front = wrapper
      .findAll('.next-day-upcoming__list')
      .at(0)!
      .findAll('.next-day-upcoming__row')

    expect(front.map(row => row.find('strong').text())).toEqual([
      'planWeek_current',
      'planWeek_next',
      'planWeek_next',
      'planWeek · 23–29 mar 2026',
    ])
    expect(front[0].classes()).toContain('is-overdue')
    expect(front[0].find('em').text()).toBe('notPlanned')
    expect(front[2].classes()).toContain('is-done')
    expect(front[2].find('em').text()).toBe('planned')
    expect(front[1].find('.next-day-upcoming__context').text()).toBe('16–22 mar 2026')

    const past = wrapper.find('details.next-day-upcoming__past')
    expect(past.find('summary').text()).toBe('past:{"n":1}')
    expect(past.findAll('.next-day-upcoming__row')[0].find('strong').text()).toBe(
      'reflectWeek_previous'
    )
  })

  it('caps the front list and reveals the rest on "more"', async () => {
    const wrapper = mountList()
    const more = wrapper.find('.next-day-upcoming__more')

    expect(more.text()).toBe('more:{"n":1}')
    expect(more.attributes('aria-expanded')).toBe('false')
    await more.trigger('click')
    expect(
      wrapper.findAll('.next-day-upcoming__list').at(0)!.findAll('.next-day-upcoming__row')
    ).toHaveLength(5)
    expect(wrapper.find('.next-day-upcoming__more').text()).toBe('less')
    expect(more.attributes('aria-expanded')).toBe('true')
  })

  it('shows the empty state only when the front list is empty, past section may still exist', () => {
    const wrapper = mountList([ritual('2026-03-08', 'done', 'reflect', '2026-W09')])

    expect(wrapper.find('.next-day-upcoming__list p').text()).toBe('empty')
    expect(wrapper.find('details.next-day-upcoming__past').exists()).toBe(true)
    expect(wrapper.find('.next-day-upcoming__more').exists()).toBe(false)
  })

  it('opens reflection rituals with the reflect action', async () => {
    const wrapper = mountList([ritual('2026-03-08', 'due', 'reflect', '2026-W09')])
    await wrapper.find('.next-day-upcoming__row').trigger('click')

    expect(push).toHaveBeenLastCalledWith({
      name: 'calendar-week',
      params: { weekRef: '2026-W09' },
      query: { action: 'reflect' },
    })
  })
})
