<template>
  <AppCard class="neo-card neo-card--composer relative h-full overflow-hidden">
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
      :style="{ backgroundColor: accentColor }"
    />

    <form class="pl-3 pr-3 py-3 flex flex-col gap-3 h-full" @submit.prevent="handleSubmit">
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <label for="new-priority-name" class="sr-only">{{ t('planning.components.priorityComposerCard.nameLabel') }}</label>
          <input
            id="new-priority-name"
            ref="nameInputRef"
            v-model="form.name"
            type="text"
            :placeholder="t('planning.components.priorityComposerCard.namePlaceholder')"
            :disabled="isSaving"
            class="neo-input w-full px-2.5 py-2"
            :class="errors.name ? 'border-error' : ''"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-error">
            {{ errors.name }}
          </p>
        </div>
        <span class="neo-pill neo-pill--primary px-2.5 py-1 text-[11px] font-semibold">
          {{ t('planning.common.status.active') }}
        </span>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
          {{ t('planning.components.priorityComposerCard.iconLabel') }}
        </label>
        <IconPicker
          v-model="form.icon"
          aria-label="Select priority icon"
        />
      </div>

      <!-- Linked Life Areas -->
      <div class="space-y-2">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('planning.common.entities.lifeAreas') }}
        </span>
        <div v-if="explicitLifeAreas.length > 0" class="flex flex-wrap gap-1.5">
          <LinkedPill
            v-for="la in explicitLifeAreas"
            :key="la.id"
            :label="la.name"
            :icon="la.icon"
            :color="la.color"
            @remove="removeLifeArea(la.id)"
          />
        </div>
        <CascadingLinkMenu
          :categories="linkCategories"
          :items-by-category="linkItemsByCategory"
          :disabled="isSaving"
          @select="handleAddLink"
        />
      </div>

      <!-- Success Signals -->
      <div class="neo-surface p-3 space-y-2">
        <div class="flex items-center gap-1.5">
          <TrophyIcon class="w-3.5 h-3.5 text-primary" />
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.priorityComposerCard.successSignals.title') }}
          </span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(signal, index) in form.successSignals"
            :key="'new-signal-' + index"
            class="flex items-center gap-1.5 neo-inset rounded-xl px-3 py-2"
          >
            <CheckIcon class="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
            <input
              :value="signal"
              type="text"
              :placeholder="t('planning.components.priorityComposerCard.successSignals.placeholder')"
              :disabled="isSaving"
              class="neo-input flex-1 px-2.5 py-1.5 text-sm"
              @input="form.successSignals[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
              :disabled="isSaving"
              @click="form.successSignals.splice(index, 1)"
            >
              <XMarkIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-primary hover:text-primary-strong transition-colors"
          :disabled="isSaving"
          @click="form.successSignals.push('')"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          {{ t('planning.components.priorityComposerCard.successSignals.addSignal') }}
        </button>
      </div>

      <!-- Constraints -->
      <div class="neo-surface p-3 space-y-2">
        <div class="flex items-center gap-1.5">
          <ShieldExclamationIcon class="w-3.5 h-3.5 text-primary" />
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.components.priorityComposerCard.constraints.title') }}
          </span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(constraint, index) in form.constraints"
            :key="'new-constraint-' + index"
            class="flex items-center gap-1.5 neo-inset rounded-xl px-3 py-2"
          >
            <ShieldExclamationIcon class="w-3.5 h-3.5 text-on-surface-variant/50 flex-shrink-0" />
            <input
              :value="constraint"
              type="text"
              :placeholder="t('planning.components.priorityComposerCard.constraints.placeholder')"
              :disabled="isSaving"
              class="neo-input flex-1 px-2.5 py-1.5 text-sm"
              @input="form.constraints[index] = ($event.target as HTMLInputElement).value"
            />
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
              :disabled="isSaving"
              @click="form.constraints.splice(index, 1)"
            >
              <XMarkIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-primary hover:text-primary-strong transition-colors"
          :disabled="isSaving"
          @click="form.constraints.push('')"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          {{ t('planning.components.priorityComposerCard.constraints.addConstraint') }}
        </button>
      </div>

      <div class="mt-auto flex items-center justify-between pt-2">
        <AppButton variant="text" type="button" :disabled="isSaving" @click="handleCancel">
          {{ t('common.buttons.cancel') }}
        </AppButton>
        <AppButton variant="filled" type="submit" :disabled="isSaving">
          {{ isSaving ? t('planning.components.priorityComposerCard.creating') : t('common.buttons.create') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  TrophyIcon,
  ShieldExclamationIcon,
  CheckIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import IconPicker from './IconPicker.vue'
import LinkedPill from './LinkedPill.vue'
import CascadingLinkMenu from './CascadingLinkMenu.vue'
import { useT } from '@/composables/useT'
import type { LifeArea } from '@/domain/lifeArea'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    availableLifeAreas?: LifeArea[]
    isSaving?: boolean
  }>(),
  {
    availableLifeAreas: () => [],
    isSaving: false,
  }
)

const emit = defineEmits<{
  create: [payload: {
    name: string
    icon?: string
    lifeAreaIds: string[]
    successSignals: string[]
    constraints: string[]
  }]
  cancel: []
}>()

const form = reactive({
  name: '',
  icon: undefined as string | undefined,
  lifeAreaIds: [] as string[],
  successSignals: [] as string[],
  constraints: [] as string[],
})

const errors = reactive({
  name: '',
})

const nameInputRef = ref<HTMLInputElement | null>(null)

const linkCategories = computed(() => [
  { id: 'lifeArea', label: t('planning.common.entities.lifeArea') },
])

const linkItemsByCategory = computed(() => ({
  lifeArea: props.availableLifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color })),
}))

const lifeAreaById = computed(() => new Map(props.availableLifeAreas.map((la) => [la.id, la])))

const explicitLifeAreas = computed(() =>
  form.lifeAreaIds
    .map((id) => lifeAreaById.value.get(id))
    .filter(Boolean) as LifeArea[]
)

const accentColor = computed(() => {
  const preferred = explicitLifeAreas.value[0]
  return preferred?.color || 'rgb(var(--color-primary))'
})

onMounted(() => {
  nameInputRef.value?.focus()
})

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category !== 'lifeArea') return
  if (form.lifeAreaIds.includes(payload.itemId)) return
  form.lifeAreaIds = [...form.lifeAreaIds, payload.itemId]
}

function removeLifeArea(lifeAreaId: string) {
  form.lifeAreaIds = form.lifeAreaIds.filter((id) => id !== lifeAreaId)
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
    icon: form.icon,
    lifeAreaIds: [...form.lifeAreaIds],
    successSignals: form.successSignals.map((s) => s.trim()).filter((s) => s.length > 0),
    constraints: form.constraints.map((c) => c.trim()).filter((c) => c.length > 0),
  })
}

function handleCancel() {
  emit('cancel')
}
</script>
