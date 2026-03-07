<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppCard padding="lg">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-neu-text mb-2">
          {{ t('planning.components.monthlyReviewSummary.header', { month: monthLabel }) }}
        </h2>
        <p class="text-neu-muted">
          {{ t('planning.components.monthlyReviewSummary.reviewSubtitle') }}
        </p>
      </div>
    </AppCard>

    <!-- Focus Life Areas Selection -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <RectangleStackIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.monthlyReviewSummary.focusTitle') }}
      </h3>

      <div class="space-y-3">
        <!-- Primary Focus Life Area -->
        <div v-if="primaryFocusLifeArea">
          <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">{{ t('planning.components.monthlyReviewSummary.primary') }}</p>
          <span
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-neu-raised-sm"
            :style="getLifeAreaChipStyle(primaryFocusLifeArea.color)"
          >
            <EntityIcon
              :icon="primaryFocusLifeArea.icon"
              :color="primaryFocusLifeArea.color"
              size="xs"
            />
            {{ primaryFocusLifeArea.name }}
          </span>
        </div>

        <!-- Secondary Focus Life Areas -->
        <div v-if="secondaryFocusLifeAreas.length > 0">
          <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">{{ t('planning.components.monthlyReviewSummary.secondary') }}</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="la in secondaryFocusLifeAreas"
              :key="la.id"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-neu-raised-sm"
              :style="getLifeAreaChipStyle(la.color)"
            >
              <EntityIcon
                :icon="la.icon"
                :color="la.color"
                size="xs"
              />
              {{ la.name }}
            </span>
          </div>
        </div>

        <!-- No focus areas selected -->
        <p v-if="!primaryFocusLifeArea && secondaryFocusLifeAreas.length === 0" class="text-neu-muted italic">
          {{ t('planning.components.monthlyReviewSummary.noFocusAreas') }}
        </p>
      </div>
    </AppCard>

    <!-- Monthly strategy cues -->
    <AppCard
      v-if="draft.monthIntention || draft.focusSuccessSignal || draft.balanceGuardrail"
      padding="lg"
    >
      <div class="flex items-center gap-3 mb-3">
        <SparklesIcon class="w-5 h-5 text-primary" />
        <h3 class="text-lg font-semibold text-neu-text">
          {{ t('planning.components.monthlyReviewSummary.monthIntention') }}
        </h3>
      </div>

      <div class="space-y-3">
        <div v-if="draft.monthIntention" class="neo-embedded rounded-xl p-4">
          <p class="text-xs uppercase tracking-wide text-neu-muted mb-1">
            {{ t('planning.components.monthlyReviewSummary.monthIntention') }}
          </p>
          <p class="text-lg text-neu-text">"{{ draft.monthIntention }}"</p>
        </div>

        <div v-if="draft.focusSuccessSignal" class="neo-embedded rounded-xl p-4">
          <p class="text-xs uppercase tracking-wide text-neu-muted mb-1">
            {{ t('planning.components.monthlyReviewSummary.focusSuccessSignal') }}
          </p>
          <p class="text-neu-text">{{ draft.focusSuccessSignal }}</p>
        </div>

        <div v-if="draft.balanceGuardrail" class="neo-embedded rounded-xl p-4">
          <p class="text-xs uppercase tracking-wide text-neu-muted mb-1">
            {{ t('planning.components.monthlyReviewSummary.balanceGuardrail') }}
          </p>
          <p class="text-neu-text">{{ draft.balanceGuardrail }}</p>
        </div>
      </div>
    </AppCard>

    <!-- Projects -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <RocketLaunchIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.monthlyReviewSummary.projectsTitle') }}
        <span class="text-sm font-normal text-neu-muted">{{ t('planning.components.monthlyReviewSummary.projectsCount', { count: draft.projects.length }) }}</span>
      </h3>

      <div v-if="sortedProjects.length > 0" class="space-y-3">
        <div
          v-for="project in sortedProjects"
          :key="project.id"
          class="p-4 rounded-xl bg-neu-base shadow-neu-raised-sm border border-neu-border/25"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-neu-text truncate inline-flex items-center gap-2">
                <EntityIcon
                  :icon="project.icon"
                  size="xs"
                />
                {{ project.name }}
              </p>
              <div class="flex flex-wrap gap-2 mt-2 text-xs text-neu-muted">
                <span
                  v-for="lifeArea in lifeAreasForProject(project)"
                  :key="lifeArea.id"
                  class="inline-flex items-center gap-1"
                >
                  <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: lifeArea.color || 'rgb(var(--color-primary))' }" />
                  {{ lifeArea.name }}
                </span>
                <span
                  v-for="priority in prioritiesForProject(project)"
                  :key="priority.id"
                  class="inline-flex items-center gap-1"
                >
                  <EntityIcon
                    :icon="priority.icon"
                    size="xs"
                  />
                  {{ priority.name }}
                </span>
                <span v-if="project.targetOutcome" class="inline-flex items-center gap-1">
                  {{ project.targetOutcome }}
                </span>
              </div>
            </div>
            <span
              :class="getStatusBadgeClasses(project.status)"
              class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
            >
              {{ getStatusLabel(project.status) }}
            </span>
          </div>
          <div v-if="project.isCarriedForward" class="mt-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary/50 shadow-neu-flat">
              {{ t('planning.components.monthlyReviewSummary.carriedForward') }}
            </span>
          </div>
        </div>
      </div>

      <p v-else class="text-center text-neu-muted py-8">
        {{ t('planning.components.monthlyReviewSummary.noProjects') }}
      </p>

      <p v-if="carriedForwardCount > 0" class="mt-4 text-sm text-neu-muted text-center">
        {{ t('planning.components.monthlyReviewSummary.carriedForwardCount', { count: carriedForwardCount }).split(' | ')[carriedForwardCount === 1 ? 0 : 1] }}
      </p>
    </AppCard>

  </div>
</template>

<script setup lang="ts">
/**
 * MonthlyReviewSummary - Read-only summary of monthly planning data
 */
import { computed } from 'vue'
import {
  RectangleStackIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()
import AppCard from '@/components/AppCard.vue'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import type { MonthlyPlanningDraft, DraftProject } from '@/composables/useMonthlyPlanningDraft'
import type { Priority, ProjectStatus } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

const props = defineProps<{
  draft: MonthlyPlanningDraft
  lifeAreas: LifeArea[]
  priorities: Priority[]
  monthLabel: string
}>()

const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.priorities.map((p) => [p.id, p])))

const primaryFocusLifeArea = computed(() => {
  if (!props.draft.primaryFocusLifeAreaId) return null
  return lifeAreaById.value.get(props.draft.primaryFocusLifeAreaId) || null
})

const secondaryFocusLifeAreas = computed(() => {
  return props.draft.secondaryFocusLifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter((la): la is LifeArea => la !== undefined)
})

const sortedProjects = computed(() =>
  [...props.draft.projects].sort((a, b) => a.sortOrder - b.sortOrder)
)

const carriedForwardCount = computed(() => {
  return props.draft.projects.filter((p) => p.isCarriedForward).length
})

function lifeAreasForProject(project: DraftProject): LifeArea[] {
  return project.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter((la): la is LifeArea => la !== undefined)
}

function prioritiesForProject(project: DraftProject): Priority[] {
  return project.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter((p): p is Priority => p !== undefined)
}

function getLifeAreaChipStyle(color?: string) {
  if (!color) {
    return {
      backgroundColor: 'rgb(var(--color-section))',
      color: 'rgb(var(--color-on-surface))',
    }
  }
  return {
    backgroundColor: `${color}26`,
    color: color,
  }
}

function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    planned: t('planning.common.status.planned'),
    active: t('planning.common.status.active'),
    paused: t('planning.common.status.paused'),
    completed: t('planning.common.status.completed'),
    abandoned: t('planning.common.status.abandoned'),
  }
  return labels[status]
}

function getStatusBadgeClasses(status: ProjectStatus): string {
  const classes: Record<ProjectStatus, string> = {
    planned: 'bg-neu-base text-neu-muted shadow-neu-flat',
    active: 'bg-primary/5 text-primary/70 shadow-neu-flat',
    paused: 'bg-neu-base text-neu-muted shadow-neu-flat',
    completed: 'bg-success/5 text-success/60 shadow-neu-flat',
    abandoned: 'bg-neu-base text-neu-muted/60 shadow-neu-flat',
  }
  return classes[status]
}
</script>
