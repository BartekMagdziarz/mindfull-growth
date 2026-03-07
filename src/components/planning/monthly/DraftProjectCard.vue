<template>
  <div
    class="flex items-center gap-3 p-3 bg-neu-base rounded-xl shadow-neu-raised-sm border border-neu-border/25 group transition-all"
  >
    <!-- Color bar from first linked life area -->
    <div
      class="w-1 h-12 rounded-full flex-shrink-0"
      :style="{ backgroundColor: accentColor }"
    />

    <!-- Name & details -->
    <div class="flex-1 min-w-0">
      <p class="font-medium text-neu-text truncate inline-flex items-center gap-2">
        <EntityIcon
          :icon="project.icon"
          :color="accentColor"
          size="xs"
        />
        <span class="truncate">{{ project.name }}</span>
      </p>
      <p v-if="project.objective" class="text-xs text-neu-muted mt-0.5">
        {{ project.objective }}
      </p>
      <div class="flex flex-wrap gap-2 mt-1 text-xs text-neu-muted">
        <span
          v-for="lifeArea in linkedLifeAreas"
          :key="lifeArea.id"
          class="inline-flex items-center gap-1"
        >
          <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: lifeArea.color || 'rgb(var(--color-primary))' }" />
          {{ lifeArea.name }}
        </span>
        <span
          v-for="priority in linkedPriorities"
          :key="priority.id"
          class="inline-flex items-center gap-1"
        >
          <FlagIcon class="w-3 h-3" />
          {{ priority.name }}
        </span>
        <span v-if="project.targetOutcome" class="flex items-center gap-1">
          <CheckCircleIcon class="w-3 h-3" />
          {{ project.targetOutcome }}
        </span>
      </div>
      <div
        v-if="derivedLifeAreas.length > 0"
        class="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-neu-muted/70"
      >
        <span class="uppercase tracking-wide">{{ t('planning.components.draftProjectCard.derivedLifeAreas') }}</span>
        <span
          v-for="lifeArea in derivedLifeAreas"
          :key="lifeArea.id"
          class="inline-flex items-center gap-1"
        >
          {{ lifeArea.name }}
        </span>
      </div>

      <div class="mt-2 flex items-center gap-2 text-[11px] text-neu-muted">
        <span>{{ t('planning.components.draftProjectCard.focusedThisMonth') }}</span>
        <button
          type="button"
          role="switch"
          :aria-checked="isFocused"
          :class="[
            'relative inline-flex h-5 w-9 items-center rounded-full transition-all',
            isFocused ? 'neo-toggle-track--on' : 'neo-toggle-track--off',
          ]"
          @click="toggleFocus"
        >
          <span
            :class="[
              'neo-toggle-thumb h-4 w-4',
              isFocused ? 'translate-x-4' : 'translate-x-1',
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Status badge -->
    <span
      :class="statusBadgeClasses"
      class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
    >
      {{ statusLabel }}
    </span>

    <!-- Carried forward badge -->
    <span
      v-if="project.isCarriedForward"
      class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-primary/50 shadow-neu-flat flex-shrink-0"
    >
      {{ t('planning.components.monthlyReviewSummary.carriedForward') }}
    </span>

    <!-- Edit/Delete actions -->
    <button
      type="button"
      class="p-1.5 rounded-lg text-neu-muted bg-neu-base shadow-neu-raised-sm hover:shadow-neu-hover active:shadow-neu-pressed-sm transition-all flex-shrink-0"
      :aria-label="t('planning.components.draftProjectCard.editProject')"
      @click="$emit('edit', project.id)"
    >
      <PencilIcon class="w-4 h-4" />
    </button>
    <button
      type="button"
      class="p-1.5 rounded-lg text-neu-muted bg-neu-base shadow-neu-raised-sm hover:shadow-neu-hover hover:text-error active:shadow-neu-pressed-sm transition-all flex-shrink-0"
      :aria-label="t('planning.components.draftProjectCard.deleteProject')"
      @click="$emit('delete', project.id)"
    >
      <TrashIcon class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  PencilIcon,
  TrashIcon,
  FlagIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()
import EntityIcon from '@/components/planning/EntityIcon.vue'
import type { DraftProject } from '@/composables/useMonthlyPlanningDraft'
import type { Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

// ============================================================================
// Props and Emits
// ============================================================================

const props = defineProps<{
  project: DraftProject
  lifeAreas: LifeArea[]
  priorities: Priority[]
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
  'toggle-focus': [payload: { id: string; focused: boolean }]
}>()

// ============================================================================
// Computed
// ============================================================================

const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.priorities.map((p) => [p.id, p])))

const linkedLifeAreas = computed(() =>
  props.project.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const linkedPriorities = computed(() =>
  props.project.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedLifeAreas = computed(() => {
  const derivedIds = new Set<string>()
  for (const priorityId of props.project.priorityIds) {
    const priority = priorityById.value.get(priorityId)
    priority?.lifeAreaIds?.forEach((id) => derivedIds.add(id))
  }
  props.project.lifeAreaIds.forEach((id) => derivedIds.delete(id))
  return Array.from(derivedIds)
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
})

const accentColor = computed(() => {
  const lifeArea = linkedLifeAreas.value[0]
  return lifeArea?.color || 'rgb(var(--color-primary))'
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    planned: t('planning.common.status.planned'),
    active: t('planning.common.status.active'),
    paused: t('planning.common.status.paused'),
    completed: t('planning.common.status.completed'),
    abandoned: t('planning.common.status.abandoned'),
  }
  return labels[props.project.status] || props.project.status
})

const statusBadgeClasses = computed(() => {
  const classes: Record<string, string> = {
    planned: 'bg-neu-base text-neu-muted shadow-neu-flat',
    active: 'bg-primary/5 text-primary/70 shadow-neu-flat',
    paused: 'bg-neu-base text-neu-muted shadow-neu-flat',
    completed: 'bg-success/5 text-success/60 shadow-neu-flat',
    abandoned: 'bg-neu-base text-neu-muted/60 shadow-neu-flat',
  }
  return classes[props.project.status] || 'bg-neu-base text-neu-muted shadow-neu-flat'
})

const isFocused = computed(() => props.project.isFocusedThisMonth ?? true)

function toggleFocus() {
  const nextFocused = !isFocused.value
  emit('toggle-focus', { id: props.project.id, focused: nextFocused })
}
</script>
