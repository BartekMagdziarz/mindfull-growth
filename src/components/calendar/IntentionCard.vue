<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { WeeklyIntention } from '@/domain/planning'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'

defineProps<{ intention: WeeklyIntention }>()

const { t } = useT()
</script>

<template>
  <!-- A created intention occupies a slot that mirrors the composer's inset field. -->
  <div class="neo-surface flex w-full flex-col gap-3 rounded-2xl px-3.5 py-3 sm:w-[28rem]">
    <div class="flex items-center gap-2 border-b border-neu-border/15 pb-2.5">
      <AppIcon name="target" class="shrink-0 text-base text-on-surface-variant" />
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
        {{ intention.title }}
      </span>
    </div>
    <p class="text-sm text-on-surface-variant">
      {{ formatMeasurementTargetSummary(intention.target, t) }}
    </p>
  </div>
</template>
