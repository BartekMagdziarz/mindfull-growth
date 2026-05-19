<template>
  <section class="week-grid neo-raised">
    <div class="week-grid__grid">
      <WeekPlanSummaryTile
        :has-plan="hasPlan"
        :summary="planSummary"
        @create-plan="emit('create-plan')"
        @edit-plan="emit('edit-plan')"
      />
      <WeekObjectTile
        v-for="item in items"
        :key="item.key"
        :subject="item.subject"
        :subject-type="item.subjectType"
        :planning="item.planning"
        :measurement="item.measurement"
        :raw-entries="rawEntries"
        :all-day-assignments="allDayAssignments"
        :week-ref="weekRef"
        :today-day-ref="todayDayRef"
        :parent-goal-icon="item.parentGoalIcon"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WeekObjectTile from '@/components/calendar/WeekObjectTile.vue'
import WeekPlanSummaryTile from '@/components/calendar/WeekPlanSummaryTile.vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'
import { buildWeeklyPlanSummary } from '@/services/weeklyPlanSummary'

const props = defineProps<{
  items: WeekObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  weekRef: WeekRef
  todayDayRef: DayRef
  hasPlan: boolean
}>()

const emit = defineEmits<{
  'create-plan': []
  'edit-plan': []
}>()

const planSummary = computed(() =>
  buildWeeklyPlanSummary(props.items, props.rawEntries, props.weekRef),
)
</script>

<style scoped>
.week-grid {
  width: 100%;
  padding: 14px;
  border-radius: 22px;
}

/* Min 220px gives the 7-dot completion chart enough room not to clip
   (7×22px + 6×4px gaps + tile padding ≈ 215px); auto-fill packs the
   wrapper tightly across viewports. */
.week-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
</style>
