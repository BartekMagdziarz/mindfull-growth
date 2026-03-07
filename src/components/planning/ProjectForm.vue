<template>
  <AppCard>
    <h3 class="text-lg font-semibold text-on-surface mb-4">
      {{ isEditMode ? t('planning.components.projectForm.editProject') : t('planning.components.projectForm.newProject') }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Name Field -->
      <div>
        <label for="project-name" class="block text-sm font-medium text-on-surface mb-1">
          {{ t('planning.components.projectForm.nameLabel') }} <span class="text-error">*</span>
        </label>
        <input
          id="project-name"
          v-model="form.name"
          type="text"
          :placeholder="t('planning.components.projectForm.namePlaceholder')"
          class="neo-input w-full px-3 py-2 text-on-surface placeholder:text-on-surface-variant"
          :class="{ 'border-error': errors.name }"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-error">{{ errors.name }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-on-surface mb-1">
          {{ t('planning.components.projectForm.iconLabel') }} <span class="text-on-surface-variant font-normal">{{ t('planning.components.projectForm.iconOptional') }}</span>
        </label>
        <IconPicker
          v-model="form.icon"
          aria-label="Select project icon"
        />
      </div>

      <!-- Links -->
      <div>
        <label class="block text-sm font-medium text-on-surface mb-1">{{ t('planning.components.projectForm.linksLabel') }}</label>
        <LinkedObjectsSection
          :life-areas="resolvedLifeAreas"
          :priorities="resolvedPriorities"
          :derived-life-areas="derivedLifeAreas"
          :link-categories="linkCategories"
          :link-items-by-category="linkItemsByCategory"
          :editable="true"
          :disabled="isSaving"
          @add-link="handleAddLink"
          @remove-life-area="removeLifeArea"
          @remove-priority="removePriority"
        />
      </div>

      <!-- Objective Field -->
      <div>
        <label for="project-objective" class="block text-sm font-medium text-on-surface mb-1">
          {{ t('planning.components.projectForm.objectiveLabel') }}
          <span class="text-on-surface-variant font-normal">{{ t('planning.components.projectForm.objectiveOptional') }}</span>
        </label>
        <textarea
          id="project-objective"
          v-model="form.objective"
          rows="2"
          :placeholder="t('planning.components.projectForm.objectivePlaceholder')"
          class="neo-input w-full px-3 py-2 text-on-surface placeholder:text-on-surface-variant resize-none"
        />
      </div>

      <!-- Timebox Fields -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-on-surface">{{ t('planning.components.projectForm.timeboxLabel') }}</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="project-start-date" class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('planning.components.projectForm.startDateLabel') }}
            </label>
            <input
              id="project-start-date"
              v-model="form.startDate"
              type="date"
              class="neo-input w-full px-3 py-2 text-on-surface"
            />
          </div>
          <div>
            <label for="project-end-date" class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('planning.components.projectForm.endDateLabel') }}
            </label>
            <input
              id="project-end-date"
              v-model="form.endDate"
              type="date"
              class="neo-input w-full px-3 py-2 text-on-surface"
            />
          </div>
        </div>
        <p v-if="errors.dateRange" class="text-sm text-error">{{ errors.dateRange }}</p>
        <p v-else-if="timeboxWarning" class="text-xs text-warning">{{ timeboxWarning }}</p>
      </div>

      <!-- Status Field (Edit Mode Only) -->
      <div v-if="isEditMode">
        <label for="project-status" class="block text-sm font-medium text-on-surface mb-1">
          {{ t('planning.components.projectForm.statusLabel') }}
        </label>
        <select
          id="project-status"
          v-model="form.status"
          class="neo-input w-full px-3 py-2 text-on-surface"
        >
          <option value="planned">{{ t('planning.common.status.planned') }}</option>
          <option value="active">{{ t('planning.common.status.active') }}</option>
          <option value="paused">{{ t('planning.common.status.paused') }}</option>
          <option value="completed">{{ t('planning.common.status.completed') }}</option>
          <option value="abandoned">{{ t('planning.common.status.abandoned') }}</option>
        </select>
      </div>

      <!-- Form Error -->
      <p v-if="formError" class="text-sm text-error">{{ formError }}</p>

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-2">
        <AppButton variant="text" type="button" @click="handleCancel">
          Cancel
        </AppButton>
        <AppButton variant="filled" type="submit" :disabled="isSaving">
          {{ isSaving ? t('planning.components.projectForm.savingButton') : isEditMode ? t('planning.components.projectForm.saveChanges') : t('planning.components.projectForm.createButton') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import LinkedObjectsSection from './LinkedObjectsSection.vue'
import IconPicker from './IconPicker.vue'
import { useT } from '@/composables/useT'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { getCurrentYear, getMonthRange, toLocalISODateString } from '@/utils/periodUtils'
import type {
  Project,
  ProjectStatus,
  Priority,
} from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

// ============================================================================
// Props and Emits
// ============================================================================

const props = defineProps<{
  project?: Project
  monthlyPlanId?: string
  year?: number
}>()

const emit = defineEmits<{
  save: [project: Project]
  cancel: []
}>()

// ============================================================================
// Stores
// ============================================================================

const { t } = useT()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()

// ============================================================================
// State
// ============================================================================

const isEditMode = computed(() => !!props.project)
const isSaving = ref(false)
const formError = ref<string | null>(null)
const currentYear = getCurrentYear()

const defaultMonthRange = getMonthRange(new Date())
const defaultStartDate = toLocalISODateString(defaultMonthRange.start)
const defaultEndDate = toLocalISODateString(defaultMonthRange.end)

const form = reactive({
  name: props.project?.name || '',
  icon: props.project?.icon,
  lifeAreaIds: props.project?.lifeAreaIds || [],
  priorityIds: props.project?.priorityIds || [],
  objective: props.project?.objective || '',
  startDate: props.project?.startDate || (props.project ? '' : defaultStartDate),
  endDate: props.project?.endDate || (props.project ? '' : defaultEndDate),
  focusWeekIds: props.project?.focusWeekIds || [],
  focusMonthIds: props.project?.focusMonthIds || (props.project ? [] : props.monthlyPlanId ? [props.monthlyPlanId] : []),
  status: (props.project?.status || 'planned') as ProjectStatus,
})

const errors = reactive({
  name: '',
  dateRange: '',
})

// ============================================================================
// Computed
// ============================================================================

const availableLifeAreas = computed<LifeArea[]>(() => lifeAreaStore.sortedLifeAreas)
const prioritiesForYear = computed<Priority[]>(() =>
  priorityStore.getPrioritiesByYear(props.year ?? currentYear)
)

const lifeAreaById = computed(() => new Map(availableLifeAreas.value.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(prioritiesForYear.value.map((p) => [p.id, p])))

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

const linkCategories = [
  { id: 'lifeArea', label: 'Life area' },
  { id: 'priority', label: 'Priority' },
]

const linkItemsByCategory = computed(() => {
  const lifeAreaOptions = availableLifeAreas.value
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))

  const priorityOptions = prioritiesForYear.value
    .filter((p) => !form.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const timeboxWarning = computed(() => {
  if (form.startDate && !form.endDate) {
    return t('planning.components.projectForm.timeboxWarnings.endRecommended')
  }
  if (!form.startDate && form.endDate) {
    return t('planning.components.projectForm.timeboxWarnings.startRecommended')
  }
  return ''
})

// ============================================================================
// Helpers
// ============================================================================

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category === 'lifeArea') {
    form.lifeAreaIds = [...form.lifeAreaIds, payload.itemId]
  }
  if (payload.category === 'priority') {
    form.priorityIds = [...form.priorityIds, payload.itemId]
  }
}

function removeLifeArea(lifeAreaId: string) {
  form.lifeAreaIds = form.lifeAreaIds.filter((id) => id !== lifeAreaId)
}

function removePriority(priorityId: string) {
  form.priorityIds = form.priorityIds.filter((id) => id !== priorityId)
}

// ============================================================================
// Validation
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

  return isValid
}

// ============================================================================
// Submit
// ============================================================================

async function handleSubmit() {
  formError.value = null

  if (!validate()) {
    return
  }

  isSaving.value = true

  try {
    let savedProject: Project

    if (isEditMode.value && props.project) {
      savedProject = await projectStore.updateProject(props.project.id, {
        name: form.name.trim(),
        icon: form.icon,
        lifeAreaIds: form.lifeAreaIds,
        priorityIds: form.priorityIds,
        objective: form.objective.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        focusWeekIds: form.focusWeekIds,
        focusMonthIds: form.focusMonthIds,
        status: form.status,
      })
    } else {
      const focusMonthIds = props.monthlyPlanId ? [props.monthlyPlanId] : []
      savedProject = await projectStore.createProject({
        monthIds: props.monthlyPlanId ? [props.monthlyPlanId] : [],
        lifeAreaIds: form.lifeAreaIds,
        priorityIds: form.priorityIds,
        name: form.name.trim(),
        icon: form.icon,
        objective: form.objective.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        focusWeekIds: [],
        focusMonthIds,
        status: 'planned',
      })
    }

    emit('save', savedProject)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : t('planning.components.projectForm.failedToSave')
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  emit('cancel')
}

</script>
