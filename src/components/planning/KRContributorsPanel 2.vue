<template>
  <div v-if="isLoading" class="text-xs text-on-surface-variant py-2">
    {{ t('planning.components.krContributorsPanel.loading') }}
  </div>
  <div v-else-if="contributors.length === 0" class="text-xs text-on-surface-variant py-2">
    {{ t('planning.components.krContributorsPanel.noContributors') }}
  </div>
  <div v-else class="space-y-1.5">
    <RouterLink
      v-for="item in contributors"
      :key="item.commitment.id"
      :to="item.commitment.weeklyPlanId ? `/planning/week/${item.commitment.weeklyPlanId}` : '#'"
      class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface/50 hover:bg-primary/5 transition-colors"
    >
      <!-- Status dot -->
      <span
        class="w-2 h-2 rounded-full flex-shrink-0"
        :class="statusDotClass(item.commitment.status)"
      />
      <!-- Name -->
      <span class="text-xs text-on-surface truncate flex-1 min-w-0">
        {{ item.commitment.name }}
      </span>
      <!-- Tick progress -->
      <span v-if="item.tickProgress" class="text-[11px] text-on-surface-variant flex-shrink-0">
        {{ item.tickProgress }}
      </span>
      <!-- Status badge -->
      <span
        class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
        :class="statusBadgeClass(item.commitment.status)"
      >
        {{ statusLabel(item.commitment.status) }}
      </span>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useT } from '@/composables/useT'
import { useTrackerStore } from '@/stores/tracker.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import type { Commitment, CommitmentStatus } from '@/domain/planning'

const { t } = useT()

const props = defineProps<{
  projectId: string
  krId: string
}>()

interface ContributorItem {
  commitment: Commitment
  tickProgress: string | null
}

const trackerStore = useTrackerStore()
const commitmentStore = useCommitmentStore()

const isLoading = ref(true)
const contributors = ref<ContributorItem[]>([])

function statusDotClass(status: CommitmentStatus): string {
  const map: Record<CommitmentStatus, string> = {
    planned: 'bg-primary',
    done: 'bg-success',
    skipped: 'bg-on-surface-variant',
  }
  return map[status] || 'bg-on-surface-variant'
}

function statusBadgeClass(status: CommitmentStatus): string {
  const map: Record<CommitmentStatus, string> = {
    planned: 'bg-primary/10 text-primary',
    done: 'bg-success/10 text-success',
    skipped: 'bg-section text-on-surface-variant',
  }
  return map[status] || 'bg-section text-on-surface-variant'
}

function statusLabel(status: CommitmentStatus): string {
  const map: Record<CommitmentStatus, string> = {
    planned: t('planning.common.status.planned'),
    done: t('planning.common.status.done'),
    skipped: t('planning.common.status.skipped'),
  }
  return map[status] || status
}

async function loadContributors() {
  isLoading.value = true
  try {
    // Look up the tracker by ID from the tracker store
    const tracker = trackerStore.getTrackerById(props.krId)
    if (!tracker) {
      contributors.value = []
      return
    }

    // Load commitments linked to the same project and find those referencing this tracker
    await commitmentStore.loadCommitments({ projectId: props.projectId })
    const projectCommitments = commitmentStore.commitments.filter(
      (c) => c.projectId === props.projectId
    )

    // Get tracker periods for progress display
    const periods = trackerStore.getTrackerPeriodsByTrackerId(tracker.id)

    const items: ContributorItem[] = projectCommitments.map((commitment) => {
      let tickProgress: string | null = null
      if (tracker.targetCount) {
        // Count completed ticks across all periods
        const completedTicks = periods.reduce((sum, p) => {
          if (p.ticks) {
            return sum + p.ticks.filter((t) => t.completed).length
          }
          return sum
        }, 0)
        tickProgress = `${completedTicks}/${tracker.targetCount}`
      }
      return { commitment, tickProgress }
    })

    contributors.value = items
  } catch {
    contributors.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadContributors()
})
</script>
