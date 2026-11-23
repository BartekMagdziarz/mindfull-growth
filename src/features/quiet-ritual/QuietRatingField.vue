<template>
  <article class="qr-field" @pointerenter="setAwake(true)" @pointerleave="setAwake(false)">
    <header class="qr-field__label">
      <slot name="glyph" />
      <h2>{{ title }}</h2>
      <details v-if="hint" class="qr-help">
        <summary :aria-label="`Co oznacza ${title}?`">?</summary>
        <p>{{ hint }}</p>
      </details>
    </header>
    <QuietRatingCounter
      :model-value="modelValue"
      :label="label || title"
      :low-label="lowLabel"
      :high-label="highLabel"
      :previous="previous"
      :previous-label="previousLabel"
      :awake="awake"
      @update:model-value="emit('update:modelValue', $event)"
      @preview="emit('preview', $event)"
    />
    <QuietTagDock
      :model-value="tags"
      :pool="pool"
      :label="label || title"
      :awake="awake"
      @update:model-value="emit('update:tags', $event)"
    />
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QuietRatingCounter from './QuietRatingCounter.vue'
import QuietTagDock from './QuietTagDock.vue'

/**
 * One rating with its tags inside a quiet ritual (decision 2026-11-22): a mist
 * field with the title on top („?” holds the question), a big digit counter
 * under it and the tags at the bottom. Hosts: the load and state fields of an
 * area step in the weekly reflection, the five compass axes of the monthly
 * one.
 *
 * The field stays mist under the cursor — its chips are paper and would vanish
 * on a paper field; hovering wakes the counter's arrows and the tag buttons
 * instead (`awake` goes up, so a host can react too).
 */
withDefaults(
  defineProps<{
    title: string
    /** The question behind the title, shown under „?”. */
    hint?: string
    /** Accessible name of the counter and the tags; the title when omitted. */
    label?: string
    modelValue: number | null
    lowLabel?: string
    highLabel?: string
    /** The same rating one period earlier — a quiet caption under the digit. */
    previous?: number | null
    previousLabel?: string
    tags: string[]
    /** Earlier tags, most relevant first. */
    pool?: string[]
  }>(),
  {
    hint: '',
    label: '',
    lowLabel: '',
    highLabel: '',
    previous: null,
    previousLabel: 'Poprzednio',
    pool: () => [],
  }
)
const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'update:tags': [tags: string[]]
  /** The rating an arrow under the cursor is about to set. */
  preview: [value: number | null]
  awake: [on: boolean]
}>()

const awake = ref(false)
function setAwake(on: boolean) {
  awake.value = on
  emit('awake', on)
}
</script>

<style scoped>
.qr-field {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 16px 20px;
  border-radius: var(--mg-radius-lg);
  background: var(--mg-color-mist);
  box-shadow: var(--mg-shadow-nested);
}
.qr-field__label {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  min-width: 0;
}
.qr-field__label h2 {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
  line-height: 1.2;
  white-space: nowrap;
}
.qr-field__label .qr-help {
  opacity: 0.7;
}
.qr-field__label .qr-help[open],
.qr-field:hover .qr-help {
  opacity: 1;
}
.qr-field__label .qr-help > p {
  right: auto;
  left: 0;
}
</style>
