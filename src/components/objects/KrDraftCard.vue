<template>
  <div class="mg-v2-surface mg-v2-surface--raised-sm mg-v2-surface--paper space-y-3 p-4">
    <div class="flex items-start gap-2">
      <input
        :value="modelValue.title"
        type="text"
        class="mg-v2-field min-w-0 flex-1 text-sm font-medium"
        :placeholder="t('planning.goalWizard.steps.measurable.krTitlePlaceholder')"
        :aria-label="t('planning.goalWizard.steps.measurable.krTitleLabel')"
        @input="onTitleInput"
      />
      <button
        v-if="canRemove"
        type="button"
        class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm shrink-0"
        :aria-label="t('planning.goalWizard.steps.measurable.removeKr')"
        @click="$emit('remove')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>

    <MeasurementTargetSentence
      :entry-mode="modelValue.entryMode"
      :target="modelValue.target"
      :cadence="modelValue.cadence"
      show-cadence
      @update:measurement="onUpdateMeasurement"
      @update:cadence="onCadence"
    />
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

function onUpdateMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  patch({ entryMode: measurement.entryMode, target: measurement.target })
}
</script>
