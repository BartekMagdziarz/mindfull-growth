<template>
  <div :class="containerClass">
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="flex flex-col items-center gap-1"
    >
      <!-- Done dot -->
      <div
        v-if="slot.state === 'done'"
        :class="['rounded-full', dotSizeClass]"
        style="background: linear-gradient(to bottom, rgb(var(--neo-chart-primary-start)), rgb(var(--neo-chart-primary-end)))"
      />

      <!-- Missed dot -->
      <div
        v-else-if="slot.state === 'missed'"
        :class="['rounded-full', dotSizeClass]"
        style="background: rgb(var(--color-error) / 0.35)"
      />

      <!-- Future dot -->
      <div
        v-else-if="slot.state === 'future'"
        :class="['rounded-full border-2 border-dashed', dotSizeClass]"
        style="border-color: rgb(var(--color-outline) / 0.45)"
      />

      <!-- Day label — always rendered to keep vertical alignment consistent -->
      <span
        v-if="showLabels"
        :class="[labelSizeClass, 'leading-none text-on-surface-variant/60', { invisible: !slot.label }]"
      >
        {{ slot.label || '\u00A0' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayCompletionSlot } from '@/services/todayChartData'

const props = withDefaults(
  defineProps<{
    slots: TodayCompletionSlot[]
    /** 'md' (default) — 36px dots in a 3-column grid.
     *  'sm' — 16px dots in a single horizontal row (for compact reflection rows). */
    size?: 'md' | 'sm'
  }>(),
  { size: 'md' },
)

const containerClass = computed(() =>
  props.size === 'sm'
    ? 'flex w-full items-center justify-end gap-1'
    : 'grid grid-cols-3 gap-x-4 gap-y-1.5 place-items-center',
)

const dotSizeClass = computed(() => (props.size === 'sm' ? 'h-4 w-4' : 'h-9 w-9'))

const labelSizeClass = computed(() =>
  props.size === 'sm' ? 'text-[8px]' : 'text-[11px]',
)

// Labels are too tiny to be useful in compact mode — hide them to save vertical space.
const showLabels = computed(() => props.size !== 'sm')
</script>
