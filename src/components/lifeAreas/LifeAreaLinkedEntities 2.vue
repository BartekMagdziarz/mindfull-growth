<template>
  <div class="space-y-4">
    <!-- Wheel of Life Scores -->
    <div v-if="wheelScores.length > 0">
      <h4 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.linkedEntities.wheelScores') }}</h4>
      <div class="flex items-end gap-1 h-16">
        <div
          v-for="(score, index) in wheelScores"
          :key="index"
          class="flex-1 rounded-t bg-primary/60 transition-all"
          :style="{ height: `${(score.rating / 10) * 100}%` }"
          :title="t('lifeAreas.linkedEntities.scoreTooltip', { date: score.date, rating: score.rating })"
        />
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-xs text-on-surface-variant">{{ wheelScores[0]?.date }}</span>
        <span class="text-xs text-on-surface-variant">{{ wheelScores[wheelScores.length - 1]?.date }}</span>
      </div>
    </div>

    <!-- Priorities -->
    <div v-if="linkedPriorities.length > 0">
      <h4 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.linkedEntities.prioritiesTitle') }}</h4>
      <div class="space-y-1">
        <div
          v-for="p in linkedPriorities"
          :key="p.id"
          class="text-sm px-3 py-2 rounded-xl bg-section text-on-surface"
        >
          {{ p.name }}
        </div>
      </div>
    </div>

    <!-- Projects -->
    <div v-if="linkedProjects.length > 0">
      <h4 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.linkedEntities.projectsTitle') }}</h4>
      <div class="space-y-1">
        <div
          v-for="project in linkedProjects"
          :key="project.id"
          class="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-section"
        >
          <span class="text-on-surface">{{ project.name }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="statusClass(project.status)"
          >
            {{ project.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- Commitments -->
    <div v-if="linkedCommitments.length > 0">
      <h4 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.linkedEntities.commitmentsTitle') }}</h4>
      <div class="space-y-1">
        <div
          v-for="c in linkedCommitments"
          :key="c.id"
          class="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-section"
        >
          <span class="text-on-surface">{{ c.name }}</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="commitmentStatusClass(c.status)"
          >
            {{ c.status }}
          </span>
        </div>
      </div>
    </div>

    <p
      v-if="wheelScores.length === 0 && linkedPriorities.length === 0 && linkedProjects.length === 0 && linkedCommitments.length === 0"
      class="text-sm text-on-surface-variant text-center py-4"
    >
      {{ t('lifeAreas.linkedEntities.emptyState') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { LifeArea } from '@/domain/lifeArea'
import type { ProjectStatus, CommitmentStatus } from '@/domain/planning'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useProjectStore } from '@/stores/project.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  lifeArea: LifeArea
}>()

const wheelStore = useWheelOfLifeStore()
const priorityStore = usePriorityStore()
const projectStore = useProjectStore()
const commitmentStore = useCommitmentStore()

onMounted(async () => {
  await Promise.all([
    wheelStore.loadSnapshots(),
    priorityStore.loadPriorities(),
    projectStore.loadProjects(),
    commitmentStore.loadCommitments(),
  ])
})

const wheelScores = computed(() => {
  return wheelStore.sortedSnapshots
    .map((snapshot) => {
      const area = snapshot.areas.find(
        (a) => a.name.toLowerCase() === props.lifeArea.name.toLowerCase(),
      )
      if (!area) return null
      return {
        date: new Date(snapshot.createdAt).toLocaleDateString(),
        rating: area.rating,
      }
    })
    .filter(Boolean) as Array<{ date: string; rating: number }>
})

const linkedPriorities = computed(() => {
  return priorityStore.priorities.filter((p) => p.lifeAreaIds?.includes(props.lifeArea.id))
})

const priorityIdsForLifeArea = computed(() => new Set(linkedPriorities.value.map((p) => p.id)))

const linkedProjects = computed(() => {
  return projectStore.projects.filter((project) => {
    if (project.lifeAreaIds?.includes(props.lifeArea.id)) return true
    return project.priorityIds?.some((id) => priorityIdsForLifeArea.value.has(id))
  })
})

const projectIdsForLifeArea = computed(() => new Set(linkedProjects.value.map((p) => p.id)))

const linkedCommitments = computed(() => {
  return commitmentStore.commitments.filter((commitment) => {
    if (commitment.lifeAreaIds?.includes(props.lifeArea.id)) return true
    if (commitment.projectId && projectIdsForLifeArea.value.has(commitment.projectId)) return true
    return commitment.priorityIds?.some((id) => priorityIdsForLifeArea.value.has(id))
  })
})

function statusClass(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    planned: 'bg-outline/10 text-on-surface-variant',
    active: 'bg-primary/10 text-primary',
    paused: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    abandoned: 'bg-error/10 text-error',
  }
  return map[status]
}

function commitmentStatusClass(status: CommitmentStatus): string {
  const map: Record<CommitmentStatus, string> = {
    planned: 'bg-outline/10 text-on-surface-variant',
    done: 'bg-success/10 text-success',
    skipped: 'bg-error/10 text-error',
  }
  return map[status]
}
</script>
