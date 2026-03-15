import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import {
  clearTodayInitiative,
  clearTodayMeasurementAssignment,
  clearTodayMeasurementEntry,
  deleteTodayItem,
  hideTodayItem,
  moveTodayInitiative,
  moveTodayMeasurementAssignment,
  restoreTodayItem,
  saveTodayMeasurementEntry,
  toggleTodayCompletion,
} from '@/services/todayViewActions'
import {
  getTodayViewBundle,
  getTodayViewBundleForDay,
  type TodayInitiativeItem,
  type TodayItem,
  type TodayMeasurementItem,
  type TodaySectionId,
  type TodayViewBundle,
} from '@/services/todayViewQueries'
import { getPeriodRefsForDate } from '@/utils/periods'

function createOptimisticEntry(
  item: TodayMeasurementItem,
  dayRef: DayRef,
  value: number | null
): DailyMeasurementEntry {
  const now = new Date().toISOString()
  return {
    id: `optimistic-${item.key}`,
    createdAt: now,
    updatedAt: now,
    subjectType: item.subjectType,
    subjectId: item.subject.id,
    dayRef,
    value,
  }
}

function withoutItem(items: TodayItem[], key: string): TodayItem[] {
  return items.filter(item => item.key !== key)
}

function sortItems(items: TodayItem[]): TodayItem[] {
  return [...items].sort((left, right) => {
    const leftTitle = left.kind === 'initiative' ? left.initiative.title : left.subject.title
    const rightTitle = right.kind === 'initiative' ? right.initiative.title : right.subject.title
    return leftTitle.localeCompare(rightTitle)
  })
}

function sectionPriority(sectionId: string): number {
  switch (sectionId) {
    case 'scheduled': return 0
    case 'week': return 1
    case 'month': return 2
    default: return 3
  }
}

function sortBySectionThenTitle<T extends TodayItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sectionDiff = sectionPriority(a.sectionId) - sectionPriority(b.sectionId)
    if (sectionDiff !== 0) return sectionDiff
    const aTitle = a.kind === 'initiative' ? a.initiative.title : a.subject.title
    const bTitle = b.kind === 'initiative' ? b.initiative.title : b.subject.title
    return aTitle.localeCompare(bTitle)
  })
}

export const useTodayStore = defineStore('today', () => {
  const bundle = ref<TodayViewBundle | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pendingKeys = ref<string[]>([])

  const dayRef = computed(() => bundle.value?.dayRef)
  const scheduledItems = computed(() => bundle.value?.sections.scheduled ?? [])
  const weekItems = computed(() => bundle.value?.sections.week ?? [])
  const monthItems = computed(() => bundle.value?.sections.month ?? [])
  const hiddenItems = computed(() => bundle.value?.hiddenItems ?? [])

  const allVisibleItems = computed<TodayItem[]>(() => [
    ...scheduledItems.value,
    ...weekItems.value,
    ...monthItems.value,
  ])

  const goalKrItems = computed<TodayMeasurementItem[]>(() =>
    allVisibleItems.value.filter(
      (item): item is TodayMeasurementItem =>
        item.kind === 'measurement' && item.panelType === 'keyResult'
    )
  )

  const habitItems = computed<TodayMeasurementItem[]>(() =>
    sortBySectionThenTitle(
      allVisibleItems.value.filter(
        (item): item is TodayMeasurementItem =>
          item.kind === 'measurement' && item.panelType === 'habit'
      )
    )
  )

  const trackerItems = computed<TodayMeasurementItem[]>(() =>
    sortBySectionThenTitle(
      allVisibleItems.value.filter(
        (item): item is TodayMeasurementItem =>
          item.kind === 'measurement' && item.panelType === 'tracker'
      )
    )
  )

  const initiativeItems = computed<TodayInitiativeItem[]>(() =>
    sortBySectionThenTitle(
      allVisibleItems.value.filter(
        (item): item is TodayInitiativeItem => item.kind === 'initiative'
      )
    )
  )

  interface GoalGroup {
    goal: { id: string; title: string }
    items: TodayMeasurementItem[]
  }

  const goalGroupedKrItems = computed<GoalGroup[]>(() => {
    const groupMap = new Map<string, GoalGroup>()

    for (const item of goalKrItems.value) {
      const goalTitle = item.goalTitle ?? ''
      const goalId = 'goalId' in item.subject ? (item.subject as { goalId: string }).goalId : ''

      let group = groupMap.get(goalId)
      if (!group) {
        group = { goal: { id: goalId, title: goalTitle }, items: [] }
        groupMap.set(goalId, group)
      }
      group.items.push(item)
    }

    const groups = [...groupMap.values()].sort((a, b) => a.goal.title.localeCompare(b.goal.title))
    for (const group of groups) {
      group.items = sortBySectionThenTitle(group.items)
    }
    return groups
  })

  function isPending(key: string): boolean {
    return pendingKeys.value.includes(key)
  }

  function setPending(key: string, pending: boolean): void {
    pendingKeys.value = pending
      ? Array.from(new Set([...pendingKeys.value, key]))
      : pendingKeys.value.filter(value => value !== key)
  }

  function shiftDay(currentDayRef: DayRef, delta: number): DayRef {
    const date = new Date(`${currentDayRef}T00:00:00`)
    date.setDate(date.getDate() + delta)
    return getPeriodRefsForDate(date).day
  }

  async function loadBundle(targetDayRef?: DayRef): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      bundle.value = targetDayRef
        ? await getTodayViewBundleForDay(targetDayRef)
        : await getTodayViewBundle()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load Today workspace'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function goToPreviousDay(): Promise<void> {
    const current = bundle.value?.dayRef
    if (!current) return
    await loadBundle(shiftDay(current, -1))
  }

  async function goToNextDay(): Promise<void> {
    const current = bundle.value?.dayRef
    if (!current) return
    await loadBundle(shiftDay(current, 1))
  }

  async function goToDay(targetDayRef: DayRef): Promise<void> {
    await loadBundle(targetDayRef)
  }

  async function reloadCurrentDay(): Promise<void> {
    if (bundle.value) {
      await loadBundle(bundle.value.dayRef)
      return
    }

    await loadBundle()
  }

  function patchMeasurementEntry(key: string, nextEntry: DailyMeasurementEntry | undefined): void {
    if (!bundle.value) {
      return
    }

    const patchItems = (items: TodayItem[]) =>
      items.map(item => {
        if (item.kind !== 'measurement' || item.key !== key) {
          return item
        }

        return {
          ...item,
          todayEntry: nextEntry,
        }
      })

    bundle.value = {
      ...bundle.value,
      sections: {
        scheduled: patchItems(bundle.value.sections.scheduled),
        week: patchItems(bundle.value.sections.week),
        month: patchItems(bundle.value.sections.month),
      },
      hiddenItems: patchItems(bundle.value.hiddenItems),
    }
  }

  function moveToHidden(item: TodayItem): void {
    if (!bundle.value) {
      return
    }

    bundle.value = {
      ...bundle.value,
      sections: {
        scheduled: withoutItem(bundle.value.sections.scheduled, item.key),
        week: withoutItem(bundle.value.sections.week, item.key),
        month: withoutItem(bundle.value.sections.month, item.key),
      },
      hiddenItems: sortItems([...bundle.value.hiddenItems, item]),
    }
  }

  function restoreFromHidden(item: TodayItem): void {
    if (!bundle.value) {
      return
    }

    const sectionId = item.sectionId as TodaySectionId
    bundle.value = {
      ...bundle.value,
      sections: {
        scheduled:
          sectionId === 'scheduled'
            ? sortItems([...bundle.value.sections.scheduled, item])
            : withoutItem(bundle.value.sections.scheduled, item.key),
        week:
          sectionId === 'week'
            ? sortItems([...bundle.value.sections.week, item])
            : withoutItem(bundle.value.sections.week, item.key),
        month:
          sectionId === 'month'
            ? sortItems([...bundle.value.sections.month, item])
            : withoutItem(bundle.value.sections.month, item.key),
      },
      hiddenItems: withoutItem(bundle.value.hiddenItems, item.key),
    }
  }

  function removeItem(item: TodayItem): void {
    if (!bundle.value) {
      return
    }

    bundle.value = {
      ...bundle.value,
      sections: {
        scheduled: withoutItem(bundle.value.sections.scheduled, item.key),
        week: withoutItem(bundle.value.sections.week, item.key),
        month: withoutItem(bundle.value.sections.month, item.key),
      },
      hiddenItems: withoutItem(bundle.value.hiddenItems, item.key),
    }
  }

  async function toggleCompletion(item: TodayMeasurementItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    patchMeasurementEntry(
      item.key,
      item.todayEntry ? undefined : createOptimisticEntry(item, bundle.value.dayRef, null)
    )

    try {
      await toggleTodayCompletion(item, bundle.value.dayRef)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function saveEntry(item: TodayMeasurementItem, value: number): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    patchMeasurementEntry(item.key, createOptimisticEntry(item, bundle.value.dayRef, value))

    try {
      await saveTodayMeasurementEntry(item, bundle.value.dayRef, value)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function clearEntry(item: TodayMeasurementItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    patchMeasurementEntry(item.key, undefined)

    try {
      await clearTodayMeasurementEntry(item, bundle.value.dayRef)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function hideItem(item: TodayItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    moveToHidden(item)

    try {
      await hideTodayItem(item, bundle.value.dayRef)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function restoreItem(item: TodayItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    restoreFromHidden(item)

    try {
      await restoreTodayItem(item, bundle.value.dayRef)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function moveScheduledItem(item: TodayItem, toDayRef: DayRef): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    removeItem(item)

    try {
      if (item.kind === 'initiative') {
        await moveTodayInitiative(item, toDayRef)
      } else {
        await moveTodayMeasurementAssignment(item, bundle.value.dayRef, toDayRef)
      }
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function clearScheduledItem(item: TodayItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    removeItem(item)

    try {
      if (item.kind === 'initiative') {
        await clearTodayInitiative(item)
      } else {
        await clearTodayMeasurementAssignment(item, bundle.value.dayRef)
      }
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  async function deleteItem(item: TodayItem): Promise<void> {
    if (!bundle.value) {
      return
    }

    setPending(item.key, true)
    removeItem(item)

    try {
      await deleteTodayItem(item)
      await reloadCurrentDay()
    } catch (err) {
      await reloadCurrentDay()
      throw err
    } finally {
      setPending(item.key, false)
    }
  }

  return {
    bundle,
    dayRef,
    scheduledItems,
    weekItems,
    monthItems,
    hiddenItems,
    allVisibleItems,
    goalKrItems,
    habitItems,
    trackerItems,
    initiativeItems,
    goalGroupedKrItems,
    isLoading,
    error,
    isPending,
    loadBundle,
    goToPreviousDay,
    goToNextDay,
    goToDay,
    toggleCompletion,
    saveEntry,
    clearEntry,
    hideItem,
    restoreItem,
    moveScheduledItem,
    clearScheduledItem,
    deleteItem,
  }
})
