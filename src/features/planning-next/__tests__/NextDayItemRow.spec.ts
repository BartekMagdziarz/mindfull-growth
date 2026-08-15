import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
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
    multiItems: entryMode === 'multi-completion'
      ? [
          { id: 'wake', label: 'Pobudka', weight: 1 },
          { id: 'train', label: 'Trening', weight: 1 },
        ]
      : undefined,
    status: 'open',
  }
}

function makeEntry(
  subjectId: string,
  value: number | null,
  checkedItemIds?: string[],
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

function makeItem(entryMode: MeasurementEntryMode, entry?: DailyMeasurementEntry): TodayMeasurementItem {
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

function mountRow(item: TodayMeasurementItem) {
  return mount(NextDayItemRow, {
    props: {
      item,
      todayDayRef: TODAY,
      rawEntries: item.todayEntry ? [item.todayEntry] : [],
      allDayAssignments: [],
    },
  })
}

describe('NextDayItemRow', () => {
  it('renders one organic toggle per active multi-completion item', async () => {
    const entry = makeEntry('habit-multi-completion', null, ['wake'])
    const wrapper = mountRow(makeItem('multi-completion', entry))
    const dots = wrapper.findAll('button.ndi__well--dot')

    expect(dots).toHaveLength(2)
    expect(dots[0].attributes('aria-pressed')).toBe('true')
    expect(dots[1].attributes('aria-pressed')).toBe('false')

    await dots[1].trigger('click')
    expect(wrapper.emitted('toggle-multi-item')).toEqual([['train']])
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
