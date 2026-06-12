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
      />
    </div>

    <!-- RIGHT: Kontekst — plan-vs-execution + reflection summary with their CTAs. -->
    <aside class="flex w-full shrink-0 flex-col gap-3 lg:w-[288px] lg:order-3">
      <MonthKontextCard
        :month-ref="monthRef"
        :today-day-ref="todayDayRef"
        :has-plan="hasPlan"
        :plan-summary="planSummary"
        :show-actions="kontekstActions"
        @create-reflection="emit('create-reflection')"
        @edit-reflection="emit('edit-reflection')"
        @create-plan="emit('create-plan')"
        @edit-plan="emit('edit-plan')"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MonthEmotionsCard from './MonthEmotionsCard.vue'
import MonthKontextCard from './MonthKontextCard.vue'
import MonthObjectsGrid from './MonthObjectsGrid.vue'
import MonthWeeklyRecapCard from './MonthWeeklyRecapCard.vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { buildMonthlyPlanSummary } from '@/services/monthlyPlanSummary'

const props = withDefaults(
  defineProps<{
    monthRef: MonthRef
    todayDayRef: DayRef
    monthObjectItems: MonthObjectItem[]
    rawEntries: DailyMeasurementEntry[]
    /** When false, the kontekst card shows ratings/empty state without action buttons. */
    kontekstActions?: boolean
    /** Whether a MonthPlan record exists for this month — drives the plan-vs-execution section state. */
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

const planSummary = computed(() =>
  buildMonthlyPlanSummary(props.monthObjectItems, props.rawEntries, props.monthRef, props.todayDayRef),
)
</script>
