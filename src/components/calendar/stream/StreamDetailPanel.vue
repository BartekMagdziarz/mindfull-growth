<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import { getPeriodBounds } from '@/utils/periods'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import { loadDayAssignmentsForMonths } from '@/services/reflectionDataQueries'
import { listWeeklyIntentionsForMonth } from '@/services/weeklyIntentionService'
import {
  buildMonthObjectItems,
  buildWeekObjectItems,
  extractWeekIntentions,
} from '@/components/calendar/objectItems'
import MonthReviewSummary from '@/components/calendar/MonthReviewSummary.vue'
import WeekReviewSummary from '@/components/calendar/WeekReviewSummary.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import { useT } from '@/composables/useT'

const props = defineProps<{
  scale: 'year' | 'month' | 'week'
  monthRef: MonthRef
  weekRef: WeekRef
  todayRef: DayRef
}>()

const { t } = useT()
const router = useRouter()

/**
 * The planning/reflection wizards live in the classic CalendarView. Route there
 * for the focused period with `?action`, so the wizard opens straight away.
 */
function openClassicAction(action: 'plan' | 'reflect') {
  // origin=stream lets CalendarView return here when the wizard closes (see maybeReturnToStream).
  if (props.scale === 'month') {
    void router.push({
      name: 'calendar-month',
      params: { monthRef: props.monthRef },
      query: { action, origin: 'stream' },
    })
  } else if (props.scale === 'week') {
    void router.push({
      name: 'calendar-week',
      params: { weekRef: props.weekRef },
      query: { action, origin: 'stream' },
    })
  }
}

const isLoading = ref(false)
const loadError = ref<string | null>(null)

const monthItems = ref<MonthObjectItem[]>([])
const monthRawEntries = ref<DailyMeasurementEntry[]>([])
const monthHasPlan = ref(false)
const monthIntentions = ref<WeeklyIntention[]>([])

const weekItems = ref<WeekObjectItem[]>([])
const weekRawEntries = ref<DailyMeasurementEntry[]>([])
const weekHasPlan = ref(false)
const weekDayAssignments = ref<MeasurementDayAssignment[]>([])
const weekIntentions = ref<WeeklyIntention[]>([])

// Monotonic token guards against out-of-order async resolution when the user
// navigates faster than a load completes.
let loadToken = 0

async function load() {
  if (props.scale !== 'month' && props.scale !== 'week') return

  const token = ++loadToken
  isLoading.value = true
  loadError.value = null

  try {
    if (props.scale === 'month') {
      const [bundle, intentions] = await Promise.all([
        getMonthPlanningBundle(props.monthRef),
        listWeeklyIntentionsForMonth(props.monthRef),
      ])
      if (token !== loadToken) return
      monthItems.value = buildMonthObjectItems(bundle)
      monthRawEntries.value = bundle.rawEntries
      monthHasPlan.value = Boolean(bundle.monthPlan)
      monthIntentions.value = intentions
    } else {
      const weekEnd = getPeriodBounds(props.weekRef).end as DayRef
      const [planning, reflection] = await Promise.all([
        getWeekPlanningBundle(props.weekRef, weekEnd),
        getWeekReflectionBundle(props.weekRef, weekEnd),
      ])
      const assignments = await loadDayAssignmentsForMonths(reflection.overlappingMonthRefs)
      if (token !== loadToken) return
      weekItems.value = buildWeekObjectItems(reflection)
      weekRawEntries.value = planning.rawEntries
      weekHasPlan.value = Boolean(planning.weekPlan)
      weekDayAssignments.value = assignments
      weekIntentions.value = extractWeekIntentions(reflection)
    }
  } catch (error) {
    if (token !== loadToken) return
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (token === loadToken) isLoading.value = false
  }
}

watch(() => [props.scale, props.monthRef, props.weekRef], load, { immediate: true })
</script>

<template>
  <div>
    <PlanningStatePanel
      v-if="isLoading"
      :title="t('common.loading')"
      :eyebrow="t('planning.calendar.stream.detailsTitle')"
      :body="t('planning.calendar.stream.detailsLoading')"
      compact
    />
    <PlanningStatePanel
      v-else-if="loadError"
      :title="t('planning.calendar.loadError')"
      :body="loadError"
      :eyebrow="t('planning.calendar.stream.detailsTitle')"
      :action-label="t('common.buttons.tryAgain')"
      compact
      @action="load"
    />
    <MonthReviewSummary
      v-else-if="scale === 'month'"
      :month-ref="monthRef"
      :today-day-ref="todayRef"
      :month-object-items="monthItems"
      :raw-entries="monthRawEntries"
      :has-plan="monthHasPlan"
      :weekly-intentions="monthIntentions"
      @create-plan="openClassicAction('plan')"
      @edit-plan="openClassicAction('plan')"
      @create-reflection="openClassicAction('reflect')"
      @edit-reflection="openClassicAction('reflect')"
    />
    <WeekReviewSummary
      v-else-if="scale === 'week'"
      :week-ref="weekRef"
      :today-day-ref="todayRef"
      :week-object-items="weekItems"
      :raw-entries="weekRawEntries"
      :all-day-assignments="weekDayAssignments"
      :has-plan="weekHasPlan"
      :weekly-intentions="weekIntentions"
      @create-plan="openClassicAction('plan')"
      @edit-plan="openClassicAction('plan')"
      @create-reflection="openClassicAction('reflect')"
      @edit-reflection="openClassicAction('reflect')"
    />
  </div>
</template>
