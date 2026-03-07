<template>
  <AppCard>
    <h3 class="text-lg font-semibold text-neu-text mb-4">
      {{ isEditMode ? t('planning.components.draftProjectForm.editProject') : t('planning.components.draftProjectForm.newProject') }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="draft-project-name" class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftProjectForm.nameLabel') }} <span class="text-error">*</span>
        </label>
        <div class="mt-1 flex items-center gap-2">
          <IconPicker
            v-model="form.icon"
            compact
            minimal
            aria-label="Select project icon"
            class="flex-shrink-0"
          />
          <input
            id="draft-project-name"
            v-model="form.name"
            type="text"
            :placeholder="t('planning.components.draftProjectForm.namePlaceholder')"
            class="neo-input w-full px-3 py-2.5 text-base leading-snug"
            :class="{ 'border-error': errors.name }"
          />
        </div>
        <p v-if="errors.name" class="mt-1 text-sm text-error">{{ errors.name }}</p>
      </div>

      <div class="neo-surface p-3 space-y-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <AnimatedStatusPicker
            :current-status="form.status"
            :options="statusOptions"
            class="flex-shrink-0"
            @change="handleStatusChange"
          />

          <CommitmentActionsMenu
            :add-categories="linkCategories"
            :add-items-by-category="linkItemsByCategory"
            :removable-links="removableLinks"
            :show-tracker-options="false"
            :show-delete="false"
            trigger-aria-label="Open project link actions"
            class="flex-shrink-0"
            @add-link="handleAddLink"
            @remove-link="handleRemoveLink"
          />

          <CommitmentLinkedObjectsCluster
            :life-areas="resolvedLifeAreas"
            :priorities="resolvedPriorities"
            :derived-life-areas="derivedLifeAreas"
          />

          <div class="flex-1" />

          <InlineDateRangeEditor
            :start-date="form.startDate || undefined"
            :end-date="form.endDate || undefined"
            class="flex-shrink-0"
            @update:dates="handleDatesUpdate"
          />
        </div>

        <p v-if="errors.dateRange" class="text-sm text-error">{{ errors.dateRange }}</p>
        <p v-else-if="timeboxWarning" class="text-xs text-warning">{{ timeboxWarning }}</p>
      </div>

      <div>
        <label for="draft-project-objective" class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftProjectForm.objectiveLabel') }}
          <span class="text-neu-muted font-normal">{{ t('planning.components.draftProjectForm.objectiveOptional') }}</span>
        </label>
        <textarea
          id="draft-project-objective"
          v-model="form.objective"
          rows="2"
          :placeholder="t('planning.components.draftProjectForm.objectivePlaceholder')"
          class="neo-input w-full resize-none p-3 text-sm leading-relaxed"
        />
      </div>

      <div class="neo-surface p-3">
        <KeyResultsEditor
          ref="keyResultsEditorRef"
          v-model="form.keyResults"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-2">
        <AppButton variant="text" type="button" @click="handleCancel"> Cancel </AppButton>
        <AppButton variant="filled" type="submit">
          {{ isEditMode ? t('planning.components.draftPriorityForm.saveChanges') : t('planning.components.draftProjectForm.addProject') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, computed, markRaw, ref, h } from 'vue'
import { CheckCircleIcon, PlayCircleIcon, PauseCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import { useT } from '@/composables/useT'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import IconPicker from '@/components/planning/IconPicker.vue'
import AnimatedStatusPicker from '@/components/planning/AnimatedStatusPicker.vue'
import CommitmentActionsMenu from '@/components/planning/CommitmentActionsMenu.vue'
import CommitmentLinkedObjectsCluster from '@/components/planning/CommitmentLinkedObjectsCluster.vue'
import InlineDateRangeEditor from '@/components/planning/InlineDateRangeEditor.vue'
import KeyResultsEditor from '@/components/planning/KeyResultsEditor.vue'
import type { DraftProject } from '@/composables/useMonthlyPlanningDraft'
import type { Priority, ProjectStatus, Tracker } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

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

function cloneKeyResults(trackers: Partial<Tracker>[]): Partial<Tracker>[] {
  return trackers.map((tracker) => ({
    ...tracker,
    lifeAreaIds: Array.isArray(tracker.lifeAreaIds) ? [...tracker.lifeAreaIds] : [],
    priorityIds: Array.isArray(tracker.priorityIds) ? [...tracker.priorityIds] : [],
    tickLabels: Array.isArray(tracker.tickLabels) ? [...tracker.tickLabels] : undefined,
  }))
}

// ============================================================================
// Props and Emits
// ============================================================================

const props = defineProps<{
  project?: DraftProject
  lifeAreas: LifeArea[]
  priorities: Priority[]
  defaultLifeAreaId?: string
  defaultStartDate?: string
  defaultEndDate?: string
  initialKeyResults?: Partial<Tracker>[]
}>()

const emit = defineEmits<{
  save: [project: Omit<DraftProject, 'id' | 'sortOrder'>]
  cancel: []
}>()

// ============================================================================
// State
// ============================================================================

const isEditMode = computed(() => !!props.project)
const keyResultsEditorRef = ref<InstanceType<typeof KeyResultsEditor> | null>(null)

const form = reactive({
  name: props.project?.name || '',
  icon: props.project?.icon,
  lifeAreaIds: props.project?.lifeAreaIds ? [...props.project.lifeAreaIds] : (props.defaultLifeAreaId ? [props.defaultLifeAreaId] : []),
  priorityIds: props.project?.priorityIds ? [...props.project.priorityIds] : [],
  objective: props.project?.objective || '',
  startDate: props.project?.startDate || props.defaultStartDate || '',
  endDate: props.project?.endDate || props.defaultEndDate || '',
  status: (props.project?.status || 'planned') as ProjectStatus,
  keyResults: cloneKeyResults(props.project?.keyResults ?? props.initialKeyResults ?? []),
})

const errors = reactive({
  name: '',
  dateRange: '',
})

// ============================================================================
// Computed
// ============================================================================

const statusOptions = computed(() => [
  {
    value: 'planned',
    label: t('planning.common.status.planned'),
    icon: CircleOutlineIcon,
    activeClass: 'text-primary',
  },
  {
    value: 'active',
    label: t('planning.common.status.active'),
    icon: markRaw(PlayCircleIcon),
    activeClass: 'text-emerald-600',
  },
  {
    value: 'paused',
    label: t('planning.common.status.paused'),
    icon: markRaw(PauseCircleIcon),
    activeClass: 'text-on-surface-variant',
  },
  {
    value: 'completed',
    label: t('planning.common.status.done'),
    icon: markRaw(CheckCircleIcon),
    activeClass: 'text-primary',
  },
  {
    value: 'abandoned',
    label: t('planning.common.status.dropped'),
    icon: markRaw(XCircleIcon),
    activeClass: 'text-on-surface-variant',
  },
])

const lifeAreaById = computed(() => new Map(props.lifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.priorities.map((p) => [p.id, p])))

const derivedLifeAreas = computed(() => {
  const derivedIds = new Set<string>()
  for (const priorityId of form.priorityIds) {
    const priority = priorityById.value.get(priorityId)
    priority?.lifeAreaIds?.forEach((id) => derivedIds.add(id))
  }
  form.lifeAreaIds.forEach((id) => derivedIds.delete(id))
  return Array.from(derivedIds)
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
})

const resolvedLifeAreas = computed(() =>
  form.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const resolvedPriorities = computed(() =>
  form.priorityIds
    .map((id) => priorityById.value.get(id))
    .filter(Boolean) as Priority[]
)

const linkCategories = computed(() => [
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
])

const linkItemsByCategory = computed(() => {
  const lifeAreaOptions = props.lifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))

  const priorityOptions = props.priorities
    .filter((p) => !form.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const removableLinks = computed(() => {
  const links: Array<{ id: string; label: string; icon?: string; color?: string; category: 'lifeArea' | 'priority' }> = []
  for (const lifeArea of resolvedLifeAreas.value) {
    links.push({
      category: 'lifeArea',
      id: lifeArea.id,
      label: lifeArea.name,
      icon: lifeArea.icon,
      color: lifeArea.color,
    })
  }
  for (const priority of resolvedPriorities.value) {
    links.push({
      category: 'priority',
      id: priority.id,
      label: priority.name,
      icon: priority.icon,
    })
  }
  return links
})

const timeboxWarning = computed(() => {
  if (form.startDate && !form.endDate) {
    return t('planning.components.draftProjectForm.timeboxWarnings.endRecommended')
  }
  if (!form.startDate && form.endDate) {
    return t('planning.components.draftProjectForm.timeboxWarnings.startRecommended')
  }
  return ''
})

// ============================================================================
// Helpers
// ============================================================================

function handleStatusChange(status: string) {
  form.status = status as ProjectStatus
}

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    form.lifeAreaIds = [...form.lifeAreaIds, payload.itemId]
  }
  if (payload.category === 'priority') {
    form.priorityIds = [...form.priorityIds, payload.itemId]
  }
}

function handleRemoveLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    removeLifeArea(payload.itemId)
  }
  if (payload.category === 'priority') {
    removePriority(payload.itemId)
  }
}

function handleDatesUpdate(startDate: string | undefined, endDate: string | undefined) {
  form.startDate = startDate || ''
  form.endDate = endDate || ''
}

function removeLifeArea(lifeAreaId: string) {
  form.lifeAreaIds = form.lifeAreaIds.filter((id) => id !== lifeAreaId)
}

function removePriority(priorityId: string) {
  form.priorityIds = form.priorityIds.filter((id) => id !== priorityId)
}

// ============================================================================
// Handlers
// ============================================================================

function validate(): boolean {
  errors.name = ''
  errors.dateRange = ''

  let isValid = true

  if (!form.name.trim()) {
    errors.name = t('planning.common.validation.nameRequired')
    isValid = false
  }

  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.dateRange = t('planning.common.validation.startBeforeEnd')
    isValid = false
  }

  const keyResultsValid =
    typeof keyResultsEditorRef.value?.validate === 'function'
      ? keyResultsEditorRef.value.validate()
      : true
  if (!keyResultsValid) {
    isValid = false
  }

  return isValid
}

function handleSubmit() {
  if (!validate()) return

  emit('save', {
    name: form.name.trim(),
    icon: form.icon,
    lifeAreaIds: form.lifeAreaIds,
    priorityIds: form.priorityIds,
    objective: form.objective?.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
    status: form.status,
    keyResults: cloneKeyResults(form.keyResults),
    isCarriedForward: props.project?.isCarriedForward,
  })
}

function handleCancel() {
  emit('cancel')
}

</script>
