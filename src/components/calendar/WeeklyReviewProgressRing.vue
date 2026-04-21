<template>
  <div class="flex flex-col items-center gap-0.5">
    <div class="relative h-10 w-10">
      <svg :width="size" :height="size" class="block">
        <!-- Track: subtle primary-tinted background for the full ring -->
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          stroke="rgb(var(--color-primary) / 0.22)"
          :stroke-width="stroke"
        />
        <!-- Progress stroke -->
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          stroke="rgb(var(--color-primary))"
          :stroke-width="stroke"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          :transform="`rotate(-90 ${size / 2} ${size / 2})`"
          style="transition: stroke-dashoffset 400ms ease"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center text-primary">
        <AppIcon :name="icon" class="text-sm" />
      </div>
    </div>
    <div class="text-[10px] font-semibold tabular-nums text-primary">
      {{ value }}/{{ max }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = defineProps<{
  icon: string
  value: number
  max: number
}>()

const size = 40
const stroke = 4
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

const percent = computed(() => {
  if (props.max <= 0) return 0
  return Math.max(0, Math.min(1, props.value / props.max))
})

const dashOffset = computed(() => circumference * (1 - percent.value))
</script>
