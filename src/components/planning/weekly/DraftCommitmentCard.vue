<template>
  <div class="flex items-start gap-3 p-3 rounded-xl bg-neu-base shadow-neu-raised-sm border border-neu-border/25 transition-all">
    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="font-medium text-neu-text leading-snug line-clamp-2">
          {{ commitment.name }}
        </p>
      </div>
      <div class="mt-1">
        <CommitmentLinkedObjectsCluster
          :project="project"
          :life-areas="linkedLifeAreas"
          :priorities="linkedPriorities"
          :derived-life-areas="derivedLifeAreas"
          :derived-priorities="derivedPriorities"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="p-1.5 rounded-lg text-neu-muted bg-neu-base shadow-neu-raised-sm hover:shadow-neu-hover active:shadow-neu-pressed-sm active:bg-neu-base transition-all"
        :title="t('planning.components.draftCommitmentCard.editCommitment')"
        @click="handleEdit"
      >
        <PencilIcon class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="p-1.5 rounded-lg text-neu-muted bg-neu-base shadow-neu-raised-sm hover:shadow-neu-hover hover:text-error active:shadow-neu-pressed-sm active:bg-neu-base transition-all"
        :title="t('planning.components.draftCommitmentCard.deleteCommitment')"
        @click="handleDelete"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useT } from '@/composables/useT'

const { t } = useT()
import CommitmentLinkedObjectsCluster from '@/components/planning/CommitmentLinkedObjectsCluster.vue'
import type { DraftCommitment } from '@/composables/useWeeklyPlanningDraft'
import type { Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

const props = defineProps<{
  commitment: DraftCommitment
  project?: Project
  lifeAreas: LifeArea[]
  priorities: Priority[]
}>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.priorities.map((p) => [p.id, p])))

const linkedLifeAreas = computed(() =>
  props.commitment.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const linkedPriorities = computed(() =>
  props.commitment.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedPriorityIds = computed(() => {
  const ids = new Set<string>()
  if (props.project?.priorityIds?.length) {
    props.project.priorityIds.forEach((id) => ids.add(id))
  }
  props.commitment.priorityIds.forEach((id) => ids.delete(id))
  return Array.from(ids)
})

const derivedPriorities = computed(() =>
  derivedPriorityIds.value
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedLifeAreas = computed(() => {
  const ids = new Set<string>()
  if (props.project?.lifeAreaIds?.length) {
    props.project.lifeAreaIds.forEach((id) => ids.add(id))
  }
  const priorityIds = new Set([...props.commitment.priorityIds, ...derivedPriorityIds.value])
  for (const priorityId of priorityIds) {
    const priority = priorityById.value.get(priorityId)
    priority?.lifeAreaIds?.forEach((id) => ids.add(id))
  }
  props.commitment.lifeAreaIds.forEach((id) => ids.delete(id))
  return Array.from(ids)
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
})

function handleEdit() {
  emit('edit', props.commitment.id)
}

function handleDelete() {
  emit('delete', props.commitment.id)
}
</script>
