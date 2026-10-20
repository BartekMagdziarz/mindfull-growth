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
    <div v-else class="qr-bar-body">
      <output
        :aria-label="`${label}: ${modelValue ?? 'bez oceny'}`"
        :class="{ 'qr-bar-value--empty': modelValue == null }"
      >
        {{ modelValue ?? '' }}
      </output>
      <div class="qr-bar-stack">
        <div class="qr-bar-ends" aria-hidden="true">
          <span>{{ highLabel }}</span
          ><span>{{ lowLabel }}</span>
        </div>
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
      </div>
      <div class="qr-bar-steps">
        <button
          type="button"
          class="qr-icon qr-bar-step"
          :aria-label="`Zmniejsz: ${label}`"
          :disabled="!modelValue"
          @click="step(-1)"
        >
          <AppIcon name="remove" />
        </button>
        <button
          type="button"
          class="qr-icon qr-bar-step"
          :aria-label="`Zwiększ: ${label}`"
          :disabled="modelValue === 5"
          @click="step(1)"
        >
          <AppIcon name="add" />
        </button>
      </div>
    </div>
    <!-- Optional foot (e.g. the axis' tags) stays inside the same card. -->
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

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
// The ghost is a trace of last time, never an answer: it disappears as soon as
// this bar carries a value.
const ghost = computed(() => (props.modelValue === null ? (props.previous ?? 0) : 0))

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
.qr-axis--compact .qr-bar-body > output {
  min-height: 32px;
  font-size: 24px;
}
/* Narrow card: the scale ends wrap to two lines and stay inside the card. */
.qr-axis--compact .qr-bar-ends {
  right: calc(100% + 6px);
  width: 46px;
  padding: 4px 0;
  font-size: 9px;
  line-height: 1.15;
  white-space: normal;
}
.qr-axis--compact .qr-scale--vertical button {
  width: 64px;
}
</style>
