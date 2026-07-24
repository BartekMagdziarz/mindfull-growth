<template>
  <div class="planning-next__ritual-adapter">
    <AnnualPlanningWizard
      v-if="scale === 'year'"
      :year-ref="periodRef as YearRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />
    <NextMonthlyPlanRitual
      v-else-if="scale === 'month' && action === 'plan'"
      :month-ref="periodRef as MonthRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />
    <NextMonthlyReflectionRitual
      v-else-if="scale === 'month'"
      :month-ref="periodRef as MonthRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />
    <NextWeeklyPlanRitual
      v-else-if="scale === 'week' && action === 'plan'"
      :week-ref="periodRef as WeekRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
    />
    <NextWeeklyReflectionRitual
      v-else-if="scale === 'week'"
      :week-ref="periodRef as WeekRef"
      @close="$emit('close')"
      @updated="$emit('updated')"
      @plan-next-week="$emit('plan-next-week')"
    />
  </div>
</template>

<script setup lang="ts">
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { PlanningScale } from '@/design-system/contracts'
import AnnualPlanningWizard from '@/components/calendar/AnnualPlanningWizard.vue'
import NextMonthlyPlanRitual from './NextMonthlyPlanRitual.vue'
import NextMonthlyReflectionRitual from './NextMonthlyReflectionRitual.vue'
import NextWeeklyPlanRitual from './NextWeeklyPlanRitual.vue'
import NextWeeklyReflectionRitual from './NextWeeklyReflectionRitual.vue'

defineProps<{ scale: Exclude<PlanningScale, 'day'>; periodRef: string; action: 'plan' | 'reflect' }>()
defineEmits<{ close: []; updated: []; 'plan-next-week': [] }>()
</script>
