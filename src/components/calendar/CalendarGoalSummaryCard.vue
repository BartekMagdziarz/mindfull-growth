<template>
  <article
    class="neo-card neo-raised cursor-pointer border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-2.5 transition-shadow hover:shadow-neu-raised-lg"
    @click="$emit('click')"
  >
    <div class="space-y-1.5">
      <!-- Row 1: Status dot + icon + title -->
      <div class="flex items-center gap-1.5">
        <span :class="statusDotClass" class="h-1.5 w-1.5 shrink-0 rounded-full" />
        <EntityIcon v-if="icon" :icon="icon" size="sm" />
        <h3 class="min-w-0 flex-1 truncate text-xs font-semibold text-on-surface">
          {{ title }}
        </h3>
      </div>

      <!-- Nested KRs -->
      <div v-if="children.length > 0" class="space-y-1">
        <div
          v-for="child in children"
          :key="child.id"
          class="neo-surface rounded-md p-2"
        >
          <p class="truncate text-[11px] font-medium text-on-surface">
            {{ child.title }}
          </p>
          <ScalableSparkline
            class="mt-1"
            :subject="child.subject"
            :subject-type="child.subjectType"
            :object-cadence="child.objectCadence"
            :view-scale="viewScale"
            :current-period-ref="currentPeriodRef"
            :raw-entries="rawEntries"
            :entry-mode="child.entryMode"
            :today-ref="todayRef"
          />
        </div>
      </div>
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

export interface CalendarKrSummary {
  id: string
  title: string
  entryMode: MeasurementEntryMode
  objectCadence: PlanningCadence
  subject: MeasureableSubject
  subjectType: MeasurementSubjectType
}

const props = defineProps<{
  title: string
  icon?: string
  status: string
  children: CalendarKrSummary[]
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
