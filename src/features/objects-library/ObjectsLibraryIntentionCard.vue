<template>
  <!--
    An intention reads like a habit: icon · title, one meta line (the week,
    the linked priorities), the measurement sentence. Editing happens in the
    same places — the title becomes an inline field, the sentence its pills,
    the checklist its tiles — and ends with a quiet Save / Cancel pair, since
    an intention's draft is confirmed explicitly (the one card that is).
  -->
  <article class="group/card mg-v2-surface mg-v2-surface--raised-sm p-4">
    <div class="space-y-2">
      <!-- Row 1: icon + title + hover tray (edit, delete) -->
      <div class="flex items-center gap-2">
        <!-- The icon is not edited here: an intention without one shows a faded
             intention glyph in the ghost grammar instead of an empty disc. -->
        <span class="inline-flex shrink-0 p-0.5">
          <EntityIcon v-if="item.icon" :icon="item.icon" size="lg" />
          <span v-else class="mg-v2-icon-ghost h-10 w-10" aria-hidden="true">
            <AppIcon name="intention" class="text-sm" />
          </span>
        </span>
        <input
          v-if="editing"
          ref="titleInputRef"
          v-model="draftTitle"
          type="text"
          class="mg-v2-inline-field min-w-0 flex-1 text-sm font-bold"
          :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
          :aria-label="t('planning.weekPlanning.intentions.titleLabel')"
          @keydown.enter.prevent="saveEdit"
          @keydown.escape.prevent="cancelEdit"
        />
        <button
          v-else
          type="button"
          class="mg-v2-inline-field min-w-0 flex-1 truncate text-left text-sm font-bold"
          :title="t('planning.weekPlanning.intentions.edit')"
          @click="startEdit"
        >
          {{ item.title }}
        </button>
        <div class="mg-v2-card-tray group-hover/card:opacity-100">
          <button
            v-if="!editing"
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
            :title="t('planning.weekPlanning.intentions.edit')"
            :aria-label="t('planning.weekPlanning.intentions.edit')"
            @click="startEdit"
          >
            <AppIcon name="edit" class="text-base" />
          </button>
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
            :title="t('planning.weekPlanning.intentions.delete')"
            :aria-label="t('planning.weekPlanning.intentions.delete')"
            @click="emit('delete', item.id, item.title)"
          >
            <AppIcon name="delete" class="text-base" />
          </button>
        </div>
      </div>

      <!-- Row 2: the week · linked priorities by name (click edits the links) -->
      <div class="mg-v2-card-indent relative">
        <ObjectCardMetaLine
          :periods="item.weekRef ? [item.weekRef] : []"
          cadence="weekly"
          :priority-ids="editing ? draftPriorityIds : (item.priorityIds ?? [])"
          :priority-options="priorityOptions"
          :empty-links-label="
            priorityOptions.length > 0 ? t('planning.objects.timeline.addLink') : undefined
          "
          @open-links="openLinks"
        />
        <GoalLinksDropdown
          v-if="editing"
          ref="linksRef"
          triggerless
          :priority-ids="draftPriorityIds"
          :life-area-ids="[]"
          :priority-options="priorityOptions"
          :life-area-options="[]"
          @toggle-priority="togglePriority"
        />
      </div>

      <!-- Row 3: status only when it is not the default -->
      <p v-if="item.status !== 'open'" class="mg-v2-meta mg-v2-card-indent">
        <span class="mg-v2-meta__status">
          {{ t(`planning.objects.badges.status.${item.status}`) }}
        </span>
      </p>

      <!-- The sentence: read as quiet facts, edited as pills in the same place -->
      <section v-if="editing" class="mg-v2-group">
        <MeasurementTargetSentence
          :entry-mode="draftEntryMode"
          :target="draftTarget"
          :multi="draftMultiFacts"
          cadence="weekly"
          @update:measurement="onMeasurement"
          @update:threshold="draftMultiDailyThreshold = $event"
        />
      </section>
      <section v-else-if="targetSummary" class="mg-v2-group">
        <p class="mg-v2-meta">
          <span>{{ targetSummary }}</span>
        </p>
      </section>

      <!-- Checklist items while editing -->
      <section v-if="editing && draftEntryMode === 'multi-completion'" class="mg-v2-group">
        <MultiItemsEditor
          :heading="t('planning.objects.form.multiItems.heading')"
          :items="draftMultiItems"
          :threshold="draftMultiDailyThreshold"
          @update:config="onMultiConfig"
        />
      </section>

      <!-- The draft is confirmed explicitly: a quiet pair right after the content -->
      <div v-if="editing" class="mg-v2-card-indent flex items-center gap-2">
        <button
          type="button"
          class="mg-v2-button mg-v2-button--primary"
          :disabled="!canSave"
          @click="saveEdit"
        >
          {{ t('common.buttons.save') }}
        </button>
        <button type="button" class="mg-v2-button mg-v2-button--quiet" @click="cancelEdit">
          {{ t('common.buttons.cancel') }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import GoalLinksDropdown from '@/components/objects/GoalLinksDropdown.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import MultiItemsEditor from '@/components/objects/MultiItemsEditor.vue'
import ObjectCardMetaLine from '@/components/objects/ObjectCardMetaLine.vue'
import { useT } from '@/composables/useT'
import type {
  MeasurementEntryMode,
  MeasurementTarget,
  MultiCompletionItem,
} from '@/domain/planning'
import type {
  ObjectsLibraryFilterOption,
  ObjectsLibraryListItem,
} from '@/services/objectsLibraryQueries'
import { checklistSentenceFacts, formatMeasurementSentence } from '@/utils/measurementTargetFormat'

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

const { t } = useT()

const targetSummary = computed(() =>
  props.item.target
    ? formatMeasurementSentence(
        {
          entryMode: props.item.entryMode ?? 'completion',
          target: props.item.target,
          cadence: 'weekly',
          ratingScale: props.item.ratingScale ?? 10,
          multi:
            props.item.entryMode === 'multi-completion'
              ? checklistSentenceFacts(props.item.multiItems ?? [], props.item.multiDailyThreshold)
              : undefined,
        },
        t
      )
    : ''
)

// Inline edit — local draft committed on save (mirrors WeekPlanObjectCard).
const editing = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)
const linksRef = ref<InstanceType<typeof GoalLinksDropdown> | null>(null)
const draftTitle = ref('')
const draftEntryMode = ref<MeasurementEntryMode>('completion')
const draftTarget = ref<MeasurementTarget>({ kind: 'count', operator: 'min', value: 1 })
const draftMultiItems = ref<MultiCompletionItem[]>([])
const draftMultiDailyThreshold = ref<number | undefined>(undefined)
const draftPriorityIds = ref<string[]>([])
const canSave = computed(() => draftTitle.value.trim().length > 0)
const draftMultiFacts = computed(() =>
  draftEntryMode.value === 'multi-completion'
    ? checklistSentenceFacts(draftMultiItems.value, draftMultiDailyThreshold.value)
    : undefined
)

function startEdit(): void {
  if (editing.value) return
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

// The links picker lives in the draft: opening it from a read card starts
// the edit first, so the choice is saved with the rest.
function openLinks(): void {
  startEdit()
  void nextTick(() => linksRef.value?.openAt('priority'))
}

function togglePriority(id: string): void {
  draftPriorityIds.value = draftPriorityIds.value.includes(id)
    ? draftPriorityIds.value.filter(current => current !== id)
    : [...draftPriorityIds.value, id]
}

function onMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  draftEntryMode.value = measurement.entryMode
  draftTarget.value = measurement.target
}

function onMultiConfig(config: {
  items: MultiCompletionItem[]
  threshold: number | undefined
}): void {
  draftMultiItems.value = config.items
  draftMultiDailyThreshold.value = config.threshold
}

watch(
  () => props.isNew,
  isNew => {
    if (isNew && !editing.value) {
      startEdit()
    }
  },
  { immediate: true }
)
</script>
