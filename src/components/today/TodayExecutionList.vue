<template>
  <AppCard class="neo-raised w-full">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-on-surface">{{ t('today.executionList.title') }}</h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('today.executionList.progress', { done: doneCount, total: commitments.length }) }}
          </p>
        </div>

        <AppButton variant="tonal" size="sm" @click="emit('openPlanning')">
          {{ t('today.executionList.openPlanning') }}
        </AppButton>
      </div>

      <div
        v-if="!hasWeeklyPlan"
        class="rounded-2xl border border-neu-border/20 bg-section/45 px-4 py-4 text-sm text-on-surface-variant"
      >
        {{ t('today.executionList.noWeeklyPlan') }}
      </div>

      <div
        v-else-if="commitments.length === 0"
        class="rounded-2xl border border-neu-border/20 bg-section/45 px-4 py-4 text-sm text-on-surface-variant"
      >
        {{ t('today.executionList.empty') }}
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="commitment in sortedCommitments"
          :key="commitment.id"
          class="flex items-start gap-3 rounded-2xl border border-neu-border/15 bg-section/35 px-4 py-3"
        >
          <div class="flex gap-1 pt-0.5">
            <button
              type="button"
              :class="[
                'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                commitment.status === 'done'
                  ? 'border-success/20 bg-success/15 text-success'
                  : 'border-neu-border/20 bg-background/50 text-on-surface-variant hover:text-success',
              ]"
              :aria-label="t('today.executionList.markDone')"
              @click="toggleDone(commitment.id, commitment.status)"
            >
              <CheckIcon class="h-4 w-4" />
            </button>

            <button
              type="button"
              :class="[
                'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                commitment.status === 'skipped'
                  ? 'border-warning/20 bg-warning/15 text-warning'
                  : 'border-neu-border/20 bg-background/50 text-on-surface-variant hover:text-warning',
              ]"
              :aria-label="t('today.executionList.markSkipped')"
              @click="toggleSkipped(commitment.id, commitment.status)"
            >
              <MinusIcon class="h-4 w-4" />
            </button>
          </div>

          <div class="min-w-0 flex-1">
            <p
              :class="[
                'text-sm font-medium text-on-surface',
                commitment.status === 'done' ? 'line-through opacity-70' : '',
              ]"
            >
              {{ commitment.name }}
            </p>
            <p v-if="getCommitmentSummary(commitment)" class="mt-1 text-xs text-on-surface-variant">
              {{ getCommitmentSummary(commitment) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, MinusIcon } from '@heroicons/vue/24/solid'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { Commitment, CommitmentStatus, Priority, Project } from '@/domain/planning'

const { t } = useT()

const props = defineProps<{
  commitments: Commitment[]
  projects: Project[]
  priorities: Priority[]
  hasWeeklyPlan: boolean
}>()

const emit = defineEmits<{
  openPlanning: []
  statusChange: [commitmentId: string, status: CommitmentStatus]
}>()

const doneCount = computed(() => props.commitments.filter((commitment) => commitment.status === 'done').length)

const sortedCommitments = computed(() => {
  const statusRank: Record<CommitmentStatus, number> = {
    planned: 0,
    skipped: 1,
    done: 2,
  }

  return [...props.commitments].sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status]
    return b.createdAt.localeCompare(a.createdAt)
  })
})

function getCommitmentSummary(commitment: Commitment): string {
  const parts: string[] = []
  const project = commitment.projectId
    ? props.projects.find((candidate) => candidate.id === commitment.projectId)
    : undefined

  if (project) {
    parts.push(project.name)
  }

  const priorityNames = Array.from(
    new Set([
      ...commitment.priorityIds,
      ...(project?.priorityIds ?? []),
    ]),
  )
    .map((priorityId) => props.priorities.find((priority) => priority.id === priorityId)?.name)
    .filter((name): name is string => Boolean(name))

  if (priorityNames.length > 0) {
    parts.push(priorityNames.join(', '))
  }

  return parts.join(' · ')
}

function toggleDone(commitmentId: string, currentStatus: CommitmentStatus) {
  emit('statusChange', commitmentId, currentStatus === 'done' ? 'planned' : 'done')
}

function toggleSkipped(commitmentId: string, currentStatus: CommitmentStatus) {
  emit('statusChange', commitmentId, currentStatus === 'skipped' ? 'planned' : 'skipped')
}
</script>
