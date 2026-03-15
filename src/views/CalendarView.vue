<template>
  <div class="mx-auto w-full max-w-[1600px] px-4 py-6 pb-16">
    <div class="mb-6 space-y-4">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <section class="neo-card px-5 py-4 md:px-6">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="neo-control neo-focus"
              :aria-label="t('common.buttons.back')"
              @click="goToPreviousPeriod"
            >
              <AppIcon name="chevron_left" class="text-base" />
            </button>
            <div class="neo-inset rounded-full px-4 py-2 text-sm font-semibold text-on-surface">
              {{ activePeriodRangeLabel }}
            </div>
            <button
              type="button"
              class="neo-control neo-focus"
              :aria-label="t('common.buttons.next')"
              @click="goToNextPeriod"
            >
              <AppIcon name="chevron_right" class="text-base" />
            </button>

            <div class="hidden h-10 w-px rounded-full bg-outline/35 xl:block" />

            <div class="neo-segmented">
              <button
                v-for="item in scaleOptions"
                :key="item.scale"
                type="button"
                :class="[
                  'neo-segmented__item neo-focus',
                  item.scale === scale ? 'neo-segmented__item--active' : '',
                ]"
                @click="goToScale(item.scale)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="showHeaderActions" class="neo-card px-5 py-4 md:px-6">
          <div class="flex flex-wrap items-center gap-3 xl:justify-end">
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
          </div>
        </section>
      </div>
    </div>

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
          <MonthlyPlanner
            v-if="showMonthlyPlanner && activeMonthRef"
            :month-ref="activeMonthRef"
            @close="closeMonthlyPlanner"
            @updated="handleMonthlyPlannerUpdated"
          />

          <WeeklyPlanner
            v-else-if="showWeeklyPlanner && activeWeekRef"
            :week-ref="activeWeekRef"
            @close="closeWeeklyPlanner"
            @updated="handleWeeklyPlannerUpdated"
          />

          <section v-else-if="showSummaryMetrics" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <div
              v-for="metric in summaryMetrics"
              :key="metric.label"
              class="neo-inset rounded-[1.75rem] px-5 py-4"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                {{ metric.label }}
              </p>
              <p class="mt-3 text-2xl font-semibold text-on-surface">
                {{ metric.value }}
              </p>
            </div>
          </section>

          <section v-if="scale === 'year'" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CalendarMonthSummaryCard
                v-for="month in yearSummary?.months ?? []"
                :key="month.monthRef"
                :title="formatMonthTitle(month.monthRef)"
                :goal-groups="month.goalGroups"
                :habit-groups="month.habitGroups"
                @click="goToMonth(month.monthRef)"
              />
            </div>
          </section>

          <template v-else-if="scale === 'month' && monthPlanning">
            <div class="grid items-start gap-4 xl:grid-cols-3">
              <!-- Column 1: Goals + inline KRs + orphan KRs -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.goals') }}
                </h2>
                <CalendarGoalSummaryCard
                  v-for="card in monthGoalSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :children="card.children"
                  view-scale="month"
                  :current-period-ref="activeMonthRef!"
                  :raw-entries="monthPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel('goal', card.objectId)"
                />
                <CalendarMeasurementSummaryCard
                  v-for="card in monthOrphanKrCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="month"
                  :current-period-ref="activeMonthRef!"
                  :raw-entries="monthPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="monthGoalSummaryCards.length === 0 && monthOrphanKrCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.goals') }}
                </p>
              </div>

              <!-- Column 2: Habits -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.habits') }}
                </h2>
                <CalendarMeasurementSummaryCard
                  v-for="card in monthHabitSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="month"
                  :current-period-ref="activeMonthRef!"
                  :raw-entries="monthPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="monthHabitSummaryCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.habits') }}
                </p>
              </div>

              <!-- Column 3: Trackers -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.trackers') }}
                </h2>
                <CalendarMeasurementSummaryCard
                  v-for="card in monthTrackerSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="month"
                  :current-period-ref="activeMonthRef!"
                  :raw-entries="monthPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="monthTrackerSummaryCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.trackers') }}
                </p>
              </div>
            </div>
          </template>

          <template v-else-if="scale === 'week' && weekPlanning && weekReflection">
            <div class="grid items-start gap-4 xl:grid-cols-3">
              <!-- Column 1: Goals + inline KRs + orphan KRs -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.goals') }}
                </h2>
                <CalendarGoalSummaryCard
                  v-for="card in weekGoalSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :children="card.children"
                  view-scale="week"
                  :current-period-ref="activeWeekRef!"
                  :raw-entries="weekPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel('goal', card.objectId)"
                />
                <CalendarMeasurementSummaryCard
                  v-for="card in weekOrphanKrCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="week"
                  :current-period-ref="activeWeekRef!"
                  :raw-entries="weekPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="weekGoalSummaryCards.length === 0 && weekOrphanKrCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.goals') }}
                </p>
              </div>

              <!-- Column 2: Habits -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.habits') }}
                </h2>
                <CalendarMeasurementSummaryCard
                  v-for="card in weekHabitSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="week"
                  :current-period-ref="activeWeekRef!"
                  :raw-entries="weekPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="weekHabitSummaryCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.habits') }}
                </p>
              </div>

              <!-- Column 3: Trackers -->
              <div class="space-y-3">
                <h2 class="text-lg font-semibold text-on-surface">
                  {{ t('planning.calendar.sections.trackers') }}
                </h2>
                <CalendarMeasurementSummaryCard
                  v-for="card in weekTrackerSummaryCards"
                  :key="card.key"
                  :title="card.title"
                  :icon="card.icon"
                  :status="card.status"
                  :entry-mode="card.entryMode"
                  :subject="card.subject"
                  :subject-type="card.subjectType"
                  :object-cadence="card.objectCadence"
                  view-scale="week"
                  :current-period-ref="activeWeekRef!"
                  :raw-entries="weekPlanning!.rawEntries"
                  :today-ref="todayRef"
                  @click="openObjectsPanel(card.panelType, card.objectId)"
                />
                <p
                  v-if="weekTrackerSummaryCards.length === 0"
                  class="text-xs text-on-surface-variant/60"
                >
                  {{ t('planning.calendar.empty.trackers') }}
                </p>
              </div>
            </div>
          </template>

          <template v-else-if="scale === 'day' && dayBundle">
            <section class="space-y-4">
              <h2 class="text-xl font-semibold text-on-surface">
                {{ t('planning.calendar.sections.scheduledToday') }}
              </h2>
              <div v-if="dayScheduledCards.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CalendarItemCard
                  v-for="card in dayScheduledCards"
                  :key="card.key"
                  :title="card.title"
                  :eyebrow="card.eyebrow"
                  :description="card.description"
                  :badges="card.badges"
                  :details="card.details"
                  highlight
                  interactive
                  @click="handleOpenItemCard(card)"
                />
              </div>
              <div v-else class="neo-card p-6 text-sm text-on-surface-variant">
                {{ t('planning.calendar.empty.today') }}
              </div>
            </section>

            <section class="space-y-4">
              <h2 class="text-xl font-semibold text-on-surface">
                {{ t('planning.calendar.sections.entriesToday') }}
              </h2>
              <div v-if="dayEntryCards.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CalendarItemCard
                  v-for="card in dayEntryCards"
                  :key="card.key"
                  :title="card.title"
                  :eyebrow="card.eyebrow"
                  :description="card.description"
                  :badges="card.badges"
                  :details="card.details"
                  interactive
                  @click="handleOpenItemCard(card)"
                />
              </div>
              <div v-else class="neo-card p-6 text-sm text-on-surface-variant">
                {{ t('planning.calendar.empty.entries') }}
              </div>
            </section>

            <section class="space-y-4">
              <h2 class="text-xl font-semibold text-on-surface">
                {{ t('planning.calendar.sections.activeThisWeek') }}
              </h2>
              <div v-if="dayWeekContextCards.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CalendarItemCard
                  v-for="card in dayWeekContextCards"
                  :key="card.key"
                  :title="card.title"
                  :eyebrow="card.eyebrow"
                  :description="card.description"
                  :badges="card.badges"
                  :details="card.details"
                  interactive
                  @click="handleOpenItemCard(card)"
                />
              </div>
              <div v-else class="neo-card p-6 text-sm text-on-surface-variant">
                {{ t('planning.calendar.empty.generic') }}
              </div>
            </section>

            <section class="space-y-4">
              <h2 class="text-xl font-semibold text-on-surface">
                {{ t('planning.calendar.sections.monthlyContext') }}
              </h2>
              <div v-if="dayMonthGoalCards.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CalendarGoalCard
                  v-for="goal in dayMonthGoalCards"
                  :key="goal.key"
                  :title="goal.title"
                  :description="goal.description"
                  :linked-label="goal.linkedLabel"
                  :linked-count="goal.linkedCount"
                  :badges="goal.badges"
                  interactive
                  @click="openObjectsPanel('goal', goal.objectId)"
                />
              </div>
              <div v-if="dayMonthContextCards.length > 0" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <CalendarItemCard
                  v-for="card in dayMonthContextCards"
                  :key="card.key"
                  :title="card.title"
                  :eyebrow="card.eyebrow"
                  :description="card.description"
                  :badges="card.badges"
                  :details="card.details"
                  interactive
                  @click="handleOpenItemCard(card)"
                />
              </div>
              <div
                v-if="dayMonthGoalCards.length === 0 && dayMonthContextCards.length === 0"
                class="neo-card p-6 text-sm text-on-surface-variant"
              >
                {{ t('planning.calendar.empty.generic') }}
              </div>
            </section>
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
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import type {
  MonthMeasurementPlanningItem,
  MonthPlanningBundle,
  WeekInitiativePlanningItem,
  WeekPlanningBundle,
  WeekReflectionBundle,
} from '@/services/planningStateQueries'
import type {
  CalendarYearSummary,
  DayCalendarBundle,
  MonthReflectionBundle,
} from '@/services/calendarViewQueries'
import type { MeasurementSummary, MeasureableSubject } from '@/services/measurementProgress'
import type { CalendarKrSummary } from '@/components/calendar/CalendarGoalSummaryCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import CalendarGoalCard from '@/components/calendar/CalendarGoalCard.vue'
import CalendarGoalSummaryCard from '@/components/calendar/CalendarGoalSummaryCard.vue'
import CalendarItemCard from '@/components/calendar/CalendarItemCard.vue'
import CalendarMeasurementSummaryCard from '@/components/calendar/CalendarMeasurementSummaryCard.vue'
import CalendarMonthSummaryCard from '@/components/calendar/CalendarMonthSummaryCard.vue'
import MonthlyPlanner from '@/components/calendar/MonthlyPlanner.vue'
import WeeklyPlanner from '@/components/calendar/WeeklyPlanner.vue'
import CalendarSidePanel from '@/components/calendar/CalendarSidePanel.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import { useT } from '@/composables/useT'
import { clearTrendCache } from '@/services/calendarChartData'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import {
  countGoalKeyResults,
  filterUnscheduledMonthInitiatives,
  getCalendarYearSummary,
  getDayCalendarBundle,
  getMonthReflectionBundle,
  hasObjectReflection,
  splitMonthMeasurementItems,
} from '@/services/calendarViewQueries'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import {
  getObjectsLibraryFamilyForPanelType,
  type ObjectsLibraryPanelType,
} from '@/services/objectsLibraryQueries'
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
  formatDayRange as formatDayRangeLabel,
  formatDayTitle as formatDayTitleLabel,
  formatMonthTitle as formatMonthTitleLabel,
  formatTimestamp as formatTimestampLabel,
  formatWeekTitle as formatWeekTitleLabel,
} from '@/utils/periodLabels'
import AppIcon from '@/components/shared/AppIcon.vue'

type CalendarScale = 'year' | 'month' | 'week' | 'day'
type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'
type PanelKind =
  | 'year-plan'
  | 'year-reflection'
  | 'month-plan'
  | 'month-reflection'
  | 'week-plan'
  | 'week-reflection'

interface BadgeModel {
  label: string
  tone?: BadgeTone
}

interface MetricModel {
  label: string
  value: string
}

interface ItemCardModel {
  key: string
  objectId: string
  panelType: ObjectsLibraryPanelType
  title: string
  eyebrow: string
  description?: string
  badges: BadgeModel[]
  details: string[]
}

interface GoalCardModel {
  key: string
  objectId: string
  title: string
  description?: string
  linkedLabel: string
  linkedCount: number
  badges: string[]
}

interface GoalSummaryCardModel {
  key: string
  objectId: string
  title: string
  icon?: string
  status: string
  children: CalendarKrSummary[]
}

interface MeasurementSummaryCardModel {
  key: string
  objectId: string
  panelType: ObjectsLibraryPanelType
  title: string
  icon?: string
  status: string
  entryMode: MeasurementEntryMode
  subject: MeasureableSubject
  subjectType: MeasurementSubjectType
  objectCadence: PlanningCadence
}

type CalendarMeasurementItem =
  | MonthPlanningBundle['measurementItems'][number]
  | WeekPlanningBundle['relevant']['measurementItems'][number]
  | WeekReflectionBundle['relevant']['measurementItems'][number]

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
const monthPlanning = ref<MonthPlanningBundle | null>(null)
const monthReflection = ref<MonthReflectionBundle | null>(null)
const weekPlanning = ref<WeekPlanningBundle | null>(null)
const weekReflection = ref<WeekReflectionBundle | null>(null)
const dayBundle = ref<DayCalendarBundle | null>(null)
const anchorDay = ref<DayRef | null>(null)
const panelState = ref<PanelKind | null>(null)
const monthlyPlannerOpen = ref(false)
const monthlyPlannerDirty = ref(false)
const weeklyPlannerOpen = ref(false)
const weeklyPlannerDirty = ref(false)
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

const invalidRoute = computed(() => parsedPeriodRef.value === null)
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
  { scale: 'year' as const, label: t('planning.calendar.scales.year') },
  { scale: 'month' as const, label: t('planning.calendar.scales.month') },
  { scale: 'week' as const, label: t('planning.calendar.scales.week') },
  { scale: 'day' as const, label: t('planning.calendar.scales.day') },
])

const currentBounds = computed(() =>
  parsedPeriodRef.value ? getPeriodBounds(parsedPeriodRef.value) : null
)

const currentPlanRecord = computed(() => {
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
    case 'day':
      return formatDayTitle(parsedPeriodRef.value as DayRef)
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
    case 'day':
      return formatDayTitle(parsedPeriodRef.value as DayRef)
  }
})

const showPlanAction = computed(
  () => props.scale === 'year' || props.scale === 'month' || props.scale === 'week'
)
const showReflectionAction = computed(
  () => props.scale === 'year' || props.scale === 'month' || props.scale === 'week'
)
const showHeaderActions = computed(() => showPlanAction.value || showReflectionAction.value)

const planActionLabel = computed(() => {
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
  return currentPlanRecord.value
    ? t('planning.calendar.actions.viewPlanRecord')
    : t('planning.calendar.actions.createPlan')
})

const reflectionActionLabel = computed(() =>
  currentReflectionRecord.value
    ? t('planning.calendar.actions.editReflection')
    : t('planning.calendar.actions.createReflection')
)

const planActionVariant = computed<'filled' | 'tonal'>(() => {
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
  return currentPlanRecord.value ? 'tonal' : 'filled'
})
const reflectionActionVariant = computed<'filled' | 'tonal'>(() => {
  if (!currentPlanRecord.value) {
    return 'tonal'
  }

  return currentReflectionRecord.value ? 'tonal' : 'filled'
})

const summaryMetrics = computed<MetricModel[]>(() => {
  if (props.scale === 'year' && yearSummary.value) {
    return [
      {
        label: t('planning.calendar.metrics.activeGoals'),
        value: String(yearSummary.value.totals.activeGoalCount),
      },
      {
        label: t('planning.calendar.metrics.activeCadenced'),
        value: String(yearSummary.value.totals.activeCadencedCount),
      },
      {
        label: t('planning.calendar.metrics.activeTrackers'),
        value: String(yearSummary.value.totals.activeTrackerCount),
      },
      {
        label: t('planning.calendar.metrics.activeInitiatives'),
        value: String(yearSummary.value.totals.activeInitiativeCount),
      },
    ]
  }

  if (props.scale === 'month' && monthPlanning.value) {
    return [
      {
        label: t('planning.calendar.metrics.activeGoals'),
        value: String(monthPlanning.value.goalItems.length),
      },
      {
        label: t('planning.calendar.metrics.activeCadenced'),
        value: String(monthPlanning.value.cadencedItems.length),
      },
      {
        label: t('planning.calendar.metrics.activeTrackers'),
        value: String(monthPlanning.value.trackerItems.length),
      },
      {
        label: t('planning.calendar.metrics.activeInitiatives'),
        value: String(monthPlanning.value.initiativeItems.length),
      },
    ]
  }

  if (props.scale === 'week' && weekPlanning.value && weekReflection.value) {
    return [
      {
        label: t('planning.calendar.summary.planReady'),
        value: weekPlanning.value.weekPlan ? '1' : '0',
      },
      {
        label: t('planning.calendar.summary.reflectionReady'),
        value: weekReflection.value.periodReflection ? '1' : '0',
      },
      {
        label: t('planning.calendar.sections.plannedThisWeek'),
        value: String(weekSummaryCards.value.length),
      },
      {
        label: t('planning.calendar.metrics.activeCadenced'),
        value: String(weekPlanning.value.relevant.cadencedItems.length),
      },
    ]
  }

  if (props.scale === 'day' && dayBundle.value) {
    return [
      {
        label: t('planning.calendar.sections.scheduledToday'),
        value: String(dayScheduledCards.value.length),
      },
      {
        label: t('planning.calendar.sections.entriesToday'),
        value: String(dayEntryCards.value.length),
      },
      {
        label: t('planning.calendar.sections.activeThisWeek'),
        value: String(dayWeekContextCards.value.length),
      },
      {
        label: t('planning.calendar.sections.monthlyContext'),
        value: String(dayMonthGoalCards.value.length + dayMonthContextCards.value.length),
      },
    ]
  }

  return []
})

const showSummaryMetrics = computed(() =>
  summaryMetrics.value.some(metric => Number(metric.value) > 0)
)
const showMonthlyPlanner = computed(() => props.scale === 'month' && monthlyPlannerOpen.value)
const showWeeklyPlanner = computed(() => props.scale === 'week' && weeklyPlannerOpen.value)

const monthSplit = computed(() =>
  monthPlanning.value
    ? splitMonthMeasurementItems(monthPlanning.value)
    : { keyResults: [], habits: [], trackers: [] }
)

const monthGoalSummaryCards = computed<GoalSummaryCardModel[]>(() => {
  const planning = monthPlanning.value
  if (!planning) {
    return []
  }

  const krs = planning.measurementItems.filter((item) => item.subjectType === 'keyResult')
  const krsByGoal = new Map<string, MonthMeasurementPlanningItem[]>()
  for (const kr of krs) {
    if ('goalId' in kr.subject) {
      const existing = krsByGoal.get(kr.subject.goalId) ?? []
      existing.push(kr)
      krsByGoal.set(kr.subject.goalId, existing)
    }
  }

  return planning.goalItems.map((item) => ({
    key: item.goal.id,
    objectId: item.goal.id,
    title: item.goal.title,
    icon: item.goal.icon,
    status: item.goal.status,
    children: (krsByGoal.get(item.goal.id) ?? []).map((kr) =>
      buildKrSummary(kr),
    ),
  }))
})

const monthOrphanKrCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = monthPlanning.value
  if (!planning) {
    return []
  }

  const goalIds = new Set(planning.goalItems.map((item) => item.goal.id))
  const orphanKrs = planning.measurementItems.filter(
    (item) =>
      item.subjectType === 'keyResult' &&
      'goalId' in item.subject &&
      !goalIds.has(item.subject.goalId),
  )

  return orphanKrs.map((item) => buildMeasurementSummaryCard(item))
})

const monthHabitSummaryCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = monthPlanning.value
  if (!planning) {
    return []
  }

  return monthSplit.value.habits.map((item) => buildMeasurementSummaryCard(item))
})

const monthTrackerSummaryCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = monthPlanning.value
  if (!planning) {
    return []
  }

  return monthSplit.value.trackers.map((item) => buildMeasurementSummaryCard(item))
})

const weekGoalSummaryCards = computed<GoalSummaryCardModel[]>(() => {
  const planning = weekPlanning.value
  const reflection = weekReflection.value
  if (!planning || !reflection) {
    return []
  }

  const krItems = planning.relevant.measurementItems.filter((item) => item.subjectType === 'keyResult')
  const krsByGoal = new Map<string, typeof krItems>()
  for (const kr of krItems) {
    if ('goalId' in kr.subject) {
      const existing = krsByGoal.get(kr.subject.goalId) ?? []
      existing.push(kr)
      krsByGoal.set(kr.subject.goalId, existing)
    }
  }

  // Use goal objects from reflection context
  const goalMap = new Map(reflection.relevant.goalItems.map((item) => [item.goal.id, item.goal]))

  const cards: GoalSummaryCardModel[] = []
  for (const [goalId, goalKrs] of krsByGoal) {
    const goal = goalMap.get(goalId)
    if (!goal) continue

    cards.push({
      key: `week-goal:${goalId}`,
      objectId: goalId,
      title: goal.title,
      icon: goal.icon,
      status: goal.status,
      children: goalKrs.map((kr) => ({
        id: kr.subject.id,
        title: kr.subject.title,
        entryMode: kr.subject.entryMode,
        objectCadence: kr.subject.cadence,
        subject: kr.subject as MeasureableSubject,
        subjectType: kr.subjectType,
      })),
    })
  }

  return cards
})

const weekOrphanKrCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = weekPlanning.value
  if (!planning) {
    return []
  }

  const goalIdsInCards = new Set(weekGoalSummaryCards.value.map((c) => c.objectId))
  const orphanKrs = planning.relevant.measurementItems.filter(
    (item) =>
      item.subjectType === 'keyResult' &&
      'goalId' in item.subject &&
      !goalIdsInCards.has(item.subject.goalId),
  )

  return orphanKrs.map((item) => buildWeekMeasurementSummaryCard(item))
})

const weekHabitSummaryCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = weekPlanning.value
  if (!planning) {
    return []
  }

  return planning.relevant.measurementItems
    .filter((item) => item.subjectType === 'habit')
    .map((item) => buildWeekMeasurementSummaryCard(item))
})

const weekTrackerSummaryCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = weekPlanning.value
  if (!planning) {
    return []
  }

  return planning.relevant.measurementItems
    .filter((item) => item.subjectType === 'tracker')
    .map((item) => buildWeekMeasurementSummaryCard(item))
})

const weekSummaryCards = computed<MeasurementSummaryCardModel[]>(() => {
  const planning = weekPlanning.value
  if (!planning) {
    return []
  }

  return planning.relevant.measurementItems.map((item) =>
    buildWeekMeasurementSummaryCard(item),
  )
})

const dayScheduledCards = computed<ItemCardModel[]>(() => {
  if (!dayBundle.value) {
    return []
  }

  return [
    ...dayBundle.value.scheduledMeasurementItems.map(item =>
      buildMeasurementCard(item, 'day', dayBundle.value?.weekReflection.objectReflections ?? [])
    ),
    ...dayBundle.value.scheduledInitiativeItems.map(item =>
      buildInitiativeCard(item, 'day', dayBundle.value?.weekReflection.objectReflections ?? [])
    ),
  ]
})

const dayEntryCards = computed<ItemCardModel[]>(() => {
  if (!dayBundle.value) {
    return []
  }

  return dayBundle.value.entriesToday.map(item => buildDayEntryCard(item))
})

const dayWeekContextCards = computed<ItemCardModel[]>(() => {
  if (!dayBundle.value) {
    return []
  }

  return [
    ...dayBundle.value.contextMeasurementItems.map(item =>
      buildMeasurementCard(item, 'day', dayBundle.value?.weekReflection.objectReflections ?? [])
    ),
    ...dayBundle.value.contextInitiativeItems.map(item =>
      buildInitiativeCard(item, 'day', dayBundle.value?.weekReflection.objectReflections ?? [])
    ),
  ]
})

const dayMonthGoalCards = computed<GoalCardModel[]>(() => {
  const bundle = dayBundle.value

  if (!bundle) {
    return []
  }

  return bundle.monthPlanning.goalItems.map(item => ({
    key: item.goal.id,
    objectId: item.goal.id,
    title: item.goal.title,
    description: item.goal.description,
    linkedLabel: t('planning.calendar.sections.keyResults'),
    linkedCount: countGoalKeyResults(item.goal.id, bundle.monthPlanning.measurementItems),
    badges: [
      item.state.activityState === 'active'
        ? t('planning.calendar.badges.active')
        : t('planning.calendar.badges.paused'),
      ...(hasObjectReflection('goal', item.goal.id, bundle.monthReflection.objectReflections)
        ? [t('planning.calendar.badges.reflected')]
        : []),
    ],
  }))
})

const dayMonthContextCards = computed<ItemCardModel[]>(() => {
  if (!dayBundle.value) {
    return []
  }

  return filterUnscheduledMonthInitiatives(
    dayBundle.value.monthPlanning.initiativeItems,
    dayBundle.value.dayRef
  ).map(item =>
    buildInitiativeCard(item, 'month', dayBundle.value?.monthReflection.objectReflections ?? [])
  )
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
    monthlyPlannerOpen.value = false
    weeklyPlannerOpen.value = false
    reflectionNote.value = ''
    await loadCalendarData()
  },
  { immediate: true }
)

async function loadCalendarData() {
  clearTrendCache()
  yearSummary.value = null
  monthPlanning.value = null
  monthReflection.value = null
  weekPlanning.value = null
  weekReflection.value = null
  dayBundle.value = null
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
        yearSummary.value = await getCalendarYearSummary(parsedPeriodRef.value as YearRef)
        break
      case 'month':
        ;[monthPlanning.value, monthReflection.value] = await Promise.all([
          getMonthPlanningBundle(parsedPeriodRef.value as MonthRef),
          getMonthReflectionBundle(parsedPeriodRef.value as MonthRef),
        ])
        break
      case 'week':
        ;[weekPlanning.value, weekReflection.value] = await Promise.all([
          getWeekPlanningBundle(parsedPeriodRef.value as WeekRef),
          getWeekReflectionBundle(parsedPeriodRef.value as WeekRef),
        ])
        break
      case 'day':
        dayBundle.value = await getDayCalendarBundle(parsedPeriodRef.value as DayRef)
        break
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

function syncAnchorDay(periodRef: PeriodRef) {
  if (props.scale === 'day') {
    anchorDay.value = periodRef as DayRef
    return
  }

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

  const nextRef =
    targetScale === 'day' && anchorDay.value
      ? anchorDay.value
      : zoomPeriod(parsedPeriodRef.value, targetScale, anchorDay.value ?? undefined)
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
    case 'day':
      router.push({ name: 'calendar-day', params: { dayRef: periodRef } })
      break
  }
}

function handleOpenItemCard(card: ItemCardModel) {
  openObjectsPanel(card.panelType, card.objectId)
}

function openObjectsPanel(panelType: ObjectsLibraryPanelType, panelId: string) {
  void router.push({
    name: 'objects-family',
    params: { family: getObjectsLibraryFamilyForPanelType(panelType) },
    query: {
      expandedType: panelType,
      expandedId: panelId,
    },
  })
}

function openPlanPanel() {
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

  switch (props.scale) {
    case 'year':
      panelState.value = 'year-plan'
      break
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
      panelState.value = 'month-reflection'
      reflectionNote.value = monthReflection.value?.periodReflection?.note ?? ''
      break
    case 'week':
      panelState.value = 'week-reflection'
      reflectionNote.value = weekReflection.value?.periodReflection?.note ?? ''
      break
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

function buildMeasurementCard(
  item: CalendarMeasurementItem,
  periodScope: 'month' | 'week' | 'day',
  objectReflections: MonthReflectionBundle['objectReflections']
): ItemCardModel {
  const badges: BadgeModel[] = [
    { label: measurementSectionLabel(item.subjectType), tone: 'accent' },
    ...buildLifecycleBadges(item.subject.status),
    ...buildActivityBadges(item.planning.activityState),
    { label: t(`planning.objects.badges.cadence.${item.subject.cadence}`) },
    { label: t(`planning.objects.badges.entryMode.${item.subject.entryMode}`) },
    ...buildMeasurementPlanningBadges(item),
    ...buildMeasurementEvaluationBadges(item.measurement),
  ]

  if (hasObjectReflection(item.subjectType, item.subject.id, objectReflections)) {
    badges.push({ label: t('planning.calendar.badges.reflected'), tone: 'accent' })
  }

  return {
    key: `${periodScope}:${item.subjectType}:${item.subject.id}:${item.sourceMonthRef ?? 'current'}`,
    objectId: item.subject.id,
    panelType: item.subjectType,
    title: item.subject.title,
    eyebrow: buildMeasurementEyebrow(periodScope),
    description: item.subject.description,
    badges,
    details: buildMeasurementDetails(item, periodScope),
  }
}

function buildDayEntryCard(item: DayCalendarBundle['entriesToday'][number]): ItemCardModel {
  const badges: BadgeModel[] = [
    { label: measurementSectionLabel(item.subjectType), tone: 'accent' },
    { label: t(`planning.objects.badges.cadence.${item.subject.cadence}`) },
    { label: t(`planning.objects.badges.entryMode.${item.subject.entryMode}`) },
  ]

  if (item.entry.value === null) {
    badges.push({ label: t('planning.calendar.badges.recorded'), tone: 'success' })
  } else {
    badges.push({ label: formatMeasurementValue(item.entry.value), tone: 'accent' })
  }

  const details: string[] = [
    item.entry.value === null
      ? t('planning.calendar.details.recordedToday')
      : t('planning.calendar.details.loggedValue', {
          value: formatMeasurementValue(item.entry.value),
        }),
  ]

  if ('target' in item.subject) {
    details.push(formatMeasurementTarget(item.subject.target))
  }

  return {
    key: `entry:${item.subjectType}:${item.subject.id}:${item.entry.dayRef}`,
    objectId: item.subject.id,
    panelType: item.subjectType,
    title: item.subject.title,
    eyebrow: t('planning.calendar.sections.entriesToday'),
    description: item.subject.description,
    badges,
    details,
  }
}

function buildKrSummary(
  item: MonthMeasurementPlanningItem,
): CalendarKrSummary {
  return {
    id: item.subject.id,
    title: item.subject.title,
    entryMode: item.subject.entryMode,
    objectCadence: item.subject.cadence,
    subject: item.subject,
    subjectType: item.subjectType,
  }
}

function buildMeasurementSummaryCard(
  item: MonthMeasurementPlanningItem,
): MeasurementSummaryCardModel {
  return {
    key: `month:${item.subjectType}:${item.subject.id}`,
    objectId: item.subject.id,
    panelType: item.subjectType,
    title: item.subject.title,
    icon: 'icon' in item.subject ? item.subject.icon : undefined,
    status: item.subject.status,
    entryMode: item.subject.entryMode,
    subject: item.subject,
    subjectType: item.subjectType,
    objectCadence: item.subject.cadence,
  }
}

function buildWeekMeasurementSummaryCard(
  item: WeekPlanningBundle['relevant']['measurementItems'][number],
): MeasurementSummaryCardModel {
  return {
    key: `week:${item.subjectType}:${item.subject.id}:${item.sourceMonthRef ?? 'current'}`,
    objectId: item.subject.id,
    panelType: item.subjectType,
    title: item.subject.title,
    icon: 'icon' in item.subject ? item.subject.icon : undefined,
    status: item.subject.status,
    entryMode: item.subject.entryMode,
    subject: item.subject,
    subjectType: item.subjectType,
    objectCadence: item.subject.cadence,
  }
}

function buildInitiativeCard(
  item: WeekInitiativePlanningItem | MonthPlanningBundle['initiativeItems'][number],
  periodScope: 'month' | 'week' | 'day',
  objectReflections: MonthReflectionBundle['objectReflections']
): ItemCardModel {
  const initiative = item.initiative
  const badges: BadgeModel[] = [
    { label: t('planning.calendar.sections.initiatives'), tone: 'accent' },
  ]

  if ('placement' in item) {
    switch (item.placement) {
      case 'planned':
        badges.push({ label: t('planning.calendar.badges.scheduledThisWeek'), tone: 'success' })
        break
      case 'assigned':
        badges.push({ label: t('planning.calendar.badges.scheduledThisDay'), tone: 'accent' })
        break
      case 'unassigned':
        badges.push({ label: t('planning.calendar.badges.needsPlacement'), tone: 'warning' })
        break
    }
  } else {
    badges.push({ label: t('planning.calendar.badges.planned'), tone: 'success' })
  }

  if (hasObjectReflection('initiative', initiative.id, objectReflections)) {
    badges.push({ label: t('planning.calendar.badges.reflected'), tone: 'accent' })
  }

  const details: string[] = []
  if (item.planState.monthRef) {
    details.push(t('planning.calendar.details.scheduledMonth'))
  }
  if (item.planState.weekRef) {
    details.push(t('planning.calendar.details.scheduledWeek'))
  }
  if (item.planState.dayRef) {
    details.push(t('planning.calendar.details.scheduledDay'))
  }

  return {
    key: `${periodScope}:initiative:${initiative.id}`,
    objectId: initiative.id,
    panelType: 'initiative',
    title: initiative.title,
    eyebrow:
      periodScope === 'day'
        ? t('planning.calendar.sections.scheduledToday')
        : t('planning.calendar.summary.weeklyAlignment'),
    description: initiative.description,
    badges,
    details,
  }
}

function buildLifecycleBadges(status: string): BadgeModel[] {
  switch (status) {
    case 'completed':
      return [{ label: t('planning.calendar.badges.completed'), tone: 'success' }]
    case 'dropped':
      return [{ label: t('planning.calendar.badges.dropped'), tone: 'danger' }]
    case 'retired':
      return [{ label: t('planning.calendar.badges.retired'), tone: 'warning' }]
    default:
      return []
  }
}

function measurementSectionLabel(subjectType: CalendarMeasurementItem['subjectType']): string {
  switch (subjectType) {
    case 'keyResult':
      return t('planning.calendar.sections.keyResults')
    case 'habit':
      return t('planning.calendar.sections.habits')
    case 'tracker':
      return t('planning.calendar.sections.trackers')
  }
}

function buildMeasurementEyebrow(periodScope: 'month' | 'week' | 'day'): string {
  switch (periodScope) {
    case 'month':
      return t('planning.calendar.summary.monthGuidance')
    case 'week':
      return t('planning.calendar.summary.weeklyAlignment')
    case 'day':
      return t('planning.calendar.sections.activeThisWeek')
  }
}

function buildMeasurementPlanningBadges(item: CalendarMeasurementItem): BadgeModel[] {
  const badges: BadgeModel[] = []

  if (item.planning.scheduleScope) {
    badges.push({
      label: t(`planning.calendar.badges.scheduleScope.${item.planning.scheduleScope}`),
    })
  }

  if ('placement' in item) {
    switch (item.placement) {
      case 'planned':
        badges.push({ label: t('planning.calendar.badges.scheduledThisWeek'), tone: 'success' })
        break
      case 'assigned':
        badges.push({ label: t('planning.calendar.badges.scheduledThisDay'), tone: 'accent' })
        break
      case 'unassigned':
        badges.push({ label: t('planning.calendar.badges.needsPlacement'), tone: 'warning' })
        break
    }
  }

  if ('hasEntries' in item && item.hasEntries) {
    badges.push({ label: t('planning.calendar.badges.recorded'), tone: 'accent' })
  }

  return badges
}

function buildMeasurementEvaluationBadges(measurement?: MeasurementSummary): BadgeModel[] {
  if (!measurement?.target || !measurement.evaluationStatus) {
    return []
  }

  switch (measurement.evaluationStatus) {
    case 'met':
      return [{ label: t('planning.calendar.badges.met'), tone: 'success' }]
    case 'missed':
      return [{ label: t('planning.calendar.badges.missed'), tone: 'warning' }]
    case 'no-data':
      return [{ label: t('planning.calendar.badges.noData'), tone: 'default' }]
  }
}

function buildMeasurementDetails(
  item: CalendarMeasurementItem,
  periodScope: 'month' | 'week' | 'day'
): string[] {
  const details: string[] = []

  if (item.measurement?.target) {
    details.push(formatMeasurementTarget(item.measurement.target))
  }

  if (item.measurement) {
    details.push(formatMeasurementActual(item.measurement))
    details.push(t('planning.calendar.details.entryCount', { n: item.measurement.entryCount }))
  }

  if (item.planning.scheduledDayRefs.length > 0) {
    details.push(
      t('planning.calendar.details.assignedDays', { n: item.planning.scheduledDayRefs.length })
    )
  }

  if (item.planning.successNote) {
    details.push(t('planning.calendar.details.successNote', { note: item.planning.successNote }))
  }

  if (item.sourceMonthRef && periodScope !== 'month') {
    details.push(
      t('planning.calendar.details.sourceMonth', { month: formatMonthTitle(item.sourceMonthRef) })
    )
  }

  return details
}

function formatMeasurementTarget(target: MeasurementTarget): string {
  switch (target.kind) {
    case 'count':
      return t(
        target.operator === 'min'
          ? 'planning.calendar.details.targetCountMin'
          : 'planning.calendar.details.targetCountMax',
        { n: target.value }
      )
    case 'value':
      return t('planning.calendar.details.targetRule', {
        aggregation: t(`planning.calendar.labels.aggregation.${target.aggregation}`),
        operator: formatComparisonOperator(target.operator),
        value: formatMeasurementValue(target.value),
      })
    case 'rating':
      return t('planning.calendar.details.targetRule', {
        aggregation: t('planning.calendar.labels.aggregation.average'),
        operator: formatComparisonOperator(target.operator),
        value: formatMeasurementValue(target.value),
      })
  }
}

function formatMeasurementActual(measurement: MeasurementSummary): string {
  if (measurement.actualValue === undefined) {
    return t('planning.calendar.details.actualNoData')
  }

  return t('planning.calendar.details.actual', {
    value: formatMeasurementValue(measurement.actualValue),
  })
}

function formatComparisonOperator(operator: 'gte' | 'lte'): string {
  return operator === 'gte' ? '>=' : '<='
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function buildActivityBadges(activityState?: string): BadgeModel[] {
  switch (activityState) {
    case 'active':
      return [{ label: t('planning.calendar.badges.active'), tone: 'success' }]
    case 'paused':
      return [{ label: t('planning.calendar.badges.paused'), tone: 'warning' }]
    default:
      return []
  }
}

function formatMonthTitle(monthRef: MonthRef): string {
  return formatMonthTitleLabel(monthRef, locale.value)
}

function formatWeekTitle(weekRef: WeekRef): string {
  return formatWeekTitleLabel(weekRef, locale.value, t('planning.calendar.scales.week'))
}

function formatDayTitle(dayRef: DayRef): string {
  return formatDayTitleLabel(dayRef, locale.value)
}

function formatDayRange(dayRef: DayRef): string {
  return formatDayRangeLabel(dayRef, locale.value)
}

function formatTimestamp(value: string): string {
  return formatTimestampLabel(value, locale.value)
}
</script>
