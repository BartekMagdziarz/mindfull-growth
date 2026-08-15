<template>
  <DsSurface class="next-period-rail" :class="`next-period-rail--${scale}`">
    <template v-if="data?.scale === 'week'">
      <section class="next-period-rail__ratings-chart" aria-labelledby="week-ratings-title">
        <header>
          <h2 id="week-ratings-title">Oceny tygodnia</h2>
          <div class="next-period-rail__legend" aria-hidden="true">
            <span><i class="effort" />Wysiłek</span><span><i class="state" />Stan</span>
          </div>
        </header>
        <div class="next-period-rail__bars" role="img" :aria-label="weekRatingsAria">
          <span v-for="rating in weekRatings" :key="rating.label" class="next-period-rail__bar-group">
            <span class="next-period-rail__bar-slots">
              <i class="bar bar--effort" :class="{ empty: rating.effort == null }" :style="barStyle(rating.effort)"><b>{{ rating.effort ?? '—' }}</b></i>
              <i class="bar bar--state" :class="{ empty: rating.state == null }" :style="barStyle(rating.state)"><b>{{ rating.state ?? '—' }}</b></i>
            </span>
            <small>{{ rating.label }}</small>
          </span>
        </div>
      </section>

      <header class="next-period-rail__heading"><span>Siedem dni</span><small>{{ data.days.length }}</small></header>
      <div class="next-period-rail__list next-period-rail__list--days">
        <button
          v-for="day in data.days"
          :key="day.dayRef"
          type="button"
          :class="{ current: day.isToday, future: day.isFuture }"
          @click="$emit('open-period', 'day', day.dayRef)"
        >
          <span class="next-period-rail__day-label"><strong>{{ formatDay(day.dayRef, 'weekday') }}</strong><small>· {{ formatDay(day.dayRef, 'date') }}</small></span>
          <em v-if="day.journalWritten || day.emotionCount || day.exerciseCount">{{ dayActivityLabel(day) }}</em>
          <em v-else>—</em>
          <AppIcon name="chevron_right" />
        </button>
      </div>
      <DsButton class="next-period-rail__ritual" @click="$emit('open-ritual', ritualAction)">
        <AppIcon :name="ritualAction === 'plan' ? 'edit_calendar' : 'rate_review'" />{{ ritualLabel }}
      </DsButton>
    </template>

    <template v-else-if="data?.scale === 'month'">
      <DsButton class="next-period-rail__ritual" @click="$emit('open-ritual', ritualAction)">
        <AppIcon :name="ritualAction === 'plan' ? 'edit_calendar' : 'rate_review'" />{{ ritualLabel }}
      </DsButton>
      <section class="next-period-rail__month-ratings" aria-labelledby="month-ratings-title">
        <h2 id="month-ratings-title">Oceny miesiąca</h2>
        <div class="next-period-rail__bars next-period-rail__bars--single" role="img" :aria-label="monthRatingsAria">
          <span v-for="rating in monthRatings" :key="rating.label" class="next-period-rail__bar-group">
            <span class="next-period-rail__bar-slots">
              <i class="bar bar--state" :class="{ empty: rating.value == null }" :style="barStyle(rating.value)"><b>{{ rating.value ?? '—' }}</b></i>
            </span>
            <small>{{ rating.label }}</small>
          </span>
        </div>
      </section>

      <header class="next-period-rail__heading">
        <span>Tygodnie</span>
        <div class="next-period-rail__legend" aria-hidden="true"><span><i class="effort" />Wysiłek</span><span><i class="state" />Stan</span></div>
      </header>
      <div class="next-period-rail__list next-period-rail__list--weeks">
        <button
          v-for="week in data.weeks"
          :key="week.weekRef"
          type="button"
          :class="{ current: week.isCurrent, future: week.timeState === 'future' }"
          @click="$emit('open-period', 'week', week.weekRef)"
        >
          <span><strong>T{{ week.weekNumber }}</strong><small>{{ shortRange(week.startDayRef, week.endDayRef) }}</small></span>
          <span class="next-period-rail__week-chart" role="img" :aria-label="weekMatrixAria(week)">
            <span class="next-period-rail__bars next-period-rail__bars--mini" aria-hidden="true">
              <span v-for="area in weekBars(week)" :key="area.areaKey" class="next-period-rail__bar-group">
                <span class="next-period-rail__bar-slots">
                  <i class="bar bar--effort" :class="{ empty: area.effort == null }" :style="barStyle(area.effort)" />
                  <i class="bar bar--state" :class="{ empty: area.state == null }" :style="barStyle(area.state)" />
                </span>
              </span>
            </span>
            <span class="next-period-rail__week-chart-labels" aria-hidden="true"><small v-for="area in week.matrix" :key="area.areaKey">{{ areaLabel(area.areaKey) }}</small></span>
          </span>
          <AppIcon name="chevron_right" />
        </button>
      </div>
    </template>

    <template v-else-if="data?.scale === 'year'">
      <button type="button" class="next-period-rail__year-mark" @click="$emit('open-ritual', 'plan')"><AppIcon name="calendar_view_month" /><span>12 miesięcy · jedna oś</span></button>
      <header class="next-period-rail__heading"><span>Dwanaście miesięcy</span><small>{{ data.months.length }}</small></header>
      <div class="next-period-rail__list next-period-rail__list--months">
        <button
          v-for="month in data.months"
          :key="month.monthRef"
          type="button"
          :class="{ current: month.isCurrent, future: month.timeState === 'future' }"
          @click="$emit('open-period', 'month', month.monthRef)"
        >
          <span><strong>{{ monthName(month.monthRef) }}</strong><small v-if="month.isCurrent">teraz</small></span>
          <em v-if="firstPriority(month)">{{ firstPriority(month) }}</em>
          <AppIcon name="chevron_right" />
        </button>
      </div>
    </template>

    <DsState v-else title="Ładuję okres" body="Przygotowuję strukturę kalendarza." />
  </DsSurface>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlanningScale } from '@/design-system/contracts'
import type { MatrixSection } from '@/domain/reflectionMatrix'
import type { StreamDayVM, StreamMonthVM, StreamWeekVM } from '@/components/calendar/stream/streamModel'
import { getPeriodRefsForDate } from '@/utils/periods'
import { DsButton, DsState, DsSurface } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { PlanningPeriodData } from './usePlanningPeriodData'

const props = defineProps<{ scale: PlanningScale; periodRef: string; data: PlanningPeriodData | null }>()

defineEmits<{
  'open-period': [scale: PlanningScale, periodRef: string]
  'open-ritual': [action: 'plan' | 'reflect']
}>()

const { locale } = useT()
const currentRefs = getPeriodRefsForDate(new Date())
const ritualAction = computed<'plan' | 'reflect'>(() => {
  if (props.scale === 'year') return 'plan'
  if (props.scale === 'month') return props.periodRef < currentRefs.month ? 'reflect' : 'plan'
  return props.periodRef < currentRefs.week ? 'reflect' : 'plan'
})
const ritualLabel = computed(() => ritualAction.value === 'plan'
  ? props.scale === 'year' ? 'Zaplanuj rok' : props.scale === 'month' ? 'Zaplanuj miesiąc' : 'Zaplanuj tydzień'
  : props.scale === 'month' ? 'Otwórz refleksję miesiąca' : 'Otwórz refleksję tygodnia')

const weekRatings = computed(() => {
  const reflection = props.data?.scale === 'week' ? props.data.structuredReflection : null
  return [
    { label: 'Ciało', icon: 'accessibility_new', effort: reflection?.physicalCareRating ?? null, state: reflection?.energyRating ?? null },
    { label: 'Emocje', icon: 'cognition', effort: reflection?.emotionalProcessingRating ?? null, state: reflection?.moodRating ?? null },
    { label: 'Działanie', icon: 'directions_run', effort: reflection?.productivityRating ?? null, state: reflection?.calmRating ?? null },
    { label: 'Relacje', icon: 'diversity_1', effort: reflection?.closeOnesSupportRating ?? null, state: reflection?.connectionRating ?? null },
  ]
})
const monthRatings = computed(() => {
  const reflection = props.data?.scale === 'month' ? props.data.structuredReflection : null
  return [
    { label: 'Balans', value: reflection?.balanceRating ?? null },
    { label: 'Sens', value: reflection?.purposeRating ?? null },
    { label: 'Rozwój', value: reflection?.growthRating ?? null },
    { label: 'Spójność', value: reflection?.coherenceRating ?? null },
    { label: 'Sprawczość', value: reflection?.agencyRating ?? null },
  ]
})
const weekRatingsAria = computed(() => `Oceny tygodnia. ${weekRatings.value.map(item => `${item.label}: Wysiłek ${item.effort ?? 'brak'}, Stan ${item.state ?? 'brak'}`).join('; ')}`)
const monthRatingsAria = computed(() => `Oceny miesiąca. ${monthRatings.value.map(item => `${item.label}: ${item.value ?? 'brak'}`).join('; ')}`)

// Bars carry the 1–5 rating as height; the floor keeps a "1" readable (and its
// digit inside the bar) instead of collapsing to a sliver. Missing ratings get
// no inline height — CSS draws them as a dashed stub, sized per chart variant.
function barStyle(value: number | null | undefined): Record<string, string> | undefined {
  return value == null ? undefined : { height: `${Math.max(26, (value / 5) * 100)}%` }
}
function weekMatrixValues(week: StreamWeekVM, section: MatrixSection): Array<number | null> {
  return week.matrix.map(row => row.cells.find(cell => cell.section === section)?.rating ?? null)
}
function weekBars(week: StreamWeekVM): Array<{ areaKey: string; effort: number | null; state: number | null }> {
  return week.matrix.map(row => ({
    areaKey: row.areaKey,
    effort: row.cells.find(cell => cell.section === 'actions')?.rating ?? null,
    state: row.cells.find(cell => cell.section === 'state')?.rating ?? null,
  }))
}
function areaLabel(areaKey: string): string {
  return areaKey === 'body' ? 'Ciało' : areaKey === 'emotions' ? 'Emocje' : areaKey === 'tasks' ? 'Działanie' : 'Relacje'
}
function weekMatrixAria(week: StreamWeekVM): string {
  const effort = weekMatrixValues(week, 'actions').map(value => value ?? 'brak').join(', ')
  const state = weekMatrixValues(week, 'state').map(value => value ?? 'brak').join(', ')
  return `Tydzień ${week.weekNumber}. Wysiłek: ${effort}. Stan: ${state}.`
}
function dayActivityLabel(day: StreamDayVM): string {
  const activityCount = day.rings.reduce((sum, ring) => sum + (ring.num ?? 0), 0)
  return activityCount ? `${activityCount} aktywności` : day.journalWritten ? 'wpis w dzienniku' : day.emotionCount ? `${day.emotionCount} emocje` : `${day.exerciseCount} ćwiczenia`
}
function formatDay(dayRef: string, part: 'weekday' | 'date'): string {
  const date = new Date(`${dayRef}T12:00:00`)
  return new Intl.DateTimeFormat(locale.value, part === 'weekday' ? { weekday: 'long' } : { day: 'numeric', month: 'short' }).format(date)
}
function shortRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' })
  return `${formatter.format(new Date(`${start}T12:00:00`))}–${formatter.format(new Date(`${end}T12:00:00`))}`
}
function monthName(monthRef: string): string {
  return new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(new Date(`${monthRef}-15T12:00:00`))
}
function firstPriority(month: StreamMonthVM): string {
  return month.priorities.find(priority => !priority.empty)?.name ?? ''
}
</script>
