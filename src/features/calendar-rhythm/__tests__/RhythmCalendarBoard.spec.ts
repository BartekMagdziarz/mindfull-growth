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
