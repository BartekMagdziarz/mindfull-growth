<template>
  <section class="week-grid neo-raised">
    <div v-if="items.length > 0" class="week-grid__grid">
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
    <!-- Quiet empty state — the create-plan CTA lives in the Summary panel. -->
    <p v-else class="week-grid__empty">
      {{
        hasPlan
          ? t('planning.reflection.review.planVsExecution.noObjects')
          : t('planning.reflection.review.planVsExecution.gridEmptyNoPlan')
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import WeekObjectTile from '@/components/calendar/WeekObjectTile.vue'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'

defineProps<{
  items: WeekObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  weekRef: WeekRef
  todayDayRef: DayRef
  hasPlan: boolean
}>()

const { t } = useT()
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

.week-grid__empty {
  padding: 18px 8px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--neo-muted));
  text-align: center;
}
</style>
