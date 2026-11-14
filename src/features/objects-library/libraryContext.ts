import type { MeasurementCriteriaEditor } from '@/composables/useMeasurementCriteriaEditor'
import type { Ref } from 'vue'
import type { useT } from '@/composables/useT'
import type { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'

type T = ReturnType<typeof useT>

/**
 * What every library composable shares (P-5): the store, translations, the
 * snackbar and the "just created" markers that tell a card to focus its title.
 */
export interface LibraryContext {
  criteriaEditor: MeasurementCriteriaEditor
  store: ReturnType<typeof useObjectsLibraryStore>
  t: T['t']
  locale: T['locale']
  notify: (message: string) => void
  /** The error's own message, else the translated fallback (default: generic save error). */
  notifyError: (err: unknown, fallbackKey?: string) => void
  newIds: {
    goal: Ref<string | null>
    measurement: Ref<string | null>
    intention: Ref<string | null>
    priority: Ref<string | null>
  }
}
