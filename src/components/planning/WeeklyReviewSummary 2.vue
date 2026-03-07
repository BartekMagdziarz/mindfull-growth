<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppCard padding="lg">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-neu-text mb-2">
          {{ t('planning.components.weeklyReviewSummary.header', { weekRange: weekRangeLabel }) }}
        </h2>
        <p class="text-neu-muted">
          {{ t('planning.components.weeklyReviewSummary.reviewSubtitle') }}
        </p>
      </div>
    </AppCard>

    <!-- Constraints -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <BoltIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.weeklyReviewSummary.constraintsTitle') }}
      </h3>

      <p v-if="draft.constraintsNote" class="text-neu-muted neo-embedded rounded-xl p-3">
        <span class="text-neu-text font-medium">{{ t('planning.components.weeklyReviewSummary.constraintsNote') }}</span>
        {{ draft.constraintsNote }}
      </p>
      <p v-else class="text-sm text-neu-muted">
        {{ t('planning.components.weeklyReviewSummary.constraintsEmpty') }}
      </p>
    </AppCard>

    <!-- Battery Snapshot -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <ChartBarIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.weeklyReviewSummary.batterySnapshotTitle') }}
      </h3>
      <div class="space-y-2">
        <div
          v-for="row in batterySnapshotRows"
          :key="row.key"
          class="flex items-center justify-between rounded-xl bg-neu-base border border-neu-border/20 px-3 py-2"
        >
          <p class="text-sm font-medium text-neu-text">{{ row.title }}</p>
          <p class="text-xs text-neu-muted">
            <span class="text-warning">D{{ row.demand ?? '-' }}</span>
            <span class="mx-1">/</span>
            <span class="text-primary">S{{ row.state ?? '-' }}</span>
          </p>
        </div>
      </div>
    </AppCard>

    <!-- Commitments -->
    <AppCard padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <ClipboardDocumentCheckIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.weeklyReviewSummary.commitmentsTitle') }}
        <span class="text-sm font-normal text-neu-muted">{{ t('planning.components.weeklyReviewSummary.commitmentsCount', { count: draft.commitments.length }) }}</span>
      </h3>

      <!-- Commitment List -->
      <div v-if="draft.commitments.length > 0" class="space-y-3">
        <div
          v-for="commitment in sortedCommitments"
          :key="commitment.id"
          class="flex items-center gap-3 p-3 rounded-xl bg-neu-base shadow-neu-raised-sm border border-neu-border/25"
        >
          <div class="p-1.5 rounded-lg bg-neu-base shadow-neu-flat">
            <CheckCircleIcon class="w-4 h-4 text-neu-muted" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-neu-text">
              {{ commitment.name }}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getPrimaryLifeAreaForCommitment(commitment)?.color || 'rgb(var(--color-primary))' }"
              />
              <span class="text-xs text-neu-muted">
                {{ getLifeAreaLabelForCommitment(commitment) }}
                <span v-if="getProjectForCommitment(commitment.projectId)" class="text-neu-muted/60">
                  {{ t('planning.components.weeklyReviewSummary.via', { project: getProjectForCommitment(commitment.projectId)?.name }) }}
                </span>
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- Empty state -->
      <p v-else class="text-center text-neu-muted py-8">
        {{ t('planning.components.weeklyReviewSummary.noCommitments') }}
      </p>
    </AppCard>

    <!-- Weekly Focus (if present) -->
    <AppCard v-if="draft.focusSentence || draft.adaptiveIntention" padding="lg">
      <h3 class="text-lg font-semibold text-neu-text mb-4 flex items-center gap-2">
        <SparklesIcon class="w-5 h-5 text-primary" />
        {{ t('planning.components.weeklyReviewSummary.focusTitle') }}
      </h3>

      <!-- Focus Sentence -->
      <div v-if="draft.focusSentence" class="mb-4">
        <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">
          {{ t('planning.components.weeklyReviewSummary.whatMakeGoodWeek') }}
        </p>
        <p class="text-lg text-neu-text neo-embedded rounded-xl p-4">
          "{{ draft.focusSentence }}"
        </p>
      </div>

      <!-- Adaptive Intention -->
      <div v-if="draft.adaptiveIntention">
        <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">
          {{ t('planning.components.weeklyReviewSummary.ifThingsGetMessy') }}
        </p>
        <p class="text-neu-text neo-embedded rounded-xl p-4">
          "{{ draft.adaptiveIntention }}"
        </p>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
/**
 * WeeklyReviewSummary - Read-only summary of weekly planning data
 *
 * Displays:
 * - Week range header
 * - Constraints note
 * - Battery trend snapshot
 * - Commitments list
 * - Focus sentence and adaptive intention
 */
import { computed } from 'vue'
import {
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()
import AppCard from '@/components/AppCard.vue'
import {
  type WeeklyPlanningDraft,
  type DraftCommitment,
} from '@/composables/useWeeklyPlanningDraft'
import type { Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import type { WeeklyBatteryTrendPoint } from '@/services/weeklyBatteryTrend.service'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  draft: WeeklyPlanningDraft
  weekRangeLabel: string
  lifeAreas: LifeArea[]
  priorities: Priority[]
  projects: Project[]
  batteryTrendPanels: Array<{
    key: 'body' | 'mind' | 'emotion' | 'social'
    title: string
    points: WeeklyBatteryTrendPoint[]
  }>
}>()

// ============================================================================
// Computed
// ============================================================================

const sortedCommitments = computed(() => {
  return [...props.draft.commitments].sort((a, b) => a.sortOrder - b.sortOrder)
})

const batterySnapshotRows = computed(() => {
  return props.batteryTrendPanels.map((panel) => {
    const latest = panel.points[panel.points.length - 1]
    return {
      key: panel.key,
      title: panel.title,
      demand: latest?.demand ?? null,
      state: latest?.state ?? null,
    }
  })
})

// ============================================================================
// Helpers
// ============================================================================

function getProjectForCommitment(projectId?: string): Project | undefined {
  if (!projectId) return undefined
  return props.projects.find((p) => p.id === projectId)
}

function getPrimaryLifeAreaForCommitment(commitment: DraftCommitment): LifeArea | undefined {
  return getLifeAreasForCommitment(commitment)[0]
}

function getLifeAreaLabelForCommitment(commitment: DraftCommitment): string {
  const lifeAreas = getLifeAreasForCommitment(commitment)
  if (lifeAreas.length === 0) return t('planning.components.weeklyReviewSummary.unlinked')
  return lifeAreas.map((la) => la.name).join(', ')
}

function getLifeAreasForCommitment(commitment: DraftCommitment): LifeArea[] {
  const ids: string[] = []
  const seen = new Set<string>()

  const addId = (id?: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  const addMany = (list?: string[]) => {
    list?.forEach((id) => addId(id))
  }

  addMany(commitment.lifeAreaIds)

  commitment.priorityIds?.forEach((priorityId) => {
    const priority = props.priorities.find((p) => p.id === priorityId)
    addMany(priority?.lifeAreaIds)
  })

  if (commitment.projectId) {
    const project = getProjectForCommitment(commitment.projectId)
    addMany(project?.lifeAreaIds)
    project?.priorityIds?.forEach((priorityId) => {
      const priority = props.priorities.find((p) => p.id === priorityId)
      addMany(priority?.lifeAreaIds)
    })
  }

  return ids
    .map((id) => props.lifeAreas.find((la) => la.id === id))
    .filter(Boolean) as LifeArea[]
}
</script>
