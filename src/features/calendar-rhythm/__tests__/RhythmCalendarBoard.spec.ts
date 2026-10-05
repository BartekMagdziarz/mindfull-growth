import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import RhythmBoard from '../RhythmBoard.vue'
import RhythmPeriodSummary from '../RhythmPeriodSummary.vue'
import { ritualActions, unitsFor } from '../rhythmProjections'
import { buildRows, resolveView, viewOptions } from '../rhythmRows'
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
  function mountSummary(scale: 'month' | 'year' = 'month') {
    const ref = scale === 'month' ? MONTH : '2026'
    return mount(RhythmPeriodSummary, {
      props: {
        scenario: scenario(),
        scale,
        periodRef: ref,
        units: unitsFor(scale, ref, CLOCK),
        open: false,
        view: 'dir:p1',
      },
    })
  }

  it('keeps the five empty compass axes for a month without a reflection, without chips or "Więcej"', () => {
    const wrapper = mountSummary()
    expect(wrapper.findAll('.ps__bars--tall li')).toHaveLength(5)
    expect(wrapper.findAll('.ps__col i.none')).toHaveLength(5)
    expect(wrapper.text()).not.toContain('Brak oceny')
    expect(wrapper.find('.ps__head').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Więcej')
  })

  it('turns a focus chip of the year into a table lens', async () => {
    const wrapper = mountSummary('year')

    await wrapper.find('.ps__chip').trigger('click')

    expect(wrapper.emitted('focus')).toEqual([['dir:p1']])
  })
})

describe('ritualActions (calendar header)', () => {
  it('offers the ritual that fits the state of the period', () => {
    expect(ritualActions('month', 'future', false).map(a => a.label)).toEqual(['Zaplanuj miesiąc'])
    expect(ritualActions('week', 'current', false).map(a => a.label)).toEqual(['Plan', 'Refleksja'])
    // A closed period without a reflection invites writing one, not planning.
    expect(ritualActions('month', 'past', false).map(a => a.label)).toEqual(['Napisz refleksję'])
    expect(ritualActions('week', 'past', true).map(a => a.label)).toEqual(['Edytuj refleksję'])
    expect(ritualActions('year', 'current', false).map(a => a.label)).toEqual(['Plan roku'])
  })
})

describe('Week scale · focus lens and reflection lens', () => {
  const weekUnits = () => unitsFor('week', WEEK, CLOCK)
  const withFocus = (patch: Partial<RhythmScenario> = {}) => scenario({ weekPlans: [{ weekRef: WEEK, topObjectKeys: [habit.key] }], ...patch })

  it('starts on the week focus and offers the reflection as a lens', () => {
    const state = withFocus()
    const options = viewOptions(state, 'week', WEEK, weekUnits())
    expect(options[0]).toMatchObject({ id: 'focus', label: 'Fokus tygodnia', icon: 'star' })
    expect(options.find(o => o.id === 'reflection')?.label).toBe('Refleksja')
    expect(resolveView(state, 'week', WEEK, weekUnits(), null)).toBe('focus')
  })

  it('lists the focus objects of the week under one sublabel, without "the rest"', () => {
    const rows = buildRows(withFocus(), 'week', WEEK, weekUnits(), 'focus', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['sublabel', 'series'])
    expect(buildRows(scenario(), 'week', WEEK, weekUnits(), 'focus', { moreSeries: null }).map(r => r.kind)).toEqual(['note'])
  })

  it('draws each day as the Plan-dnia disc: done blob, today ring, dot without a plan', () => {
    const state = withFocus({
      assignments: [
        { id: 'a1', objectKey: habit.key, scope: { kind: 'day', ref: '2026-07-13' as DayRef } },
        { id: 'a2', objectKey: habit.key, scope: { kind: 'day', ref: '2026-07-15' as DayRef } },
        { id: 'a3', objectKey: habit.key, scope: { kind: 'day', ref: '2026-07-17' as DayRef } },
      ],
    })
    const units = weekUnits()
    const wrapper = mount(RhythmBoard, {
      props: { rows: buildRows(state, 'week', WEEK, units, 'focus', { moreSeries: null }), units, scale: 'week' as const, objects: state.objects, fine: [], view: 'focus', options: viewOptions(state, 'week', WEEK, units) },
    })
    const cells = wrapper.findAll('.rb-cell--series')
    expect(cells).toHaveLength(7)
    expect(cells[0].find('.sm-well--missed').exists()).toBe(true) // Mon: planned, nothing recorded
    expect(cells[1].find('.mg-well--done').exists()).toBe(true) // Tue: recorded
    expect(cells[2].find('.sm-well--today').exists()).toBe(true) // Wed = clock, planned
    expect(cells[3].find('.sm-faint').exists()).toBe(true) // Thu: no plan
    expect(cells[4].find('.sm-well--future').exists()).toBe(true) // Fri: planned later
    expect(wrapper.text()).toContain('Fokus tygodnia')
  })

  it('shows the written reflection instead of rows and hides the day axis', async () => {
    const state = scenario({
      weeklyReflections: [
        { weekRef: WEEK, status: 'done', load: [4, 2, 3, 1], state: [4, 4, 2, 5], anchors: { good: 'Dobry sen\nSpacer', hard: '', lessons: 'Wcześniej spać' }, freeform: 'Spokojny tydzień.', savedAt: '2026-07-19T18:00:00' },
      ],
    })
    const units = weekUnits()
    const rows = buildRows(state, 'week', WEEK, units, 'reflection', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-own'])
    const wrapper = mount(RhythmBoard, {
      props: { rows, units, scale: 'week' as const, objects: state.objects, fine: [], view: 'reflection', options: viewOptions(state, 'week', WEEK, units) },
    })
    expect(wrapper.findAll('.rb-axis__unit')).toHaveLength(0)
    expect(wrapper.findAll('.rb-refl__anchor')).toHaveLength(2) // the empty "hard" anchor disappears
    expect(wrapper.findAll('.rb-refl__anchor--good p')).toHaveLength(2)
    expect(wrapper.find('.rb-refl__entry').text()).toContain('Spokojny tydzień.')
    expect(wrapper.text()).toContain('zapisana w niedzielę, 19 lipca')
    await wrapper.find('.rb-refl__head button').trigger('click')
    expect(wrapper.emitted('ritual')).toEqual([['reflection']])
  })

  it('invites writing the reflection when there is none yet', async () => {
    const units = weekUnits()
    const rows = buildRows(scenario(), 'week', WEEK, units, 'reflection', { moreSeries: null })
    const wrapper = mount(RhythmBoard, {
      props: { rows, units, scale: 'week' as const, objects: [], fine: [], view: 'reflection', options: [] },
    })
    expect(wrapper.text()).toContain('Refleksja nie została jeszcze zapisana.')
    await wrapper.find('.rb-refl__empty button').trigger('click')
    expect(wrapper.emitted('ritual')).toEqual([['reflection']])
  })
})

describe('Month scale · focus lens, reflection lens and day discs', () => {
  const monthUnits = () => unitsFor('month', MONTH, CLOCK)

  it('starts on the month focus and keeps the sub-period lenses under their own ids', () => {
    const state = scenario()
    const ids = viewOptions(state, 'month', MONTH, monthUnits()).map(o => `${o.id}=${o.label}`)
    expect(ids[0]).toBe('focus=Fokus miesiąca')
    expect(ids).toContain('focus-units=Fokus tygodni')
    expect(ids).toContain('reflection=Refleksja miesiąca')
    expect(ids).toContain('ratings=Oceny tygodni')
    expect(resolveView(state, 'month', MONTH, monthUnits(), null)).toBe('focus')
    // the year has no focus or reflection of its own in the table
    const yearIds = viewOptions(state, 'year', '2026', unitsFor('year', '2026', CLOCK)).map(o => o.id)
    expect(yearIds).not.toContain('focus')
    expect(yearIds).not.toContain('reflection')
    expect(yearIds).toContain('focus-units')
  })

  it('lists each focus direction of the month as a sublabel with its actions', () => {
    const rows = buildRows(scenario(), 'month', MONTH, monthUnits(), 'focus', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['sublabel', 'series'])
    expect(rows[0]).toMatchObject({ text: 'Regularny ruch' })
    expect(buildRows(scenario({ monthPlans: [] }), 'month', MONTH, monthUnits(), 'focus', { moreSeries: null }).map(r => r.kind)).toEqual(['note'])
  })

  it('draws the days of a week column as small Plan-dnia discs', () => {
    const state = scenario({
      assignments: [{ id: 'a1', objectKey: habit.key, scope: { kind: 'day', ref: '2026-07-13' as DayRef } }],
      entries: [{ id: 'e1', objectKey: habit.key, dayRef: '2026-07-14' as DayRef }],
    })
    const units = monthUnits()
    const daily: RhythmObject = { ...habit, target: { kind: 'count', operator: 'min', value: 10 } }
    const withDaily = { ...state, objects: [daily] }
    const wrapper = mount(RhythmBoard, {
      props: { rows: buildRows(withDaily, 'month', MONTH, units, 'dir:p1', { moreSeries: null }), units, scale: 'month' as const, objects: withDaily.objects, fine: [], view: 'dir:p1', options: [] },
    })
    const week = wrapper.findAll('.rb-cell--series')[2] // W28: 13–19.07
    const discs = week.findAll('.sm-wells > i')
    expect(discs).toHaveLength(7)
    expect(discs[0].classes()).toContain('sm-well--missed')
    expect(discs[1].classes()).toContain('mg-well--done')
    expect(discs[2].classes()).toContain('sm-faint')
  })

  it('shows the monthly reflection with its anchors and direction verdicts', async () => {
    const state = scenario({
      monthlyReflections: [
        { monthRef: MONTH, status: 'done', compass: [3, 4, 4, 3, 4], anchors: { proud: 'Wróciłem do biegania', challenges: '', growth: '' }, priorityVerdicts: [{ priorityKey: 'p1', effort: 4, verdict: 'continue' }], freeform: 'Dobry miesiąc.', savedAt: '2026-07-31T20:00:00' },
      ],
    })
    const units = monthUnits()
    const rows = buildRows(state, 'month', MONTH, units, 'reflection', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-own'])
    const wrapper = mount(RhythmBoard, {
      props: { rows, units, scale: 'month' as const, objects: state.objects, priorities: state.priorities, fine: [], view: 'reflection', options: [] },
    })
    expect(wrapper.findAll('.rb-axis__unit')).toHaveLength(0)
    expect(wrapper.text()).toContain('Refleksja miesiąca')
    expect(wrapper.text()).toContain('zapisana w piątek, 31 lipca')
    expect(wrapper.findAll('.rb-refl__anchor')).toHaveLength(1)
    expect(wrapper.find('.rb-refl__verdicts').text()).toContain('Regularny ruch')
    expect(wrapper.find('.rb-refl__verdicts').text()).toContain('kontynuuj')
    expect(wrapper.find('.rb-refl__entry').text()).toContain('Dobry miesiąc.')
    await wrapper.find('.rb-refl__head button').trigger('click')
    expect(wrapper.emitted('ritual')).toEqual([['reflection']])
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
    const rows = buildRows(state, 'month', MONTH, units, 'ratings', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-area', 'reflection-area', 'reflection-area', 'reflection-area'])
    const wrapper = mount(RhythmBoard, {
      props: { rows, units, scale: 'month' as const, objects: state.objects, fine: [], view: 'ratings', options: viewOptions(state, 'month', MONTH, units) },
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
    const rows = buildRows(scenario(), 'year', '2026', unitsFor('year', '2026', CLOCK), 'ratings', { moreSeries: null })
    expect(rows.map(r => r.kind)).toEqual(['reflection-area', 'reflection-area', 'reflection-area', 'reflection-area', 'reflection-units'])
  })
})

describe('RhythmPeriodSummary · load/state', () => {
  it('draws load and state pairs for the week alone — no header, no ribbons, no "Więcej"', () => {
    const state = scenario({
      weeklyReflections: [
        { weekRef: WEEK, status: 'done', load: [4, 2, 3, 1], state: [4, 4, 2, 5], anchors: { good: 'Dobry sen', hard: '', lessons: '' } },
      ],
      weekPlans: [{ weekRef: WEEK, topObjectKeys: [habit.key] }],
    })
    const units = unitsFor('week', WEEK, CLOCK)
    const wrapper = mount(RhythmPeriodSummary, {
      props: { scenario: state, scale: 'week' as const, periodRef: WEEK, units, open: false },
    })
    expect(wrapper.findAll('.ps__bars--pairs li')).toHaveLength(4)
    expect(wrapper.find('.ps__head').exists()).toBe(false)
    expect(wrapper.findAll('.ps__multiple')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Więcej')
    expect(wrapper.text()).not.toContain('Dobry sen')
  })

  it('keeps four empty pairs for a week without a reflection', () => {
    const units = unitsFor('week', WEEK, CLOCK)
    const wrapper = mount(RhythmPeriodSummary, {
      props: { scenario: scenario(), scale: 'week' as const, periodRef: WEEK, units, open: false },
    })
    expect(wrapper.findAll('.ps__bars--pairs li')).toHaveLength(4)
    expect(wrapper.findAll('.ps__col i.none')).toHaveLength(8)
    expect(wrapper.text()).not.toContain('Brak oceny')
  })

  it('shows family completion as a percentage in a ring, the fraction only in the tooltip', () => {
    const units = unitsFor('week', WEEK, CLOCK)
    const wrapper = mount(RhythmPeriodSummary, {
      props: { scenario: scenario(), scale: 'week' as const, periodRef: WEEK, units, open: false },
    })
    const habits = wrapper.findAll('.ps__tile').find(tile => tile.text().includes('Nawyki'))!
    expect(habits.find('.ps__ring .ps__pct').exists()).toBe(true)
    expect(habits.text()).not.toMatch(/\d+\s*\/\s*\d+/)
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
      props: { scenario: state, scale: 'month' as const, periodRef: MONTH, units, open: false },
    })
    expect(wrapper.text()).toContain('Tygodnie · obciążenie i stan')
    expect(wrapper.findAll('.ps__multiple')).toHaveLength(4)
  })
})
