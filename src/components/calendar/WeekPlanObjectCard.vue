<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import { useT } from '@/composables/useT'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import type { WeekPlanCandidate } from './weekPlanCandidate'

const props = defineProps<{ candidate: WeekPlanCandidate; selected: boolean }>()

const emit = defineEmits<{
  toggle: []
  delete: []
  save: [payload: { title: string; entryMode: MeasurementEntryMode; target: MeasurementTarget }]
}>()

const { t } = useT()

const isIntention = computed(() => props.candidate.subjectType === 'weeklyIntention')
const modeLabel = computed(() => t(`planning.objects.targetSentence.mode.${props.candidate.entryMode}`))
const targetSummary = computed(() => formatMeasurementTargetSummary(props.candidate.target, t))

const expanded = ref(false)
const hasDetails = computed(
  () => Boolean(props.candidate.parentGoalTitle) || Boolean(props.candidate.description),
)

// Inline edit (intentions only) — local draft committed on save.
const editing = ref(false)
const draftTitle = ref('')
const draftEntryMode = ref<MeasurementEntryMode>('completion')
const draftTarget = ref<MeasurementTarget>({ kind: 'count', operator: 'min', value: 1 })
const canSave = computed(() => draftTitle.value.trim().length > 0)

function startEdit(): void {
  draftTitle.value = props.candidate.title
  draftEntryMode.value = props.candidate.entryMode
  draftTarget.value = props.candidate.target
  expanded.value = false
  editing.value = true
}

function cancelEdit(): void {
  editing.value = false
}

function saveEdit(): void {
  if (!canSave.value) return
  emit('save', { title: draftTitle.value.trim(), entryMode: draftEntryMode.value, target: draftTarget.value })
  editing.value = false
}

function onMeasurement(m: { entryMode: MeasurementEntryMode; target: MeasurementTarget }): void {
  draftEntryMode.value = m.entryMode
  draftTarget.value = m.target
}
</script>

<template>
  <article
    class="neo-card neo-raised flex flex-col gap-2 border p-3 transition-shadow"
    :class="
      selected
        ? 'border-primary/50 bg-primary/5'
        : 'border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom hover:shadow-neu-raised-lg'
    "
  >
    <!-- Edit mode (intentions only) -->
    <template v-if="editing">
      <input
        v-model="draftTitle"
        type="text"
        class="w-full border-b border-neu-border/20 bg-transparent pb-1.5 text-sm font-medium text-on-surface focus:outline-none"
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
      <div class="flex justify-end gap-2">
        <AppButton variant="text" @click="cancelEdit">{{ t('common.buttons.cancel') }}</AppButton>
        <AppButton variant="filled" :disabled="!canSave" @click="saveEdit">
          {{ t('common.buttons.save') }}
        </AppButton>
      </div>
    </template>

    <!-- Display mode -->
    <template v-else>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="shrink-0 leading-none"
          :aria-pressed="selected"
          :title="t('planning.weekPlanning.priorities.toggle')"
          @click="emit('toggle')"
        >
          <AppIcon
            :name="selected ? 'check_circle' : 'radio_button_unchecked'"
            class="text-xl"
            :class="selected ? 'text-primary' : 'text-on-surface-variant'"
          />
        </button>
        <EntityIcon :icon="candidate.icon" size="sm" />
        <span class="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
          {{ candidate.title }}
        </span>
        <span
          class="shrink-0 rounded-full bg-section/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
        >
          {{ candidate.typeLabel }}
        </span>
      </div>

      <div class="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <span class="rounded-md bg-section/50 px-1.5 py-0.5 font-medium">{{ modeLabel }}</span>
        <span class="min-w-0 truncate">{{ targetSummary }}</span>
      </div>

      <div class="flex items-center justify-between">
        <button
          v-if="hasDetails"
          type="button"
          class="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <AppIcon :name="expanded ? 'expand_less' : 'expand_more'" class="text-sm" />
          {{ t('planning.weekPlanning.details.toggle') }}
        </button>
        <span v-else />

        <div v-if="isIntention" class="flex items-center gap-1">
          <button
            type="button"
            class="neo-icon-button h-7 w-7 rounded-lg"
            :title="t('planning.weekPlanning.intentions.edit')"
            @click="startEdit"
          >
            <AppIcon name="edit" class="text-sm" />
          </button>
          <button
            type="button"
            class="neo-icon-button h-7 w-7 rounded-lg text-error"
            :title="t('planning.weekPlanning.intentions.delete')"
            @click="emit('delete')"
          >
            <AppIcon name="delete" class="text-sm" />
          </button>
        </div>
      </div>

      <Transition
        enter-active-class="transition-opacity duration-150"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-show="expanded && hasDetails"
          class="space-y-1.5 border-t border-neu-border/15 pt-2 text-xs text-on-surface-variant"
        >
          <p v-if="candidate.parentGoalTitle" class="flex items-center gap-1.5">
            <EntityIcon v-if="candidate.parentGoalIcon" :icon="candidate.parentGoalIcon" size="xs" />
            <span class="min-w-0 truncate">{{ candidate.parentGoalTitle }}</span>
          </p>
          <p v-if="candidate.description" class="whitespace-pre-line">{{ candidate.description }}</p>
        </div>
      </Transition>
    </template>
  </article>
</template>
