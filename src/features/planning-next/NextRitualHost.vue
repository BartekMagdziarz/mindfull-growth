<template>
  <div class="planning-next__ritual-adapter planning-next__ritual-adapter--quiet">
    <AnnualPlanningWizard
      v-if="scale === 'year'"
      :year-ref="periodRef as YearRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />

    <!-- Quiet ritual (UX Lab "02 · Spokojny rytuał") — the only month/week ritual. -->
    <QuietMonthlyPlan
      v-else-if="scale === 'month' && action === 'plan'"
      :month-ref="periodRef as MonthRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
      @open-week="$emit('open-period', 'week', $event)"
    />
    <QuietMonthlyReflection
      v-else-if="scale === 'month'"
      :month-ref="periodRef as MonthRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
      @plan-next-month="$emit('plan-next-period')"
      @open-week="$emit('open-period', 'week', $event)"
    />
    <QuietWeeklyPlan
      v-else-if="action === 'plan'"
      :week-ref="periodRef as WeekRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />
    <QuietWeeklyReflection
      v-else
      :week-ref="periodRef as WeekRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
      @plan-next-week="$emit('plan-next-period')"
    />
  </div>
</template>

<script setup lang="ts">
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { PlanningScale } from '@/design-system/contracts'
import AnnualPlanningWizard from '@/components/calendar/AnnualPlanningWizard.vue'
import QuietMonthlyPlan from '@/features/quiet-ritual/QuietMonthlyPlan.vue'
import QuietMonthlyReflection from '@/features/quiet-ritual/QuietMonthlyReflection.vue'
import QuietWeeklyPlan from '@/features/quiet-ritual/QuietWeeklyPlan.vue'
import QuietWeeklyReflection from '@/features/quiet-ritual/QuietWeeklyReflection.vue'

defineProps<{
  scale: Exclude<PlanningScale, 'day'>
  periodRef: string
  action: 'plan' | 'reflect'
}>()

defineEmits<{
  close: []
  updated: []
  /** Save-and-plan-next: the next week (weekly) or next month (monthly). */
  'plan-next-period': []
  'open-period': [scale: PlanningScale, periodRef: string]
}>()
</script>
