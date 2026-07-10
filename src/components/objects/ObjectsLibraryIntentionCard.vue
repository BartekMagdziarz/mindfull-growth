<template>
  <article
    class="group/card neo-card neo-raised border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3"
  >
    <!-- Edit mode -->
    <div v-if="editing" class="space-y-3">
      <input
        ref="titleInputRef"
        v-model="draftTitle"
        type="text"
        class="w-full border-b border-neu-border/20 bg-transparent pb-1.5 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
        :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
        :aria-label="t('planning.weekPlanning.intentions.titleLabel')"
        @keydown.enter.prevent="saveEdit"
      />
      <MeasurementTargetSentence
        bare
        :entry-mode="draftEntryMode"
        :target="draftTarget"
        cadence="weekly"
        @update:measurement="onMeasurement"
      />
      <MultiItemsEditor
        v-if="draftEntryMode === 'multi-completion'"
        :items="draftMultiItems"
        :threshold="draftMultiDailyThreshold"
        @update:config="onMultiConfig"
      />
      <PriorityLinkPicker
        v-if="pickerOptions.length > 0"
        :options="pickerOptions"
        :model-value="draftPriorityIds"
        @update:model-value="draftPriorityIds = $event"
      />
      <div class="flex justify-end gap-2">
        <AppButton variant="text" @click="cancelEdit">{{ t('common.buttons.cancel') }}</AppButton>
        <AppButton variant="filled" :disabled="!canSave" @click="saveEdit">
          {{ t('common.buttons.save') }}
        </AppButton>
      </div>
    </div>

    <!-- Display mode -->
    <div v-else class="space-y-2">
      <div class="flex items-center gap-2">
        <EntityIcon :icon="item.icon" size="sm" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
          {{ item.title }}
        </span>
        <div
          class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
        >
          <button
            type="button"
            class="neo-icon-button neo-focus h-7 w-7 rounded-lg"
            :title="t('planning.weekPlanning.intentions.edit')"
            :aria-label="t('planning.weekPlanning.intentions.edit')"
            @click="startEdit"
          >
            <AppIcon name="edit" class="text-sm" />
          </button>
          <button
            type="button"
            class="neo-icon-button neo-focus h-7 w-7 rounded-lg text-danger"
            :title="t('planning.weekPlanning.intentions.delete')"
            :aria-label="t('planning.weekPlanning.intentions.delete')"
            @click="emit('delete', item.id, item.title)"
          >
            <AppIcon name="delete" class="text-sm" />
          </button>
        </div>
        <span
          v-if="item.status !== 'open'"
          class="neo-badge shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        >
          {{ t(`planning.objects.badges.status.${item.status}`) }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
        <span class="rounded-md bg-section/50 px-1.5 py-0.5 font-medium">{{ weekChipLabel }}</span>
        <span class="rounded-md bg-section/50 px-1.5 py-0.5 font-medium">{{ modeLabel }}</span>
        <span class="min-w-0 truncate">{{ targetSummary }}</span>
      </div>

      <div v-if="linkedPriorityLabels.length > 0" class="flex flex-wrap gap-1.5">
        <span
          v-for="label in linkedPriorityLabels"
          :key="label"
          class="rounded-full border border-neu-border/40 px-2 py-0.5 text-[11px] font-medium text-on-surface-variant"
        >
          {{ label }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import MultiItemsEditor from '@/components/objects/MultiItemsEditor.vue'
import PriorityLinkPicker from '@/components/calendar/PriorityLinkPicker.vue'
import { useT } from '@/composables/useT'
import type { MeasurementEntryMode, MeasurementTarget, MultiCompletionItem } from '@/domain/planning'
import type { ObjectsLibraryFilterOption, ObjectsLibraryListItem } from '@/services/objectsLibraryQueries'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import { formatDayRange } from '@/utils/periodLabels'
import { getPeriodBounds } from '@/utils/periods'

const props = defineProps<{
  item: ObjectsLibraryListItem
  priorityOptions: ObjectsLibraryFilterOption[]
  isNew?: boolean
}>()

const emit = defineEmits<{
  save: [
    id: string,
    payload: {
      title: string
      entryMode: MeasurementEntryMode
      target: MeasurementTarget
      multiItems?: MultiCompletionItem[]
      multiDailyThreshold?: number
      priorityIds: string[]
    },
  ]
  delete: [id: string, title: string]
}>()

const { t, locale } = useT()

const weekChipLabel = computed(() => {
  const weekRef = props.item.weekRef
  if (!weekRef) {
    return ''
  }
  const bounds = getPeriodBounds(weekRef)
  return `${weekRef} · ${formatDayRange(bounds.start, locale.value)} – ${formatDayRange(bounds.end, locale.value)}`
})

const modeLabel = computed(() =>
  t(`planning.objects.targetSentence.mode.${props.item.entryMode ?? 'completion'}`),
)
const targetSummary = computed(() =>
  props.item.target ? formatMeasurementTargetSummary(props.item.target, t) : '',
)

const pickerOptions = computed(() =>
  props.priorityOptions.map((option) => ({ id: option.id, title: option.label })),
)
const linkedPriorityLabels = computed(() =>
  (props.item.priorityIds ?? [])
    .map((id) => props.priorityOptions.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label)),
)

// Inline edit — local draft committed on save (mirrors WeekPlanObjectCard).
const editing = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)
const draftTitle = ref('')
const draftEntryMode = ref<MeasurementEntryMode>('completion')
const draftTarget = ref<MeasurementTarget>({ kind: 'count', operator: 'min', value: 1 })
const draftMultiItems = ref<MultiCompletionItem[]>([])
const draftMultiDailyThreshold = ref<number | undefined>(undefined)
const draftPriorityIds = ref<string[]>([])
const canSave = computed(() => draftTitle.value.trim().length > 0)

function startEdit(): void {
  draftTitle.value = props.item.title
  draftEntryMode.value = props.item.entryMode ?? 'completion'
  draftTarget.value = props.item.target ?? { kind: 'count', operator: 'min', value: 1 }
  draftMultiItems.value = [...(props.item.multiItems ?? [])]
  draftMultiDailyThreshold.value = props.item.multiDailyThreshold
  draftPriorityIds.value = [...(props.item.priorityIds ?? [])]
  editing.value = true
  void nextTick(() => {
    titleInputRef.value?.focus()
  })
}

function cancelEdit(): void {
  editing.value = false
}

function saveEdit(): void {
  if (!canSave.value) {
    return
  }
  emit('save', props.item.id, {
    title: draftTitle.value.trim(),
    entryMode: draftEntryMode.value,
    target: draftTarget.value,
    ...(draftEntryMode.value === 'multi-completion' && draftMultiItems.value.length > 0
      ? { multiItems: draftMultiItems.value, multiDailyThreshold: draftMultiDailyThreshold.value }
      : {}),
    priorityIds: draftPriorityIds.value,
  })
  editing.value = false
}

function onMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  draftEntryMode.value = measurement.entryMode
  draftTarget.value = measurement.target
}

function onMultiConfig(config: { items: MultiCompletionItem[]; threshold: number | undefined }): void {
  draftMultiItems.value = config.items
  draftMultiDailyThreshold.value = config.threshold
}

watch(
  () => props.isNew,
  (isNew) => {
    if (isNew && !editing.value) {
      startEdit()
    }
  },
  { immediate: true },
)
</script>
