<template>
  <section data-testid="monthly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <div class="flex items-center justify-between">
      <div class="flex items-baseline gap-2">
        <h2 class="text-lg font-bold text-on-surface">
          {{ t('planning.reflection.monthly.title') }}
        </h2>
        <span v-if="stepSubtitle" class="text-xs text-on-surface-variant">— {{ stepSubtitle }}</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" role="group" :aria-label="t('planning.reflection.monthly.progress')">
          <button
            v-for="(label, idx) in stepLabels"
            :key="idx"
            type="button"
            :aria-label="`Step ${idx + 1}: ${label}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
            class="rounded-full transition-all duration-200"
            :class="
              idx < stepIndex
                ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
                : idx === stepIndex
                  ? 'neo-step-active w-3.5 h-3.5'
                  : 'neo-step-future w-2.5 h-2.5'
            "
            @click="idx < stepIndex && goToStep(STEPS[idx])"
          />
        </div>
        <span class="text-xs font-medium text-on-surface-variant">
          {{ stepLabels[stepIndex] }}
        </span>
      </div>
    </div>

    <!-- Step Content -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Step: Review (calendar + goals/habits/trackers dashboard) -->
      <div v-if="currentStep === 'review'" key="review" class="space-y-5">

        <!-- Month calendar with per-day emotion quadrants + journal flag -->
        <MonthCalendarSummary
          v-if="dailyCalendarSummaries.length > 0"
          :summaries="dailyCalendarSummaries"
        />

        <!-- 3-column layout: Goals | Habits | Trackers -->
        <div
          v-if="goalSummaries.length > 0 || habitDetails.length > 0 || trackerDetails.length > 0"
          class="flex gap-4 items-start"
        >

          <!-- COLUMN: Goals & Key Results -->
          <div v-if="goalSummaries.length > 0" class="flex-[2] min-w-0 space-y-3">
            <h4 class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              <span class="material-symbols-outlined text-[14px] text-primary">flag</span>
              {{ t('planning.reflection.monthly.goalsSection') }}
            </h4>

            <div
              v-for="goalSummary in goalSummaries"
              :key="goalSummary.goal.id"
              class="space-y-1.5"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <EntityIcon
                  v-if="goalSummary.goal.icon"
                  :icon="goalSummary.goal.icon"
                  size="xs"
                />
                <span class="text-xs font-semibold text-on-surface truncate">{{ goalSummary.goal.title }}</span>
              </div>

              <div
                v-if="goalSummary.keyResults.length > 0"
                class="grid gap-1.5"
                style="grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr))"
              >
                <div
                  v-for="kr in goalSummary.keyResults"
                  :key="kr.id"
                  class="neo-inset rounded-lg p-2 flex flex-col"
                >
                  <span class="text-[11px] font-medium text-on-surface leading-tight line-clamp-2 mb-1.5">{{ kr.title }}</span>

                  <!-- Weekly KR: bar chart -->
                  <div
                    v-if="kr.cadence === 'weekly' && kr.weeklyBreakdown"
                    class="flex items-end gap-[3px] h-12 mt-auto"
                    :title="weeklyBarChartTitle(kr.weeklyBreakdown, kr.target)"
                  >
                    <div
                      v-for="(week, wIdx) in kr.weeklyBreakdown"
                      :key="wIdx"
                      class="flex-1 rounded-t-sm min-h-[3px]"
                      :class="barColor(week.evaluationStatus)"
                      :style="{ height: `${weekBarHeight(week, kr.target)}%` }"
                    />
                  </div>

                  <!-- Monthly KR: donut ring -->
                  <div
                    v-else-if="kr.cadence === 'monthly' && kr.target"
                    class="flex items-center justify-center mt-auto py-1"
                  >
                    <svg viewBox="0 0 36 36" class="w-11 h-11">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.5" stroke="rgb(var(--color-outline))" stroke-opacity="0.2" />
                      <circle
                        v-if="kr.actualValue != null"
                        cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.5"
                        stroke-linecap="round"
                        :stroke="kr.evaluationStatus === 'met' ? 'rgb(var(--neo-chart-primary-end))' : 'rgb(var(--color-error))'"
                        :stroke-dasharray="`${progressPercent(kr.actualValue, kr.target)} ${100 - progressPercent(kr.actualValue, kr.target)}`"
                        stroke-dashoffset="25"
                      />
                      <text x="18" y="19" text-anchor="middle" dominant-baseline="central" class="fill-on-surface text-[9px] font-bold">
                        {{ kr.actualValue != null ? progressPercent(kr.actualValue, kr.target) + '%' : '—' }}
                      </text>
                    </svg>
                  </div>

                  <div v-else class="h-12 mt-auto" />
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMN: Habits -->
          <div v-if="habitDetails.length > 0" class="flex-1 min-w-0 space-y-3">
            <h4 class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              <span class="material-symbols-outlined text-[14px] text-primary">repeat</span>
              {{ t('planning.reflection.monthly.habitsSection') }}
            </h4>

            <div class="space-y-1.5">
              <div
                v-for="habit in sortedHabitDetails"
                :key="habit.id"
                class="neo-inset rounded-lg p-2 flex flex-col"
              >
                <div class="flex items-center gap-1 min-w-0 mb-1.5">
                  <EntityIcon v-if="habit.icon" :icon="habit.icon" size="xs" />
                  <span class="text-[11px] font-medium text-on-surface leading-tight line-clamp-2">{{ habit.title }}</span>
                </div>

                <!-- Weekly habit: bar chart -->
                <div
                  v-if="habit.cadence === 'weekly' && habit.weeklyBreakdown"
                  class="flex items-end gap-[3px] h-12 mt-auto"
                  :title="weeklyBarChartTitle(habit.weeklyBreakdown, habit.target)"
                >
                  <div
                    v-for="(week, wIdx) in habit.weeklyBreakdown"
                    :key="wIdx"
                    class="flex-1 rounded-t-sm min-h-[3px]"
                    :class="barColor(week.evaluationStatus)"
                    :style="{ height: `${weekBarHeight(week, habit.target)}%` }"
                  />
                </div>

                <!-- Monthly habit: donut ring -->
                <div
                  v-else-if="habit.cadence === 'monthly' && habit.target"
                  class="flex items-center justify-center mt-auto py-1"
                >
                  <svg viewBox="0 0 36 36" class="w-11 h-11">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.5" stroke="rgb(var(--color-outline))" stroke-opacity="0.2" />
                    <circle
                      v-if="habit.actualValue != null"
                      cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.5"
                      stroke-linecap="round"
                      :stroke="habit.evaluationStatus === 'met' ? 'rgb(var(--neo-chart-primary-end))' : 'rgb(var(--color-error))'"
                      :stroke-dasharray="`${progressPercent(habit.actualValue, habit.target)} ${100 - progressPercent(habit.actualValue, habit.target)}`"
                      stroke-dashoffset="25"
                    />
                    <text x="18" y="19" text-anchor="middle" dominant-baseline="central" class="fill-on-surface text-[9px] font-bold">
                      {{ habit.actualValue != null ? progressPercent(habit.actualValue, habit.target) + '%' : '—' }}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMN: Trackers -->
          <div v-if="trackerDetails.length > 0" class="flex-1 min-w-0 space-y-3">
            <h4 class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              <span class="material-symbols-outlined text-[14px] text-primary">monitoring</span>
              {{ t('planning.reflection.monthly.trackersSection') }}
            </h4>

            <div class="space-y-1.5">
              <div
                v-for="tracker in trackerDetails"
                :key="tracker.id"
                class="neo-inset rounded-lg p-2 flex flex-col"
              >
                <div class="flex items-center gap-1 min-w-0 mb-1.5">
                  <EntityIcon v-if="tracker.icon" :icon="tracker.icon" size="xs" />
                  <span class="text-[11px] font-medium text-on-surface leading-tight line-clamp-2">{{ tracker.title }}</span>
                </div>
                <div class="flex items-end gap-px h-12 mt-auto">
                  <div
                    v-for="(entry, eIdx) in trackerSparkEntries(tracker)"
                    :key="eIdx"
                    class="flex-1 max-w-2 rounded-t-sm bg-primary/50"
                    :style="{ height: `${entry.heightPct}%` }"
                    :title="`${entry.dayRef}: ${entry.value ?? '—'}`"
                  />
                </div>
                <div v-if="tracker.latestValue != null" class="text-xs font-medium text-on-surface text-center mt-1 tabular-nums">
                  {{ formatMeasurementValue(tracker.latestValue) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step: Weekly Trends -->
      <div v-else-if="currentStep === 'weekly-recap'" key="weekly-recap" class="space-y-6">

        <!-- Dot ladder trend visualization (per-dimension line + dots across weeks) -->
        <WeeklyDimensionHeatmap
          v-if="weeklyTrends.length > 0"
          :trends="weeklyTrends"
          :week-refs="monthWeekRefs"
        />

        <!-- Weekly reflection cards -->
        <div v-if="weeklyReflectionDetails.length > 0" class="space-y-3">
          <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
            {{ t('planning.reflection.monthly.weeklyReflections') }}
          </h4>

          <div
            v-for="detail in weeklyReflectionDetails"
            :key="detail.weekRef"
            class="neo-inset rounded-2xl overflow-hidden transition-all duration-200"
          >
            <!-- Card header (always visible, clickable) -->
            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-on-surface/[0.02] transition-colors"
              @click="toggleWeekExpanded(detail.weekRef)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-semibold text-on-surface">
                  {{ formatWeekLabel(detail.weekRef) }}
                </span>
                <span
                  v-for="highlight in weekHighlights(detail.weekRef)"
                  :key="highlight.key"
                  class="text-[10px] text-on-surface-variant"
                >
                  {{ highlight.label }}
                </span>
              </div>
              <span
                class="material-symbols-outlined text-base text-on-surface-variant transition-transform duration-200"
                :class="{ 'rotate-180': expandedWeeks.has(detail.weekRef) }"
              >expand_more</span>
            </button>

            <!-- Expandable content -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-[32rem]"
              leave-from-class="opacity-100 max-h-[32rem]"
              leave-to-class="opacity-0 max-h-0"
            >
              <div
                v-if="expandedWeeks.has(detail.weekRef)"
                class="px-4 pb-3 space-y-3 overflow-hidden"
              >
                <!-- Freeform reflection -->
                <p
                  v-if="detail.freeformReflection.trim()"
                  class="text-sm text-on-surface leading-relaxed whitespace-pre-line"
                >{{ detail.freeformReflection }}</p>

                <!-- Prompt responses -->
                <div
                  v-for="(text, key) in nonEmptyPrompts(detail.promptResponses)"
                  :key="key"
                  class="space-y-0.5"
                >
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {{ weeklyAnchorLabel(key as string) }}
                  </p>
                  <p class="text-sm text-on-surface whitespace-pre-line">{{ text }}</p>
                </div>

                <p
                  v-if="!detail.freeformReflection.trim() && Object.keys(nonEmptyPrompts(detail.promptResponses)).length === 0"
                  class="text-sm text-on-surface-variant italic"
                >—</p>
              </div>
            </Transition>
          </div>
        </div>

        <p
          v-if="weeklyTrends.length === 0 && weeklyReflectionDetails.length === 0"
          class="text-sm text-on-surface-variant"
        >
          {{ t('planning.reflection.monthly.noWeeklyData') }}
        </p>
      </div>

      <!-- Step: Ratings -->
      <div v-else-if="currentStep === 'ratings'" key="ratings" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="monthlyGroups"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Anchors -->
      <div v-else-if="currentStep === 'anchors'" key="anchors">
        <ReflectionAnchorsGrid
          :categories="monthlyAnchorCategories"
          :model-value="promptResponses"
          @update:model-value="promptResponses = $event"
        />
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal">
        <ReflectionJournalSidebar
          :model-value="freeformReflection"
          :placeholder="t('planning.reflection.monthly.journalPlaceholder')"
          :anchors="promptResponses"
          :anchor-categories="monthlyAnchorCategories"
          :rating-groups="monthlyRatingSummary"
          @update:model-value="freeformReflection = $event"
        />
      </div>
    </Transition>

    <!-- Navigation Footer -->
    <div class="flex items-center justify-between pt-2">
      <AppButton
        v-if="stepIndex > 0"
        variant="tonal"
        :aria-label="t('common.buttons.back')"
        @click="prevStep()"
      >
        <AppIcon name="arrow_back" class="text-lg" />
      </AppButton>
      <div v-else />

      <AppButton
        v-if="currentStep === 'journal'"
        variant="filled"
        :disabled="isSaving"
        @click="handleSave"
      >
        {{ isSaving ? t('planning.reflection.saving') : t('planning.reflection.save') }}
      </AppButton>
      <AppButton
        v-else
        variant="filled"
        :disabled="!canAdvance"
        :aria-label="t('common.buttons.next')"
        @click="nextStep()"
      >
        <AppIcon name="arrow_forward" class="text-lg" />
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, toRef } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import MonthCalendarSummary from './MonthCalendarSummary.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import WeeklyDimensionHeatmap from './WeeklyDimensionHeatmap.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import {
  useMonthlyReflectionWizard,
  type MonthlyReflectionStep,
} from '@/composables/useMonthlyReflectionWizard'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type {
  KRWeeklyBreakdown,
  TrackerReflectionDetail,
} from '@/services/reflectionDataQueries'
import type { MeasurementEvaluationStatus } from '@/services/measurementProgress'
import { getPeriodBounds } from '@/utils/periods'

const { t } = useT()

const props = defineProps<{
  monthRef: MonthRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: MonthlyReflectionStep[] = [
  'review',
  'weekly-recap',
  'ratings',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.weeklyRecap'),
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'review': return t('planning.reflection.monthly.reviewSubtitle')
    case 'weekly-recap': return t('planning.reflection.monthly.weeklyRecapSubtitle')
    case 'ratings': return t('planning.reflection.monthly.groups.ratings.subtitle')
    default: return ''
  }
})

const monthlyAnchorCategories = computed(() => [
  { key: 'proudOf', label: t('planning.reflection.monthly.anchors.proudOf'), icon: 'emoji_events' },
  { key: 'challenges', label: t('planning.reflection.monthly.anchors.challenges'), icon: 'warning' },
  { key: 'growth', label: t('planning.reflection.monthly.anchors.growth'), icon: 'trending_up' },
  { key: 'patterns', label: t('planning.reflection.monthly.anchors.patterns'), icon: 'pattern' },
  { key: 'carryForward', label: t('planning.reflection.monthly.anchors.carryForward'), icon: 'arrow_forward' },
  { key: 'letGo', label: t('planning.reflection.monthly.anchors.letGo'), icon: 'delete_sweep' },
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  dataBundle,
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  isSaving,
  save,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

const weeklyTrends = computed(() => dataBundle.value?.weeklyRatingTrends ?? [])
const goalSummaries = computed(() => dataBundle.value?.goalSummaries ?? [])
const habitDetails = computed(() => dataBundle.value?.habitDetails ?? [])
const trackerDetails = computed(() => dataBundle.value?.trackerDetails ?? [])
const weeklyReflectionDetails = computed(() => dataBundle.value?.weeklyReflectionDetails ?? [])
const monthWeekRefs = computed(() => dataBundle.value?.monthWeekRefs ?? [])
const dailyCalendarSummaries = computed(() => dataBundle.value?.dailyCalendarSummaries ?? [])

// Sort habits: missed first, then met, then no-data
const sortedHabitDetails = computed(() =>
  [...habitDetails.value].sort((a, b) => {
    const order: Record<string, number> = { missed: 0, 'no-data': 1, met: 2 }
    return (order[a.evaluationStatus] ?? 1) - (order[b.evaluationStatus] ?? 1)
  })
)

// Expandable week cards
const expandedWeeks = reactive(new Set<WeekRef>())
function toggleWeekExpanded(weekRef: WeekRef) {
  if (expandedWeeks.has(weekRef)) expandedWeeks.delete(weekRef)
  else expandedWeeks.add(weekRef)
}

// ---------------------------------------------------------------------------
// Weekly bar chart helpers
// ---------------------------------------------------------------------------

function barColor(status: MeasurementEvaluationStatus): string {
  switch (status) {
    case 'met': return 'bg-primary'
    case 'missed': return 'bg-error/40'
    default: return 'bg-on-surface/15'
  }
}

function weekBarHeight(week: KRWeeklyBreakdown, target?: MeasurementTarget): number {
  if (week.actualValue == null || week.actualValue === 0) return 10
  if (!target || target.value === 0) return 60
  return Math.max(15, Math.min(100, Math.round((week.actualValue / target.value) * 100)))
}

function weeklyBarChartTitle(breakdown: KRWeeklyBreakdown[], target?: MeasurementTarget): string {
  return breakdown
    .map((w) => `${weekDotLabel(w.weekRef)}: ${w.actualValue ?? '—'}${target ? '/' + target.value : ''}`)
    .join(' | ')
}

// ---------------------------------------------------------------------------
// Progress / target helpers
// ---------------------------------------------------------------------------

function progressPercent(actual: number | undefined, target: MeasurementTarget | undefined): number {
  if (actual == null || !target) return 0
  const targetValue = target.value
  if (targetValue === 0) return actual > 0 ? 100 : 0
  return Math.min(100, Math.round((actual / targetValue) * 100))
}

function formatMeasurementValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// ---------------------------------------------------------------------------
// Week label helpers
// ---------------------------------------------------------------------------

function weekDotLabel(weekRef: WeekRef): string {
  const bounds = getPeriodBounds(weekRef)
  const startDay = bounds.start.slice(8, 10).replace(/^0/, '')
  const endDay = bounds.end.slice(8, 10).replace(/^0/, '')
  return `${startDay}–${endDay}`
}

function formatWeekLabel(weekRef: WeekRef): string {
  const bounds = getPeriodBounds(weekRef)
  const startDay = bounds.start.slice(8, 10).replace(/^0/, '')
  const endDay = bounds.end.slice(8, 10).replace(/^0/, '')
  const startMonth = parseInt(bounds.start.slice(5, 7), 10)
  const endMonth = parseInt(bounds.end.slice(5, 7), 10)
  const months = ['', 'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${months[startMonth]}`
  }
  return `${startDay} ${months[startMonth]}–${endDay} ${months[endMonth]}`
}

// ---------------------------------------------------------------------------
// Week highlights (best/worst dimension)
// ---------------------------------------------------------------------------

function weekHighlights(weekRef: WeekRef): { key: string; label: string }[] {
  const trend = weeklyTrends.value.find((t) => t.weekRef === weekRef)
  if (!trend) return []

  const stateDims = [
    { key: 'mood', val: trend.moodRating, label: t('planning.reflection.weekly.dimensions.mood') },
    { key: 'energy', val: trend.energyRating, label: t('planning.reflection.weekly.dimensions.energy') },
    { key: 'calm', val: trend.calmRating, label: t('planning.reflection.weekly.dimensions.calm') },
    { key: 'connection', val: trend.connectionRating, label: t('planning.reflection.weekly.dimensions.connection') },
  ].filter((d) => d.val != null) as { key: string; val: number; label: string }[]

  if (stateDims.length === 0) return []

  const best = stateDims.reduce((a, b) => (b.val > a.val ? b : a))
  const worst = stateDims.reduce((a, b) => (b.val < a.val ? b : a))

  const highlights: { key: string; label: string }[] = []
  if (best.val >= 4) highlights.push({ key: 'best', label: `${best.label} ${best.val}` })
  if (worst.val <= 2 && worst.key !== best.key) highlights.push({ key: 'worst', label: `${worst.label} ${worst.val}` })
  return highlights
}

// ---------------------------------------------------------------------------
// Weekly anchor labels
// ---------------------------------------------------------------------------

const WEEKLY_ANCHOR_KEYS = ['wentWell', 'challenges', 'gratitude', 'lessons', 'improvements', 'lookingAhead'] as const

function weeklyAnchorLabel(key: string): string {
  if (WEEKLY_ANCHOR_KEYS.includes(key as typeof WEEKLY_ANCHOR_KEYS[number])) {
    return t(`planning.reflection.weekly.anchors.${key}`)
  }
  return key
}

function nonEmptyPrompts(responses: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(responses)) {
    if (value.trim()) result[key] = value
  }
  return result
}

// ---------------------------------------------------------------------------
// Tracker sparkline
// ---------------------------------------------------------------------------

function trackerSparkEntries(tracker: TrackerReflectionDetail) {
  const entries = tracker.entries.slice(-20) // last 20 entries max
  const values = entries.map((e) => e.value ?? 0)
  const maxVal = Math.max(...values, 1)
  return entries.map((e) => ({
    dayRef: e.dayRef,
    value: e.value,
    heightPct: Math.max(10, Math.round(((e.value ?? 0) / maxVal) * 100)),
  }))
}

// Icon sets for monthly dimensions
const ICONS = {
  balance: ['landslide', 'falling', 'tune', 'balance', 'all_inclusive'] as [string, string, string, string, string],
  purpose: ['search', 'question_mark', 'lightbulb', 'auto_awesome', 'moon_stars'] as [string, string, string, string, string],
  growth: ['park', 'potted_plant', 'forest', 'nature', 'landscape'] as [string, string, string, string, string],
  coherence: ['call_split', 'conversion_path', 'timeline', 'adjust', 'gps_fixed'] as [string, string, string, string, string],
  agency: ['anchor', 'explore', 'navigation', 'sailing', 'flight'] as [string, string, string, string, string],
}

const monthlyGroups = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    dimensions: [
      {
        key: 'balance',
        label: t('planning.reflection.monthly.dimensions.balance'),
        value: balanceRating.value,
        icons: ICONS.balance,
        lowLabel: t('planning.reflection.monthly.scaleLabels.balance.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.balance.high'),
      },
      {
        key: 'purpose',
        label: t('planning.reflection.monthly.dimensions.purpose'),
        value: purposeRating.value,
        icons: ICONS.purpose,
        lowLabel: t('planning.reflection.monthly.scaleLabels.purpose.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.purpose.high'),
      },
      {
        key: 'growth',
        label: t('planning.reflection.monthly.dimensions.growth'),
        value: growthRating.value,
        icons: ICONS.growth,
        lowLabel: t('planning.reflection.monthly.scaleLabels.growth.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.growth.high'),
      },
      {
        key: 'coherence',
        label: t('planning.reflection.monthly.dimensions.coherence'),
        value: coherenceRating.value,
        icons: ICONS.coherence,
        lowLabel: t('planning.reflection.monthly.scaleLabels.coherence.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.coherence.high'),
      },
      {
        key: 'agency',
        label: t('planning.reflection.monthly.dimensions.agency'),
        value: agencyRating.value,
        icons: ICONS.agency,
        lowLabel: t('planning.reflection.monthly.scaleLabels.agency.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.agency.high'),
      },
    ],
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'balance': balanceRating.value = value; break
    case 'purpose': purposeRating.value = value; break
    case 'growth': growthRating.value = value; break
    case 'coherence': coherenceRating.value = value; break
    case 'agency': agencyRating.value = value; break
  }
}

const monthlyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    items: [
      { label: t('planning.reflection.monthly.dimensions.balance'), value: balanceRating.value },
      { label: t('planning.reflection.monthly.dimensions.purpose'), value: purposeRating.value },
      { label: t('planning.reflection.monthly.dimensions.growth'), value: growthRating.value },
      { label: t('planning.reflection.monthly.dimensions.coherence'), value: coherenceRating.value },
      { label: t('planning.reflection.monthly.dimensions.agency'), value: agencyRating.value },
    ],
  },
])

async function handleSave() {
  try {
    await save()
    emit('updated')
    emit('close')
  } catch (err) {
    console.error('Failed to save monthly reflection:', err)
  }
}
</script>
