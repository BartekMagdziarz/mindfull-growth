import { ref, type Ref } from 'vue'

export interface SerializedSave {
  /**
   * Request a save of the current state. Coalescing and non-overlapping: while a write
   * is in flight further requests only set a dirty flag, and the loop re-runs `write`
   * afterwards. The returned promise resolves once the latest requested state has been
   * flushed — safe to `await` before a reload.
   */
  save: () => Promise<void>
  /** True while a write is in flight. */
  isSaving: Ref<boolean>
  /** True once at least one save has completed successfully. */
  hasSaved: Ref<boolean>
}

/**
 * Serialize an async writer so calls never overlap and the last request always wins.
 *
 * `write` must read the current (external) source of truth on each call — the serializer
 * re-invokes it after any request that arrived mid-flight (dirty flag), so the final
 * persisted state matches the last request. This avoids the write-ordering race a raw
 * `void save()` on every click can hit (overlapping, out-of-order writes leaving a stale
 * final state) without a debounce timer that would need flushing on unmount.
 */
export function useSerializedSave(write: () => Promise<void>): SerializedSave {
  const isSaving = ref(false)
  const hasSaved = ref(false)
  let running: Promise<void> | null = null
  let dirty = false

  async function drain(): Promise<void> {
    isSaving.value = true
    try {
      // No `await` runs between reading `dirty` false and exiting, so a request that
      // arrives during `write()` is always observed on the next iteration — no lost write.
      while (dirty) {
        dirty = false
        await write()
      }
      hasSaved.value = true
    } finally {
      running = null
      isSaving.value = false
    }
  }

  function save(): Promise<void> {
    dirty = true
    running ??= drain()
    return running
  }

  return { save, isSaving, hasSaved }
}
