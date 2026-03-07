<template>
  <AppCard>
    <h3 class="text-lg font-semibold text-neu-text mb-4">
      {{ isEditMode ? t('planning.components.draftPriorityForm.editPriority') : t('planning.components.draftPriorityForm.newPriority') }}
    </h3>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Name Field -->
      <div>
        <label for="draft-priority-name" class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftPriorityForm.nameLabel') }} <span class="text-error">*</span>
        </label>
        <input
          id="draft-priority-name"
          v-model="form.name"
          type="text"
          :placeholder="t('planning.components.draftPriorityForm.namePlaceholder')"
          class="neo-input w-full"
          :class="{ 'border-error': errors.name }"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-error">{{ errors.name }}</p>
      </div>

      <!-- Icon Field -->
      <div>
        <label class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftPriorityForm.iconLabel') }} <span class="text-neu-muted font-normal">{{ t('planning.components.draftPriorityForm.iconOptional') }}</span>
        </label>
        <IconPicker
          v-model="form.icon"
          aria-label="Select priority icon"
        />
      </div>

      <!-- Linked Life Areas -->
      <div>
        <label class="block text-sm font-medium text-neu-text mb-1">
          {{ t('planning.components.draftPriorityForm.linksLabel') }} <span class="text-neu-muted font-normal">{{ t('planning.components.draftPriorityForm.linksOptional') }}</span>
        </label>
        <LinkedObjectsSection
          :life-areas="resolvedLifeAreas"
          :priorities="[]"
          :link-categories="linkCategories"
          :link-items-by-category="linkItemsByCategory"
          :editable="true"
          @add-link="handleAddLink"
          @remove-life-area="removeLifeArea"
        />
      </div>

      <!-- Success Signals Field -->
      <div class="neo-surface rounded-xl p-4 space-y-3">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wide text-neu-muted mb-0.5 flex items-center gap-1.5">
            <TrophyIcon class="w-3.5 h-3.5 text-primary" />
            {{ t('planning.components.draftPriorityForm.successSignals.title') }}
          </label>
          <p class="text-xs text-neu-muted">
            {{ t('planning.components.draftPriorityForm.successSignals.description') }}
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="(signal, index) in form.successSignals"
            :key="'signal-' + index"
            class="flex items-center gap-2"
          >
            <input
              :value="signal"
              type="text"
              :placeholder="t('planning.components.draftPriorityForm.successSignals.placeholder')"
              class="neo-input flex-1 text-sm"
              @input="updateSuccessSignal(index, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="p-1.5 rounded-lg text-neu-muted hover:text-error hover:bg-section transition-colors"
              aria-label="Remove signal"
              @click="removeSuccessSignal(index)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong transition-colors"
            @click="addSuccessSignal"
          >
            <PlusIcon class="w-4 h-4" />
            {{ t('planning.components.draftPriorityForm.successSignals.addSignal') }}
          </button>
        </div>
      </div>

      <!-- Constraints Field -->
      <div class="neo-surface rounded-xl p-4 space-y-3">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wide text-neu-muted mb-0.5 flex items-center gap-1.5">
            <ShieldExclamationIcon class="w-3.5 h-3.5 text-primary" />
            {{ t('planning.components.draftPriorityForm.constraints.title') }}
          </label>
          <p class="text-xs text-neu-muted">{{ t('planning.components.draftPriorityForm.constraints.description') }}</p>
        </div>
        <div class="space-y-2">
          <div
            v-for="(constraint, index) in form.constraints"
            :key="'constraint-' + index"
            class="flex items-center gap-2"
          >
            <input
              :value="constraint"
              type="text"
              :placeholder="t('planning.components.draftPriorityForm.constraints.placeholder')"
              class="neo-input flex-1 text-sm"
              @input="updateConstraint(index, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="p-1.5 rounded-lg text-neu-muted hover:text-error hover:bg-section transition-colors"
              aria-label="Remove constraint"
              @click="removeConstraint(index)"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-primary hover:text-primary-strong transition-colors"
            @click="addConstraint"
          >
            <PlusIcon class="w-4 h-4" />
            {{ t('planning.components.draftPriorityForm.constraints.addConstraint') }}
          </button>
        </div>
      </div>

      <!-- Active Toggle -->
      <div class="flex items-center justify-between">
        <label for="draft-priority-active" class="text-sm font-medium text-neu-text">
          {{ t('planning.components.draftPriorityForm.activeLabel') }}
        </label>
        <button
          id="draft-priority-active"
          type="button"
          role="switch"
          :aria-checked="form.isActive"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-all',
            form.isActive ? 'neo-toggle-track--on' : 'neo-toggle-track--off',
          ]"
          @click="form.isActive = !form.isActive"
        >
          <span
            :class="[
              'neo-toggle-thumb h-4 w-4',
              form.isActive ? 'translate-x-6' : 'translate-x-1',
            ]"
          />
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 justify-end pt-2">
        <AppButton variant="text" type="button" @click="handleCancel"> Cancel </AppButton>
        <AppButton variant="filled" type="submit">
          {{ isEditMode ? t('planning.components.draftPriorityForm.saveChanges') : t('common.buttons.add') }}
        </AppButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  TrophyIcon,
  ShieldExclamationIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import LinkedObjectsSection from '@/components/planning/LinkedObjectsSection.vue'
import IconPicker from '@/components/planning/IconPicker.vue'
import { useT } from '@/composables/useT'
import type { DraftPriority } from '@/composables/useYearlyPlanningDraft'
import type { LifeArea } from '@/domain/lifeArea'

const { t } = useT()

// ============================================================================
// Props and Emits
// ============================================================================

const props = defineProps<{
  priority?: DraftPriority
  lifeAreas: LifeArea[]
}>()

const emit = defineEmits<{
  save: [priority: Omit<DraftPriority, 'id' | 'sortOrder'>]
  cancel: []
}>()

// ============================================================================
// State
// ============================================================================

const isEditMode = computed(() => !!props.priority)

const form = reactive({
  name: props.priority?.name || '',
  icon: props.priority?.icon,
  successSignals: [...(props.priority?.successSignals || [])],
  constraints: [...(props.priority?.constraints || [])],
  isActive: props.priority?.isActive ?? true,
  lifeAreaIds: [...(props.priority?.lifeAreaIds || [])],
})

const errors = reactive({
  name: '',
})

const resolvedLifeAreas = computed(() =>
  form.lifeAreaIds
    .map((id) => props.lifeAreas.find((la) => la.id === id))
    .filter(Boolean) as LifeArea[]
)

const linkCategories = [{ id: 'lifeArea', label: 'Life area' }]

const linkItemsByCategory = computed(() => ({
  lifeArea: props.lifeAreas
    .filter((la) => !form.lifeAreaIds.includes(la.id))
    .map((la) => ({ id: la.id, label: la.name, icon: la.icon, color: la.color })),
}))

function handleAddLink(payload: { category: string; itemId: string }) {
  if (payload.category !== 'lifeArea') return
  if (form.lifeAreaIds.includes(payload.itemId)) return
  form.lifeAreaIds.push(payload.itemId)
}

function removeLifeArea(id: string) {
  form.lifeAreaIds = form.lifeAreaIds.filter((lifeAreaId) => lifeAreaId !== id)
}

// ============================================================================
// Success Signals Management
// ============================================================================

function addSuccessSignal() {
  form.successSignals.push('')
}

function updateSuccessSignal(index: number, value: string) {
  form.successSignals[index] = value
}

function removeSuccessSignal(index: number) {
  form.successSignals.splice(index, 1)
}

// ============================================================================
// Constraints Management
// ============================================================================

function addConstraint() {
  form.constraints.push('')
}

function updateConstraint(index: number, value: string) {
  form.constraints[index] = value
}

function removeConstraint(index: number) {
  form.constraints.splice(index, 1)
}

// ============================================================================
// Validation
// ============================================================================

function validate(): boolean {
  errors.name = ''

  if (!form.name.trim()) {
    errors.name = t('planning.common.validation.nameRequired')
    return false
  }

  return true
}

// ============================================================================
// Handlers
// ============================================================================

function handleSubmit() {
  if (!validate()) {
    return
  }

  // Filter out empty strings from arrays
  const cleanedSuccessSignals = form.successSignals
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const cleanedConstraints = form.constraints.map((c) => c.trim()).filter((c) => c.length > 0)

  emit('save', {
    name: form.name.trim(),
    icon: form.icon,
    lifeAreaIds: form.lifeAreaIds,
    successSignals: cleanedSuccessSignals,
    constraints: cleanedConstraints,
    isActive: form.isActive,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>
