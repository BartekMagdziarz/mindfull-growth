<template>
  <div class="neo-surface space-y-3 rounded-2xl p-4 shadow-neu-raised-sm">
    <div class="flex items-start gap-2">
      <input
        :value="modelValue.title"
        type="text"
        class="neo-input min-w-0 flex-1 px-3 py-2 text-sm font-medium text-on-surface"
        :placeholder="t('planning.goalWizard.steps.measurable.krTitlePlaceholder')"
        :aria-label="t('planning.goalWizard.steps.measurable.krTitleLabel')"
        @input="onTitleInput"
      />
      <button
        v-if="canRemove"
        type="button"
        class="neo-icon-button neo-focus shrink-0"
        :aria-label="t('planning.goalWizard.steps.measurable.removeKr')"
        @click="$emit('remove')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>

    <div class="space-y-1">
      <span class="text-xs font-medium text-on-surface-variant">
        {{ t('planning.objects.form.cadence') }}
      </span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="option in cadenceOptions"
          :key="option.value"
          type="button"
          class="neo-pill neo-focus px-2 py-1 text-xs transition-all"
          :class="modelValue.cadence === option.value
            ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
            : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
          @click="onCadence(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <MeasurementTargetSentence
      :entry-mode="modelValue.entryMode"
      :target="modelValue.target"
      :cadence="modelValue.cadence"
      @update:measurement="onUpdateMeasurement"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const cadenceOptions = computed(() => [
  { value: 'weekly' as PlanningCadence, label: t('planning.objects.badges.cadence.weekly') },
  { value: 'monthly' as PlanningCadence, label: t('planning.objects.badges.cadence.monthly') },
])

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
