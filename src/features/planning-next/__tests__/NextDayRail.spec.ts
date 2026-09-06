import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import NextDayRail from '../NextDayRail.vue'

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
  })

  it('stages the first open item and moves the stage on row click', async () => {
    const wrapper = await mountRail()

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

  it('hide from the stage shows an undo snackbar that restores the item', async () => {
    const wrapper = await mountRail()

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

  it('"Jutro" moves a scheduled item to the next day', async () => {
    const wrapper = await mountRail()
    const habitRow = wrapper.findAll('.ndi').find(row => row.text().includes('Rozciąganie'))!
    await habitRow.find('button.ndi__label').trigger('click')

    await wrapper.find('.ndi--staged .next-day-rail__stage-actions button').trigger('click')
    await flushPromises()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(expect.objectContaining({ key: 'habit:h2' }), DAY, '2026-03-13')
  })

  it('"Jutro" on a week-context row re-homes it through rescheduleContextItem', async () => {
    const wrapper = await mountRail()

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
