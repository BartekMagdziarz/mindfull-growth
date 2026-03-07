<template>
  <AppCard
    class="neo-card neo-card--commitment relative h-full overflow-hidden group"
  >
    <div class="flex h-full flex-col items-center gap-2.5 px-3 py-3">
      <!-- Title -->
      <InlineEditableText
        :model-value="commitment.name"
        :disabled="isSaving"
        :is-saving="isSaving"
        text-class="block text-center text-lg font-semibold leading-snug text-on-surface line-clamp-2"
        input-class="text-lg font-semibold text-center"
        :aria-label="t('planning.components.commitmentCard.editName')"
        @save="handleNameSave"
      />

      <!-- Buttons + Linked objects -->
      <div class="flex flex-wrap items-center justify-center gap-1.5">
        <AnimatedStatusPicker
          :current-status="commitment.status"
          :options="statusOptions"
          :disabled="isSaving"
          class="flex-shrink-0"
          @change="handleStatusChange"
        />

        <CommitmentActionsMenu
          :add-categories="linkCategories"
          :add-items-by-category="linkItemsByCategory"
          :removable-links="removableLinks"
          :has-tracker="!!tracker"
          :disabled="isSaving"
          class="flex-shrink-0"
          @add-link="handleAddLink"
          @remove-link="handleRemoveLink"
          @add-tracker="(type: string) => $emit('add-tracker', commitment.id, type)"
          @remove-tracker="$emit('remove-tracker', commitment.id)"
          @delete="handleDelete"
        />

        <CommitmentLinkedObjectsCluster
          :project="linkedProject"
          :life-areas="explicitLifeAreas"
          :priorities="explicitPriorities"
          :derived-life-areas="derivedLifeAreas"
          :derived-priorities="derivedPriorities"
          :disabled="isSaving"
        />
      </div>

      <!-- Optional tracker -->
      <TrackerInlineInput
        v-if="tracker"
        class="w-full"
        :tracker="tracker"
        :period-type="periodType!"
        :start-date="startDate!"
        :end-date="endDate!"
        compact
        @logged="$emit('tracker-logged', $event)"
      />

    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, markRaw, h } from 'vue'
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/solid'
import { useT } from '@/composables/useT'

const { t } = useT()

const CircleOutlineIcon = markRaw({
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      'stroke-width': '1.5',
      stroke: 'currentColor',
    }, [h('circle', { cx: '12', cy: '12', r: '9' })])
  },
})
import AppCard from '@/components/AppCard.vue'
import InlineEditableText from './InlineEditableText.vue'
import AnimatedStatusPicker from './AnimatedStatusPicker.vue'
import CommitmentLinkedObjectsCluster from './CommitmentLinkedObjectsCluster.vue'
import CommitmentActionsMenu from './CommitmentActionsMenu.vue'
import TrackerInlineInput from './TrackerInlineInput.vue'
import type { Commitment, CommitmentStatus, Project, Priority, Tracker } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

interface CommitmentActionCategory {
  id: string
  label: string
}

interface CommitmentActionItem {
  id: string
  label: string
  icon?: string
  color?: string
}

interface CommitmentRemovableLink extends CommitmentActionItem {
  category: 'project' | 'lifeArea' | 'priority'
}

const props = withDefaults(
  defineProps<{
    commitment: Commitment
    availableProjects?: Project[]
    availableLifeAreas?: LifeArea[]
    availablePriorities?: Priority[]
    isSaving?: boolean
    detailsOpenByDefault?: boolean
    tracker?: Tracker
    periodType?: 'weekly' | 'monthly'
    startDate?: string
    endDate?: string
  }>(),
  {
    isSaving: false,
    availableProjects: () => [],
    availableLifeAreas: () => [],
    availablePriorities: () => [],
    detailsOpenByDefault: false,
    tracker: undefined,
    periodType: undefined,
    startDate: undefined,
    endDate: undefined,
  }
)

const emit = defineEmits<{
  delete: [commitmentId: string]
  'status-change': [commitmentId: string, status: CommitmentStatus]
  'update-name': [commitmentId: string, name: string]
  'update-life-areas': [commitmentId: string, lifeAreaIds: string[]]
  'update-priorities': [commitmentId: string, priorityIds: string[]]
  'update-project': [commitmentId: string, projectId: string | undefined]
  'add-tracker': [commitmentId: string, type: string]
  'remove-tracker': [commitmentId: string]
  'tracker-logged': [trackerId: string]
}>()

const statusOptions = computed(() => [
  {
    value: 'planned',
    label: t('planning.common.status.planned'),
    icon: CircleOutlineIcon,
    activeClass: 'text-primary',
    badgeClass: 'bg-primary-soft text-primary-strong border-primary/20',
    dotClass: 'bg-primary/70',
  },
  {
    value: 'done',
    label: t('planning.common.status.done'),
    icon: markRaw(CheckCircleIcon),
    activeClass: 'text-primary',
    badgeClass: 'bg-gradient-to-r from-primary to-primary-strong text-on-primary border-primary/20',
    dotClass: 'bg-primary',
  },
  {
    value: 'skipped',
    label: t('planning.common.status.skipped'),
    icon: markRaw(MinusCircleIcon),
    activeClass: 'text-on-surface-variant',
    badgeClass: 'bg-surface text-on-surface-variant border-outline/30',
    dotClass: 'bg-on-surface-variant/70',
  },
])

const lifeAreaById = computed(() => new Map(props.availableLifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.availablePriorities.map((p) => [p.id, p])))
const projectById = computed(() => new Map(props.availableProjects.map((p) => [p.id, p])))

const linkedProject = computed(() => {
  if (!props.commitment.projectId) return undefined
  return projectById.value.get(props.commitment.projectId)
})

const explicitLifeAreas = computed(() =>
  props.commitment.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const explicitPriorities = computed(() =>
  props.commitment.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedPriorityIds = computed(() => {
  const ids = new Set<string>()
  if (linkedProject.value?.priorityIds?.length) {
    linkedProject.value.priorityIds.forEach((id) => ids.add(id))
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
  if (linkedProject.value?.lifeAreaIds?.length) {
    linkedProject.value.lifeAreaIds.forEach((id) => ids.add(id))
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

const linkCategories = computed(() => [
  { id: 'project', label: t('planning.common.entities.project') },
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
] satisfies CommitmentActionCategory[])

const linkItemsByCategory = computed<Record<string, CommitmentActionItem[]>>(() => {
  const projectOptions = props.availableProjects.map((p) => ({
    id: p.id,
    label: p.name,
    icon: p.icon,
  }))
  const lifeAreaOptions = props.availableLifeAreas
    .filter((la) => !props.commitment.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))
  const priorityOptions = props.availablePriorities
    .filter((p) => !props.commitment.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    project: projectOptions,
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const removableLinks = computed<CommitmentRemovableLink[]>(() => {
  const links: CommitmentRemovableLink[] = []

  if (linkedProject.value) {
    links.push({
      category: 'project',
      id: linkedProject.value.id,
      label: linkedProject.value.name,
      icon: linkedProject.value.icon,
    })
  }

  for (const lifeArea of explicitLifeAreas.value) {
    links.push({
      category: 'lifeArea',
      id: lifeArea.id,
      label: lifeArea.name,
      icon: lifeArea.icon,
      color: lifeArea.color,
    })
  }

  for (const priority of explicitPriorities.value) {
    links.push({
      category: 'priority',
      id: priority.id,
      label: priority.name,
      icon: priority.icon,
    })
  }

  return links
})

function handleStatusChange(status: string) {
  if (status !== props.commitment.status) {
    emit('status-change', props.commitment.id, status as CommitmentStatus)
  }
}

function handleDelete() {
  emit('delete', props.commitment.id)
}

function handleNameSave(name: string) {
  if (name.trim() && name.trim() !== props.commitment.name) {
    emit('update-name', props.commitment.id, name.trim())
  }
}

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'project') {
    emit('update-project', props.commitment.id, payload.itemId)
  }
  if (payload.category === 'lifeArea') {
    emit('update-life-areas', props.commitment.id, [...props.commitment.lifeAreaIds, payload.itemId])
  }
  if (payload.category === 'priority') {
    emit('update-priorities', props.commitment.id, [...props.commitment.priorityIds, payload.itemId])
  }
}

function handleRemoveLink(payload: { category: 'project' | 'lifeArea' | 'priority'; itemId: string }) {
  if (payload.category === 'project') {
    emit('update-project', props.commitment.id, undefined)
  }
  if (payload.category === 'lifeArea') {
    emit(
      'update-life-areas',
      props.commitment.id,
      props.commitment.lifeAreaIds.filter((id) => id !== payload.itemId)
    )
  }
  if (payload.category === 'priority') {
    emit(
      'update-priorities',
      props.commitment.id,
      props.commitment.priorityIds.filter((id) => id !== payload.itemId)
    )
  }
}
</script>
