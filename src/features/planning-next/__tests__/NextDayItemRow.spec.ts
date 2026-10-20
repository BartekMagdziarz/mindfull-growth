import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Habit, MeasurementEntryMode } from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import NextDayItemRow from '../NextDayItemRow.vue'

const TODAY = '2026-03-12' as DayRef
const WEEK = '2026-W10' as WeekRef

function makeHabit(entryMode: MeasurementEntryMode): Habit {
  return {
    id: `habit-${entryMode}`,
    title: `Habit ${entryMode}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode,
    target: { kind: 'count', operator: 'min', value: 3 },
    multiItems:
      entryMode === 'multi-completion'
        ? [
            { id: 'wake', label: 'Pobudka', weight: 1 },
            { id: 'train', label: 'Trening', icon: 'fitness_center', weight: 1 },
          ]
        : undefined,
    status: 'open',
  }
}

function makeEntry(
  subjectId: string,
  value: number | null,
  checkedItemIds?: string[]
): DailyMeasurementEntry {
  return {
    id: `entry-${subjectId}`,
    subjectType: 'habit',
    subjectId,
    dayRef: TODAY,
    value,
    checkedItemIds,
    createdAt: '2026-03-12T08:00:00.000Z',
    updatedAt: '2026-03-12T08:00:00.000Z',
  }
}

function makeItem(
  entryMode: MeasurementEntryMode,
  entry?: DailyMeasurementEntry
): TodayMeasurementItem {
  const subject = makeHabit(entryMode)
  const measurement: MeasurementSummary = {
    entryMode,
    cadence: 'weekly',
    entryCount: entry ? 1 : 0,
    actualValue: entry?.value ?? undefined,
    target: subject.target,
    periodRef: WEEK,
  }
  return {
    kind: 'measurement',
    priorityIds: [],
    key: `habit:${subject.id}`,
    panelType: 'habit',
    subjectType: 'habit',
    subject,
    planning: { scheduleScope: 'whole-week', scheduledDayRefs: [] },
    measurement,
    todayEntry: entry,
    contextPeriodRef: WEEK,
    sectionId: 'week',
    isScheduledToday: false,
    isTopPriority: false,
    canHide: true,
    canReschedule: false,
    canDelete: false,
  }
}

function mountRow(item: TodayMeasurementItem, attachToBody = false) {
  return mount(NextDayItemRow, {
    props: {
      item,
      todayDayRef: TODAY,
      rawEntries: item.todayEntry ? [item.todayEntry] : [],
      allDayAssignments: [],
    },
    attachTo: attachToBody ? document.body : undefined,
  })
}

describe('NextDayItemRow', () => {
  it('folds a multi-completion checklist into a fraction disc at rest', () => {
    const entry = makeEntry('habit-multi-completion', null, ['wake'])
    const wrapper = mountRow(makeItem('multi-completion', entry))

    expect(wrapper.findAll('button.ndi__well--dot')).toHaveLength(0)
    const fraction = wrapper.find('button.ndi__well--fraction')
    expect(fraction.text().replace(/\s+/g, '')).toBe('1/2')
    expect(fraction.classes()).toContain('ndi__well--on')
    expect(fraction.classes()).not.toContain('ndi__well--met')
  })

  it('marks the fraction disc as met once the daily threshold is reached', () => {
    const entry = makeEntry('habit-multi-completion', null, ['wake', 'train'])
    const wrapper = mountRow(makeItem('multi-completion', entry))

    expect(wrapper.find('button.ndi__well--fraction').classes()).toContain('ndi__well--met')
  })

  it('splits the fraction into one organic toggle per active item on hover', async () => {
    const entry = makeEntry('habit-multi-completion', null, ['wake'])
    const wrapper = mountRow(makeItem('multi-completion', entry))

    await wrapper.find('.ndi__multi').trigger('mouseenter')
    expect(wrapper.find('button.ndi__well--fraction').exists()).toBe(false)
    const dots = wrapper.findAll('button.ndi__well--dot')

    expect(dots).toHaveLength(2)
    expect(dots[0].attributes('aria-pressed')).toBe('true')
    expect(dots[1].attributes('aria-pressed')).toBe('false')

    await dots[1].trigger('click')
    expect(wrapper.emitted('toggle-multi-item')).toEqual([['train']])

    await wrapper.find('.ndi__multi').trigger('mouseleave')
    expect(wrapper.find('button.ndi__well--fraction').exists()).toBe(true)
  })

  it('shows the item icon in its dot, falling back to the label initial', async () => {
    const wrapper = mountRow(makeItem('multi-completion'))
    await wrapper.find('.ndi__multi').trigger('mouseenter')
    const dots = wrapper.findAll('button.ndi__well--dot')

    expect(dots[0].find('.ndi__initial').text()).toBe('P')
    expect(dots[0].find('.material-symbols-outlined').exists()).toBe(false)
    expect(dots[1].find('.app-icon').attributes('data-glyph')).toBe('strength')
    expect(dots[1].find('.ndi__initial').exists()).toBe(false)
  })

  it('names a hovered dot in a tooltip after half a second', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mountRow(makeItem('multi-completion'), true)
      await wrapper.find('.ndi__multi').trigger('mouseenter')
      const dot = wrapper.findAll('button.ndi__well--dot')[1]

      await dot.trigger('mouseenter')
      expect(document.body.querySelector('.ndi-tip')).toBeNull()

      vi.advanceTimersByTime(499)
      await nextTick()
      expect(document.body.querySelector('.ndi-tip')).toBeNull()

      vi.advanceTimersByTime(1)
      await nextTick()
      expect(document.body.querySelector('.ndi-tip')?.textContent).toBe('Trening')

      await dot.trigger('mouseleave')
      expect(document.body.querySelector('.ndi-tip')).toBeNull()
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('increments counters from the persisted daily value', async () => {
    const entry = makeEntry('habit-counter', 3)
    const wrapper = mountRow(makeItem('counter', entry))

    await wrapper.find('button.ndi__step--plus').trigger('click')
    expect(wrapper.emitted('save-entry')).toEqual([[4]])
  })

  it('accepts a Polish decimal comma in value mode', async () => {
    const entry = makeEntry('habit-value', 1.5)
    const wrapper = mountRow(makeItem('value', entry))
    const input = wrapper.find('input.ndi__input')

    await input.setValue('7,5')
    await input.trigger('blur')
    expect(wrapper.emitted('save-entry')).toEqual([[7.5]])
  })
})

describe('NextDayItemRow — stage, tray and highlight (inline-stage port)', () => {
  beforeEach(() => setActivePinia(createPinia())) // fresh preferences → Polish default labels

  function makeScheduledItem(entry?: DailyMeasurementEntry): TodayMeasurementItem {
    return {
      ...makeItem('completion', entry),
      planning: { scheduleScope: 'specific-days', scheduledDayRefs: [TODAY] },
      sectionId: 'scheduled',
      isScheduledToday: true,
      canHide: false,
      canReschedule: true,
      canDelete: true,
    }
  }

  it('selects the row from its title and from the row surface, never opening the object directly', async () => {
    const wrapper = mountRow(makeItem('completion'))

    await wrapper.find('button.ndi__label').trigger('click')
    await wrapper.find('article.ndi').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(2)
    expect(wrapper.emitted('open-object')).toBeUndefined()
    expect(wrapper.find('button.ndi__label').attributes('aria-pressed')).toBe('false')
  })

  it('shows the icon tray for a context item (hide + open) and the scheduling tray for a scheduled one', async () => {
    const context = mountRow(makeItem('completion'))
    const contextLabels = context
      .findAll('.ndi__tray button')
      .map(button => button.attributes('title'))
    expect(contextLabels).toEqual([
      'Przenieś na jutro',
      'Przenieś na dzień',
      'Ukryj na dziś',
      'Otwórz obiekt',
    ])

    const scheduled = mountRow(makeScheduledItem(makeEntry('habit-completion', null)))
    const scheduledLabels = scheduled
      .findAll('.ndi__tray button')
      .map(button => button.attributes('title'))
    expect(scheduledLabels).toEqual([
      'Przenieś na jutro',
      'Przenieś na dzień',
      'Usuń z dziś',
      'Wyczyść wpis',
      'Otwórz obiekt',
      'Usuń',
    ])

    await scheduled.findAll('.ndi__tray button')[0].trigger('click')
    await scheduled.findAll('.ndi__tray button')[1].trigger('click')
    expect(scheduled.emitted('move-tomorrow')).toHaveLength(1)
    expect(scheduled.emitted('pick-day')).toHaveLength(1)
    // Tray clicks must not also re-select the row.
    expect(scheduled.emitted('select')).toBeUndefined()
    expect(scheduled.find('input[type="date"]').exists()).toBe(false)
  })

  it('staged: labelled actions replace the tray, the entry control stays, no strip without history', () => {
    const wrapper = mount(NextDayItemRow, {
      props: {
        item: makeItem('completion'),
        todayDayRef: TODAY,
        rawEntries: [],
        allDayAssignments: [],
        staged: true,
      },
    })

    expect(wrapper.classes()).toContain('ndi--staged')
    expect(wrapper.classes()).not.toContain('ndi--history')
    expect(wrapper.findAll('.ndi__actions button').map(button => button.text())).toEqual([
      'Jutro',
      'Dzień',
      'Ukryj',
      'Otwórz',
    ])
    expect(
      wrapper.findAll('.ndi__actions button').map(button => button.attributes('data-flip'))
    ).toEqual(['tomorrow', 'day', 'hide', 'open'])
    expect(wrapper.find('.ndi__tray').exists()).toBe(false)
    expect(wrapper.find('.ndi__strip').exists()).toBe(false)
    expect(wrapper.find('button.ndi__well--button').exists()).toBe(true)
    expect(wrapper.find('button.ndi__label').attributes('aria-pressed')).toBe('true')
  })

  it('staged with history: six past days end in the live disc, missed days are rose, readings fill', () => {
    // Daily points from calendarChartData: an entry → value + 'no-target', none → 'no-data';
    // "missed" is an assigned day without an entry.
    const point = (
      key: string,
      status: 'no-target' | 'no-data' | 'missed',
      value?: number,
      target?: number,
      assigned = false
    ) => ({ key, label: key, status, value, target, current: false, assigned })
    const history = [
      point('2026-03-06', 'no-target', 1),
      point('2026-03-07', 'no-data', undefined, undefined, true),
      point('2026-03-08', 'no-data'),
      point('2026-03-09', 'no-target', 1),
      point('2026-03-10', 'no-data', undefined, undefined, true),
      point('2026-03-11', 'no-target', 1),
      { ...point(TODAY, 'no-data'), current: true },
    ]
    const wrapper = mount(NextDayItemRow, {
      props: {
        item: makeItem('completion'),
        todayDayRef: TODAY,
        rawEntries: [],
        allDayAssignments: [],
        staged: true,
        history,
      },
    })

    expect(wrapper.classes()).toContain('ndi--history')
    const days = wrapper.findAll('.ndi__day')
    expect(days).toHaveLength(6)
    expect(
      days.map(day =>
        day
          .find('.ndi__dot')
          .classes()
          .find(cls => cls.startsWith('is-'))
      )
    ).toEqual(['is-done', 'is-missed', 'is-empty', 'is-done', 'is-missed', 'is-done'])
    expect(days[0].find('.ndi__dot').classes()).toContain('mg-well--done')
    expect(days.map(day => day.find('small').text())).toEqual(['p', 's', 'n', 'p', 'w', 'ś'])
    expect(days[0].attributes('title')).toBe('piątek, 6 marca')
    // The disc is the seventh cell: the same control, now with its own initial underneath.
    expect(wrapper.find('.ndi__entry').attributes('data-flip')).toBe('disc')
    expect(wrapper.find('.ndi__today').text()).toBe('c')
    expect(wrapper.find('button.ndi__well--button').exists()).toBe(true)

    const counter = mount(NextDayItemRow, {
      props: {
        item: makeItem('counter'),
        todayDayRef: TODAY,
        rawEntries: [],
        allDayAssignments: [],
        staged: true,
        history: [
          point('2026-03-06', 'no-target', 8, 8),
          point('2026-03-07', 'missed', 4, 8),
          point('2026-03-08', 'no-data'),
          point('2026-03-09', 'no-target', 8, 8),
          point('2026-03-10', 'missed', 2, 8),
          point('2026-03-11', 'no-target', 8, 8),
          { ...point(TODAY, 'no-data'), current: true },
        ],
      },
    })
    const dots = counter.findAll('.ndi__dot')
    expect(dots[0].text()).toBe('8')
    expect(dots[0].classes()).toContain('is-reading')
    expect(dots[0].attributes('style')).toContain('--fill: 100%')
    expect(dots[1].classes()).toContain('is-short')
    expect(dots[1].attributes('style')).toContain('--fill: 50%')
    expect(dots[2].classes()).toContain('is-empty')
  })

  it('maps lit and dim to modifier classes', () => {
    const lit = mount(NextDayItemRow, {
      props: {
        item: makeItem('counter'),
        todayDayRef: TODAY,
        rawEntries: [],
        allDayAssignments: [],
        lit: true,
      },
    })
    const dim = mount(NextDayItemRow, {
      props: {
        item: makeItem('counter'),
        todayDayRef: TODAY,
        rawEntries: [],
        allDayAssignments: [],
        dim: true,
      },
    })

    expect(lit.classes()).toContain('ndi--lit')
    expect(dim.classes()).toContain('ndi--dim')
  })
})
