<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <Teleport to="#app-top-bar-end" :disabled="!useTopBarTeleport">
      <CalendarToolbar
        :class="useTopBarTeleport ? '' : 'mb-6'"
        :label="activePeriodRangeLabel"
        :scale-options="scaleOptions"
        :active-scale="scale"
        @prev="goToPreviousPeriod"
        @next="goToNextPeriod"
        @scale="goToScale($event as CalendarScale)"
      >
        <template v-if="showHeaderActions" #actions>
          <AppButton v-if="showPlanAction" :variant="planActionVariant" @click="openPlanPanel">
            <AppIcon name="calendar_month" class="text-base" />
            {{ planActionLabel }}
          </AppButton>
          <AppButton
            v-if="showReflectionAction"
            :variant="reflectionActionVariant"
            @click="openReflectionPanel"
          >
            <AppIcon name="auto_awesome" class="text-base" />
            {{ reflectionActionLabel }}
          </AppButton>
        </template>
      </CalendarToolbar>
    </Teleport>

    <PlanningStatePanel
      v-if="invalidRoute"
      :title="t('planning.calendar.invalidPeriod')"
      :body="t('planning.calendar.title')"
      :eyebrow="t('planning.calendar.title')"
    />

    <div v-else :class="calendarLayoutClasses">
      <div class="space-y-6">
        <PlanningStatePanel
          v-if="isLoading"
          :title="t('common.loading')"
          :body="t('planning.calendar.title')"
          :eyebrow="t('planning.calendar.title')"
          compact
        />

        <PlanningStatePanel
          v-else-if="loadError"
          :title="t('planning.calendar.loadError')"
          :body="loadError"
          :eyebrow="t('planning.calendar.title')"
          :action-label="t('common.buttons.tryAgain')"
          compact
          @action="void loadCalendarData()"
        />

        <template v-else>
          <AnnualPlanningWizard
            v-if="showAnnualPlanner && activeYearRef"
            :year-ref="activeYearRef"
            @close="closeAnnualPlanner"
            @updated="handleAnnualPlannerUpdated"
          />

          <template v-else>
            <!-- Reflection mode swaps the planner grid for the reflection form;
                 the period summary below stays visible the whole time. -->
            <MonthlyReflectionWizard
              v-if="showMonthlyReflection && activeMonthRef"
              :month-ref="activeMonthRef"
              @close="closeMonthlyReflection"
              @updated="handleMonthlyReflectionUpdated"
            />

            <WeeklyReflectionWizard
              v-else-if="showWeeklyReflection && activeWeekRef"
              :week-ref="activeWeekRef"
              @close="closeWeeklyReflection"
              @updated="handleWeeklyReflectionUpdated"
            />

            <MonthlyPlanner
              v-else-if="scale === 'month' && activeMonthRef"
              :month-ref="activeMonthRef"
              :show-sidebar="showMonthlyPlanner"
              @close="closeMonthlyPlanner"
              @updated="handleMonthlyPlannerUpdated"
            />

            <WeeklyPlanner
              v-else-if="scale === 'week' && activeWeekRef"
              :week-ref="activeWeekRef"
              :show-sidebar="showWeeklyPlanner"
              @close="closeWeeklyPlanner"
              @updated="handleWeeklyPlannerUpdated"
            />

            <section v-if="scale === 'year'" class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr">
                <CalendarMonthSummaryCard
                  v-for="month in yearSummary?.months ?? []"
                  :key="month.monthRef"
                  :title="formatMonthName(month.monthRef)"
                  :goal-groups="month.goalGroups"
                  :habit-groups="month.habitGroups"
                  @click="goToMonth(month.monthRef)"
                />
              </div>
            </section>

            <template v-else-if="scale === 'month' && monthPlanning && monthReflection">
              <MonthReviewSummary
                :month-ref="activeMonthRef!"
                :today-day-ref="todayRef"
                :month-object-items="monthObjectItems"
                :raw-entries="monthPlanning.rawEntries"
                :has-plan="Boolean(monthPlanning.monthPlan)"
                :kontekst-actions="!showMonthlyReflection"
                @create-reflection="openReflectionPanel"
                @edit-reflection="openReflectionPanel"
                @create-plan="openPlanPanel"
                @edit-plan="openPlanPanel"
              />
            </template>

            <template v-else-if="scale === 'week' && weekPlanning && weekReflection">
              <WeekReviewSummary
                :week-ref="activeWeekRef!"
                :today-day-ref="todayRef"
                :week-object-items="weekObjectItems"
                :raw-entries="weekPlanning.rawEntries"
                :all-day-assignments="weekDayAssignments"
                :has-plan="Boolean(weekPlanning.weekPlan)"
                :kontekst-actions="!showWeeklyReflection"
                @create-reflection="openReflectionPanel"
                @edit-reflection="openReflectionPanel"
                @create-plan="openPlanPanel"
                @edit-plan="openPlanPanel"
              />
            </template>

          </template>
        </template>
      </div>

      <CalendarSidePanel
        v-if="panelState"
        :open="Boolean(panelState)"
        :title="panelTitle"
        :body="panelBody"
        :meta="panelMeta"
        :show-note-field="panelShowsNoteField"
        :note="reflectionNote"
        :note-label="t('planning.calendar.panel.noteLabel')"
        :note-placeholder="t('planning.calendar.panel.notePlaceholder')"
        :show-confirm="panelShowsConfirm"
        :confirm-label="panelConfirmLabel"
        :confirm-disabled="panelConfirmDisabled"
        :close-label="t('common.buttons.close')"
        :saving="panelSaving"
        :saving-label="t('common.saving')"
        :empty-title="t('planning.calendar.panel.closedTitle')"
        :empty-body="t('planning.calendar.panel.closedBody')"
        @close="closePanel"
        @confirm="submitPanel"
        @update:note="reflectionNote = $event"
      >
        <div
          v-if="panelMode === 'plan' && currentPlanRecord"
          class="neo-inset rounded-[1.75rem] p-4 text-sm leading-6 text-on-surface-variant"
        >
          {{ t('planning.calendar.details.emptyPlanExisting') }}
        </div>
        <div
          v-else-if="panelMode === 'plan'"
          class="neo-inset rounded-[1.75rem] p-4 text-sm leading-6 text-on-surface-variant"
        >
          {{ t('planning.calendar.details.emptyPlan') }}
        </div>
        <div
          v-else-if="panelKind.startsWith('year')"
          class="neo-inset rounded-[1.75rem] p-4 text-sm leading-6 text-on-surface-variant"
        >
          {{ t('planning.calendar.details.yearPlaceholder') }}
        </div>
        <div
          v-else-if="panelMode === 'reflection'"
          class="neo-inset rounded-[1.75rem] p-4 text-sm leading-6 text-on-surface-variant"
        >
          {{ t('planning.calendar.details.reflectionPlaceholder') }}
        </div>
      </CalendarSidePanel>
    </div>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { MeasurementDayAssignment } from '@/domain/planningState'
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import type {
  MonthPlanningBundle,
  WeekReflectionBundle,
  WeekPlanningBundle,
} from '@/services/planningStateQueries'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import { loadDayAssignmentsForMonths } from '@/services/reflectionDataQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import type {
  CalendarYearSummary,
  MonthReflectionBundle,
} from '@/services/calendarViewQueries'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import CalendarToolbar from '@/components/calendar/CalendarToolbar.vue'
import CalendarMonthSummaryCard from '@/components/calendar/CalendarMonthSummaryCard.vue'
import MonthReviewSummary from '@/components/calendar/MonthReviewSummary.vue'
import WeekReviewSummary from '@/components/calendar/WeekReviewSummary.vue'
import MonthlyPlanner from '@/components/calendar/MonthlyPlanner.vue'
import WeeklyPlanner from '@/components/calendar/WeeklyPlanner.vue'
import WeeklyReflectionWizard from '@/components/calendar/WeeklyReflectionWizard.vue'
import MonthlyReflectionWizard from '@/components/calendar/MonthlyReflectionWizard.vue'
import AnnualPlanningWizard from '@/components/calendar/AnnualPlanningWizard.vue'
import CalendarSidePanel from '@/components/calendar/CalendarSidePanel.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import { useT } from '@/composables/useT'
import { clearTrendCache } from '@/services/calendarChartData'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { annualPlanDexieRepository } from '@/repositories/annualPlanDexieRepository'
import type { AnnualPlan } from '@/domain/annualPlan'
import {
  getCalendarYearSummary,
  getMonthReflectionBundle,
} from '@/services/calendarViewQueries'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import {
  containsDay,
  getNextPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPeriodType,
  getPreviousPeriod,
  parsePeriodRef,
  zoomPeriod,
} from '@/utils/periods'
import {
  formatMonthName as formatMonthNameLabel,
  formatMonthTitle as formatMonthTitleLabel,
  formatTimestamp as formatTimestampLabel,
  formatWeekTitle as formatWeekTitleLabel,
} from '@/utils/periodLabels'
import AppIcon from '@/components/shared/AppIcon.vue'

type CalendarScale = 'year' | 'month' | 'week'
type PanelKind =
  | 'year-plan'
  | 'year-reflection'
  | 'month-plan'
  | 'month-reflection'
  | 'week-plan'
  | 'week-reflection'

interface Props {
  scale: CalendarScale
  periodRef: string
}

const props = defineProps<Props>()

const router = useRouter()
const { t, locale } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const yearSummary = ref<CalendarYearSummary | null>(null)
const annualPlan = ref<AnnualPlan | null>(null)
const monthPlanning = ref<MonthPlanningBundle | null>(null)
const monthReflection = ref<MonthReflectionBundle | null>(null)
const weekPlanning = ref<WeekPlanningBundle | null>(null)
const weekReflection = ref<WeekReflectionBundle | null>(null)
const weekDayAssignments = ref<MeasurementDayAssignment[]>([])
const anchorDay = ref<DayRef | null>(null)
const panelState = ref<PanelKind | null>(null)
const monthlyPlannerOpen = ref(false)
const monthlyPlannerDirty = ref(false)
const weeklyPlannerOpen = ref(false)
const weeklyPlannerDirty = ref(false)
const annualPlannerOpen = ref(false)
const annualPlannerDirty = ref(false)
const weeklyReflectionOpen = ref(false)
const weeklyReflectionDirty = ref(false)
const monthlyReflectionOpen = ref(false)
const monthlyReflectionDirty = ref(false)
const reflectionNote = ref('')
const panelSaving = ref(false)

const parsedPeriodRef = computed<PeriodRef | null>(() => {
  try {
    const parsed = parsePeriodRef(props.periodRef)
    return getPeriodType(parsed) === props.scale ? parsed : null
  } catch {
    return null
  }
})
const scale = computed(() => props.scale)

// Week and month views teleport the toolbar into AppTopAppBar's
// `#app-top-bar-end`. Tests render CalendarView in isolation (no AppTopAppBar)
// — fall back to inline rendering when the target is missing so the toolbar
// still mounts.
const topBarTargetReady = ref(
  typeof document !== 'undefined' && document.querySelector('#app-top-bar-end') !== null,
)
onMounted(() => {
  if (!topBarTargetReady.value) {
    topBarTargetReady.value =
      typeof document !== 'undefined' && document.querySelector('#app-top-bar-end') !== null
  }
})
const useTopBarTeleport = computed(
  () => (props.scale === 'week' || props.scale === 'month') && topBarTargetReady.value,
)

const invalidRoute = computed(() => parsedPeriodRef.value === null)
const activeYearRef = computed(() =>
  props.scale === 'year' && parsedPeriodRef.value ? (parsedPeriodRef.value as YearRef) : null
)
const activeMonthRef = computed(() =>
  props.scale === 'month' && parsedPeriodRef.value ? (parsedPeriodRef.value as MonthRef) : null
)
const activeWeekRef = computed(() =>
  props.scale === 'week' && parsedPeriodRef.value ? (parsedPeriodRef.value as WeekRef) : null
)
const todayRef = computed(() => getPeriodRefsForDate(new Date()).day)

const calendarLayoutClasses = computed(() => [
  'grid gap-6',
  panelState.value ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : 'grid-cols-1',
])

const scaleOptions = computed(() => [
  { scale: 'week' as const, label: t('planning.calendar.scales.week') },
  { scale: 'month' as const, label: t('planning.calendar.scales.month') },
  { scale: 'year' as const, label: t('planning.calendar.scales.year') },
])

const currentBounds = computed(() =>
  parsedPeriodRef.value ? getPeriodBounds(parsedPeriodRef.value) : null
)

const currentPlanRecord = computed(() => {
  if (props.scale === 'year') {
    return annualPlan.value
  }

  if (props.scale === 'month') {
    return monthPlanning.value?.monthPlan
  }

  if (props.scale === 'week') {
    return weekPlanning.value?.weekPlan
  }

  return undefined
})

const currentReflectionRecord = computed(() => {
  if (props.scale === 'month') {
    return monthReflection.value?.periodReflection
  }

  if (props.scale === 'week') {
    return weekReflection.value?.periodReflection
  }

  return undefined
})

const activePeriodLabel = computed(() => {
  if (!parsedPeriodRef.value) {
    return t('planning.calendar.title')
  }

  switch (props.scale) {
    case 'year':
      return parsedPeriodRef.value as string
    case 'month':
      return formatMonthTitle(parsedPeriodRef.value as MonthRef)
    case 'week':
      return formatWeekTitle(parsedPeriodRef.value as WeekRef)
    default:
      return ''
  }
})

function formatShortDay(dayRef: DayRef): string {
  const date = new Date(`${dayRef}T00:00:00`)
  return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
}

const activePeriodRangeLabel = computed(() => {
  if (!parsedPeriodRef.value) return ''

  switch (props.scale) {
    case 'year':
      return parsedPeriodRef.value as string
    case 'month':
      return formatMonthTitle(parsedPeriodRef.value as MonthRef)
    case 'week': {
      const weekRef = parsedPeriodRef.value as WeekRef
      const num = weekRef.slice(-2)
      if (!currentBounds.value) return `W${num}`
      return `W${num}: ${formatShortDay(currentBounds.value.start)} - ${formatShortDay(currentBounds.value.end)}`
    }
    default:
      return ''
  }
})

// Week and month scales move both actions into per-card affordances inside
// WeekReviewSummary / MonthReviewSummary: the plan action lives on the
// Plan-vs-Execution tile, the reflection action on the KontextCard.
const showPlanAction = computed(() => props.scale === 'year')
const showReflectionAction = computed(() => props.scale === 'year')
const showHeaderActions = computed(() => showPlanAction.value || showReflectionAction.value)

const planActionLabel = computed(() => {
  if (props.scale === 'year') {
    return annualPlannerOpen.value
      ? t('common.buttons.close')
      : currentPlanRecord.value
        ? t('planning.calendar.actions.editPlan')
        : t('planning.calendar.actions.createPlan')
  }
  if (props.scale === 'month') {
    return monthlyPlannerOpen.value
      ? t('common.buttons.close')
      : currentPlanRecord.value
        ? t('planning.calendar.actions.editPlan')
        : t('planning.calendar.actions.createPlan')
  }
  if (props.scale === 'week') {
    return weeklyPlannerOpen.value
      ? t('common.buttons.close')
      : currentPlanRecord.value
        ? t('planning.calendar.actions.editPlan')
        : t('planning.calendar.actions.createPlan')
  }
  return t('planning.calendar.actions.createPlan')
})

const reflectionActionLabel = computed(() => {
  if (props.scale === 'month' && monthlyReflectionOpen.value) {
    return t('common.buttons.close')
  }
  if (props.scale === 'week' && weeklyReflectionOpen.value) {
    return t('common.buttons.close')
  }
  return currentReflectionRecord.value
    ? t('planning.calendar.actions.editReflection')
    : t('planning.calendar.actions.createReflection')
})

const planActionVariant = computed<'filled' | 'tonal'>(() => {
  if (props.scale === 'year') {
    return annualPlannerOpen.value
      ? 'tonal'
      : currentPlanRecord.value
        ? 'tonal'
        : 'filled'
  }
  if (props.scale === 'month') {
    return monthlyPlannerOpen.value
      ? 'tonal'
      : currentPlanRecord.value
        ? 'tonal'
        : 'filled'
  }
  if (props.scale === 'week') {
    return weeklyPlannerOpen.value
      ? 'tonal'
      : currentPlanRecord.value
        ? 'tonal'
        : 'filled'
  }
  return 'filled'
})
const reflectionActionVariant = computed<'filled' | 'tonal'>(() => {
  if (props.scale === 'month' && monthlyReflectionOpen.value) return 'tonal'
  if (props.scale === 'week' && weeklyReflectionOpen.value) return 'tonal'
  if (!currentPlanRecord.value) return 'tonal'
  return currentReflectionRecord.value ? 'tonal' : 'filled'
})

const showAnnualPlanner = computed(() => props.scale === 'year' && annualPlannerOpen.value)
const showMonthlyPlanner = computed(() => props.scale === 'month' && monthlyPlannerOpen.value)
const showWeeklyPlanner = computed(() => props.scale === 'week' && weeklyPlannerOpen.value)
const showWeeklyReflection = computed(() => props.scale === 'week' && weeklyReflectionOpen.value)
const showMonthlyReflection = computed(() => props.scale === 'month' && monthlyReflectionOpen.value)

// Flat list of all objects active this week, in the same KR→habit→tracker
// order used by the reflection wizard. Consumed by WeekReviewSummary.
const weekObjectItems = computed<WeekObjectItem[]>(() => {
  const reflection = weekReflection.value
  if (!reflection) return []

  const items: WeekObjectItem[] = []
  const goalMap = new Map(
    reflection.relevant.goalItems.map((item) => [item.goal.id, item.goal]),
  )

  const krItems = reflection.relevant.cadencedItems.filter(
    (item) => item.subjectType === 'keyResult',
  )
  const habitItems = reflection.relevant.cadencedItems.filter(
    (item) => item.subjectType === 'habit',
  )
  const trackerItems = reflection.relevant.trackerItems

  const krsByGoal = new Map<string, typeof krItems>()
  for (const kr of krItems) {
    if ('goalId' in kr.subject) {
      const list = krsByGoal.get(kr.subject.goalId) ?? []
      list.push(kr)
      krsByGoal.set(kr.subject.goalId, list)
    }
  }

  let goalIndex = 0
  for (const [goalId, krs] of krsByGoal) {
    const goal = goalMap.get(goalId)
    krs.forEach((kr, krIndex) => {
      items.push({
        key: `keyResult:${kr.subject.id}`,
        subjectType: 'keyResult',
        subject: kr.subject,
        planning: kr.planning,
        measurement: kr.measurement,
        parentGoalId: goal?.id,
        parentGoalIcon: goal?.icon,
        parentGoalTitle: goal?.title,
        sortOrder: 1000 * goalIndex + krIndex,
      })
    })
    goalIndex++
  }

  habitItems.forEach((habit, i) => {
    items.push({
      key: `habit:${habit.subject.id}`,
      subjectType: 'habit',
      subject: habit.subject,
      planning: habit.planning,
      measurement: habit.measurement,
      sortOrder: 100_000 + i,
    })
  })

  trackerItems.forEach((tracker, i) => {
    items.push({
      key: `tracker:${tracker.subject.id}`,
      subjectType: 'tracker',
      subject: tracker.subject,
      planning: tracker.planning,
      measurement: tracker.measurement,
      sortOrder: 200_000 + i,
    })
  })

  return items
})

// Flat list of all objects active this month, mirroring weekObjectItems in
// structure. Consumed by MonthReviewSummary. Per-object measurement is built
// against the month period; per-week aggregates for chart slots are computed
// inside the tile components via monthlySliceChartData.
const monthObjectItems = computed<MonthObjectItem[]>(() => {
  const bundle = monthPlanning.value
  if (!bundle) return []

  const items: MonthObjectItem[] = []
  const goalMap = new Map(bundle.goalItems.map((item) => [item.goal.id, item.goal]))

  const krItems = bundle.cadencedItems.filter((item) => item.subjectType === 'keyResult')
  const habitItems = bundle.cadencedItems.filter((item) => item.subjectType === 'habit')
  const trackerItems = bundle.trackerItems

  const krsByGoal = new Map<string, typeof krItems>()
  for (const kr of krItems) {
    if ('goalId' in kr.subject) {
      const list = krsByGoal.get(kr.subject.goalId) ?? []
      list.push(kr)
      krsByGoal.set(kr.subject.goalId, list)
    }
  }

  let goalIndex = 0
  for (const [goalId, krs] of krsByGoal) {
    const goal = goalMap.get(goalId)
    krs.forEach((kr, krIndex) => {
      items.push({
        key: `keyResult:${kr.subject.id}`,
        subjectType: 'keyResult',
        subject: kr.subject,
        planning: kr.planning,
        measurement:
          kr.measurement ??
          buildMeasurementSummary(kr.subject, bundle.rawEntries, bundle.monthRef),
        parentGoalId: goal?.id,
        parentGoalIcon: goal?.icon,
        parentGoalTitle: goal?.title,
        sortOrder: 1000 * goalIndex + krIndex,
      })
    })
    goalIndex++
  }

  habitItems.forEach((habit, i) => {
    items.push({
      key: `habit:${habit.subject.id}`,
      subjectType: 'habit',
      subject: habit.subject,
      planning: habit.planning,
      measurement:
        habit.measurement ??
        buildMeasurementSummary(habit.subject, bundle.rawEntries, bundle.monthRef),
      sortOrder: 100_000 + i,
    })
  })

  trackerItems.forEach((tracker, i) => {
    items.push({
      key: `tracker:${tracker.subject.id}`,
      subjectType: 'tracker',
      subject: tracker.subject,
      planning: tracker.planning,
      measurement:
        tracker.measurement ??
        buildMeasurementSummary(tracker.subject, bundle.rawEntries, bundle.monthRef),
      sortOrder: 200_000 + i,
    })
  })

  return items
})

const panelKind = computed(() => panelState.value ?? 'month-plan')
const panelMode = computed<'plan' | 'reflection'>(() =>
  panelKind.value.includes('reflection') ? 'reflection' : 'plan'
)

const panelTitle = computed(() => {
  switch (panelKind.value) {
    case 'year-plan':
      return t('planning.calendar.panel.yearPlanTitle')
    case 'year-reflection':
      return t('planning.calendar.panel.yearReflectionTitle')
    case 'month-plan':
      return t('planning.calendar.panel.monthPlanTitle')
    case 'month-reflection':
      return t('planning.calendar.panel.monthReflectionTitle')
    case 'week-plan':
      return t('planning.calendar.panel.weekPlanTitle')
    case 'week-reflection':
      return t('planning.calendar.panel.weekReflectionTitle')
    default:
      return ''
  }
})

const panelBody = computed(() => {
  if (panelKind.value.startsWith('year')) {
    return t('planning.calendar.details.yearPlaceholder')
  }

  if (panelMode.value === 'plan') {
    return currentPlanRecord.value
      ? t('planning.calendar.details.emptyPlanExisting')
      : t('planning.calendar.details.emptyPlan')
  }

  return t('planning.calendar.details.reflectionPlaceholder')
})

const panelMeta = computed(() => {
  const items: Array<{ label: string; value: string }> = [
    { label: t('planning.calendar.title'), value: activePeriodLabel.value },
  ]

  if (currentPlanRecord.value) {
    items.push(
      {
        label: t('planning.calendar.details.createdAt'),
        value: formatTimestamp(currentPlanRecord.value.createdAt),
      },
      {
        label: t('planning.calendar.details.updatedAt'),
        value: formatTimestamp(currentPlanRecord.value.updatedAt),
      }
    )
  } else if (currentReflectionRecord.value) {
    items.push(
      {
        label: t('planning.calendar.details.createdAt'),
        value: formatTimestamp(currentReflectionRecord.value.createdAt),
      },
      {
        label: t('planning.calendar.details.updatedAt'),
        value: formatTimestamp(currentReflectionRecord.value.updatedAt),
      }
    )
  }

  return items
})

const panelShowsNoteField = computed(
  () =>
    Boolean(panelState.value) &&
    panelMode.value === 'reflection' &&
    !panelKind.value.startsWith('year')
)
const panelShowsConfirm = computed(() => {
  if (!panelState.value) {
    return false
  }

  if (panelKind.value.startsWith('year')) {
    return false
  }

  if (panelMode.value === 'plan') {
    return !currentPlanRecord.value
  }

  return true
})
const panelConfirmLabel = computed(() =>
  panelMode.value === 'reflection'
    ? t('planning.calendar.actions.saveReflection')
    : t('planning.calendar.actions.createPlanRecord')
)
const panelConfirmDisabled = computed(
  () => panelMode.value === 'reflection' && reflectionNote.value.trim().length === 0
)

watch(
  () => [props.scale, props.periodRef] as const,
  async () => {
    panelState.value = null
    annualPlannerOpen.value = false
    monthlyPlannerOpen.value = false
    weeklyPlannerOpen.value = false
    weeklyReflectionOpen.value = false
    monthlyReflectionOpen.value = false
    reflectionNote.value = ''
    await loadCalendarData()
  },
  { immediate: true }
)

async function loadCalendarData() {
  clearTrendCache()
  yearSummary.value = null
  annualPlan.value = null
  monthPlanning.value = null
  monthReflection.value = null
  weekPlanning.value = null
  weekReflection.value = null
  weekDayAssignments.value = []
  loadError.value = null

  if (!parsedPeriodRef.value) {
    isLoading.value = false
    return
  }

  syncAnchorDay(parsedPeriodRef.value)
  isLoading.value = true

  try {
    switch (props.scale) {
      case 'year':
        {
          const [nextYearSummary, nextAnnualPlan] = await Promise.all([
            getCalendarYearSummary(parsedPeriodRef.value as YearRef),
            annualPlanDexieRepository.getByYearRef(parsedPeriodRef.value as YearRef),
          ])
          yearSummary.value = nextYearSummary
          annualPlan.value = nextAnnualPlan ?? null
        }
        break
      case 'month':
        ;[monthPlanning.value, monthReflection.value] = await Promise.all([
          getMonthPlanningBundle(parsedPeriodRef.value as MonthRef),
          getMonthReflectionBundle(parsedPeriodRef.value as MonthRef),
        ])
        break
      case 'week': {
        const weekRef = parsedPeriodRef.value as WeekRef
        const weekEnd = getPeriodBounds(weekRef).end as DayRef
        ;[weekPlanning.value, weekReflection.value] = await Promise.all([
          getWeekPlanningBundle(weekRef, weekEnd),
          getWeekReflectionBundle(weekRef, weekEnd),
        ])
        weekDayAssignments.value = await loadDayAssignmentsForMonths(
          weekReflection.value?.overlappingMonthRefs ?? [],
        )
        break
      }
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

function syncAnchorDay(periodRef: PeriodRef) {
  if (!anchorDay.value || !containsDay(periodRef, anchorDay.value)) {
    anchorDay.value = getPeriodBounds(periodRef).start
  }
}

function goToPreviousPeriod() {
  if (!parsedPeriodRef.value) {
    return
  }

  navigateTo(props.scale, getPreviousPeriod(parsedPeriodRef.value))
}

function goToNextPeriod() {
  if (!parsedPeriodRef.value) {
    return
  }

  navigateTo(props.scale, getNextPeriod(parsedPeriodRef.value))
}

function goToScale(targetScale: CalendarScale) {
  if (!parsedPeriodRef.value) {
    return
  }

  const nextRef = zoomPeriod(parsedPeriodRef.value, targetScale, anchorDay.value ?? undefined)
  navigateTo(targetScale, nextRef)
}

function goToMonth(monthRef: MonthRef) {
  anchorDay.value = getPeriodBounds(monthRef).start
  navigateTo('month', monthRef)
}

function navigateTo(scale: CalendarScale, periodRef: PeriodRef) {
  switch (scale) {
    case 'year':
      router.push({ name: 'calendar-year', params: { yearRef: periodRef } })
      break
    case 'month':
      router.push({ name: 'calendar-month', params: { monthRef: periodRef } })
      break
    case 'week':
      router.push({ name: 'calendar-week', params: { weekRef: periodRef } })
      break
  }
}

function openPlanPanel() {
  if (props.scale === 'year') {
    if (annualPlannerOpen.value) {
      closeAnnualPlanner()
      return
    }

    panelState.value = null
    annualPlannerOpen.value = true
    annualPlannerDirty.value = true
    return
  }

  if (props.scale === 'month') {
    void (async () => {
      if (monthlyPlannerOpen.value) {
        closeMonthlyPlanner()
        return
      }

      if (!parsedPeriodRef.value) {
        return
      }

      if (!monthPlanning.value?.monthPlan) {
        await periodPlanDexieRepository.createMonthPlan({
          monthRef: parsedPeriodRef.value as MonthRef,
        })
        await loadCalendarData()
      }

      monthlyPlannerOpen.value = true
      monthlyPlannerDirty.value = false
    })()
    return
  }

  if (props.scale === 'week') {
    void (async () => {
      if (weeklyPlannerOpen.value) {
        closeWeeklyPlanner()
        return
      }

      if (!parsedPeriodRef.value) {
        return
      }

      if (!weekPlanning.value?.weekPlan) {
        await periodPlanDexieRepository.createWeekPlan({
          weekRef: parsedPeriodRef.value as WeekRef,
        })
        await loadCalendarData()
      }

      weeklyPlannerOpen.value = true
      weeklyPlannerDirty.value = false
    })()
    return
  }

}

function handleAnnualPlannerUpdated() {
  annualPlannerDirty.value = true
}

function closeAnnualPlanner() {
  annualPlannerOpen.value = false
  if (annualPlannerDirty.value) {
    annualPlannerDirty.value = false
    void loadCalendarData()
  }
}

function handleMonthlyPlannerUpdated() {
  monthlyPlannerDirty.value = true
}

function closeMonthlyPlanner() {
  monthlyPlannerOpen.value = false
  if (monthlyPlannerDirty.value) {
    monthlyPlannerDirty.value = false
    void loadCalendarData()
  }
}

function handleWeeklyPlannerUpdated() {
  weeklyPlannerDirty.value = true
}

function closeWeeklyPlanner() {
  weeklyPlannerOpen.value = false
  if (weeklyPlannerDirty.value) {
    weeklyPlannerDirty.value = false
    void loadCalendarData()
  }
}

function openReflectionPanel() {
  switch (props.scale) {
    case 'year':
      panelState.value = 'year-reflection'
      reflectionNote.value = ''
      break
    case 'month':
      if (monthlyReflectionOpen.value) {
        closeMonthlyReflection()
      } else {
        monthlyReflectionOpen.value = true
        monthlyReflectionDirty.value = false
      }
      break
    case 'week':
      if (weeklyReflectionOpen.value) {
        closeWeeklyReflection()
      } else {
        weeklyReflectionOpen.value = true
        weeklyReflectionDirty.value = false
      }
      break
  }
}

function handleWeeklyReflectionUpdated() {
  weeklyReflectionDirty.value = true
}

function closeWeeklyReflection() {
  weeklyReflectionOpen.value = false
  if (weeklyReflectionDirty.value) {
    weeklyReflectionDirty.value = false
    void loadCalendarData()
  }
}

function handleMonthlyReflectionUpdated() {
  monthlyReflectionDirty.value = true
}

function closeMonthlyReflection() {
  monthlyReflectionOpen.value = false
  if (monthlyReflectionDirty.value) {
    monthlyReflectionDirty.value = false
    void loadCalendarData()
  }
}

function closePanel() {
  panelState.value = null
  reflectionNote.value = ''
}

async function submitPanel() {
  if (!parsedPeriodRef.value || !panelState.value || panelKind.value.startsWith('year')) {
    return
  }

  panelSaving.value = true

  try {
    switch (panelKind.value) {
      case 'month-plan':
        if (!monthPlanning.value?.monthPlan) {
          await periodPlanDexieRepository.createMonthPlan({
            monthRef: parsedPeriodRef.value as MonthRef,
          })
          snackbarRef.value?.show(t('planning.calendar.panel.planSuccess'))
        }
        break
      case 'week-plan':
        if (!weekPlanning.value?.weekPlan) {
          await periodPlanDexieRepository.createWeekPlan({
            weekRef: parsedPeriodRef.value as WeekRef,
          })
          snackbarRef.value?.show(t('planning.calendar.panel.planSuccess'))
        }
        break
      case 'month-reflection':
        await reflectionDexieRepository.upsertPeriodReflection({
          periodType: 'month',
          periodRef: parsedPeriodRef.value as MonthRef,
          note: reflectionNote.value.trim(),
        })
        snackbarRef.value?.show(t('planning.calendar.panel.saveSuccess'))
        break
      case 'week-reflection':
        await reflectionDexieRepository.upsertPeriodReflection({
          periodType: 'week',
          periodRef: parsedPeriodRef.value as WeekRef,
          note: reflectionNote.value.trim(),
        })
        snackbarRef.value?.show(t('planning.calendar.panel.saveSuccess'))
        break
    }

    closePanel()
    await loadCalendarData()
  } catch (error) {
    snackbarRef.value?.show(error instanceof Error ? error.message : String(error))
  } finally {
    panelSaving.value = false
  }
}

function formatMonthTitle(monthRef: MonthRef): string {
  return formatMonthTitleLabel(monthRef, locale.value)
}

function formatMonthName(monthRef: MonthRef): string {
  return formatMonthNameLabel(monthRef, locale.value)
}

function formatWeekTitle(weekRef: WeekRef): string {
  return formatWeekTitleLabel(weekRef, locale.value, t('planning.calendar.scales.week'))
}

function formatTimestamp(value: string): string {
  return formatTimestampLabel(value, locale.value)
}
</script>
