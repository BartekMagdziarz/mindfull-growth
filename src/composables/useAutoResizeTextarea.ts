import { nextTick, onMounted, watch, type Ref } from 'vue'

/**
 * Auto-resizes a textarea so its visible height always matches its content.
 *
 * Use it on textareas that should grow with the user's input instead of
 * showing a scrollbar. Works with `v-model` since we re-measure whenever the
 * bound value changes (and on the `input` event for typing).
 *
 * Usage:
 * ```vue
 * <textarea
 *   ref="taRef"
 *   v-model="text"
 *   class="resize-none overflow-hidden"
 *   @input="autoResize"
 * />
 * ```
 *
 * ```ts
 * const taRef = ref<HTMLTextAreaElement | null>(null)
 * const text = ref('')
 * const { autoResize } = useAutoResizeTextarea(taRef, () => text.value)
 * ```
 */
export function useAutoResizeTextarea(
  textareaRef: Ref<HTMLTextAreaElement | null>,
  source: () => string | undefined,
  options: { minHeightPx?: number } = {}
) {
  const minHeight = options.minHeightPx ?? 0

  function resize() {
    const el = textareaRef.value
    if (!el) return
    // Reset height first so scrollHeight reflects actual content
    el.style.height = 'auto'
    const next = Math.max(el.scrollHeight, minHeight)
    el.style.height = `${next}px`
  }

  function autoResize(event?: Event) {
    if (event && event.target instanceof HTMLTextAreaElement && event.target !== textareaRef.value) {
      // Direct event handler called from a different element — still resize the bound one
    }
    resize()
  }

  onMounted(() => {
    void nextTick(resize)
  })

  watch(source, () => {
    void nextTick(resize)
  })

  return { autoResize, resize }
}
