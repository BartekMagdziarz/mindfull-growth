import type { Ref } from 'vue'

/**
 * Helper for the dominant Pinia store shape: a single data array, an
 * `isLoading` boolean, and an `error` string-or-null. Resets all three to
 * their initial state in one call.
 *
 * Used by `reset()` actions in stores so that on user logout/login (handled
 * by the watcher in `AppShell.vue` via `appStateReset`), all in-memory data
 * from the previous user is wiped before the components re-fetch from the
 * newly-connected per-user Dexie database.
 *
 * Stores with a non-standard shape (multiple arrays, additional flags like
 * `isSaving`, or non-array state) write their own bespoke `reset()` rather
 * than calling this helper.
 */
export function resetStandardCollectionStore<T>(state: {
  data: Ref<T[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}): void {
  state.data.value = []
  state.isLoading.value = false
  state.error.value = null
}
