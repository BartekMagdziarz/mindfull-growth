<template>
  <!-- Counter: [+] button + tappable count -->
  <div
    v-if="entryMode === 'counter'"
    class="flex items-center gap-1"
  >
    <button
      type="button"
      class="neo-icon-button neo-focus text-xs"
      :disabled="isPending"
      aria-label="Increment"
      @click.stop="$emit('increment')"
    >
      +
    </button>
    <button
      type="button"
      class="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-on-surface hover:text-primary"
      :disabled="isPending"
      @click.stop="showInlineEdit = true"
    >
      {{ formatValue(currentValue) }}
    </button>
    <!-- Inline edit -->
    <input
      v-if="showInlineEdit"
      ref="inlineInputRef"
      :value="draftValue"
      type="number"
      step="1"
      class="neo-input w-14 rounded-lg px-1.5 py-0.5 text-center text-xs"
      @click.stop
      @input="draftValue = ($event.target as HTMLInputElement).value"
      @blur="submitFromInput($event)"
      @keydown.enter="submitFromInput($event)"
      @keydown.escape.prevent="showInlineEdit = false"
    />
  </div>

  <!-- Value / Rating: compact number input -->
  <div
    v-else-if="entryMode === 'value' || entryMode === 'rating'"
    class="flex items-center"
  >
    <input
      ref="valueInputRef"
      :value="draftValue"
      type="number"
      :step="entryMode === 'rating' ? 0.1 : 0.1"
      class="neo-input w-16 rounded-lg px-2 py-1.5 text-center text-xs"
      :placeholder="entryMode === 'rating' ? `1-${ratingMax}` : '—'"
      :disabled="isPending"
      @click.stop
      @input="draftValue = ($event.target as HTMLInputElement).value"
      @blur="submitFromInput($event)"
      @keydown.enter="submitFromInput($event)"
    />
  </div>

  <!-- Completion: nothing (CompletionDots handles interaction) -->
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { MeasurementEntryMode } from '@/domain/planning'

const props = withDefaults(
  defineProps<{
    entryMode: MeasurementEntryMode
    currentValue: number
    isPending?: boolean
    ratingMax?: number
  }>(),
  { isPending: false, ratingMax: 10 },
)

const emit = defineEmits<{
  increment: []
  'save-value': [value: number]
}>()

const draftValue = ref('')
const showInlineEdit = ref(false)
const inlineInputRef = ref<HTMLInputElement | null>(null)
const valueInputRef = ref<HTMLInputElement | null>(null)
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
  // Guard against double-fire: Enter blurs the input which would
  // call this again. Skip the blur if Enter already submitted.
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

  // On Enter: mark as submitted and blur (blur handler will skip)
  if (event.type === 'keydown') {
    justSubmitted.value = true
    input.blur()
  }
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
</script>
