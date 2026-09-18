<template>
  <span
    class="eds"
    :class="{ 'eds--empty': !emotions.length }"
    role="img"
    :aria-label="label"
    :title="label"
  >
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
import { quadrantLabel, ritualQuadrants, type RitualQuadrant } from '~lab/lab/quietRitual'
// One day of emotion logs as a small stacked column: a segment per emotion-wheel quadrant
// (fixed order), segment height ∝ number of logs in that quadrant, so a day with four
// quadrants reads as four bands and a day with five logs reads taller than one with one.
const props = withDefaults(
  defineProps<{
    emotions: Array<{ name: string; quadrant: RitualQuadrant }>
    dayLabel?: string
    maxHeight?: number
  }>(),
  { dayLabel: '', maxHeight: 36 }
)
const counts = computed(() => {
  const map = new Map<RitualQuadrant, number>()
  for (const emotion of props.emotions) map.set(emotion.quadrant, (map.get(emotion.quadrant) ?? 0) + 1)
  return map
})
const segments = computed(() => {
  const total = props.emotions.length
  if (!total) return []
  const unit = Math.min(7, props.maxHeight / total)
  return ritualQuadrants
    .filter(quadrant => counts.value.has(quadrant))
    .map(quadrant => ({ quadrant, height: Math.max(3, counts.value.get(quadrant)! * unit) }))
})
const label = computed(() => {
  const prefix = props.dayLabel ? `${props.dayLabel}: ` : ''
  if (!props.emotions.length) return `${prefix}bez zapisu emocji`
  const parts = ritualQuadrants
    .filter(quadrant => counts.value.has(quadrant))
    .map(quadrant => `${quadrantLabel[quadrant]} ${counts.value.get(quadrant)}`)
  return `${prefix}${props.emotions.map(e => e.name).join(', ')} (${parts.join(' · ')})`
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
  border: 1px solid rgb(var(--sky-800) / 0.1);
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
  background: rgb(var(--sky-400) / 0.35);
}
</style>
