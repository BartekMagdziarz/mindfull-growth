<template>
  <section class="month-grid neo-raised">
    <div v-if="items.length > 0" class="month-grid__grid">
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
    <!-- Quiet empty state — the create-plan CTA lives in the Summary panel. -->
    <p v-else class="month-grid__empty">
      {{
        hasPlan
          ? t('planning.reflection.review.planVsExecution.noObjects')
          : t('planning.reflection.review.planVsExecution.gridEmptyNoPlan')
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import MonthObjectTile from '@/components/calendar/MonthObjectTile.vue'
import { useT } from '@/composables/useT'
import type { DayRef, MonthRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'

defineProps<{
  items: MonthObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  monthRef: MonthRef
  todayDayRef: DayRef
  hasPlan: boolean
}>()

const { t } = useT()
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

.month-grid__empty {
  padding: 18px 8px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--neo-muted));
  text-align: center;
}
</style>
