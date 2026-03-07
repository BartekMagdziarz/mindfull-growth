<template>
  <AppCard class="neo-card neo-card--composer relative h-full overflow-hidden">
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
      :style="{ backgroundColor: accentColor }"
    />

    <form class="pl-3 pr-3 py-3 flex flex-col gap-3 h-full" @submit.prevent="handleSubmit">
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <label for="new-project-name" class="sr-only">{{ t('planning.components.projectComposerCard.nameLabel') }}</label>
          <input
            id="new-project-name"
            ref="nameInputRef"
            v-model="form.name"
            type="text"
            :placeholder="t('planning.components.projectComposerCard.namePlaceholder')"
            :disabled="isSaving"
            class="neo-input w-full px-2.5 py-2"
            :class="errors.name ? 'border-error' : ''"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-error">
            {{ errors.name }}
          </p>
        </div>
        <span class="neo-pill neo-pill--primary px-2.5 py-1 text-[11px] font-semibold">
          {{ t('planning.common.status.planned') }}
        </span>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
          {{ t('planning.components.projectComposerCard.iconLabel') }}
        </label>
        <IconPicker
          v-model="form.icon"
          aria-label="Select project icon"
        />
      </div>

      <LinkedObjectsSection
        :life-areas="explicitLifeAreas"
        :priorities="explicitPriorities"
        :derived-life-areas="derivedLifeAreas"
        :link-categories="linkCategories"
        :link-items-by-category="linkItemsByCategory"
        :editable="true"
        :disabled="isSaving"
        @add-link="handleAddLink"
        @remove-life-area="removeLifeArea"
        @remove-priority="removePriority"
      />

      <!-- Objective -->
      <div class="space-y-2">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('planning.components.projectComposerCard.objectiveLabel') }}
        </span>
        <textarea
          id="new-project-objective"
          v-model="form.objective"
          rows="2"
          :placeholder="t('planning.components.projectComposerCard.objectivePlaceholder')"
          :disabled="isSaving"
          class="neo-input w-full resize-none px-2.5 py-2 text-sm"
        />
      </div>

      <!-- Timebox -->
      <div class="space-y-2">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('planning.components.projectComposerCard.timeboxLabel') }}
        </span>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="new-project-start-date" class="block text-[11px] text-on-surface-variant mb-0.5">{{ t('planning.components.projectComposerCard.startLabel') }}</label>
            <input
              id="new-project-start-date"
              v-model="form.startDate"
              type="date"
              :disabled="isSaving"
              class="neo-input w-full px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label for="new-project-end-date" class="block text-[11px] text-on-surface-variant mb-0.5">{{ t('planning.components.projectComposerCard.endLabel') }}</label>
            <input
              id="new-project-end-date"
              v-model="form.endDate"
              type="date"
              :disabled="isSaving"
              class="neo-input w-full px-2.5 py-2 text-sm"
            />
          </div>
        </div>
        <p v-if="dateRangeError" class="text-xs text-error">{{ dateRangeError }}</p>
      </div>

      <div class="mt-auto flex items-center justify-between pt-2">
        <AppButton variant="text" type="button" :disabled="isSaving" @click="handleCancel">
          {{ t('common.buttons.cancel') }}
        </AppButton>
        <AppButton variant="filled" type="submit" :disabled="isSaving">
          {{ isSaving ? t('planning.components.projectComposerCard.creating') : t('common.buttons.create') }}
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
import IconPicker from './IconPicker.vue'
import { useT } from '@/composables/useT'
import { getMonthRange, toLocalISODateString } from '@/utils/periodUtils'
import type { LifeArea } from '@/domain/lifeArea'
import type { Priority } from '@/domain/planning'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    availableLifeAreas?: LifeArea[]
    availablePriorities?: Priority[]
    isSaving?: boolean
  }>(),
  {
    availableLifeAreas: () => [],
    availablePriorities: () => [],
    isSaving: false,
  }
)

const emit = defineEmits<{
  create: [payload: {
    name: string
    icon?: string
    lifeAreaIds: string[]
    priorityIds: string[]
    objective?: string
    startDate?: string
    endDate?: string
  }]
  cancel: []
}>()

const defaultMonthRange = getMonthRange(new Date())
const defaultStartDate = toLocalISODateString(defaultMonthRange.start)
const defaultEndDate = toLocalISODateString(defaultMonthRange.end)

const form = reactive({
  name: '',
  icon: undefined as string | undefined,
  lifeAreaIds: [] as string[],
  priorityIds: [] as string[],
  objective: '',
  startDate: defaultStartDate,
  endDate: defaultEndDate,
})

const errors = reactive({
  name: '',
})

const nameInputRef = ref<HTMLInputElement | null>(null)

const dateRangeError = computed(() => {
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    return t('planning.common.validation.startBeforeEnd')
  }
  return ''
})

const linkCategories = computed(() => [
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
  { id: 'priority', label: t('planning.common.entities.priority') },
])

const linkItemsByCategory = computed(() => {
  const lifeAreaOptions = props.availableLifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color }))
  const priorityOptions = props.availablePriorities
    .filter((p) => !form.priorityIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }))

  return {
    lifeArea: lifeAreaOptions,
    priority: priorityOptions,
  }
})

const lifeAreaById = computed(() => new Map(props.availableLifeAreas.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(props.availablePriorities.map((p) => [p.id, p])))

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

const accentColor = computed(() => {
  const preferred = explicitLifeAreas.value[0] || derivedLifeAreas.value[0]
  return preferred?.color || 'rgb(var(--color-primary))'
})

onMounted(() => {
  nameInputRef.value?.focus()
})

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

function validate(): boolean {
  errors.name = ''
  let isValid = true

  if (!form.name.trim()) {
    errors.name = t('planning.common.validation.nameRequired')
    isValid = false
  }

  if (dateRangeError.value) {
    isValid = false
  }

  return isValid
}

function handleSubmit() {
  if (!validate()) return

  emit('create', {
    name: form.name.trim(),
    icon: form.icon,
    lifeAreaIds: [...form.lifeAreaIds],
    priorityIds: [...form.priorityIds],
    objective: form.objective.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.endDate || undefined,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>
