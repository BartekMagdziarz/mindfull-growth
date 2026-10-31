<template>
  <div class="mg-design-v2 planning-next">
    <!-- The quiet ritual is its own page: one surface, one question, no rail. -->
    <NextRitualHost
      v-if="fullBleedRitual && ritualAction"
      :scale="scale"
      :period-ref="periodRef"
      :action="ritualAction"
      @close="closeRitual"
      @plan-next-period="planNextPeriod"
      @open-period="openRitualPeriod"
    />
    <!-- Week/month/year calendar: the rhythm board is its own page (one axis, one lens). -->
    <RhythmCalendarView
      v-else-if="rhythmCalendar"
      :scale="scale"
      :period-ref="periodRef"
      @open-period="navigateToRef"
      @open-scale="navigateScale"
      @open-ritual="openRitual"
    />
    <!-- The annual wizard keeps its framed stage; a bad address gets a quiet state. -->
    <div
      v-else
      class="planning-next__sheet"
      :class="{ 'planning-next__sheet--ritual': ritualAction }"
    >
      <main
        class="planning-next__stage"
        :class="
          ritualAction ? 'planning-next__stage--framed mg-v2-surface mg-v2-surface--raised' : ''
        "
      >
        <DsState
          v-if="invalidRoute"
          icon="event_busy"
          title="Nieprawidłowy okres"
          body="Sprawdź adres kalendarza i spróbuj ponownie."
        />
        <NextRitualHost
          v-else-if="ritualAction"
          :scale="scale"
          :period-ref="periodRef"
          :action="ritualAction"
          @close="closeRitual"
          @plan-next-period="planNextPeriod"
          @open-period="openRitualPeriod"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CalendarScale, PlanningScale } from '@/design-system/contracts'
import { DsState } from '@/design-system/components'
import { getNextPeriod, getPeriodType, parsePeriodRef, zoomPeriod } from '@/utils/periods'
import NextRitualHost from './NextRitualHost.vue'
import RhythmCalendarView from '@/features/calendar-rhythm/RhythmCalendarView.vue'
import './planning-next.css'

/**
 * Calendar workspace: week / month / year (rhythm board or a ritual). The day
 * is not a scale here — it is Dzisiaj, its own route; a clicked day is handed
 * over to `today-day`. The quiet rituals and the rhythm calendar are the only
 * variants since 2026-10-31 (the classic wizard chain and the tile overview
 * behind `?ritual=classic` / `?overview=classic` were removed).
 */
const props = defineProps<{
  scale: CalendarScale
  periodRef: string
}>()

const route = useRoute()
const router = useRouter()

const invalidRoute = computed(() => {
  try {
    return getPeriodType(parsePeriodRef(props.periodRef)) !== props.scale
  } catch {
    return true
  }
})
const ritualAction = computed<'plan' | 'reflect' | null>(() => {
  return route.query.action === 'plan' || route.query.action === 'reflect'
    ? route.query.action
    : null
})
/** The rhythm calendar owns week/month/year whenever no ritual is open. */
const rhythmCalendar = computed(
  () =>
    !ritualAction.value &&
    !invalidRoute.value &&
    (props.scale === 'week' || props.scale === 'month' || props.scale === 'year')
)
/** Week/month quiet rituals replace the whole workspace; the annual wizard keeps the framed stage. */
const fullBleedRitual = computed(
  () =>
    Boolean(ritualAction.value) &&
    !invalidRoute.value &&
    (props.scale === 'week' || props.scale === 'month')
)

/** Days open Dzisiaj; every other scale stays inside the calendar. */
function routeFor(scale: PlanningScale, periodRef: string) {
  const names = {
    day: 'today-day',
    week: 'calendar-week',
    month: 'calendar-month',
    year: 'calendar-year',
  } as const
  const paramNames = { day: 'dayRef', week: 'weekRef', month: 'monthRef', year: 'yearRef' } as const
  return {
    name: names[scale],
    params: { [paramNames[scale]]: periodRef },
  }
}

function navigateScale(nextScale: CalendarScale) {
  if (invalidRoute.value) return
  const nextRef = zoomPeriod(parsePeriodRef(props.periodRef), nextScale)
  void router.push(routeFor(nextScale, nextRef))
}

function navigateToRef(scale: PlanningScale, periodRef: string) {
  void router.push(routeFor(scale, periodRef))
}

function openRitual(action: 'plan' | 'reflect') {
  void router.replace({ query: { action } })
}

function closeRitual() {
  void router.replace({ query: {} })
}

/** "Save and plan the next one": the next week or the next month, in plan mode. */
function planNextPeriod() {
  if (props.scale !== 'week' && props.scale !== 'month') return
  const nextRef = getNextPeriod(parsePeriodRef(props.periodRef))
  void router.push({ ...routeFor(props.scale, nextRef), query: { action: 'plan' } })
}

/** A ritual handing over to another period's plan (month → one of its weeks). */
function openRitualPeriod(scale: PlanningScale, periodRef: string) {
  void router.push({ ...routeFor(scale, periodRef), query: { action: 'plan' } })
}
</script>
