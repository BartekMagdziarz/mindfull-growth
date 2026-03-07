<template>
  <AppCard class="neo-card neo-card--composer relative h-full overflow-hidden">
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
      :style="{ backgroundColor: 'rgb(var(--color-primary))' }"
    />

    <form class="pl-3 pr-3 py-3 flex flex-col gap-3 h-full" @submit.prevent="handleSubmit">
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <label for="new-commitment-name" class="sr-only">{{ t('planning.components.commitmentComposerCard.nameLabel') }}</label>
          <input
            id="new-commitment-name"
            ref="nameInputRef"
            v-model="form.name"
            type="text"
            :placeholder="t('planning.components.commitmentComposerCard.namePlaceholder')"
            :disabled="isSaving"
            class="neo-input w-full px-2.5 py-2"
            :class="errors.name ? 'border-error' : ''"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-error">
            {{ errors.name }}
          </p>
        </div>
        <span class="neo-pill neo-pill--primary px-2.5 py-1 text-[11px] font-semibold shrink-0">
          {{ t('planning.common.status.planned') }}
        </span>
      </div>

      <LinkedObjectsSection
        :project="selectedProject"
        :life-areas="explicitLifeAreas"
        :priorities="explicitPriorities"
        :derived-life-areas="derivedLifeAreas"
        :derived-priorities="derivedPriorities"
        :link-categories="linkCategories"
        :link-items-by-category="linkItemsByCategory"
        :editable="true"
        :disabled="isSaving"
        show-project
        @add-link="handleAddLink"
        @remove-project="removeProject"
        @remove-life-area="removeLifeArea"
        @remove-priority="removePriority"
      />

      <div class="mt-auto flex items-center justify-between pt-2">
        <AppButton variant="text" type="button" :disabled="isSaving" @click="handleCancel">
          {{ t('common.buttons.cancel') }}
        </AppButton>
        <AppButton variant="filled" type="submit" :disabled="isSaving">
          {{ isSaving ? t('planning.components.commitmentComposerCard.creating') : t('common.buttons.create') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import LinkedObjectsSection from './LinkedObjectsSection.vue'
import { useT } from '@/composables/useT'
import type { Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    availableProjects?: Project[]
    availableLifeAreas?: LifeArea[]
    availablePriorities?: Priority[]
    isSaving?: boolean
  }>(),
  {
    availableProjects: () => [],
    availableLifeAreas: () => [],
    availablePriorities: () => [],
    isSaving: false,
  }
)

const emit = defineEmits<{
  create: [payload: {
    name: string
    projectId?: string
    lifeAreaIds: string[]
    priorityIds: string[]
  }]
  cancel: []
}>()

const form = reactive({
  name: '',
  projectId: undefined as string | undefined,
  lifeAreaIds: [] as string[],
  priorityIds: [] as string[],
})

const errors = reactive({
  name: '',
})

const nameInputRef = ref<HTMLInputElement | null>(null)

const linkCategories = computed(() => [
  { id: 'project', label: t('planning.common.entities.project') },
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
])

const linkItemsByCategory = computed(() => {
  const projectOptions = props.availableProjects.map((p) => ({ id: p.id, label: p.name, icon: p.icon }))
  const lifeAreaOptions = props.availableLifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))
  const priorityOptions = props.availablePriorities
    .filter((p) => !form.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    project: projectOptions,
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const lifeAreaById = computed(() => new Map(props.availableLifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.availablePriorities.map((p) => [p.id, p])))
const projectById = computed(() => new Map(props.availableProjects.map((p) => [p.id, p])))

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

onMounted(() => {
  nameInputRef.value?.focus()
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

function removeProject() {
  form.projectId = undefined
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

  emit('create', {
    name: form.name.trim(),
    projectId: form.projectId,
    lifeAreaIds: form.lifeAreaIds,
    priorityIds: form.priorityIds,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>
