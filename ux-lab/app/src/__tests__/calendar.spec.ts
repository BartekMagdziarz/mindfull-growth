import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { MonthRef } from '@product/domain/period'
import { buildRichVerificationScenario } from '@product/dev/richVerificationScenario'
import { getChildPeriods } from '@product/utils/periods'
import CalendarReplica from '~lab/experiments/CalendarReplica.vue'
import {
  dayMetrics,
  lensReading,
  monthGrid,
  monthMetrics,
  monthsOfYear,
  weekBelongsToMonth,
  weekMetrics,
} from '~lab/lab/calendarConceptData'

// setup.ts przypina zegar do 2026-07-23 (miesiąc 2026-07). Tygodnie produktu są kanoniczne,
// NIE-ISO (W1 = pierwszy poniedziałek roku), więc numer bieżącego tygodnia bierzemy z fixture.
const fixture = buildRichVerificationScenario()
const currentWeekLabel = `T${Number(fixture.refs.currentWeek.slice(-2))}`
const julyWeeks = getChildPeriods('2026-07' as MonthRef)

function mountCalendar(variantId: string, presetId = 'current') {
  return mount(CalendarReplica, { props: { presetId, variantId }, global: { plugins: [createPinia()] } })
}

describe('warstwa danych kalendarza', () => {
  it('rozróżnia przeszłość, teraz i przyszłość oraz asymetrię danych', () => {
    const past = weekMetrics(fixture, fixture.refs.previousWeek)
    const current = weekMetrics(fixture, fixture.refs.currentWeek)
    const future = weekMetrics(fixture, `2026-W${Number(fixture.refs.currentWeek.slice(-2)) + 4}`)

    expect(past.state).toBe('past')
    expect(past.exec).not.toBeNull()
    expect(['done', 'missing']).toContain(past.ritual)
    expect(current.state).toBe('current')
    expect(current.ritual).toBe('due')
    expect(future.state).toBe('future')
    expect(future.exec).toBeNull()
    expect(future.ratings).toBeNull()
    expect(lensReading(future, 'rytm').parts).toHaveLength(0)
    expect(lensReading(future, 'rytm').text).toMatch(/^\d+ · \d+ · \d+$/)
  })

  it('jest deterministyczna i agreguje tygodnie do miesiąca po czwartku', () => {
    expect(weekMetrics(fixture, '2026-W20')).toEqual(weekMetrics(buildRichVerificationScenario(), '2026-W20'))
    // lipiec 2026: pierwszy tydzień zaczyna się 29.06 (czwartek 2.07 → należy), ostatni 27.07 (czwartek 30.07 → należy)
    expect(julyWeeks).toHaveLength(5)
    expect(julyWeeks.every(week => weekBelongsToMonth(week, '2026-07'))).toBe(true)
    expect(weekBelongsToMonth(julyWeeks[0], '2026-06')).toBe(false)

    const june = monthMetrics(fixture, '2026-06')
    expect(june.state).toBe('past')
    expect(june.exec!.habits.total).toBeGreaterThan(0)
    expect(june.compass === null || june.compass.length === 5).toBe(true)
    expect(monthsOfYear(fixture, '2026')).toHaveLength(12)
  })

  it('soczewki dnia degradują łagodnie', () => {
    const day = dayMetrics(fixture, '2026-07-14')
    expect(lensReading(day, 'stan').empty).toBe(true)
    expect(lensReading(day, 'kierunki').empty).toBe(true)
    expect(lensReading(day, 'rytm').text).toMatch(/^\d+\/\d+$/)
    const grid = monthGrid(fixture, '2026-07')
    expect(grid.every(row => row.days.length === 7)).toBe(true)
    expect(grid.filter(row => row.belongs)).toHaveLength(5)
  })
})

describe('koncepcje kalendarza (UX Lab)', () => {
  it('01 Kartka: siatka miesiąca, zmiana skali zachowuje okres, klik dnia otwiera panel dnia', async () => {
    const wrapper = mountCalendar('sheet-v1')
    expect(wrapper.find('.cal-sheet').exists()).toBe(true)
    expect(wrapper.text()).toContain('lipiec 2026')
    expect(wrapper.findAll('.cal-sheet__row')).toHaveLength(5)
    expect(wrapper.findAll('.cal-sheet__row')[0].findAll('.cal-sheet__day')).toHaveLength(7)

    const today = wrapper.findAll('.cal-sheet__day').find(cell => cell.classes('today'))
    expect(today).toBeTruthy()
    await today!.trigger('click')
    expect(wrapper.text()).toContain('Otwórz dzień')
    expect(wrapper.text()).toContain('Czwartek, 23 lipca')

    await wrapper.findAll('.lens-bar__scale button').find(button => button.text() === 'Rok')!.trigger('click')
    expect(wrapper.findAll('.cal-sheet__month')).toHaveLength(12)
    expect(wrapper.find('.lens-bar__title').text()).toBe('2026')

    await wrapper.findAll('.lens-bar__scale button').find(button => button.text() === 'Tydzień')!.trigger('click')
    expect(wrapper.findAll('.cal-sheet__daycol')).toHaveLength(7)
    expect(wrapper.find('.lens-bar__title').text()).toContain(currentWeekLabel)
  })

  it('02 Wstęga: trzy rzędy naraz, wybór tygodnia przestawia miesiąc', async () => {
    const wrapper = mountCalendar('ribbon-v1')
    expect(wrapper.findAll('.rb-month')).toHaveLength(12)
    expect(wrapper.findAll('.rb-day')).toHaveLength(7)
    expect(wrapper.findAll('.rb-week').length).toBeGreaterThanOrEqual(52)
    expect(wrapper.find('.rb-week.selected').text()).toContain(currentWeekLabel)

    const juneWeek = getChildPeriods('2026-06' as MonthRef).find(week => weekBelongsToMonth(week, '2026-06'))!
    await wrapper.find(`[data-week="${juneWeek}"]`).trigger('click')
    expect(wrapper.find('.rb-month.active').text()).toContain('cze')
    expect(wrapper.find('.lens-bar__title').text()).toContain(`T${Number(juneWeek.slice(-2))}`)
  })

  it('03 Macierz: pięć sekcji soczewek, wybór soczewki rozwija wiersze obiektów', async () => {
    const wrapper = mountCalendar('matrix-v1')
    expect(wrapper.findAll('.mx-section')).toHaveLength(5)
    expect(wrapper.find('.mx-section.open').text()).toContain('Rytm')
    expect(wrapper.findAll('.mx-row').length).toBeGreaterThan(3)

    await wrapper.findAll('.mx-section')[1].trigger('click')
    expect(wrapper.find('.mx-section.open').text()).toContain('Stan')
    expect(wrapper.findAll('.mx-row').map(row => row.find('.mx-row__name').text())).toEqual(['Ciało', 'Emocje', 'Działanie', 'Relacje'])

    await wrapper.findAll('.mx-col')[0].trigger('click')
    expect(wrapper.find('.mx-col.selected').exists()).toBe(true)
    expect(wrapper.find('.mx-brief h2').text()).toContain(`T${Number(julyWeeks[0].slice(-2))}`)
  })

  it('04 Soczewka: klawiatura przesuwa fokus, Enter wchodzi, Esc wychodzi', async () => {
    const wrapper = mountCalendar('zoom-v1')
    expect(wrapper.findAll('.zm-tile')).toHaveLength(5)
    const before = wrapper.find('.zm-tile.focus').text()

    await wrapper.find('.cal-zoom').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('.zm-tile.focus').text()).not.toBe(before)

    await wrapper.find('.cal-zoom').trigger('keydown', { key: 'Enter' })
    expect(wrapper.findAll('.zm-tile')).toHaveLength(7)
    expect(wrapper.findAll('.zm-crumbs button')).toHaveLength(3)

    await wrapper.find('.cal-zoom').trigger('keydown', { key: 'Escape' })
    expect(wrapper.findAll('.zm-tile')).toHaveLength(5)
  })
})
