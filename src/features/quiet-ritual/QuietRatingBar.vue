<template>
  <article class="qr-axis" :class="{ 'qr-axis--effort': effort, 'qr-axis--compact': compact }">
    <header>
      <h2>{{ label }}</h2>
      <details v-if="hint" class="qr-help">
        <summary :aria-label="`Co oznacza ${label}?`">?</summary>
        <p>{{ hint }}</p>
      </details>
    </header>
    <div class="qr-bar-body">
      <div class="qr-bar-ends" aria-hidden="true">
        <span>{{ highLabel }}</span><span>{{ lowLabel }}</span>
      </div>
      <div class="qr-bar-stack">
        <button
          type="button"
          class="qr-icon qr-bar-step"
          :aria-label="`Zwiększ: ${label}`"
          :disabled="modelValue === 5"
          @click="step(1)"
        >
          <AppIcon name="add" />
        </button>
        <div
          class="qr-scale qr-scale--vertical"
          role="group"
          :aria-label="label"
          tabindex="0"
          @keydown.up.prevent="step(1)"
          @keydown.right.prevent="step(1)"
          @keydown.down.prevent="step(-1)"
          @keydown.left.prevent="step(-1)"
        >
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            :aria-label="`${label}: ${n} z 5`"
            :aria-pressed="modelValue === n"
            :class="{ filled: (modelValue ?? 0) >= n, ghost: ghost >= n }"
            :title="ghost >= n ? `${previousLabel}: ${previous}` : `${n} z 5`"
            @click="emit('update:modelValue', modelValue === n ? null : n)"
          />
        </div>
        <button
          type="button"
          class="qr-icon qr-bar-step"
          :aria-label="`Zmniejsz: ${label}`"
          :disabled="!modelValue"
          @click="step(-1)"
        >
          <AppIcon name="remove" />
        </button>
      </div>
      <output :aria-label="`${label}: ${modelValue ?? 'bez oceny'}`">{{ modelValue ?? '—' }}</output>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    label: string
    hint?: string
    /** Effort axis — rose family, "Duży / Niewielki" ends. */
    effort?: boolean
    /** Narrow variant for the five-axis compass (five bars side by side). */
    compact?: boolean
    /** Previous period's value, drawn as a faint outline until the bar is used. */
    previous?: number | null
    previousLabel?: string
    highLabel?: string
    lowLabel?: string
  }>(),
  { effort: false, compact: false, previous: null, previousLabel: 'Poprzednio' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const highLabel = computed(() => props.highLabel ?? (props.effort ? 'Duży' : 'Bardzo dobry'))
const lowLabel = computed(() => props.lowLabel ?? (props.effort ? 'Niewielki' : 'Bardzo słaby'))
// The ghost is a trace of last time, never an answer: it disappears as soon as
// this bar carries a value.
const ghost = computed(() => (props.modelValue === null ? (props.previous ?? 0) : 0))

function step(delta: number) {
  emit('update:modelValue', Math.max(0, Math.min(5, (props.modelValue ?? 0) + delta)) || null)
}
</script>

<style scoped>
.qr-axis--compact {
  padding: 20px 14px;
  min-width: 0;
}
.qr-axis--compact header {
  justify-content: space-between;
  gap: 8px;
}
.qr-axis--compact h2 {
  font-size: 18px;
}
.qr-axis--compact .qr-bar-body {
  display: flex;
  justify-content: center;
  position: relative;
  gap: 12px;
}
.qr-axis--compact .qr-bar-body > output {
  width: 28px;
  font-size: 24px;
}
.qr-axis--compact .qr-bar-ends {
  position: absolute;
  left: 0;
  inset-block: 0;
  pointer-events: none;
  font-size: 9px;
  padding: 48px 0;
}
.qr-axis--compact .qr-bar-stack {
  margin-left: 10px;
}
.qr-axis--compact .qr-scale--vertical button {
  width: 64px;
}
</style>
