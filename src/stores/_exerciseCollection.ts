import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { createStoreSessionScope } from '@/services/userSessionScope'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import type { DexieCrudRepository, TimestampedRecord } from '@/repositories/_crud'
import { reportError } from '@/utils/reportError'

/**
 * The shared anatomy of an exercise store: a list of records, loading and
 * error flags, newest-first ordering, and load/create/update/remove that are
 * bound to the current account through the store session scope.
 *
 * A store built on it keeps its historical public names by aliasing:
 *
 *   const records = useExerciseCollection({ repository, label, scope, completionSlug })
 *   return { records: records.items, loadRecords: records.loadAll, … }
 *
 * Creating a record also records an exercise completion under `completionSlug`
 * (skipped for registries such as IFS parts, which are not exercises).
 */

export interface ExerciseCollectionOptions<
  T extends TimestampedRecord,
  CreatePayload,
  UpdatePayload,
> {
  repository: DexieCrudRepository<T, CreatePayload, UpdatePayload>
  /** Singular label for the fallback messages, e.g. "thought record". */
  label: string
  /** Plural label; `${label}s` unless the English plural is irregular. */
  labelPlural?: string
  /** `reportError` scope prefix, e.g. "thoughtRecordStore". */
  scope: string
  /** Exercise slug recorded as a completion on create; omit when creating is not an exercise. */
  completionSlug?: string
  /** Runs inside `create` before the repository call; a throw is stored in `error` and rethrown. */
  validateCreate?: (data: CreatePayload) => void
  /** Runs inside `update` before the repository call, with the record as currently loaded. */
  validateUpdate?: (existing: T | undefined, data: UpdatePayload) => void
}

export interface ExerciseCollection<T extends TimestampedRecord, CreatePayload, UpdatePayload> {
  items: Ref<T[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  /** Newest first by `createdAt`. */
  sorted: ComputedRef<T[]>
  latest: ComputedRef<T | null>
  getById: ComputedRef<(id: string) => T | undefined>
  loadAll(): Promise<void>
  create(data: CreatePayload): Promise<T>
  update(id: string, data: UpdatePayload): Promise<T>
  remove(id: string): Promise<void>
  /** Records a completion for `completionSlug`; a no-op without one. Errors are reported, never thrown. */
  recordCompletion(recordId: string): void
  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next load re-fetches from the new database.
   */
  reset(): void
}

export function useExerciseCollection<T extends TimestampedRecord, CreatePayload, UpdatePayload>(
  options: ExerciseCollectionOptions<T, CreatePayload, UpdatePayload>
): ExerciseCollection<T, CreatePayload, UpdatePayload> {
  const { repository, label, scope, completionSlug, validateCreate, validateUpdate } = options
  const plural = options.labelPlural ?? `${label}s`
  const sessionScope = createStoreSessionScope()
  const items = ref<T[]>([]) as Ref<T[]>
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sorted = computed(() =>
    [...items.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )
  const latest = computed(() => sorted.value[0] ?? null)
  const getById = computed(() => (id: string) => items.value.find(item => item.id === id))

  const describe = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback

  function recordCompletion(recordId: string): void {
    if (!completionSlug) return
    void useExerciseCompletionsStore()
      .record(completionSlug, recordId)
      .catch(err => reportError(`${scope}.recordCompletion`, err))
  }

  async function loadAll(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        items.value = await operation.wait(repository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = describe(err, `Failed to load ${plural}`)
        reportError(`${scope}.loadAll`, err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (err) {
      if (operation.isCurrent()) throw err
    }
  }

  async function create(data: CreatePayload): Promise<T> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      validateCreate?.(data)
      const created = await operation.wait(repository.create(data))
      recordCompletion(created.id)
      items.value.push(created)
      return created
    } catch (err) {
      operation.assertCurrent()
      error.value = describe(err, `Failed to create ${label}`)
      reportError(`${scope}.create`, err)
      throw err
    }
  }

  async function update(id: string, data: UpdatePayload): Promise<T> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      validateUpdate?.(getById.value(id), data)
      const updated = await operation.wait(repository.update(id, data))
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = describe(err, `Failed to update ${label}`)
      reportError(`${scope}.update`, err)
      throw err
    }
  }

  async function remove(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(repository.delete(id))
        items.value = items.value.filter(item => item.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = describe(err, `Failed to delete ${label}`)
        reportError(`${scope}.remove`, err)
        throw err
      }
    } catch (err) {
      if (operation.isCurrent()) throw err
    }
  }

  function reset(): void {
    sessionScope.reset()
    items.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    items,
    isLoading,
    error,
    sorted,
    latest,
    getById,
    loadAll,
    create,
    update,
    remove,
    recordCompletion,
    reset,
  }
}
