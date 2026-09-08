<template>
  <span class="eds" :class="{ 'eds--empty': !emotions.length }" role="img" :aria-label="label" :title="label">
    <i
      v-for="segment in segments"
      :key="segment.quadrant"
      :style="{
        height: `${segment.height}px`,
        background: `var(--color-quadrant-${segment.quadrant})`,
        borderColor: `var(--color-quadrant-${segment.quadrant}-border)`,
      }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Quadrant } from '@/domain/emotion'
import { QUADRANTS_IN_ORDER } from '@/domain/emotion'

/**
 * One day (or week) of emotion logs as a small stacked column: a segment per
 * emotion-wheel quadrant in a fixed order, height ∝ number of logs, so five
 * logs read taller than one and four quadrants read as four bands.
 */
const props = withDefaults(
  defineProps<{
    emotions: Array<{ name: string; quadrant: Quadrant }>
    slotLabel?: string
    maxHeight?: number
  }>(),
  { slotLabel: '', maxHeight: 36 },
)

const QUADRANT_LABEL: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'Energia · przyjemne',
  'high-energy-low-pleasantness': 'Energia · nieprzyjemne',
  'low-energy-high-pleasantness': 'Spokój · przyjemne',
  'low-energy-low-pleasantness': 'Spokój · nieprzyjemne',
}

const counts = computed(() => {
  const map = new Map<Quadrant, number>()
  for (const emotion of props.emotions) map.set(emotion.quadrant, (map.get(emotion.quadrant) ?? 0) + 1)
  return map
})

const segments = computed(() => {
  const total = props.emotions.length
  if (!total) return []
  const unit = Math.min(7, props.maxHeight / total)
  return QUADRANTS_IN_ORDER.filter(quadrant => counts.value.has(quadrant)).map(quadrant => ({
    quadrant,
    height: Math.max(3, (counts.value.get(quadrant) ?? 0) * unit),
  }))
})

const label = computed(() => {
  const prefix = props.slotLabel ? `${props.slotLabel}: ` : ''
  if (!props.emotions.length) return `${prefix}bez zapisu emocji`
  const parts = QUADRANTS_IN_ORDER.filter(quadrant => counts.value.has(quadrant)).map(
    quadrant => `${QUADRANT_LABEL[quadrant]} ${counts.value.get(quadrant)}`,
  )
  return `${prefix}${props.emotions.map(emotion => emotion.name).join(', ')} (${parts.join(' · ')})`
})
</script>

<style scoped>
.eds {
  display: inline-flex;
  flex-direction: column-reverse;
  justify-content: start;
  gap: 1px;
  width: 16px;
  height: v-bind('`${maxHeight}px`');
}
.eds i {
  display: block;
  width: 100%;
  border-radius: 3px 4px 2px 3px;
  border: 1px solid var(--qr-line-soft);
  box-sizing: border-box;
  transform: rotate(-1deg);
}
.eds i:first-child {
  border-radius: 3px 4px 5px 4px;
}
.eds i:nth-child(2n) {
  transform: rotate(1deg);
}
.eds i:last-child {
  border-radius: 5px 4px 2px 3px;
}
.eds--empty::before {
  content: '';
  display: block;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: var(--qr-line-soft);
}
</style>
