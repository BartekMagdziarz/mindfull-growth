import { onBeforeUnmount } from 'vue'
import type { Router } from 'vue-router'
import type { PeriodRef } from '@/domain/period'
import type { ObjectsLibraryFamily } from '@/services/objectsLibraryQueries'
import type { LibraryContext } from './libraryContext'

/** Filters live in the URL: every change writes the query back (search debounced). */
export function useLibraryRoute(ctx: Pick<LibraryContext, 'store'>, router: Router) {
  const { store } = ctx
  let searchSyncTimeout: ReturnType<typeof setTimeout> | null = null

  onBeforeUnmount(() => {
    if (searchSyncTimeout) {
      clearTimeout(searchSyncTimeout)
      searchSyncTimeout = null
    }
  })

  async function syncRoute(): Promise<void> {
    await router.replace({
      name: 'objects-family',
      params: { family: store.query.family },
      query: store.serializeForRoute(),
    })
  }

  function scheduleSearchSync(): void {
    if (searchSyncTimeout) {
      clearTimeout(searchSyncTimeout)
    }
    searchSyncTimeout = setTimeout(() => {
      void syncRoute()
    }, 220)
  }

  function handleFamilyChange(family: ObjectsLibraryFamily): void {
    store.setFamily(family)
    void syncRoute()
  }

  function handleSearch(value: string): void {
    store.setSearch(value)
    scheduleSearchSync()
  }

  function handlePeriodChange(period: PeriodRef | undefined): void {
    store.setPeriod(period)
    void syncRoute()
  }

  function handleLifeAreaToggle(id: string): void {
    store.toggleLifeArea(id)
    void syncRoute()
  }

  function handlePriorityToggle(id: string): void {
    store.togglePriority(id)
    void syncRoute()
  }

  function handleClosedToggle(): void {
    store.setShowClosed(!store.query.showClosed)
    void syncRoute()
  }

  function handleClearFilters(): void {
    store.clearFilters()
    void syncRoute()
  }

  return {
    syncRoute,
    handleFamilyChange,
    handleSearch,
    handlePeriodChange,
    handleLifeAreaToggle,
    handlePriorityToggle,
    handleClosedToggle,
    handleClearFilters,
  }
}
