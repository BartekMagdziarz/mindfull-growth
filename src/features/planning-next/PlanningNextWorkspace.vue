<template>
  <div class="mg-design-v2 planning-next">
    <div class="planning-next__sheet mg-v2-surface mg-v2-surface--inset" :class="{ 'planning-next__sheet--ritual': ritualAction }">
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
            v-if="scale === 'day'"
            ref="dayPickerRef"
            class="planning-next__native-picker"
            type="date"
            :value="periodRef"
            @change="handleDayPicked"
          />
          <input
            v-else-if="scale === 'month'"
            ref="monthPickerRef"
            class="planning-next__native-picker"
            type="month"
            :value="periodRef"
            @change="handleMonthPicked"
          />
        </DsSurface>

        <NextDayRail v-if="scale === 'day'" :day-ref="periodRef as DayRef" />
        <NextPeriodRail
          v-else
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
        <NextDayStage v-else-if="scale === 'day'" :day-ref="periodRef as DayRef" />
        <NextRitualHost
          v-else-if="ritualAction"
          :scale="scale"
          :period-ref="periodRef"
          :action="ritualAction"
          @close="closeRitual"
          @updated="handleRitualUpdated"
          @plan-next-week="planNextWeek"
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
import type { DayRef, PeriodRef } from '@/domain/period'
import type { PlanningScale, PlanningUi } from '@/design-system/contracts'
import { DsPeriodNavigation, DsSegmentedControl, DsState, DsSurface } from '@/design-system/components'
import { getNextPeriod, getPreviousPeriod, getPeriodBounds, getPeriodType, parsePeriodRef, zoomPeriod } from '@/utils/periods'
import { formatMonthTitle } from '@/utils/periodLabels'
import { useT } from '@/composables/useT'
import NextDayRail from './NextDayRail.vue'
import NextDayStage from './NextDayStage.vue'
import NextPeriodOverview from './NextPeriodOverview.vue'
import NextPeriodRail from './NextPeriodRail.vue'
import NextRitualHost from './NextRitualHost.vue'
import { usePlanningPeriodData } from './usePlanningPeriodData'
import './planning-next.css'

const props = defineProps<{
  scale: PlanningScale
  periodRef: string
  ui: PlanningUi
}>()

const route = useRoute()
const router = useRouter()
const { locale } = useT()
const dayPickerRef = ref<HTMLInputElement | null>(null)
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
const ritualAction = computed<'plan' | 'reflect' | null>(() => {
  if (props.scale === 'day') return null
  return route.query.action === 'plan' || route.query.action === 'reflect' ? route.query.action : null
})
const scaleOptions = [
  { value: 'day' as const, label: 'Dzień' },
  { value: 'week' as const, label: 'Tydzień' },
  { value: 'month' as const, label: 'Miesiąc' },
  { value: 'year' as const, label: 'Rok' },
]
const periodTitle = computed(() => {
  if (invalidRoute.value) return props.periodRef
  if (props.scale === 'year') return props.periodRef
  if (props.scale === 'month') return formatMonthTitle(props.periodRef as never, locale.value)
  if (props.scale === 'week') {
    const bounds = getPeriodBounds(props.periodRef as PeriodRef)
    return formatWeekRange(bounds.start, bounds.end)
  }
  return new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${props.periodRef}T12:00:00`))
})
const periodSubtitle = computed(() => {
  if (invalidRoute.value || props.scale === 'day' || props.scale === 'week' || props.scale === 'year') return ''
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

function routeFor(scale: PlanningScale, periodRef: string) {
  const names = { day: 'calendar-day', week: 'calendar-week', month: 'calendar-month', year: 'calendar-year' } as const
  const paramNames = { day: 'dayRef', week: 'weekRef', month: 'monthRef', year: 'yearRef' } as const
  return {
    name: names[scale],
    params: { [paramNames[scale]]: periodRef },
    query: route.query.ui ? { ui: route.query.ui } : {},
  }
}

function navigatePeriod(direction: -1 | 1) {
  if (invalidRoute.value) return
  const current = parsePeriodRef(props.periodRef)
  const next = direction === -1 ? getPreviousPeriod(current) : getNextPeriod(current)
  void router.push(routeFor(props.scale, next))
}

function navigateScale(nextScale: PlanningScale) {
  if (invalidRoute.value) return
  const nextRef = zoomPeriod(parsePeriodRef(props.periodRef), nextScale)
  void router.push(routeFor(nextScale, nextRef))
}

function navigateToRef(scale: PlanningScale, periodRef: string) {
  void router.push(routeFor(scale, periodRef))
}

function openNativePeriodPicker() {
  if (props.scale === 'day') dayPickerRef.value?.showPicker()
  if (props.scale === 'month') monthPickerRef.value?.showPicker()
}

function handleDayPicked(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) navigateToRef('day', value)
}

function handleMonthPicked(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) navigateToRef('month', value)
}

function openRitual(action: 'plan' | 'reflect') {
  void router.replace({ query: { ...(route.query.ui ? { ui: route.query.ui } : {}), action } })
}

function closeRitual() {
  void router.replace({ query: route.query.ui ? { ui: route.query.ui } : {} })
}

function handleRitualUpdated() {
  void reloadPeriod()
}

function planNextWeek() {
  if (props.scale !== 'week') return
  const nextWeek = getNextPeriod(parsePeriodRef(props.periodRef))
  void router.push({ ...routeFor('week', nextWeek), query: { ...(route.query.ui ? { ui: route.query.ui } : {}), action: 'plan' } })
}
</script>
