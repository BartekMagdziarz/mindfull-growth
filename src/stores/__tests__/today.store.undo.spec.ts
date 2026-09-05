import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DayRef } from '@/domain/period'
import type { TodayMeasurementItem, TodayViewBundle } from '@/services/todayViewQueries'

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
  toggleTodayCompletion: vi.fn(),
  toggleTodayMultiItem: vi.fn(),
}))

vi.mock('@/services/todayViewQueries', () => ({
  getTodayViewBundle: vi.fn(),
  getTodayViewBundleForDay: vi.fn(),
}))

import * as actions from '@/services/todayViewActions'
import * as queries from '@/services/todayViewQueries'
import { useTodayStore } from '@/stores/today.store'

const DAY = '2026-03-12' as DayRef

function makeItem(overrides: Partial<TodayMeasurementItem> = {}): TodayMeasurementItem {
  return {
    kind: 'measurement',
    key: 'habit:h1',
    panelType: 'habit',
    subjectType: 'habit',
    subject: {
      id: 'h1', title: 'Rozciąganie', isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly',
      entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 3 }, status: 'open', createdAt: '', updatedAt: '',
    },
    planning: { scheduleScope: 'whole-week', scheduledDayRefs: [] },
    measurement: { entryMode: 'completion', cadence: 'weekly', entryCount: 0, target: { kind: 'count', operator: 'min', value: 3 }, periodRef: '2026-W11' },
    priorityIds: [],
    contextPeriodRef: '2026-W11',
    sectionId: 'week',
    isScheduledToday: false,
    isTopPriority: false,
    canHide: true,
    canReschedule: false,
    canDelete: false,
    ...overrides,
  } as TodayMeasurementItem
}

function makeBundle(items: TodayMeasurementItem[]): TodayViewBundle {
  return {
    dayRef: DAY,
    refs: { day: DAY, week: '2026-W11', month: '2026-03', year: '2026' } as TodayViewBundle['refs'],
    sections: {
      scheduled: items.filter(item => item.sectionId === 'scheduled'),
      week: items.filter(item => item.sectionId === 'week'),
      month: items.filter(item => item.sectionId === 'month'),
    },
    hiddenItems: [],
    rawEntries: [],
    allDayAssignments: [],
    topPriorityKeys: [],
  }
}

describe('today.store — single-level undo for planning operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('hide → undoLast restores on the day the item was hidden and reloads', async () => {
    const item = makeItem()
    vi.mocked(queries.getTodayViewBundleForDay).mockResolvedValue(makeBundle([item]))
    const store = useTodayStore()
    await store.loadBundle(DAY)

    await store.hideItem(item)
    expect(actions.hideTodayItem).toHaveBeenCalledWith(item, DAY)
    expect(store.undoState?.kind).toBe('hide')

    await store.undoLast()
    expect(actions.restoreTodayItem).toHaveBeenCalledWith(item, DAY)
    expect(store.undoState).toBeNull()
    expect(store.isPending(item.key)).toBe(false)
  })

  it('move → undoLast moves the assignment back from the target day', async () => {
    const item = makeItem({ key: 'habit:h2', sectionId: 'scheduled', isScheduledToday: true, canHide: false, canReschedule: true, canDelete: true })
    vi.mocked(queries.getTodayViewBundleForDay).mockResolvedValue(makeBundle([item]))
    const store = useTodayStore()
    await store.loadBundle(DAY)

    await store.moveScheduledItem(item, '2026-03-13' as DayRef)
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenCalledWith(item, DAY, '2026-03-13')
    expect(store.undoState?.kind).toBe('move')

    await store.undoLast()
    expect(actions.moveTodayMeasurementAssignment).toHaveBeenLastCalledWith(item, '2026-03-13', DAY)
    expect(store.undoState).toBeNull()
  })

  it('a newer operation replaces the older undo; reset forgets it', async () => {
    const first = makeItem({ key: 'habit:a' })
    const second = makeItem({ key: 'habit:b' })
    vi.mocked(queries.getTodayViewBundleForDay).mockResolvedValue(makeBundle([first, second]))
    const store = useTodayStore()
    await store.loadBundle(DAY)

    await store.hideItem(first)
    await store.hideItem(second)
    expect(store.undoState?.itemKey).toBe('habit:b')

    store.reset()
    expect(store.undoState).toBeNull()
    await store.undoLast()
    expect(actions.restoreTodayItem).not.toHaveBeenCalled()
  })
})
