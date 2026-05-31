import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * Owns the local draft for an editable text field whose source-of-truth lives
 * elsewhere (a prop, a store, etc.) and debounces user edits before committing
 * them back. Prevents the race where an unrelated re-render of the source
 * resets the input while the user is still typing.
 *
 * The draft only syncs from `source` when the input is not focused, so an
 * external update (e.g. a store reload triggered by another action) never
 * stomps an in-flight edit. A pending edit always wins until it is committed
 * or flushed.
 *
 * Usage:
 * ```vue
 * <input ref="titleRef" v-model="title" @blur="flushTitle" />
 * ```
 *
 * ```ts
 * const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
 *   source: () => props.item.title,
 *   commit: (next) => emit('field-change', 'title', next),
 *   delay: 400,
 * })
 * ```
 */
export interface UseEditableFieldOptions<TStored, TInput = string> {
  source: () => TStored | undefined
  commit?: (value: TInput) => void
  /**
   * Debounce delay in ms before commit fires after a user edit.
   * Leave undefined for manual mode — pending edits are tracked but only
   * `flush()` commits them (useful for `@change`/`@blur` save patterns).
   */
  delay?: number
  format?: (stored: TStored | undefined) => TInput
  isEqual?: (a: TInput, b: TInput) => boolean
  /**
   * Custom focus check used by the source-sync guard. Useful when a component
   * has more than one input element that can be the active editor (e.g. an
   * inline-edit alternative). When provided, this overrides the default check
   * against `inputRef`.
   */
  isFocused?: () => boolean
}

export interface UseEditableFieldReturn<TInput = string> {
  value: Ref<TInput>
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null>
  flush: () => void
}

const defaultFormat = <TStored, TInput>(stored: TStored | undefined): TInput =>
  (stored == null ? '' : String(stored)) as unknown as TInput

export function useEditableField<TStored, TInput = string>(
  options: UseEditableFieldOptions<TStored, TInput>,
): UseEditableFieldReturn<TInput> {
  const { source, commit, delay } = options
  const format = (options.format ?? defaultFormat) as (s: TStored | undefined) => TInput
  const isEqual = options.isEqual ?? ((a: TInput, b: TInput) => a === b)

  const value = ref(format(source())) as Ref<TInput>
  const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let pendingValue: TInput | undefined
  let suppressDraftWatch = false

  watch(source, (next) => {
    const focused = options.isFocused
      ? options.isFocused()
      : typeof document !== 'undefined' &&
        inputRef.value != null &&
        document.activeElement === inputRef.value
    const hasPendingEdit = pendingValue !== undefined
    if (focused || hasPendingEdit) return

    const formatted = format(next)
    if (isEqual(value.value, formatted)) return

    suppressDraftWatch = true
    value.value = formatted
    suppressDraftWatch = false
  })

  watch(value, (next) => {
    if (suppressDraftWatch) return
    if (!commit) return

    const sourceFormatted = format(source())
    if (isEqual(next, sourceFormatted)) {
      // Reverted to source value before debounce fired — drop pending commit.
      pendingValue = undefined
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer)
        debounceTimer = undefined
      }
      return
    }

    pendingValue = next
    if (delay === undefined) return // manual mode — wait for explicit flush()

    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const valueToCommit = pendingValue
      pendingValue = undefined
      debounceTimer = undefined
      if (valueToCommit !== undefined) commit(valueToCommit)
    }, delay)
  })

  function flush(): void {
    if (debounceTimer === undefined && pendingValue === undefined) return
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    const valueToCommit = pendingValue
    pendingValue = undefined
    if (commit && valueToCommit !== undefined) commit(valueToCommit)
  }

  onScopeDispose(flush)

  return { value, inputRef, flush }
}
