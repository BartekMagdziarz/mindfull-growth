<template>
  <section class="month-grid neo-raised">
    <div class="month-grid__grid">
      <MonthPlanSummaryTile
        :has-plan="hasPlan"
        :summary="planSummary"
        @create-plan="emit('create-plan')"
        @edit-plan="emit('edit-plan')"
      />
      <MonthObjectTile
        v-for="item in items"
        :key="item.key"
        :subject="item.subject"
        :subject-type="item.subjectType"
        :planning="item.planning"
        :measurement="item.measurement"
        :raw-entries="rawEntries"
        :month-ref="monthRef"
        :today-day-ref="todayDayRef"
        :parent-goal-icon="item.parentGoalIcon"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MonthObjectTile from '@/components/calendar/MonthObjectTile.vue'
import MonthPlanSummaryTile from '@/components/calendar/MonthPlanSummaryTile.vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { buildMonthlyPlanSummary } from '@/services/monthlyPlanSummary'

const props = defineProps<{
  items: MonthObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  monthRef: MonthRef
  todayDayRef: DayRef
  hasPlan: boolean
}>()

const emit = defineEmits<{
  'create-plan': []
  'edit-plan': []
}>()

const planSummary = computed(() =>
  buildMonthlyPlanSummary(props.items, props.rawEntries, props.monthRef, props.todayDayRef),
)
</script>

<style scoped>
.month-grid {
  width: 100%;
  padding: 14px;
  border-radius: 22px;
}

.month-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
</style>
