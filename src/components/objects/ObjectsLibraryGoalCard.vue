<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3.5"
  >
    <div class="space-y-2">
      <!-- Row 1: Icon + Title + [hover: menu] + Status -->
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
          v-model="title"
          type="text"
          class="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
          :placeholder="t('planning.objects.form.goalTitlePlaceholder')"
          @blur="flushTitle"
        />
        <div class="-mr-10 flex shrink-0 items-center gap-1.5 opacity-0 transition-all duration-200 ease-in-out group-hover/card:mr-0 group-hover/card:opacity-100">
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
              class="absolute bottom-full right-0 z-20 mb-1 min-w-[130px] overflow-hidden rounded-xl border border-outline/30 bg-surface shadow-lg"
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
                @click="handleEdit"
              >
                {{ t('planning.objects.actions.editObject') }}
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
        <StatusIconButton
          :model-value="item.status"
          :options="statusOptions"
          @update:model-value="emitFieldChange('status', $event)"
        />
      </div>

      <!-- Row 2: Links + Months -->
      <div class="flex items-center gap-1.5">
        <GoalLinksDropdown
          icon-only
          :priority-ids="item.priorityIds ?? []"
          :life-area-ids="item.lifeAreaIds ?? []"
          :priority-options="priorityOptions"
          :life-area-options="lifeAreaOptions"
          @toggle-priority="emitFieldChange('togglePriority', $event)"
          @toggle-life-area="emitFieldChange('toggleLifeArea', $event)"
        />
        <GoalMonthsDropdown
          :linked-months="linkedMonths"
          @link-month="$emit('link-month', item.id, $event)"
          @unlink-month="$emit('unlink-month', item.id, $event)"
        />
        <span
          class="neo-pill inline-flex items-center gap-1 px-2 py-0.5 text-[0.7rem] font-medium"
          :class="targetDateChipClass"
          :title="targetDateTooltip"
        >
          <AppIcon name="schedule" class="text-xs" />
          {{ targetDateLabel }}
        </span>
        <span
          class="neo-pill inline-flex items-center gap-1 px-2 py-0.5 text-[0.7rem] font-semibold"
          :class="smartBadgeClass"
          :title="smartBadgeTooltip"
        >
          {{ t('planning.goalWizard.completeness.label', { score: smartCompleteness.score }) }}
        </span>
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
import { computeSmartCompleteness } from '@/domain/smartCompleteness'
import GoalMonthsDropdown from '@/components/objects/GoalMonthsDropdown.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import StatusIconButton from '@/components/objects/StatusIconButton.vue'
import ObjectsLibraryKrCard from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedPeriod } from '@/components/objects/ObjectsLibraryKrCard.vue'
import type { LinkedMonth } from '@/components/objects/GoalMonthsDropdown.vue'
import { useEditableField } from '@/composables/useEditableField'
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
  edit: [goalId: string]
  'add-key-result': [goalId: string]
  'kr-toggle-expand': [krId: string]
  'kr-field-change': [krId: string, field: string, value: unknown]
  'kr-link-period': [krId: string, periodRef: string]
  'kr-unlink-period': [krId: string, periodRef: string]
  'kr-delete': [krId: string]
  'kr-archive': [krId: string]
}>()

const { t } = useT()

const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

function emitFieldChange(field: string, value: unknown): void {
  emit('field-change', props.item.id, field, value)
}

const { value: title, inputRef: titleRef, flush: flushTitle } = useEditableField({
  source: () => props.item.title,
  commit: (value) => emitFieldChange('title', value),
  delay: 400,
})

const validKrCount = computed(() => (props.item.childPreviews ?? []).length)

const smartCompleteness = computed(() =>
  computeSmartCompleteness(
    {
      title: props.item.title,
      description: props.item.description,
      targetDate: props.item.targetDate,
      successDefinition: props.item.successDefinition,
      whyMatters: props.item.whyMatters,
      confidenceRating: props.item.confidenceRating,
      achievabilityRationale: props.item.achievabilityRationale,
      obstacles: props.item.obstacles,
      resources: props.item.resources,
      priorityIds: props.item.priorityIds,
      lifeAreaIds: props.item.lifeAreaIds,
    },
    validKrCount.value,
  ),
)

const smartBadgeClass = computed(() => {
  if (smartCompleteness.value.score === 5) return 'bg-status-good-soft text-status-good-on'
  return 'bg-status-warn-soft text-status-warn-on'
})

const smartBadgeTooltip = computed(() => {
  if (smartCompleteness.value.missing.length === 0) {
    return t('planning.goalWizard.completeness.tooltip.complete')
  }
  return t('planning.goalWizard.completeness.tooltip.missing', {
    letters: smartCompleteness.value.missing.join(', '),
  })
})

const targetDateRelative = computed(() => {
  const targetDate = props.item.targetDate
  if (!targetDate) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null
  const target = new Date(`${targetDate}T00:00:00Z`)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const diffDays = Math.round((target.getTime() - todayUtc.getTime()) / 86_400_000)
  return { diffDays, isoDate: targetDate }
})

const targetDateLabel = computed(() => {
  const rel = targetDateRelative.value
  if (!rel) return t('planning.objects.form.targetDateMissing')
  if (rel.diffDays === 0) return t('planning.goalWizard.steps.timebound.countdown.today')
  if (rel.diffDays < 0) {
    return t('planning.goalWizard.steps.timebound.countdown.overdue', { count: Math.abs(rel.diffDays) })
  }
  if (rel.diffDays >= 14) {
    const weeks = Math.round(rel.diffDays / 7)
    return t('planning.goalWizard.steps.timebound.countdown.weeks', { count: weeks })
  }
  return t('planning.goalWizard.steps.timebound.countdown.days', { count: rel.diffDays })
})

const targetDateTooltip = computed(() => {
  const rel = targetDateRelative.value
  return rel ? rel.isoDate : t('planning.objects.form.targetDateMissing')
})

const targetDateChipClass = computed(() => {
  const rel = targetDateRelative.value
  if (!rel) return 'bg-status-warn-soft text-status-warn-on'
  if (rel.diffDays < 0) return 'bg-status-bad-soft text-status-bad-on'
  return 'bg-neu-base text-on-surface-variant shadow-neu-pressed'
})

function handleAddKeyResult(): void {
  menuOpen.value = false
  emit('add-key-result', props.item.id)
}

function handleEdit(): void {
  menuOpen.value = false
  emit('edit', props.item.id)
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
})
</script>
