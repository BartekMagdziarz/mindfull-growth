<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-2">
    <!-- Inset counter display (tappable to inline-edit) -->
    <button
      v-if="!showInlineEdit"
      type="button"
      class="neo-input flex w-20 flex-1 items-center justify-center rounded-2xl text-2xl font-bold tabular-nums text-on-surface transition-colors hover:text-primary"
      :disabled="isPending"
      @click.stop="showInlineEdit = true"
    >
      {{ formatValue(currentValue) }}
    </button>
    <input
      v-else
      ref="inlineInputRef"
      :value="draftValue"
      type="number"
      step="1"
      class="neo-input w-20 flex-1 rounded-2xl px-2 text-center text-2xl font-bold tabular-nums"
      @click.stop
      @input="draftValue = ($event.target as HTMLInputElement).value"
      @blur="submitFromInput($event)"
      @keydown.enter="submitFromInput($event)"
      @keydown.escape.prevent="showInlineEdit = false"
    />
    <!-- ± buttons -->
    <div class="flex w-20 gap-1.5">
      <button
        type="button"
        class="flex-1 rounded-xl bg-neu-base py-1.5 text-sm font-semibold text-on-surface shadow-neu-raised-sm transition-all neo-focus hover:-translate-y-px hover:shadow-neu-raised active:shadow-neu-pressed disabled:opacity-40 disabled:pointer-events-none"
        :disabled="isPending || currentValue <= 0"
        aria-label="Decrement"
        @click.stop="emit('decrement')"
      >
        −
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-neu-base py-1.5 text-sm font-semibold text-on-surface shadow-neu-raised-sm transition-all neo-focus hover:-translate-y-px hover:shadow-neu-raised active:shadow-neu-pressed disabled:opacity-40 disabled:pointer-events-none"
        :disabled="isPending"
        aria-label="Increment"
        @click.stop="emit('increment')"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    currentValue: number
    isPending?: boolean
  }>(),
  { isPending: false },
)

const emit = defineEmits<{
  increment: []
  decrement: []
  'save-value': [value: number]
}>()

const draftValue = ref('')
const showInlineEdit = ref(false)
const inlineInputRef = ref<HTMLInputElement | null>(null)
const justSubmitted = ref(false)

watch(
  () => props.currentValue,
  (value) => {
    draftValue.value = value ? formatValue(value) : ''
  },
  { immediate: true },
)

watch(showInlineEdit, async (show) => {
  if (show) {
    draftValue.value = formatValue(props.currentValue)
    await nextTick()
    inlineInputRef.value?.focus()
    inlineInputRef.value?.select()
  }
})

function submitFromInput(event: Event): void {
  if (justSubmitted.value) {
    justSubmitted.value = false
    return
  }

  const input = event.target as HTMLInputElement
  const raw = input.value.trim()

  showInlineEdit.value = false

  if (!raw) return
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return

  emit('save-value', parsed)

  if (event.type === 'keydown') {
    justSubmitted.value = true
    input.blur()
  }
}

function formatValue(value: number): string {
  return String(value || 0)
}
</script>
