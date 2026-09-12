import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { DayRef, WeekRef } from '@/domain/period'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import { getPeriodRefsForDate } from '@/utils/periods'
import NextDayCalendarCard from '../NextDayCalendarCard.vue'

const TODAY = '2026-03-12' as DayRef // Thursday
const markers: DayMarker[] = [
  { key: 'w', kind: 'ritual', dayRef: '2026-03-16' as DayRef, state: 'due', ritual: 'week', action: 'plan', weekRef: '2026-W12' as WeekRef },
  { key: 'r', kind: 'ritual', dayRef: '2026-03-15' as DayRef, state: 'done', ritual: 'week', action: 'reflect', weekRef: '2026-W11' as WeekRef },
]

function mountCard(props: Partial<{ dayRef: DayRef; targeting: boolean; targetingWeekRef: WeekRef | null }> = {}) {
  return mount(NextDayCalendarCard, { props: { dayRef: TODAY, todayRef: TODAY, markers, targeting: false, ...props } })
}

describe('NextDayCalendarCard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows the date with a "Dziś" eyebrow, arrows and a folded grid by default', async () => {
    const wrapper = mountCard()

    expect(wrapper.find('.next-day-cal__date small').text()).toBe('Dziś')
    expect(wrapper.find('.next-day-cal__date h2').text()).toContain('12 marca')
    expect(wrapper.find('.next-day-cal__week').exists()).toBe(false)
    expect(wrapper.find('.next-day-cal__today').exists()).toBe(false)

    await wrapper.find('[aria-label="Następny dzień"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['2026-03-13']])
  })

  it('opens on demand: the viewed week, markers on their day, click navigates', async () => {
    const wrapper = mountCard({ dayRef: '2026-03-13' as DayRef })
    expect(wrapper.find('.next-day-cal__date small').text()).toBe('')
    expect(wrapper.find('.next-day-cal__today').exists()).toBe(true)

    await wrapper.find('.next-day-cal__toggle').trigger('click')
    const cells = wrapper.findAll('.next-day-cal__day--week')
    expect(cells).toHaveLength(7)
    expect(cells[0].find('strong').text()).toBe('9') // Monday of the viewed week
    expect(wrapper.find('.next-day-cal__day.is-today strong').text()).toBe('12')
    expect(wrapper.find('.next-day-cal__day.is-selected strong').text()).toBe('13')
    expect(wrapper.find('.next-day-cal__period strong').text()).toBe(`T${Number(getPeriodRefsForDate(new Date('2026-03-09T12:00:00')).week.slice(-2))}`)

    await wrapper.find('.next-day-cal__switch button:last-child').trigger('click')
    expect(wrapper.findAll('.next-day-cal__day--month').length).toBeGreaterThanOrEqual(35)
    expect(wrapper.find('.next-day-cal__day--month[title*="16"] .next-day-cal__marks i.is-ritual').exists()).toBe(true)
    expect(wrapper.find('.next-day-cal__day--month[title*="16"] .next-day-cal__marks i.is-done').exists()).toBe(false)
    expect(wrapper.find('.next-day-cal__day--month[title*="15"] .next-day-cal__marks i.is-ritual.is-done').exists()).toBe(true)

    await wrapper.find('.next-day-cal__day--month[title*="16"]').trigger('click')
    expect(wrapper.emitted('navigate')?.at(-1)).toEqual(['2026-03-16'])
  })

  it('targeting opens the next seven days, blocks the past and emits pick', async () => {
    const wrapper = mountCard({ targeting: true })

    expect(wrapper.find('.next-day-cal__date small').text()).toBe('Wybierz dzień')
    expect(wrapper.find('[aria-label="Następny dzień"]').attributes('disabled')).toBeDefined()
    const cells = wrapper.findAll('.next-day-cal__day--week')
    expect(cells[0].find('strong').text()).toBe('13')
    expect(cells.every(cell => cell.classes().includes('is-pickable'))).toBe(true)
    expect(wrapper.find('.next-day-cal__period strong').text()).toBe('Najbliższe 7 dni')

    await cells[2].trigger('click')
    expect(wrapper.emitted('pick')).toEqual([['2026-03-15']])
    expect(wrapper.emitted('navigate')).toBeUndefined()

    await wrapper.find('.next-day-cal__toggle').trigger('click')
    expect(wrapper.emitted('cancel-targeting')).toHaveLength(1)
  })

  it('targeting with a week lock keeps only that week pickable', async () => {
    const lock = getPeriodRefsForDate(new Date('2026-03-12T12:00:00')).week
    const wrapper = mountCard({ targeting: true, targetingWeekRef: lock })
    const cells = wrapper.findAll('.next-day-cal__day--week')

    // Forward view: Fri 13 … Thu 19 — only Fri/Sat/Sun stay in the locked week.
    expect(cells.map(cell => cell.classes().includes('is-pickable'))).toEqual([true, true, true, false, false, false, false])
    await cells[4].trigger('click')
    expect(wrapper.emitted('pick')).toBeUndefined()
    await cells[1].trigger('click')
    expect(wrapper.emitted('pick')).toEqual([['2026-03-14']])
  })
})
