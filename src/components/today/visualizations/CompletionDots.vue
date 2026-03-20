<template>
  <div class="flex flex-wrap gap-x-3.5 gap-y-1">
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="flex flex-col items-center gap-1"
    >
      <!-- Done dot -->
      <div
        v-if="slot.state === 'done'"
        class="h-6 w-6 rounded-full"
        :style="{ background: `linear-gradient(to bottom, rgb(var(${colors.start})), rgb(var(${colors.end})))` }"
      />

      <!-- Missed dot -->
      <div
        v-else-if="slot.state === 'missed'"
        class="h-6 w-6 rounded-full border-2"
        style="border-color: rgb(var(--color-error) / 0.45)"
      />

      <!-- Future dot -->
      <div
        v-else-if="slot.state === 'future'"
        class="h-6 w-6 rounded-full border-2 border-dashed"
        style="border-color: rgb(var(--color-outline) / 0.45)"
      />

      <!-- Today pending: interactive -->
      <button
        v-else-if="slot.state === 'today-pending'"
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors hover:opacity-80"
        :style="{ borderColor: `rgb(var(${colors.end}) / 0.5)` }"
        :disabled="isPending"
        aria-label="Record today"
        @click.stop="$emit('toggle')"
      >
        <svg viewBox="0 0 12 12" class="h-4 w-4" aria-hidden="true">
          <path
            d="M2 6 L5 9 L10 3"
            fill="none"
            :stroke="`rgb(var(${colors.end}))`"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-opacity="0.4"
          />
        </svg>
      </button>

      <!-- Today done: filled interactive -->
      <button
        v-else-if="slot.state === 'today-done'"
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:opacity-80"
        :style="{ background: `linear-gradient(to bottom, rgb(var(${colors.start})), rgb(var(${colors.end})))` }"
        :disabled="isPending"
        aria-label="Undo today"
        @click.stop="$emit('toggle')"
      >
        <svg viewBox="0 0 12 12" class="h-4 w-4" aria-hidden="true">
          <path
            d="M2 6 L5 9 L10 3"
            fill="none"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

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
import { computed } from 'vue'
import type { TodayCompletionSlot } from '@/services/todayChartData'
import { chartColorVars, type ChartColorTheme } from '@/components/objects/sparklines/sparklineUtils'

const props = withDefaults(
  defineProps<{
    slots: TodayCompletionSlot[]
    colorTheme?: ChartColorTheme
    isPending?: boolean
  }>(),
  { colorTheme: 'keyResult', isPending: false },
)

defineEmits<{ toggle: [] }>()

const colors = computed(() => chartColorVars(props.colorTheme))
</script>
