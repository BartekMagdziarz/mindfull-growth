<template>
  <div class="cd-container" :style="containerStyle">
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="cd-slot flex flex-col"
    >
      <div :class="dotClasses(slot)" :style="dotStyle(slot)" />
      <span
        v-if="showLabels"
        :class="['cd-label', { invisible: !slot.label }]"
        :style="labelStyle"
      >
        {{ slot.label || ' ' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { TodayCompletionSlot } from '@/services/todayChartData'

const props = withDefaults(
  defineProps<{
    slots: TodayCompletionSlot[]
    /** 'md' (default) — full sized layout for the Today overview tiles.
     *  'sm' — compact horizontal row for reflection rows. */
    size?: 'md' | 'sm'
  }>(),
  { size: 'md' },
)

const count = computed(() => props.slots.length)

/**
 * Single-row layout that shrinks dot diameter (and gap) as count grows so 1-7
 * dots all fit inside the overview tile without horizontal clipping. With 8+
 * dots the labels are dropped to free vertical room — they'd be unreadable at
 * that scale anyway.
 */
const dotSizePx = computed(() => {
  if (props.size === 'sm') return 16
  switch (count.value) {
    case 0:
    case 1:
    case 2:
    case 3:
      return 36
    case 4:
      return 32
    case 5:
      return 28
    case 6:
      return 24
    case 7:
      return 22
    default:
      return 18
  }
})

const dotGapPx = computed(() => {
  if (props.size === 'sm') return 4
  switch (count.value) {
    case 0:
    case 1:
    case 2:
    case 3:
      return 8
    case 4:
      return 6
    case 5:
      return 6
    case 6:
      return 5
    case 7:
      return 4
    default:
      return 2
  }
})

const showLabels = computed(() => props.size !== 'sm' && count.value <= 7)

const containerStyle = computed<CSSProperties>(() => ({
  gap: `${dotGapPx.value}px`,
}))

function dotClasses(slot: TodayCompletionSlot): string[] {
  const base = ['cd-dot', 'rounded-full']
  if (slot.state === 'today-pending') base.push('border-2')
  if (slot.state === 'future') base.push('border-2', 'border-dashed')
  return base
}

function dotStyle(slot: TodayCompletionSlot): CSSProperties {
  const size = `${dotSizePx.value}px`
  const base: CSSProperties = { width: size, height: size }

  switch (slot.state) {
    case 'done':
      return {
        ...base,
        background:
          'linear-gradient(to bottom, rgb(var(--sky-300)), rgb(var(--sky-500)))',
      }
    case 'today-done':
      return {
        ...base,
        background:
          'linear-gradient(to bottom, rgb(var(--sky-300)), rgb(var(--sky-500)))',
        boxShadow: `0 0 0 ${dotSizePx.value <= 22 ? 1.5 : 2}px rgb(var(--sky-500) / 0.35)`,
      }
    case 'today-pending':
      return {
        ...base,
        borderColor: 'rgb(var(--sky-500) / 0.55)',
      }
    case 'missed':
      return {
        ...base,
        background: 'rgb(var(--color-error) / 0.35)',
      }
    case 'future':
      return {
        ...base,
        borderColor: 'rgb(var(--color-outline) / 0.45)',
      }
  }
}

const labelStyle = computed<CSSProperties>(() => ({
  fontSize: props.size === 'sm' ? '8px' : '11px',
  color: 'rgb(var(--neo-muted) / 0.7)',
  fontWeight: 500,
  letterSpacing: '0.02em',
}))
</script>

<style scoped>
.cd-container {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: nowrap;
}

.cd-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}

.cd-dot {
  box-sizing: border-box;
  flex: 0 0 auto;
}

.cd-label {
  display: inline-block;
  line-height: 1;
  white-space: nowrap;
  font-weight: 500;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
</style>
