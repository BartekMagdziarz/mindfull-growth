import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DayRef } from '@/domain/period'
import NextDayToolbar from '../NextDayToolbar.vue'
vi.mock('../NextDayEntriesBar.vue', () => ({ default: { props: ['dayRef'], template: '<div class="entries" :data-day="dayRef" />' } }))
afterEach(() => vi.useRealTimers())
describe('compact Today toolbar', () => {
  it('navigates across a month boundary and shares the viewed day with entries', () => {
    const wrapper = mount(NextDayToolbar, { props: { dayRef:'2026-03-01' as DayRef } })
    expect(wrapper.find('.entries').attributes('data-day')).toBe('2026-03-01')
    wrapper.find('.next-day-toolbar__date > button').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['2026-02-28'])
  })
  it('returns to the real current day, not the last viewed date', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-22T12:00:00'))
    const wrapper = mount(NextDayToolbar, { props: { dayRef:'2026-09-19' as DayRef } })
    await wrapper.find('.next-day-toolbar__return').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['2026-09-22'])
  })
  it('shows a single relative label under the date', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-22T12:00:00'))
    const yesterday = mount(NextDayToolbar, { props: { dayRef:'2026-09-21' as DayRef } })
    expect(yesterday.find('.next-day-toolbar__date-copy').text()).not.toMatch(/today|dziś|dzisiaj/i)
    expect(yesterday.find('.next-day-toolbar__date-copy small').text()).toMatch(/yesterday|wczoraj/i)
    const current = mount(NextDayToolbar, { props: { dayRef:'2026-09-22' as DayRef } })
    expect(current.find('.next-day-toolbar__return').exists()).toBe(false)
  })
  it('closes date selection on escape', async () => {
    const wrapper = mount(NextDayToolbar, { props: { dayRef:'2026-09-19' as DayRef } })
    await wrapper.find('[aria-expanded]').trigger('click')
    expect(wrapper.find('input[type=date]').exists()).toBe(true)
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('input').exists()).toBe(false)
  })
})
