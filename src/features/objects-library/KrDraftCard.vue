<template>
  <!-- A key result being drafted reads like an expanded KR in the goal card:
       inline title, a quiet remove in the tray, the sentence in a group. -->
  <div class="group/kr mg-v2-surface mg-v2-surface--flat space-y-3 p-3">
    <div class="flex items-center gap-2">
      <input
        :value="modelValue.title"
        type="text"
        class="mg-v2-inline-field min-w-0 flex-1 text-sm font-bold"
        :placeholder="t('planning.objects.form.krTitlePlaceholder')"
        :aria-label="t('planning.goalWizard.steps.measurable.krTitleLabel')"
        @input="onTitleInput"
      />
      <div v-if="canRemove" class="mg-v2-card-tray group-hover/kr:opacity-100">
        <button
          type="button"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet shrink-0"
          :aria-label="t('planning.goalWizard.steps.measurable.removeKr')"
          :title="t('planning.goalWizard.steps.measurable.removeKr')"
          @click="$emit('remove')"
        >
          <AppIcon name="close" class="text-base" />
        </button>
      </div>
    </div>

    <section class="mg-v2-group">
      <MeasurementTargetSentence
        :entry-mode="modelValue.entryMode"
        :target="modelValue.target"
        :cadence="modelValue.cadence"
        :rating-scale="modelValue.ratingScale ?? 10"
        :rating-scale-min="modelValue.ratingScaleMin ?? 1"
        editable-scale
        show-cadence
        @update:measurement="onUpdateMeasurement"
        @update:cadence="onCadence"
        @update:scale="onScale"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import { useT } from '@/composables/useT'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { KrDraft } from '@/composables/useGoalCreationWizard'

const { t } = useT()

const props = defineProps<{
  modelValue: KrDraft
  canRemove: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KrDraft]
  remove: []
}>()

function patch(update: Partial<KrDraft>): void {
  emit('update:modelValue', { ...props.modelValue, ...update })
}

function onTitleInput(event: Event): void {
  patch({ title: (event.target as HTMLInputElement).value })
}

function onCadence(cadence: PlanningCadence): void {
  patch({ cadence })
}

function onScale(scale: { min: number; max: number }): void {
  patch({ ratingScaleMin: scale.min, ratingScale: scale.max })
}

function onUpdateMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  patch({ entryMode: measurement.entryMode, target: measurement.target })
}
</script>
