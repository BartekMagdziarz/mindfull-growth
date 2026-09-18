import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { TodayMeasurementItem, TodayViewBundle } from '@/services/todayViewQueries'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: { get: vi.fn(async () => undefined), set: vi.fn(async () => {}), delete: vi.fn(async () => {}) },
}))
vi.mock('@/services/todayViewActions', () => ({
  clearTodayInitiative: vi.fn(),
  clearTodayMeasurementAssignment: vi.fn(),
  clearTodayMeasurementEntry: vi.fn(),
  deleteTodayItem: vi.fn(),
  hideTodayItem: vi.fn(async () => {}),
  moveTodayInitiative: vi.fn(),
  moveTodayMeasurementAssignment: vi.fn(async () => {}),
  restoreTodayItem: vi.fn(async () => {}),
  saveTodayMeasurementEntry: vi.fn(),
  toggleTodayCompletion: vi.fn(async () => {}),
  toggleTodayMultiItem: vi.fn(),
  addMeasurementToDay: vi.fn(async () => {}),
  removeMeasurementFromDay: vi.fn(async () => {}),
  rescheduleContextItem: vi.fn(async () => ({ createdAssignment: false })),
  undoRescheduleContextItem: vi.fn(async () => {}),
}))
vi.mock('@/services/todayViewQueries', () => ({
  getTodayViewBundle: vi.fn(),
  getTodayViewBundleForDay: vi.fn(),
}))

import * as actions from '@/services/todayViewActions'
import * as queries from '@/services/todayViewQueries'
import { getPeriodRefsForDate } from '@/utils/periods'
import { useTodayStore } from '@/stores/today.store'
import NextDayPlanCalendar from '../NextDayPlanCalendar.vue'
import NextDayRail from '../NextDayRail.vue'
import NextWeekPlanBoard from '../NextWeekPlanBoard.vue'

const DAY = '2026-03-12' as DayRef // Thursday
const labelOf = (button: { text: () => string }) => button.text().replace(/^[a-z_]+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/, '')
const WEEK = getPeriodRefsForDate(new Date('2026-03-12T12:00:00')).week // app week numbering, not ISO

function entry(subjectType: TodayMeasurementItem['subjectType'], subjectId: string, value: number | null): DailyMeasurementEntry {
  return { id: `e-${subjectId}`, subjectType, subjectId, dayRef: DAY, value, createdAt: '', updatedAt: '' }
}

function item(
  subjectType: TodayMeasurementItem['subjectType'],
  id: string,
  title: string,
  entryMode: 'completion' | 'counter',
  options: { scheduled?: boolean; todayEntry?: DailyMeasurementEntry; goalId?: string } = {},
): TodayMeasurementItem {
  const scheduled = options.scheduled ?? false
  const subject = {
    id, title, isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly', entryMode,
    target: { kind: 'count', operator: 'min', value: 3 }, status: 'open', createdAt: '', updatedAt: '',
    ...(options.goalId ? { goalId: options.goalId } : {}),
    ...(subjectType === 'weeklyIntention' ? { weekRef: WEEK } : {}),
  }
  return {
    kind: 'measurement',
    key: `${subjectType}:${id}`,
    panelType: subjectType,
    subjectType,
    subject,
    planning: { scheduleScope: scheduled ? 'specific-days' : 'whole-week', scheduledDayRefs: scheduled ? [DAY] : [] },
    measurement: { entryMode, cadence: 'weekly', entryCount: options.todayEntry ? 1 : 0, target: subject.target, periodRef: WEEK },
    todayEntry: options.todayEntry,
    goalTitle: options.goalId ? 'Cel' : undefined,
    priorityIds: [],
    contextPeriodRef: WEEK,
    sectionId: scheduled ? 'scheduled' : 'week',
    isScheduledToday: scheduled,
    isTopPriority: false,
    canHide: !scheduled,
    canReschedule: scheduled,
    canDelete: scheduled,
  } as unknown as TodayMeasurementItem
}

function bundle(items: TodayMeasurementItem[]): TodayViewBundle {
  return {
    dayRef: DAY,
    refs: { day: DAY, week: WEEK, month: '2026-03', year: '2026' } as TodayViewBundle['refs'],
    sections: {
      scheduled: items.filter(entry => entry.sectionId === 'scheduled'),
      week: items.filter(entry => entry.sectionId === 'week'),
      month: [],
    },
    hiddenItems: [],
    rawEntries: items.flatMap(entry => (entry.todayEntry ? [entry.todayEntry] : [])),
    allDayAssignments: [],
    topPriorityKeys: [],
    addCandidates: [
      { key: 'habit:h9', subjectType: 'habit', cadence: 'weekly', subject: { id: 'h9', title: 'Spacer' } },
      { key: 'keyResult:kr9', subjectType: 'keyResult', cadence: 'weekly', subject: { id: 'kr9', title: 'Trzy sesje' }, goalTitle: 'Cel' },
    ] as unknown as TodayViewBundle['addCandidates'],
  }
}

const intention = item('weeklyIntention', 'i1', 'Zaplanować budżet', 'completion')
const doneKr = item('keyResult', 'kr1', 'Biegi 3 razy', 'completion', { scheduled: true, todayEntry: entry('keyResult', 'kr1', null), goalId: 'g1' })
const counterHabit = item('habit', 'h1', 'Szklanki wody', 'counter', { todayEntry: entry('habit', 'h1', 3) })
const openHabit = item('habit', 'h2', 'Rozciąganie', 'completion', { scheduled: true })

async function mountRail(items = [intention, doneKr, counterHabit, openHabit]) {
  vi.mocked(queries.getTodayViewBundleForDay).mockImplementation(async () => bundle(items))
  const wrapper = mount(NextDayRail, { props: { dayRef: DAY }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('NextDayRail — inline stage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-12T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('past day: entries and quick planning actions remain available', async () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00'))
    const wrapper = await mountRail()

    expect(wrapper.find('.next-day-add__button').exists()).toBe(true)
    await wrapper.findAll('.ndi').find(row => row.text().includes('Zaplanować budżet'))!.find('button.ndi__label').trigger('click')
    expect(wrapper.findAll('.ndi--staged .next-day-rail__stage-actions button').map(labelOf)).toEqual(['Jutro', 'Dzień', 'Ukryj', 'Kontekst'])
    const scheduledRow = wrapper.findAll('.ndi').find(row => row.text().includes('Rozciąganie'))!
    expect(scheduledRow.findAll('.ndi__tray button').map(button => button.attributes('title'))).toEqual(['Przenieś na jutro', 'Przenieś na dzień', 'Usuń z dziś', 'Otwórz obiekt', 'Usuń'])
    expect(scheduledRow.find('button.ndi__well--button').exists()).toBe(true)
  })

  it('clears the assignment through the quick action on a past day', async () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00'))
    const wrapper = await mountRail([openHabit])
    await wrapper.find('.ndi__tray button[title="Usuń z dziś"]').trigger('click')
    await flushPromises()
    expect(actions.clearTodayMeasurementAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ key: openHabit.key }), DAY,
    )
    wrapper.unmount()
  })

  it('rests flat, expands a row on click, moves on another click and folds on a repeat click', async () => {
    const wrapper = await mountRail()

    // Nothing is expanded by default — the list is a plain list until the user asks.
    expect(wrapper.findAll('.ndi--staged')).toHaveLength(0)
    expect(wrapper.find('.ndi__expansion').exists()).toBe(false)

    const intentionRow = wrapper.findAll('.ndi').find(row => row.text().includes('Zaplanować budżet'))!
    await intentionRow.find('button.ndi__label').trigger('click')
    const staged = wrapper.findAll('.ndi--staged')
    expect(staged).toHaveLength(1)
    expect(staged[0].text()).toContain('Zaplanować budżet')
    expect(staged[0].find('.ndi__expansion').exists()).toBe(true)
    expect(staged[0].find('.next-object-card--bare').exists()).toBe(true)
    expect(staged[0].findAll('.next-day-rail__stage-actions button').map(labelOf)).toEqual(['Jutro', 'Dzień', 'Ukryj', 'Kontekst'])

    const habitRow = wrapper.findAll('.ndi').find(row => row.text().includes('Rozciąganie'))!
    await habitRow.find('button.ndi__label').trigger('click')
    const restaged = wrapper.findAll('.ndi--staged')
    expect(restaged).toHaveLength(1)
    expect(restaged[0].text()).toContain('Rozciąganie')
    expect(restaged[0].findAll('.next-day-rail__stage-actions button').map(labelOf)).toEqual(['Jutro', 'Dzień', 'Usuń z dziś', 'Otwórz'])
    expect(wrapper.find('.next-day-rail__filament').attributes('aria-label')).toBe('Wykonanie dnia: 2 z 4')

    // Clicking the expanded row again folds it — no row has to stay open.
    await habitRow.find('button.ndi__label').trigger('click')
    expect(wrapper.findAll('.ndi--staged')).toHaveLength(0)
  })

  it('collapses finished completion rows only, drops emptied groups and offers the way back', async () => {
    const wrapper = await mountRail()
    expect(wrapper.findAll('.next-day-rail__group > header').map(header => header.text())).toEqual(['Intencje tygodnia', 'Cele i rezultaty', 'Nawyki'])

    await wrapper.find('[aria-label="Zwiń wykonane"]').trigger('click')
    await flushPromises()

    const titles = wrapper.findAll('.ndi .ndi__label strong').map(node => node.text())
    expect(titles).not.toContain('Biegi 3 razy')
    expect(titles).toContain('Szklanki wody') // recorded number stays visible
    expect(wrapper.findAll('.next-day-rail__group > header').map(header => header.text())).toEqual(['Intencje tygodnia', 'Nawyki'])
    expect(wrapper.find('.next-day-rail__collapsed').text()).toContain('Wykonane (1)')

    await wrapper.find('.next-day-rail__collapsed').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.ndi .ndi__label strong').map(node => node.text())).toContain('Biegi 3 razy')
  })

  it.each(['2026-03-12', '2026-03-20'])('hide and undo use the viewed day when today is %s', async today => {
    vi.setSystemTime(new Date(`${today}T12:00:00`))
    const wrapper = await mountRail()
    await wrapper.findAll('.ndi').find(row => row.text().includes('Zaplanować budżet'))!.find('button.ndi__label').trigger('click')

    await wrapper.findAll('.ndi--staged .next-day-rail__stage-actions button').find(button => labelOf(button) === 'Ukryj')!.trigger('click')
    await flushPromises()
    expect(actions.hideTodayItem).toHaveBeenCalledWith(expect.objectContaining({ key: 'weeklyIntention:i1' }), DAY)

    const undo = wrapper.find('.snackbar__action')
    expect(undo.exists()).toBe(true)
    expect(undo.text()).toBe('Cofnij')
    await undo.trigger('click')
    await flushPromises()
    expect(actions.restoreTodayItem).toHaveBeenCalledWith(expect.objectContaining({ key: 'weeklyIntention:i1' }), DAY)
  })

  it.each(['2026-03-12', '2026-03-20'])('"Jutro" moves to the day after the viewed day when today is %s', async today => {
    vi.setSystemTime(new Date(`${today}T12:00:00`))
    const wrapper = await mountRail()
    const habitRow = wrapper.findAll('.ndi').find(row => row.text().includes('Rozciąganie'))!
    await habitRow.find('button.ndi__label').trigger('click')

    await wrapper.find('.ndi--staged .next-day-rail__stage-actions button').trigger('click')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(expect.objectContaining({ key: 'habit:h2' }), DAY, '2026-03-13')
  })

  it('"Jutro" on a week-context row re-homes it through rescheduleContextItem', async () => {
    const wrapper = await mountRail()
    await wrapper.findAll('.ndi').find(row => row.text().includes('Zaplanować budżet'))!.find('button.ndi__label').trigger('click')

    await wrapper.findAll('.ndi--staged .next-day-rail__stage-actions button').find(button => labelOf(button) === 'Jutro')!.trigger('click')
    await flushPromises()
    expect(actions.rescheduleContextItem).toHaveBeenCalledWith(expect.objectContaining({ key: 'weeklyIntention:i1' }), DAY, '2026-03-13')
    expect(actions.moveTodayMeasurementAssignment).not.toHaveBeenCalled()
  })

  it('one plus in the header opens a type → object cascade and adds through the store', async () => {
    const wrapper = await mountRail()
    expect(wrapper.findAll('.next-day-rail__group > header button')).toHaveLength(0)

    await wrapper.find('.next-day-add__button').trigger('click')
    expect(wrapper.find('.next-day-add__menu').exists()).toBe(true)
    expect(wrapper.find('.next-day-add__items').exists()).toBe(false)
    expect(wrapper.findAll('.next-day-add__types button').map(button => button.find('span:not(.material-symbols-outlined)').text())).toEqual(['Cele i rezultaty', 'Nawyki'])

    await wrapper.findAll('.next-day-add__types button')[1].trigger('mouseenter')
    const items = wrapper.findAll('.next-day-add__items button')
    expect(items.map(button => button.find('span:not(.material-symbols-outlined)').text())).toEqual(['Spacer'])

    await items[0].trigger('click')
    await flushPromises()
    expect(actions.addMeasurementToDay).toHaveBeenCalledWith(expect.objectContaining({ key: 'habit:h9' }), DAY)
    expect(wrapper.find('.next-day-add__menu').exists()).toBe(false)
    expect(wrapper.find('.snackbar__action').text()).toBe('Cofnij')
  })
})


describe('Today calendar integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-12T12:00:00'))
    vi.mocked(queries.getTodayViewBundleForDay).mockResolvedValue(bundle([openHabit]))
  })
  afterEach(() => vi.useRealTimers())

  it.each(['2026-03-12', '2026-03-20'])('routes drag and drop through move and undo when today is %s', async today => {
    vi.setSystemTime(new Date(`${today}T12:00:00`))
    vi.mocked(queries.getTodayViewBundleForDay).mockImplementation(async date => ({ ...bundle(date === DAY ? [openHabit] : []), dayRef: date }))
    const rail = mount(NextDayRail, { props: { dayRef: DAY, calendarContext: true } })
    await flushPromises()
    const calendar = mount(NextDayPlanCalendar, { props: { dayRef: DAY, expanded: false } })
    const payload = new Map<string, string>()
    const transfer = { setData: (type: string, value: string) => payload.set(type, value), getData: (type: string) => payload.get(type), effectAllowed: '', dropEffect: '' }
    const handle = rail.find('.ndi__drag')
    await handle.trigger('dragstart', { dataTransfer: transfer })
    expect(useTodayStore().draggingItemKey).toBe(openHabit.key)
    await calendar.findAll('.day-plan-calendar__days button')[4].trigger('drop', { dataTransfer: transfer })
    await handle.trigger('dragend')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(expect.objectContaining({ key: openHabit.key }), DAY, '2026-03-13')
    await rail.find('.snackbar__action').trigger('click')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenLastCalledWith(expect.objectContaining({ key: openHabit.key }), '2026-03-13', DAY)
    rail.unmount(); calendar.unmount()
  })

  it('moves selected object evidence to the calendar without duplicating the row chart', async () => {
    const rail = mount(NextDayRail, {props:{dayRef:DAY,calendarContext:true}})
    await flushPromises()
    await rail.find('.ndi__label').trigger('click')
    const store = useTodayStore()
    expect(store.selectedItemKey).toBe(openHabit.key)
    expect(rail.find('.next-object-card').exists()).toBe(false)
    const calendar = mount(NextDayPlanCalendar,{props:{dayRef:DAY,expanded:false}})
    expect(calendar.find('.day-plan-calendar__selection').text()).toContain('Rozciąganie')
    expect(calendar.find('.next-object-card').exists()).toBe(true)
    await rail.find('.ndi__label').trigger('click')
    expect(store.selectedItemKey).toBeNull()
    rail.unmount();calendar.unmount()
  })

  it('only accepts an internal drag and hands the destination to the existing move flow', async () => {
    const store = useTodayStore()
    store.bundle = bundle([openHabit])
    store.targetingItem = openHabit
    store.draggingItemKey = openHabit.key
    const calendar = mount(NextDayPlanCalendar,{props:{dayRef:DAY,expanded:false}})
    const cells = calendar.findAll('.day-plan-calendar__days button')
    expect(cells[0].attributes('disabled')).toBeUndefined()
    expect(cells[3].attributes('disabled')).toBeDefined()
    await cells[4].trigger('drop',{dataTransfer:{getData:()=> 'external'}})
    expect(store.pendingPick).toBeNull()
    await cells[4].trigger('drop',{dataTransfer:{getData:()=>openHabit.key}})
    expect(store.pendingPick).toEqual({item:openHabit,dayRef:'2026-03-13'})
    expect(store.draggingItemKey).toBeNull()
    calendar.unmount()
  })

  it('picks an earlier historical date through the row quick action and calendar', async () => {
    vi.setSystemTime(new Date('2026-03-20T12:00:00'))
    vi.mocked(queries.getTodayViewBundleForDay).mockImplementation(async date => ({ ...bundle(date === DAY ? [openHabit] : []), dayRef: date }))
    const rail = mount(NextDayRail, { props: { dayRef: DAY, calendarContext: true } })
    await flushPromises()
    const calendar = mount(NextDayPlanCalendar, { props: { dayRef: DAY, expanded: false } })
    await rail.find('.ndi__tray button[title="Przenieś na dzień"]').trigger('click')
    const cells = calendar.findAll('.day-plan-calendar__days button')
    expect(cells[3].attributes('disabled')).toBeDefined()
    await cells[0].trigger('click')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ key: openHabit.key }), DAY, '2026-03-09',
    )
    rail.unmount(); calendar.unmount()
  })

  it('blocks an occupied destination rather than merging assignments and breaking undo', async () => {
    const store = useTodayStore()
    store.bundle = bundle([openHabit])
    store.bundle.allDayAssignments = [{subjectType:'habit',subjectId:'h2',dayRef:'2026-03-13'}] as TodayViewBundle['allDayAssignments']
    store.targetingItem = openHabit
    const calendar = mount(NextDayPlanCalendar,{props:{dayRef:DAY,expanded:false}})
    expect(calendar.findAll('.day-plan-calendar__days button')[4].attributes('disabled')).toBeDefined()
    calendar.unmount()
  })
})


describe('Week board planning mutations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-12T12:00:00'))
    vi.mocked(queries.getTodayViewBundleForDay).mockImplementation(async date => ({ ...bundle(date === DAY ? [openHabit, intention] : []), dayRef: date }))
  })
  afterEach(() => vi.useRealTimers())

  it('moves the selected assignment and reverses the same source and destination', async () => {
    const board = mount(NextWeekPlanBoard, { props: { dayRef: DAY } })
    await flushPromises()
    await board.findAll('.week-plan-board__days button').find(b => b.text().includes('Rozciąganie'))!.trigger('click')
    await board.find('input[type=date]').setValue('2026-03-13')
    await board.find('form').trigger('submit')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(expect.objectContaining({ key: openHabit.key }), DAY, '2026-03-13')
    await board.find('[role=status] button').trigger('click')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenLastCalledWith(expect.objectContaining({ key: openHabit.key }), '2026-03-13', DAY)
    board.unmount()
  })

  it('assigns an undated intention but prevents moving it outside its week', async () => {
    const board = mount(NextWeekPlanBoard, { props: { dayRef: DAY } })
    await flushPromises()
    await board.find('.week-plan-board__flex button').trigger('click')
    await board.find('input[type=date]').setValue('2026-03-20')
    await board.find('form').trigger('submit')
    await flushPromises()
    expect(actions.addMeasurementToDay).not.toHaveBeenCalled()
    expect(board.find('[role=alert]').exists()).toBe(true)
    await board.find('input[type=date]').setValue('2026-03-13')
    await board.find('form').trigger('submit')
    await flushPromises()
    expect(actions.addMeasurementToDay).toHaveBeenCalledWith(expect.objectContaining({ key: intention.key }), '2026-03-13')
    expect(actions.moveTodayMeasurementAssignment).not.toHaveBeenCalled()
    board.unmount()
  })

  it('surfaces failed writes and keeps the editor available for retry', async () => {
    vi.mocked(actions.moveTodayMeasurementAssignment).mockRejectedValueOnce(new Error('Save failed'))
    const board = mount(NextWeekPlanBoard, { props: { dayRef: DAY } })
    await flushPromises()
    await board.findAll('.week-plan-board__days button').find(b => b.text().includes('Rozciąganie'))!.trigger('click')
    await board.find('input[type=date]').setValue('2026-03-13')
    await board.find('form').trigger('submit')
    await flushPromises()
    expect(board.find('[role=alert]').text()).toContain('Save failed')
    expect(board.find('form').exists()).toBe(true)
    expect(board.find('[role=status]').exists()).toBe(false)
    board.unmount()
  })
})
