<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import { createWeeklyIntention } from '@/services/weeklyIntentionService'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ created: [] }>()

const { t } = useT()

interface IntentionDraft {
  title: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}

function emptyDraft(): IntentionDraft {
  return { title: '', entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 1 } }
}

const draft = ref<IntentionDraft>(emptyDraft())
const isSaving = ref(false)

const canAddIntention = computed(() => draft.value.title.trim().length > 0)

function onUpdateMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  draft.value = { ...draft.value, entryMode: measurement.entryMode, target: measurement.target }
}

async function addIntention(): Promise<void> {
  if (!canAddIntention.value || isSaving.value) return
  isSaving.value = true
  try {
    await createWeeklyIntention({
      weekRef: props.weekRef,
      title: draft.value.title.trim(),
      entryMode: draft.value.entryMode,
      target: draft.value.target,
    })
    draft.value = emptyDraft()
    emit('created')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div data-testid="intention-composer" class="neo-card neo-card--composer space-y-3 rounded-2xl p-4">
    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
      {{ t('planning.weekPlanning.intentions.heading') }}
    </h4>

    <label class="block">
      <span class="sr-only">{{ t('planning.weekPlanning.intentions.titleLabel') }}</span>
      <input
        v-model="draft.title"
        type="text"
        class="neo-input w-full max-w-sm px-3 py-2 text-sm font-medium text-on-surface"
        :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
        @keydown.enter.prevent="addIntention"
      />
    </label>

    <MeasurementTargetSentence
      :entry-mode="draft.entryMode"
      :target="draft.target"
      cadence="weekly"
      @update:measurement="onUpdateMeasurement"
    />

    <div class="flex justify-end">
      <AppButton variant="filled" :disabled="!canAddIntention || isSaving" @click="addIntention">
        {{ t('planning.weekPlanning.intentions.add') }}
      </AppButton>
    </div>
  </div>
</template>
