<template>
  <article
    class="neo-card neo-raised cursor-pointer border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-2.5 transition-shadow hover:shadow-neu-raised-lg"
    @click="$emit('click')"
  >
    <div class="space-y-1">
      <!-- Title row: Status dot + icon + title -->
      <div class="flex items-center gap-1.5">
        <span :class="statusDotClass" class="h-1.5 w-1.5 shrink-0 rounded-full" />
        <EntityIcon v-if="icon" :icon="icon" size="sm" />
        <h3 class="min-w-0 flex-1 truncate text-xs font-semibold text-on-surface">
          {{ title }}
        </h3>
      </div>

      <!-- Scalable sparkline -->
      <ScalableSparkline
        :subject="subject"
        :subject-type="subjectType"
        :object-cadence="objectCadence"
        :view-scale="viewScale"
        :current-period-ref="currentPeriodRef"
        :raw-entries="rawEntries"
        :entry-mode="entryMode"
        :today-ref="todayRef"
        :color-theme="subjectType"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningCadence, MeasurementEntryMode } from '@/domain/planning'
import type { MonthRef, WeekRef, DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject } from '@/services/measurementProgress'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import ScalableSparkline from '@/components/objects/ScalableSparkline.vue'

const props = defineProps<{
  title: string
  icon?: string
  status: string
  entryMode: MeasurementEntryMode
  subject: MeasureableSubject
  subjectType: MeasurementSubjectType
  objectCadence: PlanningCadence
  viewScale: 'month' | 'week'
  currentPeriodRef: MonthRef | WeekRef
  rawEntries: DailyMeasurementEntry[]
  todayRef: DayRef
}>()

defineEmits<{
  click: []
}>()

const statusDotClass = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'bg-success'
    case 'dropped':
      return 'bg-error'
    case 'retired':
      return 'bg-warning'
    default:
      return 'bg-primary'
  }
})
</script>
