<template>
  <div class="mg-design-v2 planning-next">
    <!-- The quiet ritual is its own page: one surface, one question, no rail. -->
    <NextRitualHost
      v-if="fullBleedRitual && ritualAction"
      :scale="scale"
      :period-ref="periodRef"
      :action="ritualAction"
      :variant="ritualVariant"
      @close="closeRitual"
      @updated="handleRitualUpdated"
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
    <div v-else class="planning-next__sheet" :class="{ 'planning-next__sheet--ritual': ritualAction }">
      <aside v-if="!ritualAction" class="planning-next__rail-stack">
        <DsSurface class="planning-next__navigation">
          <DsPeriodNavigation
            :title="periodTitle"
            :subtitle="periodSubtitle"
            @previous="navigatePeriod(-1)"
            @next="navigatePeriod(1)"
            @pick="openNativePeriodPicker"
          />
          <DsSegmentedControl
            :model-value="scale"
            label="Skala kalendarza"
            :options="scaleOptions"
            @update:model-value="navigateScale"
          />
          <input
            v-if="scale === 'month'"
            ref="monthPickerRef"
            class="planning-next__native-picker"
            type="month"
            :value="periodRef"
            @change="handleMonthPicked"
          />
        </DsSurface>

        <NextPeriodRail
          :scale="scale"
          :period-ref="periodRef"
          :data="periodData"
          @open-period="navigateToRef"
          @open-ritual="openRitual"
        />
      </aside>

      <main
        class="planning-next__stage"
        :class="ritualAction ? 'planning-next__stage--framed mg-v2-surface mg-v2-surface--raised' : ''"
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
          :variant="ritualVariant"
          @close="closeRitual"
          @updated="handleRitualUpdated"
          @plan-next-period="planNextPeriod"
          @open-period="openRitualPeriod"
        />
        <DsState
          v-else-if="periodState === 'loading'"
          icon="hourglass_empty"
          title="Ładuję kalendarz"
          body="Zbieram plan, wykonanie i refleksje dla tego okresu."
        />
        <DsState
          v-else-if="periodState === 'error'"
          icon="error"
          title="Nie udało się wczytać kalendarza"
          :body="periodError ?? ''"
          action-label="Spróbuj ponownie"
          @action="void reloadPeriod()"
        />
        <NextPeriodOverview
          v-else-if="periodData"
          :scale="scale"
          :period-ref="periodRef"
          :data="periodData"
          :empty="periodState === 'empty'"
          @open-period="navigateToRef"
          @open-ritual="openRitual"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PeriodRef } from '@/domain/period'
import type { CalendarScale, PlanningScale, PlanningUi } from '@/design-system/contracts'
import { DsPeriodNavigation, DsSegmentedControl, DsState, DsSurface } from '@/design-system/components'
import { getNextPeriod, getPreviousPeriod, getPeriodBounds, getPeriodType, parsePeriodRef, zoomPeriod } from '@/utils/periods'
import { formatMonthTitle } from '@/utils/periodLabels'
import { useT } from '@/composables/useT'
import NextPeriodOverview from './NextPeriodOverview.vue'
import NextPeriodRail from './NextPeriodRail.vue'
import NextRitualHost from './NextRitualHost.vue'
import RhythmCalendarView from '@/features/calendar-rhythm/RhythmCalendarView.vue'
import { usePlanningPeriodData } from './usePlanningPeriodData'
import './planning-next.css'

/**
 * Calendar workspace: week / month / year (rhythm board or a ritual). The day
 * is not a scale here — it is Dzisiaj, its own route; a clicked day is handed
 * over to `today-day`.
 */
const props = defineProps<{
  scale: CalendarScale
  periodRef: string
  ui: PlanningUi
}>()

const route = useRoute()
const router = useRouter()
const { locale } = useT()
const monthPickerRef = ref<HTMLInputElement | null>(null)
const scaleRef = toRef(props, 'scale')
const periodRefRef = toRef(props, 'periodRef')
const { data: periodData, error: periodError, load: reloadPeriod, state: periodState } = usePlanningPeriodData(scaleRef, periodRefRef)

const invalidRoute = computed(() => {
  try {
    return getPeriodType(parsePeriodRef(props.periodRef)) !== props.scale
  } catch {
    return true
  }
})
/** `?ritual=classic` keeps the previous wizard chain available for comparison. */
const ritualVariant = computed<'quiet' | 'classic'>(() => (route.query.ritual === 'classic' ? 'classic' : 'quiet'))
const ritualAction = computed<'plan' | 'reflect' | null>(() => {
  return route.query.action === 'plan' || route.query.action === 'reflect' ? route.query.action : null
})
/** `?overview=classic` keeps the previous rail + tile overview available for comparison. */
const overviewVariant = computed<'rhythm' | 'classic'>(() => (route.query.overview === 'classic' ? 'classic' : 'rhythm'))
/** The rhythm calendar owns week/month/year whenever no ritual is open. */
const rhythmCalendar = computed(
  () =>
    !ritualAction.value &&
    !invalidRoute.value &&
    overviewVariant.value === 'rhythm' &&
    (props.scale === 'week' || props.scale === 'month' || props.scale === 'year'),
)
/** Week/month quiet rituals replace the whole workspace; the annual wizard keeps the framed stage. */
const fullBleedRitual = computed(
  () => Boolean(ritualAction.value) && ritualVariant.value === 'quiet' && !invalidRoute.value && (props.scale === 'week' || props.scale === 'month'),
)
const scaleOptions = [
  { value: 'week' as const, label: 'Tydzień' },
  { value: 'month' as const, label: 'Miesiąc' },
  { value: 'year' as const, label: 'Rok' },
]
const periodTitle = computed(() => {
  if (invalidRoute.value) return props.periodRef
  if (props.scale === 'year') return props.periodRef
  if (props.scale === 'month') return formatMonthTitle(props.periodRef as never, locale.value)
  const bounds = getPeriodBounds(props.periodRef as PeriodRef)
  return formatWeekRange(bounds.start, bounds.end)
})
const periodSubtitle = computed(() => {
  if (invalidRoute.value || props.scale !== 'month') return ''
  const bounds = getPeriodBounds(props.periodRef as PeriodRef)
  return `${bounds.start} — ${bounds.end}`
})

function formatWeekRange(startDayRef: string, endDayRef: string): string {
  const start = new Date(`${startDayRef}T12:00:00`)
  const end = new Date(`${endDayRef}T12:00:00`)
  const sameMonth = start.getMonth() === end.getMonth()
  const startText = new Intl.DateTimeFormat(locale.value, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' }).format(start)
  const endText = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(end)
  return `${startText}–${endText}`
}

/** Days open Dzisiaj; every other scale stays inside the calendar. */
function routeFor(scale: PlanningScale, periodRef: string) {
  const names = { day: 'today-day', week: 'calendar-week', month: 'calendar-month', year: 'calendar-year' } as const
  const paramNames = { day: 'dayRef', week: 'weekRef', month: 'monthRef', year: 'yearRef' } as const
  return {
    name: names[scale],
    params: { [paramNames[scale]]: periodRef },
    query: keptQuery(),
  }
}

function navigatePeriod(direction: -1 | 1) {
  if (invalidRoute.value) return
  const current = parsePeriodRef(props.periodRef)
  const next = direction === -1 ? getPreviousPeriod(current) : getNextPeriod(current)
  void router.push(routeFor(props.scale, next))
}

function navigateScale(nextScale: CalendarScale) {
  if (invalidRoute.value) return
  const nextRef = zoomPeriod(parsePeriodRef(props.periodRef), nextScale)
  void router.push(routeFor(nextScale, nextRef))
}

function navigateToRef(scale: PlanningScale, periodRef: string) {
  void router.push(routeFor(scale, periodRef))
}

function openNativePeriodPicker() {
  if (props.scale === 'month') monthPickerRef.value?.showPicker()
}

function handleMonthPicked(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) navigateToRef('month', value)
}

/** Query keys the ritual keeps across navigation (ui variant + ritual variant). */
function keptQuery() {
  return {
    ...(route.query.ui ? { ui: route.query.ui } : {}),
    ...(route.query.ritual ? { ritual: route.query.ritual } : {}),
    ...(route.query.overview ? { overview: route.query.overview } : {}),
  }
}

function openRitual(action: 'plan' | 'reflect') {
  void router.replace({ query: { ...keptQuery(), action } })
}

function closeRitual() {
  void router.replace({ query: keptQuery() })
}

function handleRitualUpdated() {
  void reloadPeriod()
}

/** "Save and plan the next one": the next week or the next month, in plan mode. */
function planNextPeriod() {
  if (props.scale !== 'week' && props.scale !== 'month') return
  const nextRef = getNextPeriod(parsePeriodRef(props.periodRef))
  void router.push({ ...routeFor(props.scale, nextRef), query: { ...keptQuery(), action: 'plan' } })
}

/** A ritual handing over to another period's plan (month → one of its weeks). */
function openRitualPeriod(scale: PlanningScale, periodRef: string) {
  void router.push({ ...routeFor(scale, periodRef), query: { ...keptQuery(), action: 'plan' } })
}
</script>
