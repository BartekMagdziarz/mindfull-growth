import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import RhythmBoard from '../RhythmBoard.vue'
import RhythmPeriodSummary from '../RhythmPeriodSummary.vue'
import { unitsFor } from '../rhythmProjections'
import { buildRows, viewOptions } from '../rhythmRows'
import { emptyRhythmScenario, type RhythmObject, type RhythmScenario } from '../rhythmScenario'

const CLOCK = '2026-07-15' as DayRef
const MONTH = '2026-07' as MonthRef
const WEEK = '2026-W28' as WeekRef

const habit: RhythmObject = {
  key: 'habit:h1',
  title: 'Rozciąganie',
  family: 'habit',
  priorityKeys: ['p1'],
  entryMode: 'completion',
  cadence: 'weekly',
  target: { kind: 'count', operator: 'min', value: 3 },
  evidenceRole: 'action',
}

function scenario(patch: Partial<RhythmScenario> = {}): RhythmScenario {
  return {
    ...emptyRhythmScenario(CLOCK),
    priorities: [{ key: 'p1', title: 'Regularny ruch', icon: 'directions_run', status: 'active' }],
    objects: [habit],
    assignments: [{ id: 'a1', objectKey: habit.key, scope: { kind: 'week', ref: WEEK } }],
    entries: [{ id: 'e1', objectKey: habit.key, dayRef: '2026-07-14' as DayRef }],
    monthPlans: [{ monthRef: MONTH, topPriorityKeys: ['p1'] }],
    ...patch,
  }
}

function mountBoard(state = scenario()) {
  const units = unitsFor('month', MONTH, CLOCK)
  const view = `dir:p1`
  return mount(RhythmBoard, {
    props: {
      rows: buildRows(state, 'month', MONTH, units, view, { moreSeries: null }),
      units,
      scale: 'month' as const,
      objects: state.objects,
      fine: [],
      view,
      options: viewOptions(state, 'month', MONTH, units),
    },
  })
}

describe('RhythmBoard', () => {
  it('shows the period units as the axis and one row per active object', () => {
    const wrapper = mountBoard()

    expect(wrapper.findAll('.rb-axis__unit')).toHaveLength(5)
    expect(wrapper.findAll('.rb-series')).toHaveLength(1)
    expect(wrapper.text()).toContain('Rozciąganie')
  })

  it('zooms into a sub-period when its axis unit is clicked', async () => {
    const wrapper = mountBoard()

    await wrapper.findAll('.rb-axis__unit')[2].trigger('click')

    expect(wrapper.emitted('open-unit')).toEqual([[WEEK]])
  })

  it('offers one lens at a time, grouped by directions, objects and period', () => {
    const wrapper = mountBoard()
    const labels = wrapper.findAll('.rb-view__select optgroup').map(group => group.attributes('label'))

    expect(labels).toEqual(['Kierunki', 'Obiekty', 'Okres'])
  })

  it('carries a monthly object in the Σ column instead of a cell', () => {
    const monthly: RhythmObject = {
      ...habit,
      key: 'keyResult:kr1',
      family: 'keyResult',
      title: 'Dwie funkcje miesięcznie',
      cadence: 'monthly',
      target: { kind: 'count', operator: 'min', value: 2 },
    }
    const state = scenario({
      objects: [monthly],
      assignments: [{ id: 'a1', objectKey: monthly.key, scope: { kind: 'month', ref: MONTH } }],
      entries: [{ id: 'e1', objectKey: monthly.key, dayRef: '2026-07-14' as DayRef }],
    })

    const wrapper = mountBoard(state)

    expect(wrapper.find('.rb-sigma--head').text()).toContain('miesiąc')
    expect(wrapper.find('.rb-sigma__well').text()).toBe('1 / 2')
  })
})

describe('RhythmPeriodSummary', () => {
  function mountSummary(state: 'past' | 'current' | 'future') {
    return mount(RhythmPeriodSummary, {
      props: {
        scenario: scenario(),
        scale: 'month' as const,
        periodRef: MONTH,
        units: unitsFor('month', MONTH, CLOCK),
        open: false,
        view: 'dir:p1',
        state,
      },
    })
  }

  it('offers the ritual that fits the state of the period', () => {
    expect(mountSummary('future').text()).toContain('Zaplanuj miesiąc')

    const current = mountSummary('current')
    expect(current.text()).toContain('Plan')
    expect(current.text()).toContain('Refleksja')

    // A closed month without a reflection invites writing one, not planning.
    const past = mountSummary('past')
    expect(past.text()).toContain('Napisz refleksję')
    expect(past.text()).not.toContain('Zaplanuj')
  })

  it('says plainly that the period has no reflection yet', () => {
    expect(mountSummary('past').text()).toContain('Brak refleksji okresu')
  })

  it('turns a focus chip into a table lens', async () => {
    const wrapper = mountSummary('current')

    await wrapper.find('.ps__chip').trigger('click')

    expect(wrapper.emitted('focus')).toEqual([['dir:p1']])
  })
})

describe('RhythmBoard · reflection view as area ribbons', () => {
  it('shows four area rows with a ribbon each in the month scale and zooms into a week on click', async () => {
    const units = unitsFor('month', MONTH, CLOCK)
    const state = scenario({
      weeklyReflections: [
        { weekRef: WEEK, status: 'done', load: [4, 2, 3, 1], state: [4, 4, 2, 5], anchors: { good: '', hard: '', lessons: '' } },
      ],
    })
    const rows = buildRows(state, 'month', MONTH, units, 'reflection', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-area', 'reflection-area', 'reflection-area', 'reflection-area'])
    const wrapper = mount(RhythmBoard, {
      props: { rows, units, scale: 'month' as const, objects: state.objects, fine: [], view: 'reflection', options: viewOptions(state, 'month', MONTH, units) },
    })
    expect(wrapper.findAll('.rb-series--ribbon')).toHaveLength(4)
    expect(wrapper.text()).toContain('Zadania')
    expect(wrapper.text()).toContain('Bliscy')
    const hits = wrapper.findAll('.rb-series--ribbon')[0].findAll('.ls-ribbon__hit')
    expect(hits).toHaveLength(units.length)
    await hits[0].trigger('click')
    expect(wrapper.emitted('open-unit')?.[0]).toEqual([units[0].ref])
  })

  it('adds the monthly compass row after the area ribbons in the year scale', () => {
    const rows = buildRows(scenario(), 'year', '2026', unitsFor('year', '2026', CLOCK), 'reflection', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-area', 'reflection-area', 'reflection-area', 'reflection-area', 'reflection-units'])
  })
})

describe('RhythmPeriodSummary · load/state', () => {
  it('draws load and state pairs for the week and the twelve-week ribbons beside them', () => {
    const state = scenario({
      weeklyReflections: [
        { weekRef: WEEK, status: 'done', load: [4, 2, 3, 1], state: [4, 4, 2, 5], anchors: { good: 'Dobry sen', hard: '', lessons: '' } },
      ],
    })
    const units = unitsFor('week', WEEK, CLOCK)
    const wrapper = mount(RhythmPeriodSummary, {
      props: { scenario: state, scale: 'week' as const, periodRef: WEEK, units, open: false, state: 'current' as const },
    })
    expect(wrapper.find('.ps__bars--pairs').exists()).toBe(true)
    expect(wrapper.findAll('.ps__multiple')).toHaveLength(4)
    expect(wrapper.text()).toContain('Ostatnie 12 tygodni')
    expect(wrapper.findAll('.ps__multiple')[0].findAll('.ls-ribbon__hit')).toHaveLength(12)
  })

  it('shows the weeks of the month as ribbons under the month rating', () => {
    const units = unitsFor('month', MONTH, CLOCK)
    const state = scenario({
      weeklyReflections: [
        { weekRef: WEEK, status: 'done', load: [4, 2, 3, 1], state: [4, 4, 2, 5], anchors: { good: '', hard: '', lessons: '' } },
      ],
      monthlyReflections: [
        { monthRef: MONTH, status: 'done', compass: [3, 4, 4, 3, 4], anchors: { proud: '', challenges: '', growth: '' }, priorityVerdicts: [] },
      ],
    })
    const wrapper = mount(RhythmPeriodSummary, {
      props: { scenario: state, scale: 'month' as const, periodRef: MONTH, units, open: false, state: 'current' as const },
    })
    expect(wrapper.text()).toContain('Tygodnie · obciążenie i stan')
    expect(wrapper.findAll('.ps__multiple')).toHaveLength(4)
  })
})
