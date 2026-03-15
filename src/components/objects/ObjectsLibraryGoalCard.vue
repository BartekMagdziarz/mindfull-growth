<template>
  <article
    class="neo-card neo-raised border-primary/10 bg-gradient-to-br from-primary-soft/50 via-white/75 to-section/45 p-3.5"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title -->
      <div class="flex items-center gap-2">
        <IconPicker
          icon-size="lg"
          :model-value="item.icon"
          compact
          minimal
          :allow-clear="true"
          aria-label="Goal icon"
          @update:model-value="emitFieldChange('icon', $event)"
        />
        <input
          ref="titleRef"
          :value="item.title"
          type="text"
          class="neo-input min-w-0 flex-1 px-2.5 py-1.5 text-sm font-semibold"
          :placeholder="t('planning.objects.form.goalTitlePlaceholder')"
          @input="handleTitleInput"
        />
      </div>

      <!-- Row 2: Links icon + Description -->
      <div class="flex items-center gap-2">
        <GoalLinksDropdown
          icon-only
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
        <textarea
          :value="item.description ?? ''"
          class="neo-input w-full resize-none px-2.5 py-1.5 text-xs leading-5"
          rows="2"
          :placeholder="t('planning.objects.form.goalDescriptionPlaceholder')"
          @input="handleDescriptionInput"
        />
      </div>

      <!-- Row 3: Months (left) + Status icon + menu (right) -->
      <div class="flex items-center gap-1.5">
        <GoalMonthsDropdown
          :linked-months="linkedMonths"
          @link-month="$emit('link-month', item.id, $event)"
          @unlink-month="$emit('unlink-month', item.id, $event)"
        />

        <div class="ml-auto flex items-center gap-1.5">
          <StatusIconButton
            :model-value="item.status"
            :options="statusOptions"
            @update:model-value="emitFieldChange('status', $event)"
          />
          <div ref="menuRef" class="relative">
            <button
              type="button"
              class="neo-icon-button neo-focus"
              aria-label="More actions"
              @click.stop="menuOpen = !menuOpen"
            >
              <AppIcon name="more_horiz" class="text-base" />
            </button>
            <div
              v-if="menuOpen"
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-primary hover:bg-primary-soft/30"
                @click="handleAddKeyResult"
              >
                {{ t('planning.objects.actions.addKeyResult') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleArchive"
              >
                {{ item.isActive ? t('planning.objects.actions.archive') : t('planning.objects.actions.unarchive') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-danger hover:bg-danger/5"
                @click="handleDelete"
              >
                {{ t('common.buttons.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Results section -->
    <section
      v-if="item.childPreviews && item.childPreviews.length > 0"
      class="mt-3.5 space-y-1.5"
    >
      <ObjectsLibraryKrCard
        v-for="child in item.childPreviews"
        :key="child.id"
        :child="child"
        :parent-goal-id="item.id"
        :is-expanded="expandedKrId === child.id"
        :linked-periods="expandedKrId === child.id ? expandedKrPeriods : []"
        :goal-linked-month-refs="linkedMonths.map((m) => m.monthRef)"
        :cadence-options="cadenceOptions"
        :entry-mode-options="entryModeOptions"
        :status-options="krStatusOptions"
        :target-operator-options="krTargetOperatorOptions(child.entryMode)"
        :target-aggregation-options="krTargetAggregationOptions(child.entryMode)"
        :show-target-aggregation="krShowTargetAggregation(child.entryMode)"
        @toggle-expand="$emit('kr-toggle-expand', child.id)"
        @field-change="(f: string, v: unknown) => $emit('kr-field-change', child.id, f, v)"
        @link-period="(ref: string) => $emit('kr-link-period', child.id, ref)"
        @unlink-period="(ref: string) => $emit('kr-unlink-period', child.id, ref)"
        @delete="$emit('kr-delete', child.id)"
        @archive="$emit('kr-archive', child.id)"
      />
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import IconPicker from '@/components/shared/IconPicker.vue'
import GoalMonthsDropdown from '@/components/objects/GoalMonthsDropdown.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import ObjectsLibraryKrCard from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedMonth } from '@/components/objects/GoalMonthsDropdown.vue'
import type {
  ObjectsLibraryFilterOption,
  ObjectsLibraryListItem,
} from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode } from '@/domain/planning'

const props = defineProps<{
  item: ObjectsLibraryListItem
  linkedMonths: LinkedMonth[]
  statusOptions: Array<{ value: string; label: string }>
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  expandedKrId: string | null
  expandedKrPeriods: LinkedPeriod[]
  cadenceOptions: Array<{ value: string; label: string }>
  entryModeOptions: Array<{ value: string; label: string }>
  krStatusOptions: Array<{ value: string; label: string }>
  krTargetOperatorOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krTargetAggregationOptions: (entryMode: MeasurementEntryMode) => Array<{ value: string; label: string }>
  krShowTargetAggregation: (entryMode: MeasurementEntryMode) => boolean
  isNew?: boolean
}>()

const emit = defineEmits<{
  'field-change': [goalId: string, field: string, value: unknown]
  'link-month': [goalId: string, monthRef: string]
  'unlink-month': [goalId: string, monthRef: string]
  archive: [goalId: string, isCurrentlyActive: boolean]
  delete: [goalId: string, title: string]
  'add-key-result': [goalId: string]
  'kr-toggle-expand': [krId: string]
  'kr-field-change': [krId: string, field: string, value: unknown]
  'kr-link-period': [krId: string, periodRef: string]
  'kr-unlink-period': [krId: string, periodRef: string]
  'kr-delete': [krId: string]
  'kr-archive': [krId: string]
}>()

const { t } = useT()

const titleRef = ref<HTMLInputElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

let titleDebounceTimer: ReturnType<typeof setTimeout> | undefined
let descriptionDebounceTimer: ReturnType<typeof setTimeout> | undefined

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

function handleTitleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  clearTimeout(titleDebounceTimer)
  titleDebounceTimer = setTimeout(() => {
    emitFieldChange('title', value)
  }, 400)
}

function handleDescriptionInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value
  clearTimeout(descriptionDebounceTimer)
  descriptionDebounceTimer = setTimeout(() => {
    emitFieldChange('description', value)
  }, 400)
}

function handleAddKeyResult(): void {
  menuOpen.value = false
  emit('add-key-result', props.item.id)
}

function handleArchive(): void {
  menuOpen.value = false
  emit('archive', props.item.id, props.item.isActive)
}

function handleDelete(): void {
  menuOpen.value = false
  emit('delete', props.item.id, props.item.title)
}

function handleOutsideClick(event: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

// Auto-focus title when new goal is created
watch(
  () => props.isNew,
  (isNew) => {
    if (isNew) {
      void nextTick(() => {
        titleRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
  clearTimeout(titleDebounceTimer)
  clearTimeout(descriptionDebounceTimer)
})
</script>
