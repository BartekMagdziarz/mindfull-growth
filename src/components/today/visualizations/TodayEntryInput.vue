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

  <!-- Rating: counter-style display + ± buttons (integers only, clamped to scale) -->
  <div
    v-else-if="entryMode === 'rating'"
    class="flex flex-1 flex-col items-center justify-center gap-2"
  >
    <!-- Inset rating display (tappable to inline-edit) -->
    <button
      v-if="!showInlineEdit"
      type="button"
      class="neo-input flex w-20 flex-1 items-center justify-center rounded-2xl text-2xl font-bold tabular-nums text-on-surface transition-colors hover:text-primary"
      :disabled="isPending"
      @click.stop="showInlineEdit = true"
    >
      {{ currentValue ? formatValue(currentValue) : '—' }}
    </button>
    <input
      v-else
      ref="inlineInputRef"
      :value="draftValue"
      type="number"
      step="1"
      :min="ratingMin"
      :max="ratingMax"
      class="neo-input w-20 flex-1 rounded-2xl px-2 text-center text-2xl font-bold tabular-nums"
      @click.stop
      @input="draftValue = ($event.target as HTMLInputElement).value"
      @blur="submitRatingFromInput($event)"
      @keydown.enter="submitRatingFromInput($event)"
      @keydown.escape.prevent="showInlineEdit = false"
    />
    <!-- ± buttons -->
    <div class="flex w-20 gap-1.5">
      <button
        type="button"
        class="flex-1 rounded-xl bg-neu-base py-1.5 text-sm font-semibold text-on-surface shadow-neu-raised-sm transition-all neo-focus hover:-translate-y-px hover:shadow-neu-raised active:shadow-neu-pressed disabled:opacity-40 disabled:pointer-events-none"
        :disabled="isPending || currentValue < ratingMin"
        aria-label="Decrement"
        @click.stop="handleRatingDecrement"
      >
        −
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-neu-base py-1.5 text-sm font-semibold text-on-surface shadow-neu-raised-sm transition-all neo-focus hover:-translate-y-px hover:shadow-neu-raised active:shadow-neu-pressed disabled:opacity-40 disabled:pointer-events-none"
        :disabled="isPending || currentValue >= ratingMax"
        aria-label="Increment"
        @click.stop="$emit('increment')"
      >
        +
      </button>
    </div>
  </div>

  <!-- Value: prominent number input -->
  <div
    v-else-if="entryMode === 'value'"
    class="flex items-center"
  >
    <input
      ref="valueInputRef"
      :value="draftValue"
      type="number"
      :step="0.1"
      class="neo-input w-20 rounded-2xl px-2 py-6 text-center text-2xl font-semibold tabular-nums"
      placeholder="—"
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
    ratingMin?: number
    ratingMax?: number
  }>(),
  { isPending: false, ratingMin: 1, ratingMax: 10 },
)

const emit = defineEmits<{
  increment: []
  decrement: []
  'clear-entry': []
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

  if (!raw) {
    emit('clear-entry')
    if (event.type === 'keydown') {
      justSubmitted.value = true
      input.blur()
    }
    return
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return

  emit('save-value', parsed)

  // On Enter: mark as submitted and blur (blur handler will skip)
  if (event.type === 'keydown') {
    justSubmitted.value = true
    input.blur()
  }
}

function submitRatingFromInput(event: Event): void {
  if (justSubmitted.value) {
    justSubmitted.value = false
    return
  }

  const input = event.target as HTMLInputElement
  const raw = input.value.trim()

  showInlineEdit.value = false

  if (!raw) return
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed)) return

  const clamped = Math.min(props.ratingMax, Math.max(props.ratingMin, parsed))
  emit('save-value', clamped)

  if (event.type === 'keydown') {
    justSubmitted.value = true
    input.blur()
  }
}

function handleRatingDecrement(): void {
  if (props.currentValue <= props.ratingMin) {
    emit('clear-entry')
    return
  }

  emit('decrement')
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
</script>
