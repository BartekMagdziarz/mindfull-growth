<template>
  <AppCard>
    <h3 class="text-lg font-semibold text-neu-text mb-4">
      {{ isEditMode ? t('planning.components.draftCommitmentForm.editCommitment') : t('planning.components.draftCommitmentForm.newCommitment') }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Name Field -->
      <div>
        <label for="commitment-name" class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftCommitmentForm.nameLabel') }} <span class="text-error">*</span>
        </label>
        <textarea
          id="commitment-name"
          v-model="form.name"
          rows="2"
          :placeholder="t('planning.components.draftCommitmentForm.namePlaceholder')"
          class="neo-input w-full resize-y min-h-[2.75rem] px-3 py-2.5 text-base leading-snug"
          :class="{ 'border-error': errors.name }"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-error">{{ errors.name }}</p>
      </div>

      <!-- Linked Items -->
      <div class="space-y-3">
        <label class="block text-sm font-medium text-neu-text mb-1">{{ t('planning.components.draftCommitmentForm.linksLabel') }}</label>
        <div class="flex flex-wrap items-center gap-1.5">
          <CommitmentActionsMenu
            :add-categories="linkCategories"
            :add-items-by-category="linkItemsByCategory"
            :removable-links="removableLinks"
            :show-tracker-options="false"
            :show-delete="false"
            @add-link="handleAddLink"
            @remove-link="handleRemoveLink"
          />
          <CommitmentLinkedObjectsCluster
            :project="selectedProject"
            :life-areas="explicitLifeAreas"
            :priorities="explicitPriorities"
            :derived-life-areas="derivedLifeAreas"
            :derived-priorities="derivedPriorities"
          />
          <p v-if="!hasAnyLinkedObjects" class="text-xs text-neu-muted">
            {{ t('planning.common.links.noLinksYet') }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-2">
        <AppButton variant="text" type="button" @click="handleCancel">
          Cancel
        </AppButton>
        <AppButton variant="filled" type="submit">
          {{ isEditMode ? t('planning.components.draftPriorityForm.saveChanges') : t('planning.components.draftCommitmentForm.addCommitment') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useT } from '@/composables/useT'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import CommitmentActionsMenu from '@/components/planning/CommitmentActionsMenu.vue'
import CommitmentLinkedObjectsCluster from '@/components/planning/CommitmentLinkedObjectsCluster.vue'

const { t } = useT()
import type { DraftCommitment } from '@/composables/useWeeklyPlanningDraft'
import type { Project, Priority } from '@/domain/planning'
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

const props = defineProps<{
  commitment?: DraftCommitment
  projects: Project[]
  lifeAreas: LifeArea[]
  priorities: Priority[]
  defaultProjectId?: string
}>()

const emit = defineEmits<{
  save: [data: Omit<DraftCommitment, 'id' | 'sortOrder' | 'status'>]
  cancel: []
}>()

const isEditMode = computed(() => !!props.commitment)

const form = reactive({
  name: props.commitment?.name || '',
  projectId: props.commitment?.projectId || props.defaultProjectId || '',
  lifeAreaIds: props.commitment?.lifeAreaIds || [],
  priorityIds: props.commitment?.priorityIds || [],
})

const errors = reactive({
  name: '',
})

const projectById = computed(() => new Map(props.projects.map((p) => [p.id, p])))
const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.priorities.map((p) => [p.id, p])))

const selectedProject = computed(() =>
  form.projectId ? projectById.value.get(form.projectId) : undefined
)

const explicitLifeAreas = computed(() =>
  form.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const explicitPriorities = computed(() =>
  form.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedPriorityIds = computed(() => {
  const ids = new Set<string>()
  if (selectedProject.value?.priorityIds?.length) {
    selectedProject.value.priorityIds.forEach((id) => ids.add(id))
  }
  form.priorityIds.forEach((id) => ids.delete(id))
  return Array.from(ids)
})

const derivedPriorities = computed(() =>
  derivedPriorityIds.value
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const derivedLifeAreas = computed(() => {
  const ids = new Set<string>()
  if (selectedProject.value?.lifeAreaIds?.length) {
    selectedProject.value.lifeAreaIds.forEach((id) => ids.add(id))
  }
  const priorityIds = new Set([...form.priorityIds, ...derivedPriorityIds.value])
  for (const priorityId of priorityIds) {
    const priority = priorityById.value.get(priorityId)
    priority?.lifeAreaIds?.forEach((id) => ids.add(id))
  }
  form.lifeAreaIds.forEach((id) => ids.delete(id))
  return Array.from(ids)
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
})

const hasAnyLinkedObjects = computed(() =>
  Boolean(selectedProject.value) ||
  explicitLifeAreas.value.length > 0 ||
  explicitPriorities.value.length > 0 ||
  derivedLifeAreas.value.length > 0 ||
  derivedPriorities.value.length > 0
)

const linkCategories = computed<CommitmentActionCategory[]>(() => [
  { id: 'project', label: t('planning.common.entities.project') },
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
])

const linkItemsByCategory = computed<Record<string, CommitmentActionItem[]>>(() => {
  const projectOptions = props.projects.map((p) => ({ id: p.id, label: p.name, icon: p.icon }))
  const lifeAreaOptions = props.lifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))
  const priorityOptions = props.priorities
    .filter((p) => !form.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    project: projectOptions,
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const removableLinks = computed<CommitmentRemovableLink[]>(() => {
  const links: CommitmentRemovableLink[] = []

  if (selectedProject.value) {
    links.push({
      category: 'project',
      id: selectedProject.value.id,
      label: selectedProject.value.name,
      icon: selectedProject.value.icon,
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

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'project') {
    form.projectId = payload.itemId
  }
  if (payload.category === 'lifeArea') {
    form.lifeAreaIds = [...form.lifeAreaIds, payload.itemId]
  }
  if (payload.category === 'priority') {
    form.priorityIds = [...form.priorityIds, payload.itemId]
  }
}

function handleRemoveLink(payload: { category: 'project' | 'lifeArea' | 'priority'; itemId: string }) {
  if (payload.category === 'project') {
    removeProject()
    return
  }
  if (payload.category === 'lifeArea') {
    removeLifeArea(payload.itemId)
    return
  }
  removePriority(payload.itemId)
}

function removeProject() {
  form.projectId = ''
}

function removeLifeArea(lifeAreaId: string) {
  form.lifeAreaIds = form.lifeAreaIds.filter((id) => id !== lifeAreaId)
}

function removePriority(priorityId: string) {
  form.priorityIds = form.priorityIds.filter((id) => id !== priorityId)
}

function validate(): boolean {
  errors.name = ''

  if (!form.name.trim()) {
    errors.name = t('planning.common.validation.nameRequired')
    return false
  }

  return true
}

function handleSubmit() {
  if (!validate()) return

  emit('save', {
    name: form.name.trim().replace(/\s+/g, ' '),
    projectId: form.projectId || undefined,
    lifeAreaIds: form.lifeAreaIds,
    priorityIds: form.priorityIds,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>
