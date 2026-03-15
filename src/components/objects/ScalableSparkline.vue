<template>
  <div
    class="relative"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <MeasurementSparkline
      v-if="effectivePoints.length > 0"
      :points="effectivePoints"
      :cadence="effectiveCadence"
      :entry-mode="entryMode"
      :color-theme="colorTheme"
      compact
    />
    <div
      v-else
      class="flex h-[52px] items-center justify-center text-[10px] text-on-surface-variant/40"
    >
      {{ trendLoading ? '' : t('planning.objects.chart.noActivePeriods') }}
    </div>

    <!-- Scale toggle + cadence indicator (visible on hover) -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="hasToggle && hovering"
        class="absolute right-0.5 top-0.5 flex flex-col items-center gap-px"
      >
        <!-- Cadence badge -->
        <span
          class="rounded px-0.5 text-[8px] font-semibold uppercase leading-tight text-on-surface-variant/50"
        >
          {{ objectCadence === 'monthly' ? 'M' : 'W' }}
        </span>
        <!-- Toggle button -->
        <button
          type="button"
          class="rounded p-0.5 text-on-surface-variant/50 transition-colors hover:bg-primary/10 hover:text-primary"
          :title="toggleTitle"
          @click.stop="toggle"
        >
          <AppIcon v-if="isZoomedIn" name="zoom_out_map" class="text-xs" />
          <AppIcon v-else name="zoom_in_map" class="text-xs" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useT } from '@/composables/useT'
import { useChartScale } from '@/composables/useChartScale'
import type { PlanningCadence, MeasurementEntryMode } from '@/domain/planning'
import type { MonthRef, WeekRef, DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { ChartColorTheme } from './sparklines/sparklineUtils'
import type { MeasureableSubject } from '@/services/measurementProgress'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import {
  buildMonthWeeklyChartPoints,
  buildWeekDailyChartPoints,
  buildMonthlyTrendChartPoints,
  buildWeeklyTrendChartPoints,
  loadTrendEntries,
} from '@/services/calendarChartData'
import { getPeriodRefsForDate } from '@/utils/periods'
import MeasurementSparkline from '@/components/objects/MeasurementSparkline.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    subject: MeasureableSubject
    subjectType: MeasurementSubjectType
    objectCadence: PlanningCadence
    viewScale: 'month' | 'week'
    currentPeriodRef: MonthRef | WeekRef
    rawEntries: DailyMeasurementEntry[]
    entryMode: MeasurementEntryMode
    todayRef: DayRef
    colorTheme?: ChartColorTheme
  }>(),
  { colorTheme: 'keyResult' },
)

const { t } = useT()
const hovering = ref(false)

const objectId = computed(() => props.subject.id)
const cadenceRef = computed(() => props.objectCadence)
const viewScaleRef = computed(() => props.viewScale)

const { currentScale, hasToggle, toggle } = useChartScale(
  objectId,
  cadenceRef,
  viewScaleRef,
)

// Trend entries loaded lazily
const trendEntries = ref<DailyMeasurementEntry[]>()
const trendLoading = ref(false)

// Whether the current scale is the finer (zoomed-in) scale
const isZoomedIn = computed(() => {
  if (props.viewScale === 'month') return currentScale.value === 'weeks'
  return currentScale.value === 'days'
})

const toggleTitle = computed(() =>
  isZoomedIn.value ? t('planning.objects.chart.zoomOut') : t('planning.objects.chart.zoomIn'),
)

// Load trend entries when switching to a trend scale
watch(
  currentScale,
  async (scale) => {
    const isTrendScale =
      (props.viewScale === 'month' && scale === 'months') ||
      (props.viewScale === 'week' && scale === 'weeks')

    if (isTrendScale && !trendEntries.value) {
      trendLoading.value = true
      try {
        trendEntries.value = await loadTrendEntries(
          props.currentPeriodRef,
          scale === 'months' ? 'months' : 'weeks',
        )
      } finally {
        trendLoading.value = false
      }
    }
  },
  { immediate: true },
)

// Compute parent evaluation for finer-than-cadence scales
function getParentEvaluation(): ObjectsLibraryChartPoint['status'] | undefined {
  const isNativeCadence =
    (props.objectCadence === 'monthly' && currentScale.value === 'months') ||
    (props.objectCadence === 'weekly' && currentScale.value === 'weeks')

  if (isNativeCadence) return undefined

  // Finer-than-cadence: compute parent period evaluation
  const entries = trendEntries.value ?? props.rawEntries
  const summary = buildMeasurementSummary(props.subject, entries, props.currentPeriodRef)

  const todayRefs = getPeriodRefsForDate(props.todayRef)
  const isCurrentPeriod = props.viewScale === 'month'
    ? todayRefs.month === props.currentPeriodRef
    : todayRefs.week === props.currentPeriodRef

  if (isCurrentPeriod) {
    return summary.actualValue !== undefined ? 'no-target' : 'no-data'
  }

  if (!summary.evaluationStatus) {
    return summary.actualValue !== undefined ? 'no-target' : 'no-data'
  }
  return summary.evaluationStatus === 'met' ? 'met'
    : summary.evaluationStatus === 'missed' ? 'missed'
      : 'no-data'
}

// Chart points and cadence based on the current scale
const effectivePoints = computed<ObjectsLibraryChartPoint[]>(() => {
  const scale = currentScale.value
  const entries = trendEntries.value ?? props.rawEntries

  if (scale === 'months') {
    if (!trendEntries.value) return []
    return buildMonthlyTrendChartPoints(
      props.subject,
      entries,
      props.currentPeriodRef as MonthRef,
      props.todayRef,
    )
  }

  if (scale === 'weeks') {
    if (props.viewScale === 'week') {
      // Trend: past 5 weeks
      if (!trendEntries.value) return []
      return buildWeeklyTrendChartPoints(
        props.subject,
        entries,
        props.currentPeriodRef as WeekRef,
        props.todayRef,
      )
    }
    // Month view, weekly detail
    const parentEval = getParentEvaluation()
    return buildMonthWeeklyChartPoints(
      props.subject,
      props.rawEntries,
      props.currentPeriodRef as MonthRef,
      parentEval,
    )
  }

  if (scale === 'days') {
    // Week view, daily detail
    const parentEval = getParentEvaluation()
    return buildWeekDailyChartPoints(
      props.subject,
      props.subjectType,
      props.rawEntries,
      props.currentPeriodRef as WeekRef,
      parentEval,
    )
  }

  return []
})

const effectiveCadence = computed<'weekly' | 'monthly' | 'daily'>(() => {
  switch (currentScale.value) {
    case 'months': return 'monthly'
    case 'weeks': return 'weekly'
    case 'days': return 'daily'
  }
})
</script>
