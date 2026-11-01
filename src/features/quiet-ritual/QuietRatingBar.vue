<template>
  <article
    class="qr-axis"
    :class="{
      'qr-axis--row': layout === 'row',
      'qr-axis--effort': effort,
      'qr-axis--compact': compact,
      'qr-axis--load': tone === 'load',
      'qr-axis--paired': !!fillColor,
    }"
    :style="fillColor ? { '--qr-fill': fillColor } : undefined"
  >
    <header>
      <h2>{{ label }}</h2>
      <details v-if="hint" class="qr-help">
        <summary :aria-label="`Co oznacza ${label}?`">?</summary>
        <p>{{ hint }}</p>
      </details>
    </header>
    <!-- Symmetric column: value above, drawn bar centred, −/+ side by side below. -->
    <div v-if="layout === 'row'" class="qr-row-body">
      <div
        class="qr-scale qr-scale--row"
        role="group"
        :aria-label="label"
        @keydown.left.prevent="step(-1)"
        @keydown.right.prevent="step(1)"
        @keydown.delete.prevent="emit('update:modelValue', null)"
        @keydown.backspace.prevent="emit('update:modelValue', null)"
      >
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          :aria-label="`${label}: ${n} z 5`"
          :aria-pressed="modelValue === n"
          :class="{ filled: modelValue === n, ghost: modelValue == null && previous === n }"
          :title="
            modelValue == null && previous === n ? `${previousLabel}: ${previous}` : `${n} z 5`
          "
          @click="emit('update:modelValue', modelValue === n ? null : n)"
        >
          {{ n }}
        </button>
      </div>
      <div class="qr-row-ends" aria-hidden="true">
        <span>{{ lowLabel }}</span
        ><span>{{ highLabel }}</span>
      </div>
    </div>
    <!-- Column: the app's one rating stack (DsRatingStack), quiet inside a ritual card. -->
    <DsRatingStack
      v-else
      class="qr-bar-body"
      quiet
      :model-value="modelValue"
      :label="label"
      :high-label="highLabel"
      :low-label="lowLabel"
      :ghost="previous"
      :ghost-label="previousLabel"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <!-- Optional foot (e.g. the axis' tags) stays inside the same card. -->
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DsRatingStack } from '@/design-system/components'

const props = withDefaults(
  defineProps<{
    layout?: 'column' | 'row'
    modelValue: number | null
    label: string
    hint?: string
    /** Effort axis — rose family, "Duży / Niewielki" ends (legacy actions column). */
    effort?: boolean
    /** Load axis — ink fills (sky-800), the "pencil" of the load/state pair. */
    tone?: 'default' | 'load'
    /** Custom fill for the filled steps, e.g. the load/state quadrant colour. */
    fillColor?: string | null
    /** Narrow variant for the five-axis compass (five bars side by side). */
    compact?: boolean
    /** Previous period's value, drawn as a faint outline until the bar is used. */
    previous?: number | null
    previousLabel?: string
    highLabel?: string
    lowLabel?: string
  }>(),
  {
    layout: 'column',
    effort: false,
    compact: false,
    tone: 'default',
    fillColor: null,
    previous: null,
    previousLabel: 'Poprzednio',
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const highLabel = computed(() => props.highLabel ?? (props.effort ? 'Duży' : 'Bardzo dobry'))
const lowLabel = computed(() => props.lowLabel ?? (props.effort ? 'Niewielki' : 'Bardzo słaby'))
function step(delta: number) {
  emit('update:modelValue', Math.max(0, Math.min(5, (props.modelValue ?? 0) + delta)) || null)
}
</script>

<style scoped>
.qr-axis--compact {
  padding: 20px 14px 16px;
  min-width: 0;
}
.qr-axis--compact header {
  justify-content: space-between;
  gap: 8px;
}
.qr-axis--compact h2 {
  font-size: 18px;
}
/* Five bars side by side: narrower clouds and a smaller value. */
.qr-axis--compact .qr-bar-body {
  --ds-rating-bar-width: 64px;
  --mg-font-size-rating: var(--mg-font-size-xl);
}
/* Narrow card: the scale ends wrap to two lines and stay inside the card. */
.qr-axis--compact :deep(.ds-rating__ends) {
  right: calc(100% + 6px);
  width: 46px;
  padding: 4px 0;
  font-size: 9px;
  line-height: 1.15;
  white-space: normal;
}
</style>
