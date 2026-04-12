<template>
  <div class="flex flex-col items-center justify-center gap-1">
    <!-- Count display — tappable to open inline edit -->
    <button
      v-if="!showInlineEdit"
      type="button"
      class="text-sm font-bold tabular-nums text-on-surface transition-colors hover:text-primary"
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
      class="neo-input w-14 rounded-lg px-1.5 py-0.5 text-center text-sm font-bold tabular-nums"
      @click.stop
      @input="draftValue = ($event.target as HTMLInputElement).value"
      @blur="submitFromInput($event)"
      @keydown.enter="submitFromInput($event)"
      @keydown.escape.prevent="showInlineEdit = false"
    />
    <!-- Increment button -->
    <button
      type="button"
      class="neo-icon-button neo-focus text-xs"
      :disabled="isPending"
      aria-label="Increment"
      @click.stop="emit('increment')"
    >
      +
    </button>
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

  if (event.type === 'keydown') {
    justSubmitted.value = true
    input.blur()
  }
}

function formatValue(value: number): string {
  return String(value || 0)
}
</script>
