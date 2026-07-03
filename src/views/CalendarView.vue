<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <Teleport to="#app-top-bar-end" :disabled="!useTopBarTeleport">
      <CalendarToolbar
        v-if="!wizardActive"
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
              v-else-if="showWeekWizard && activeWeekRef"
              :week-ref="activeWeekRef"
              @close="closeWeekWizard"
              @updated="handleWeekWizardUpdated"
              @plan-next-week="planNextWeek"
            />

            <MonthlyPlanner
              v-else-if="scale === 'month' && activeMonthRef"
              :month-ref="activeMonthRef"
              :show-sidebar="showMonthlyPlanner"
              @close="closeMonthlyPlanner"
              @updated="handleMonthlyPlannerUpdated"
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
                :kontekst-actions="!showWeekWizard"
                @create-reflection="openWeekWizard"
                @edit-reflection="openWeekWizard"
                @create-plan="openWeekWizard"
                @edit-plan="openWeekWizard"
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
import { useRoute, useRouter } from 'vue-router'
import type { MeasurementDayAssignment } from '@/domain/planningState'
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import type {
  MonthPlanningBundle,
  WeekReflectionBundle,
  WeekPlanningBundle,
} from '@/services/planningStateQueries'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import { loadDayAssignmentsForMonths } from '@/services/reflectionDataQueries'
import { buildMonthObjectItems, buildWeekObjectItems } from '@/components/calendar/objectItems'
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
const route = useRoute()
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
// One unified week ritual wizard (planning + date-gated reflection) replaces the
// separate week-planning and week-reflection panels.
const weekWizardOpen = ref(false)
const weekWizardDirty = ref(false)
// Set just before navigating W → W+1 so the watcher re-opens the wizard after the route change.
const pendingOpenWizard = ref(false)
// Set when the wizard was opened from the Strumień stream (deep-link ?origin=stream); on close we
// navigate back to the stream instead of stranding the user in the classic calendar.
const returnToStream = ref(false)
const annualPlannerOpen = ref(false)
const annualPlannerDirty = ref(false)
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
// WeekReviewSummary / MonthReviewSummary: both the plan and reflection
// actions live in the KontextCard ("Podsumowanie" panel).
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
    return currentPlanRecord.value
      ? t('planning.calendar.actions.editPlan')
      : t('planning.calendar.actions.createPlan')
  }
  return t('planning.calendar.actions.createPlan')
})

const reflectionActionLabel = computed(() => {
  if (props.scale === 'month' && monthlyReflectionOpen.value) {
    return t('common.buttons.close')
  }
  if (props.scale === 'week' && weekWizardOpen.value) {
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
    return currentPlanRecord.value ? 'tonal' : 'filled'
  }
  return 'filled'
})
const reflectionActionVariant = computed<'filled' | 'tonal'>(() => {
  if (props.scale === 'month' && monthlyReflectionOpen.value) return 'tonal'
  if (props.scale === 'week' && weekWizardOpen.value) return 'tonal'
  if (!currentPlanRecord.value) return 'tonal'
  return currentReflectionRecord.value ? 'tonal' : 'filled'
})

const showAnnualPlanner = computed(() => props.scale === 'year' && annualPlannerOpen.value)
const showMonthlyPlanner = computed(() => props.scale === 'month' && monthlyPlannerOpen.value)
const showWeekWizard = computed(() => props.scale === 'week' && weekWizardOpen.value)
const showMonthlyReflection = computed(() => props.scale === 'month' && monthlyReflectionOpen.value)

// While any planner/reflection wizard owns the body, hide the period/scale toolbar:
// it otherwise leaks into the global top bar (esp. when launched from the Strumień stream)
// and its scale switcher can silently navigate away and discard the open wizard.
const wizardActive = computed(
  () =>
    showAnnualPlanner.value ||
    showMonthlyPlanner.value ||
    showWeekWizard.value ||
    showMonthlyReflection.value,
)

// Flat, sorted object lists for the period summaries. The derivation is shared
// with the Strumień stream view via buildWeekObjectItems / buildMonthObjectItems
// so both calendars render the same objects in the same order.
const weekObjectItems = computed<WeekObjectItem[]>(() =>
  weekReflection.value ? buildWeekObjectItems(weekReflection.value) : [],
)

const monthObjectItems = computed<MonthObjectItem[]>(() =>
  monthPlanning.value ? buildMonthObjectItems(monthPlanning.value) : [],
)

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
    weekWizardOpen.value = false
    monthlyReflectionOpen.value = false
    reflectionNote.value = ''
    // Preserve the stream-origin flag across the planNextWeek W → W+1 hand-off; otherwise a
    // fresh navigation (paging, manual nav) means we're no longer "returning to" the stream.
    if (!pendingOpenWizard.value) returnToStream.value = false
    await loadCalendarData()
    // W → W+1 hand-off: re-open the unified wizard on the freshly navigated week.
    if (pendingOpenWizard.value && props.scale === 'week') {
      pendingOpenWizard.value = false
      weekWizardOpen.value = true
      weekWizardDirty.value = false
    }
    // Deep-link hand-off from the Strumień detail panel: ?action=plan|reflect
    // opens the matching planner/reflection wizard once the period has loaded.
    consumePendingAction()
  },
  { immediate: true }
)

/**
 * When arriving with `?action=plan` or `?action=reflect` (e.g. from the Strumień
 * stream's Kontekst CTAs), open the corresponding wizard for this period, then
 * strip the query so paging prev/next doesn't re-trigger it.
 */
function consumePendingAction() {
  const action = route.query.action
  if (action !== 'plan' && action !== 'reflect') {
    return
  }

  // Remember if we arrived from the Strumień stream so we can return there on close.
  if (route.query.origin === 'stream') {
    returnToStream.value = true
  }

  const nextQuery = { ...route.query }
  delete nextQuery.action
  delete nextQuery.origin
  void router.replace({ query: nextQuery })

  if (action === 'plan') {
    openPlanPanel()
  } else {
    openReflectionPanel()
  }
}

/**
 * If the wizard/planner was opened from the Strumień stream (origin=stream), navigate back to
 * the stream view on close rather than leaving the user in the classic calendar. Stream is keyed
 * by a periodRef it drills from; from a week we land on the month containing it (matching the
 * `/calendar` redirect). Returns true when a navigation was triggered.
 */
function maybeReturnToStream(): boolean {
  if (!returnToStream.value) return false
  returnToStream.value = false
  const periodRef = parsedPeriodRef.value
  if (!periodRef) return false
  const streamRef =
    props.scale === 'week'
      ? getPeriodRefsForDate(getPeriodBounds(periodRef).start).month
      : (periodRef as string)
  void router.push({ name: 'calendar-stream', params: { periodRef: streamRef } })
  return true
}

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
    openWeekWizard()
    return
  }

}

// One entry for the whole week ritual (planning + date-gated reflection).
function openWeekWizard() {
  if (props.scale !== 'week') return
  weekWizardOpen.value = true
  weekWizardDirty.value = false
}

function handleWeekWizardUpdated() {
  weekWizardDirty.value = true
}

function closeWeekWizard() {
  weekWizardOpen.value = false
  if (maybeReturnToStream()) return
  if (weekWizardDirty.value) {
    weekWizardDirty.value = false
    void loadCalendarData()
  }
}

/** Last reflection step → navigate to next week and re-open the wizard (lands on planning). */
function planNextWeek() {
  if (!parsedPeriodRef.value) return
  weekWizardOpen.value = false
  pendingOpenWizard.value = true
  navigateTo('week', getNextPeriod(parsedPeriodRef.value))
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
  if (maybeReturnToStream()) return
  if (monthlyPlannerDirty.value) {
    monthlyPlannerDirty.value = false
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
      openWeekWizard()
      break
  }
}

function handleMonthlyReflectionUpdated() {
  monthlyReflectionDirty.value = true
}

function closeMonthlyReflection() {
  monthlyReflectionOpen.value = false
  if (maybeReturnToStream()) return
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
