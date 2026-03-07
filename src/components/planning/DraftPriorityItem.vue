<template>
  <AppCard class="neo-card neo-card--commitment relative h-full overflow-hidden group">
    <div class="px-3 py-3 flex flex-col gap-2.5">
      <!-- Row 1: Icon + Title -->
      <div class="flex items-center gap-1.5">
        <IconPicker
          :model-value="priority.icon"
          compact
          minimal
          aria-label="Select priority icon"
          class="flex-shrink-0"
          @update:model-value="$emit('update-icon', priority.id, $event)"
        />
        <span class="block text-lg font-semibold leading-snug text-on-surface line-clamp-2 flex-1 min-w-0">
          {{ priority.name }}
        </span>
      </div>

      <!-- Row 2: Status + Actions + Linked Objects -->
      <div class="flex items-center gap-1.5">
        <AnimatedStatusPicker
          :current-status="priority.isActive ? 'active' : 'paused'"
          :options="statusOptions"
          class="flex-shrink-0"
          @change="handleStatusChange"
        />

        <button
          type="button"
          class="neo-icon-button neo-focus h-8 w-8 p-0 flex-shrink-0"
          :aria-label="t('planning.components.draftPriorityItem.editPriority')"
          @click="$emit('edit', priority.id)"
        >
          <PencilIcon class="h-4 w-4" />
        </button>

        <button
          type="button"
          class="neo-icon-button neo-focus h-8 w-8 p-0 flex-shrink-0 hover:text-error"
          :aria-label="t('planning.components.draftPriorityItem.deletePriority')"
          @click="$emit('delete', priority.id)"
        >
          <TrashIcon class="h-4 w-4" />
        </button>

        <CommitmentLinkedObjectsCluster
          :life-areas="linkedLifeAreas"
          :priorities="[]"
          :derived-life-areas="[]"
        />
      </div>

      <!-- Success Signals Section -->
      <div v-if="priority.successSignals.length > 0" class="neo-surface p-3 space-y-2">
        <div class="flex items-center gap-1.5">
          <TrophyIcon class="w-3.5 h-3.5 text-primary" />
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.draftPriorityForm.successSignals.title') }}
          </span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(signal, index) in priority.successSignals"
            :key="'signal-' + index"
            class="flex items-start gap-2 neo-inset rounded-xl px-3 py-2"
          >
            <CheckIcon class="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
            <span class="text-sm text-neu-text">{{ signal }}</span>
          </div>
        </div>
      </div>

      <!-- Constraints Section -->
      <div v-if="priority.constraints.length > 0" class="neo-surface p-3 space-y-2">
        <div class="flex items-center gap-1.5">
          <ShieldExclamationIcon class="w-3.5 h-3.5 text-primary" />
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.draftPriorityForm.constraints.title') }}
          </span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(constraint, index) in priority.constraints"
            :key="'constraint-' + index"
            class="flex items-start gap-2 neo-inset rounded-xl px-3 py-2"
          >
            <ShieldExclamationIcon class="w-3.5 h-3.5 text-on-surface-variant/50 mt-0.5 flex-shrink-0" />
            <span class="text-sm text-neu-text">{{ constraint }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import {
  PencilIcon,
  TrashIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import { PlayCircleIcon, PauseCircleIcon } from '@heroicons/vue/24/solid'
import AppCard from '@/components/AppCard.vue'
import IconPicker from '@/components/planning/IconPicker.vue'
import AnimatedStatusPicker from '@/components/planning/AnimatedStatusPicker.vue'
import CommitmentLinkedObjectsCluster from '@/components/planning/CommitmentLinkedObjectsCluster.vue'
import { useT } from '@/composables/useT'
import type { DraftPriority } from '@/composables/useYearlyPlanningDraft'
import type { LifeArea } from '@/domain/lifeArea'

const { t } = useT()

// ============================================================================
// Props and Emits
// ============================================================================

const props = defineProps<{
  priority: DraftPriority
  lifeAreas: LifeArea[]
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  'update-icon': [id: string, icon: string | undefined]
  'toggle-status': [id: string]
}>()

// ============================================================================
// Computed
// ============================================================================

const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))

const linkedLifeAreas = computed(() =>
  props.priority.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const statusOptions = computed(() => [
  {
    value: 'active',
    label: t('planning.common.status.active'),
    icon: markRaw(PlayCircleIcon),
    activeClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    value: 'paused',
    label: t('planning.common.status.paused'),
    icon: markRaw(PauseCircleIcon),
    activeClass: 'text-on-surface-variant',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-on-surface-variant/70',
  },
])

function handleStatusChange(_status: string) {
  emit('toggle-status', props.priority.id)
}
</script>
