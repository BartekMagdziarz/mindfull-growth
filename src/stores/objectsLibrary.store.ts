import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  ObjectsLibraryBundle,
  ObjectsLibraryComposerMode,
  ObjectsLibraryDetailRecord,
  ObjectsLibraryFamily,
  ObjectsLibraryPanelType,
  ObjectsLibraryQuery,
} from '@/services/objectsLibraryQueries'
import {
  createDefaultObjectsLibraryQuery,
  loadObjectsLibraryBundle,
  parseObjectsLibraryQueryFromRoute,
  serializeObjectsLibraryQueryToRoute,
} from '@/services/objectsLibraryQueries'
import type { PeriodRef } from '@/domain/period'

export const useObjectsLibraryStore = defineStore('objectsLibrary', () => {
  const query = ref<ObjectsLibraryQuery>(createDefaultObjectsLibraryQuery())
  const bundle = ref<ObjectsLibraryBundle | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const items = computed(() => bundle.value?.items ?? [])
  const filterOptions = computed(
    () => bundle.value?.filterOptions ?? { lifeAreas: [], priorities: [], goals: [] },
  )
  const expandedItem = computed<ObjectsLibraryDetailRecord | undefined>(
    () => bundle.value?.expandedItem,
  )
  const composerItem = computed<ObjectsLibraryDetailRecord | undefined>(
    () => bundle.value?.composerItem,
  )
  const hasActiveFilters = computed(
    () =>
      Boolean(query.value.q.trim()) ||
      Boolean(query.value.period) ||
      query.value.lifeAreaIds.length > 0 ||
      query.value.priorityIds.length > 0 ||
      query.value.showClosed,
  )

  function hydrateFromRoute(
    familyParam: string | string[] | undefined,
    routeQuery: Record<string, unknown>,
  ): void {
    query.value = parseObjectsLibraryQueryFromRoute(familyParam, routeQuery)
  }

  function serializeForRoute(): Record<string, string> {
    return serializeObjectsLibraryQueryToRoute(query.value)
  }

  async function loadBundle(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      bundle.value = await loadObjectsLibraryBundle(query.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load library bundle'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function setFamily(family: ObjectsLibraryFamily): void {
    query.value = {
      family,
      q: '',
      period: query.value.period,
      lifeAreaIds: [...query.value.lifeAreaIds],
      priorityIds: [...query.value.priorityIds],
      showClosed: query.value.showClosed,
      composerMode: undefined,
      composerType: undefined,
      composerId: undefined,
      composerParentType: undefined,
      composerParentId: undefined,
      expandedType: undefined,
      expandedId: undefined,
    }
  }

  function setSearch(value: string): void {
    query.value = { ...query.value, q: value }
  }

  function setPeriod(period?: PeriodRef): void {
    query.value = { ...query.value, period }
  }

  function toggleLifeArea(lifeAreaId: string): void {
    query.value = {
      ...query.value,
      lifeAreaIds: toggleInList(query.value.lifeAreaIds, lifeAreaId),
    }
  }

  function togglePriority(priorityId: string): void {
    query.value = {
      ...query.value,
      priorityIds: toggleInList(query.value.priorityIds, priorityId),
    }
  }

  function setShowClosed(showClosed: boolean): void {
    query.value = { ...query.value, showClosed }
  }

  function clearFilters(): void {
    query.value = {
      ...query.value,
      q: '',
      period: undefined,
      lifeAreaIds: [],
      priorityIds: [],
      showClosed: false,
    }
  }

  function openComposer(
    composerMode: ObjectsLibraryComposerMode,
    composerType: ObjectsLibraryPanelType,
    composerId?: string,
    parentContext?: { composerParentType?: 'goal'; composerParentId?: string },
  ): void {
    query.value = {
      ...query.value,
      composerMode,
      composerType,
      composerId,
      composerParentType: parentContext?.composerParentType,
      composerParentId: parentContext?.composerParentId,
    }
  }

  function closeComposer(): void {
    query.value = {
      ...query.value,
      composerMode: undefined,
      composerType: undefined,
      composerId: undefined,
      composerParentType: undefined,
      composerParentId: undefined,
    }
  }

  function expandItem(panelType: ObjectsLibraryPanelType, id: string): void {
    query.value = {
      ...query.value,
      expandedType: panelType,
      expandedId: id,
    }
  }

  function collapseItem(): void {
    query.value = {
      ...query.value,
      expandedType: undefined,
      expandedId: undefined,
    }
  }

  return {
    query,
    bundle,
    items,
    expandedItem,
    composerItem,
    filterOptions,
    isLoading,
    error,
    hasActiveFilters,
    hydrateFromRoute,
    serializeForRoute,
    loadBundle,
    setFamily,
    setSearch,
    setPeriod,
    toggleLifeArea,
    togglePriority,
    setShowClosed,
    clearFilters,
    openComposer,
    closeComposer,
    expandItem,
    collapseItem,
  }
})

function toggleInList(values: string[], nextValue: string): string[] {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
}
