<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppCard padding="lg">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-neu-text mb-2">
          {{ periodTitle }}
        </h2>
        <p class="text-neu-muted">{{ periodRange }}</p>
      </div>
    </AppCard>

    <!-- Period Details -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-3 flex items-center gap-2">
        <CalendarDaysIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.yearlyReviewSummary.planningPeriod') }}
      </h3>
      <div class="text-sm text-neu-muted">
        <p><span class="font-medium text-neu-text">{{ t('planning.components.yearlyReviewSummary.startLabel') }}</span> {{ draft.startDate }}</p>
        <p><span class="font-medium text-neu-text">{{ t('planning.components.yearlyReviewSummary.endLabel') }}</span> {{ draft.endDate }}</p>
        <p v-if="draft.name.trim()">
          <span class="font-medium text-neu-text">{{ t('planning.components.yearlyReviewSummary.nameLabel') }}</span> {{ draft.name }}
        </p>
      </div>
    </AppCard>

    <!-- Year Theme (if present) -->
    <AppCard v-if="draft.yearTheme" padding="lg">
      <div class="flex items-center gap-3 mb-3">
        <SparklesIcon class="w-5 h-5 text-primary" />
        <h3 class="text-lg font-semibold text-neu-text">{{ t('planning.components.yearlyReviewSummary.yearTheme') }}</h3>
      </div>
      <p class="text-xl font-medium text-primary text-center py-4 bg-primary/5 rounded-xl">
        {{ draft.yearTheme }}
      </p>
    </AppCard>

    <!-- Dreaming Summary (if present) -->
    <AppCard v-if="hasDreamingContent" padding="lg">
      <div class="flex items-center gap-3 mb-3">
        <LightBulbIcon class="w-5 h-5 text-primary" />
        <h3 class="text-lg font-semibold text-neu-text">{{ t('planning.components.yearlyReviewSummary.dreamingTitle') }}</h3>
      </div>

      <div class="space-y-3 text-sm">
        <div v-if="draft.dreaming.outcomes.length > 0">
          <p class="font-medium text-neu-text mb-1">{{ t('planning.components.yearlyReviewSummary.outcomesEnvisioned') }}</p>
          <p class="text-neu-muted">{{ t('planning.components.yearlyReviewSummary.outcomesCount', { count: draft.dreaming.outcomes.length }) }}</p>
        </div>
        <div v-if="draft.dreaming.difference">
          <p class="font-medium text-neu-text mb-1">{{ t('planning.components.yearlyReviewSummary.differenceMakes') }}</p>
          <p class="text-neu-muted line-clamp-2">{{ draft.dreaming.difference }}</p>
        </div>
        <div v-if="draft.dreaming.progressClues.length > 0">
          <p class="font-medium text-neu-text mb-1">{{ t('planning.components.yearlyReviewSummary.progressClues') }}</p>
          <ul class="list-disc list-inside text-neu-muted space-y-0.5">
            <li v-for="(clue, i) in draft.dreaming.progressClues.slice(0, 5)" :key="i">
              {{ clue }}
            </li>
            <li v-if="draft.dreaming.progressClues.length > 5" class="italic">
              {{ t('planning.components.yearlyReviewSummary.andMore', { count: draft.dreaming.progressClues.length - 5 }) }}
            </li>
          </ul>
        </div>
      </div>
    </AppCard>

    <!-- Focus Life Areas -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <RectangleStackIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.yearlyReviewSummary.focusLifeAreas') }}
      </h3>

      <div v-if="primaryFocusLifeArea" class="mb-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{{ t('planning.components.yearlyReviewSummary.primaryFocus') }}</p>
        <div class="flex items-center gap-2">
          <EntityIcon
            :icon="primaryFocusLifeArea.icon"
            :color="primaryFocusLifeArea.color"
            size="xs"
          />
          <span class="text-base font-semibold text-neu-text">
            {{ primaryFocusLifeArea.name }}
          </span>
        </div>
      </div>

      <div v-if="secondaryFocusLifeAreas.length > 0" class="flex flex-wrap gap-2">
        <span
          v-for="la in secondaryFocusLifeAreas"
          :key="la.id"
          class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
          :style="getFocusAreaChipStyle(la.color)"
        >
          <EntityIcon
            :icon="la.icon"
            :color="la.color"
            size="xs"
          />
          {{ la.name }}
        </span>
      </div>

      <p v-else-if="!primaryFocusLifeArea" class="text-center text-neu-muted py-4">
        {{ t('planning.components.yearlyReviewSummary.noFocusAreas') }}
      </p>
    </AppCard>

    <!-- Priorities -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <FlagIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.yearlyReviewSummary.prioritiesTitle') }}
      </h3>

      <div v-if="sortedPriorities.length > 0" class="space-y-3">
        <div
          v-for="priority in sortedPriorities"
          :key="priority.id"
          class="flex items-start gap-3 p-3 bg-neu-base rounded-xl shadow-neu-raised-sm border border-neu-border/25"
        >
          <div
            class="w-1 self-stretch rounded-full flex-shrink-0"
            :style="{ backgroundColor: priorityAccentColor(priority) }"
          />
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-neu-text flex items-center gap-2">
              <EntityIcon
                :icon="priority.icon"
                :color="priorityAccentColor(priority)"
                size="xs"
              />
              {{ priority.name }}
              <span
                :class="priority.isActive
                  ? 'bg-primary/5 text-primary/70 shadow-neu-flat'
                  : 'bg-neu-base text-neu-muted shadow-neu-flat'"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ priority.isActive ? t('planning.common.status.active') : t('planning.common.status.paused') }}
              </span>
            </p>
            <div v-if="priority.lifeAreaIds.length > 0" class="flex flex-wrap gap-2 mt-1.5 text-xs text-neu-muted">
              <span
                v-for="lifeAreaId in priority.lifeAreaIds"
                :key="lifeAreaId"
                class="inline-flex items-center gap-1"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :style="{ backgroundColor: lifeAreaById.get(lifeAreaId)?.color || 'rgb(var(--color-primary))' }"
                />
                {{ lifeAreaNameById(lifeAreaId) }}
              </span>
            </div>
            <div class="flex flex-wrap gap-3 mt-1.5 text-xs text-neu-muted">
            <span v-if="priority.successSignals.length > 0" class="flex items-center gap-1">
              <TrophyIcon class="w-3 h-3" />
              {{ t('planning.components.yearlyReviewSummary.signalCount', { count: priority.successSignals.length }).split(' | ')[priority.successSignals.length === 1 ? 0 : 1] }}
            </span>
            <span v-if="priority.constraints.length > 0" class="flex items-center gap-1">
              <ShieldExclamationIcon class="w-3 h-3" />
              {{ t('planning.components.yearlyReviewSummary.constraintCount', { count: priority.constraints.length }).split(' | ')[priority.constraints.length === 1 ? 0 : 1] }}
            </span>
            </div>
          </div>
        </div>
      </div>

      <p v-else class="text-center text-neu-muted py-4">
        {{ t('planning.components.yearlyReviewSummary.noPriorities') }}
      </p>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
/**
 * YearlyReviewSummary - Read-only summary of yearly planning data
 *
 * Displays:
 * - Year theme (if set)
 * - Reflections (wins, lessons)
 * - Focus life areas (primary + secondary)
 * - Priorities with linked life areas
 */
import { computed } from 'vue'
import {
  SparklesIcon,
  CalendarDaysIcon,
  RectangleStackIcon,
  FlagIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  LightBulbIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()
import AppCard from '@/components/AppCard.vue'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { formatPeriodDateRange, getDefaultPeriodName } from '@/utils/periodUtils'
import type {
  YearlyPlanningDraft,
  DraftPriority,
} from '@/composables/useYearlyPlanningDraft'
import type { LifeArea } from '@/domain/lifeArea'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  draft: YearlyPlanningDraft
  lifeAreas: LifeArea[]
  focusLifeAreaIds: string[]
  primaryFocusLifeAreaId?: string
  priorities: DraftPriority[]
}>()

// ============================================================================
// Computed
// ============================================================================

const periodTitle = computed(() => {
  if (props.draft.name.trim()) {
    return props.draft.name.trim()
  }
  return getDefaultPeriodName(props.draft.startDate, props.draft.endDate, 'yearly')
})

const periodRange = computed(() =>
  formatPeriodDateRange(props.draft.startDate, props.draft.endDate)
)

const hasDreamingContent = computed(() => {
  const d = props.draft.dreaming
  if (!d || Array.isArray(d)) return false
  return d.outcomes.length > 0 || d.difference || d.progressClues.length > 0
})

// ============================================================================
// Helpers
// ============================================================================

const lifeAreaById = computed(() =>
  new Map(props.lifeAreas.map((la) => [la.id, la]))
)

const focusLifeAreas = computed(() =>
  props.focusLifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const primaryFocusLifeArea = computed(() => {
  if (!props.primaryFocusLifeAreaId) return undefined
  return lifeAreaById.value.get(props.primaryFocusLifeAreaId)
})

const secondaryFocusLifeAreas = computed(() => {
  if (!primaryFocusLifeArea.value) return focusLifeAreas.value
  return focusLifeAreas.value.filter((la) => la.id !== primaryFocusLifeArea.value?.id)
})

const sortedPriorities = computed(() =>
  [...props.priorities].sort((a, b) => a.sortOrder - b.sortOrder)
)

function lifeAreaNameById(id: string): string {
  return lifeAreaById.value.get(id)?.name || t('planning.components.yearlyReviewSummary.unknown')
}

function priorityAccentColor(priority: DraftPriority): string {
  const firstLifeArea = priority.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .find(Boolean)
  return firstLifeArea?.color || 'rgb(var(--color-primary))'
}

function getFocusAreaChipStyle(color?: string) {
  if (!color) {
    return {
      backgroundColor: 'rgb(var(--neo-surface-base))',
      color: 'rgb(var(--neo-text))',
    }
  }
  return {
    backgroundColor: `${color}26`,
    color: color,
  }
}
</script>
