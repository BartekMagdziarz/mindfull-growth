<template>
  <div class="grid grid-cols-3 gap-x-4 gap-y-1.5 place-items-center">
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="flex flex-col items-center gap-1"
    >
      <!-- Done dot -->
      <div
        v-if="slot.state === 'done'"
        class="h-9 w-9 rounded-full"
        style="background: linear-gradient(to bottom, rgb(var(--neo-chart-primary-start)), rgb(var(--neo-chart-primary-end)))"
      />

      <!-- Missed dot -->
      <div
        v-else-if="slot.state === 'missed'"
        class="h-9 w-9 rounded-full"
        style="background: rgb(var(--color-error) / 0.35)"
      />

      <!-- Future dot -->
      <div
        v-else-if="slot.state === 'future'"
        class="h-9 w-9 rounded-full border-2 border-dashed"
        style="border-color: rgb(var(--color-outline) / 0.45)"
      />

      <!-- Day label — always rendered to keep vertical alignment consistent -->
      <span
        class="text-[11px] leading-none text-on-surface-variant/60"
        :class="{ invisible: !slot.label }"
      >
        {{ slot.label || '\u00A0' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TodayCompletionSlot } from '@/services/todayChartData'

defineProps<{
  slots: TodayCompletionSlot[]
}>()
</script>
