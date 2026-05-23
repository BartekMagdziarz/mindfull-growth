<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
    <!-- LEFT: Weekly recap snippets + Emotions — narrow column. -->
    <div class="flex w-full shrink-0 flex-col gap-3 lg:w-[240px] lg:order-1">
      <MonthWeeklyRecapCard :month-ref="monthRef" />
      <MonthEmotionsCard :month-ref="monthRef" />
    </div>

    <!-- MAIN: unified grid of compact tiles (KRs + habits + trackers mixed). -->
    <div class="min-w-0 flex-1 lg:order-2">
      <MonthObjectsGrid
        :items="monthObjectItems"
        :raw-entries="rawEntries"
        :month-ref="monthRef"
        :today-day-ref="todayDayRef"
        :has-plan="hasPlan"
        @create-plan="emit('create-plan')"
        @edit-plan="emit('edit-plan')"
      />
    </div>

    <!-- RIGHT: Kontekst — reflection summary or create-reflection CTA. -->
    <aside class="flex w-full shrink-0 flex-col gap-3 lg:w-[288px] lg:order-3">
      <MonthKontextCard
        :month-ref="monthRef"
        :show-actions="kontekstActions"
        @create-reflection="emit('create-reflection')"
        @edit-reflection="emit('edit-reflection')"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import MonthEmotionsCard from './MonthEmotionsCard.vue'
import MonthKontextCard from './MonthKontextCard.vue'
import MonthObjectsGrid from './MonthObjectsGrid.vue'
import MonthWeeklyRecapCard from './MonthWeeklyRecapCard.vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'

withDefaults(
  defineProps<{
    monthRef: MonthRef
    todayDayRef: DayRef
    monthObjectItems: MonthObjectItem[]
    rawEntries: DailyMeasurementEntry[]
    /** When false, the kontekst card shows ratings/empty state without action buttons. */
    kontekstActions?: boolean
    /** Whether a MonthPlan record exists for this month — drives the plan-vs-execution tile state. */
    hasPlan?: boolean
  }>(),
  { kontekstActions: true, hasPlan: false },
)

const emit = defineEmits<{
  'create-reflection': []
  'edit-reflection': []
  'create-plan': []
  'edit-plan': []
}>()
</script>
