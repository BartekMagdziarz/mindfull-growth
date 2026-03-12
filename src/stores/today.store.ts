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
  type TodayItem,
  type TodayMeasurementItem,
  type TodaySectionId,
  type TodayViewBundle,
} from '@/services/todayViewQueries'

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

  function isPending(key: string): boolean {
    return pendingKeys.value.includes(key)
  }

  function setPending(key: string, pending: boolean): void {
    pendingKeys.value = pending
      ? Array.from(new Set([...pendingKeys.value, key]))
      : pendingKeys.value.filter(value => value !== key)
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
    isLoading,
    error,
    isPending,
    loadBundle,
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
