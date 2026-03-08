<template>
  <div class="space-y-6">
    <!-- Step indicator -->
    <div class="flex items-center justify-between gap-4">
      <div class="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
        {{ t('exerciseWizards.wheelOfLife.stepIndicator', { step: wizard.currentStep.value + 1, total: wizard.steps.value.length }) }}
      </div>
      <div class="flex items-center gap-2">
        <template v-for="(_step, i) in wizard.steps.value" :key="_step.id">
          <div
            class="w-3 h-3 rounded-full border transition-all"
            :class="
              i < wizard.currentStep.value
                ? 'bg-primary/70 border-primary/60'
                : i === wizard.currentStep.value
                  ? 'bg-primary/20 border-primary/60 scale-110'
                  : 'bg-transparent border-neu-border/30'
            "
          />
        </template>
      </div>
    </div>

    <!-- Step header -->
    <div class="text-center">
      <h2 class="text-lg font-semibold text-on-surface">
        {{ wizard.currentStepDef.value?.title }}
      </h2>
      <p class="text-sm text-on-surface-variant mt-1">
        {{ wizard.currentStepDef.value?.subtitle }}
      </p>
    </div>

    <!-- Step content -->
    <AppCard padding="lg">
      <!-- Step: Intro -->
      <div v-if="wizard.currentStepDef.value?.id === 'intro'" class="space-y-6">
        <div
          v-if="wizard.isLoadingAreas.value"
          class="flex items-center justify-center py-10"
        >
          <div class="flex items-center gap-3 text-on-surface-variant text-sm">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{{ t('exerciseWizards.wheelOfLife.loadingAreas') }}</span>
          </div>
        </div>

        <div v-else class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center">
          <div class="space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-section/70 text-xs text-on-surface-variant">
              <span class="w-2 h-2 rounded-full bg-primary/70" />
              <span>{{ t('exerciseWizards.wheelOfLife.areasFromProfile', { count: wizard.areas.value.length }) }}</span>
            </div>
            <h3 class="text-xl font-semibold text-on-surface">{{ t('exerciseWizards.wheelOfLife.intro.snapshotHeading') }}</h3>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.wheelOfLife.intro.snapshotDescription') }}
            </p>
            <ul class="space-y-2 text-sm text-on-surface-variant">
              <li class="flex gap-2">
                <span class="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{{ t('exerciseWizards.wheelOfLife.intro.instruction1') }}</span>
              </li>
              <li class="flex gap-2">
                <span class="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{{ t('exerciseWizards.wheelOfLife.intro.instruction2') }}</span>
              </li>
              <li class="flex gap-2">
                <span class="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{{ t('exerciseWizards.wheelOfLife.intro.instruction3') }}</span>
              </li>
            </ul>
            <div class="rounded-xl border border-neu-border/20 bg-section/40 p-3 text-xs text-on-surface-variant">
              {{ t('exerciseWizards.wheelOfLife.intro.changeSlicesHint') }}
            </div>
          </div>

          <div class="rounded-2xl border border-neu-border/20 bg-section/50 p-4">
            <WheelOfLifeRadialChart
              :areas="wizard.areas.value"
              :size="340"
              :padding="60"
              :animated="true"
            />
            <div class="mt-3 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
              <span class="h-2 w-2 rounded-full bg-primary/70" />
              <span>{{ t('exerciseWizards.wheelOfLife.intro.startingShapeCaption') }}</span>
            </div>
          </div>
        </div>

        <div v-if="wizard.areas.value.length > 0" class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {{ t('exerciseWizards.wheelOfLife.intro.areasYoullRate') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="area in wizard.areas.value"
              :key="area.name"
              class="px-3 py-1 rounded-full bg-section text-xs text-on-surface-variant border border-neu-border/20"
            >
              {{ area.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Step: Rate -->
        <WheelAreaRater
          v-else-if="wizard.currentStepDef.value?.id === 'rate' && wizard.currentArea.value"
          :area="wizard.currentArea.value"
          :areas="wizard.areas.value"
          :current-index="wizard.currentAreaIndex.value"
          @rate="wizard.rateArea(wizard.currentAreaIndex.value, $event)"
          @set-reflection="wizard.setAreaReflection(wizard.currentAreaIndex.value, $event.key, $event.value)"
        />

      <!-- Step: Reflect -->
      <div v-else-if="wizard.currentStepDef.value?.id === 'reflect'" class="space-y-4">
        <WheelOfLifeRadialChart
          :areas="wizard.areas.value"
          :comparison-areas="comparisonAreas"
          :size="300"
          :padding="100"
          :label-font-size="9"
          :rating-font-size="8"
        />
        <WheelReflectionPrompts
          :prompts="wizard.reflectionPrompts.value"
          :answers="wizard.reflectionAnswers.value"
          :notes="wizard.notes.value"
          @update="(key: string, value: string) => (wizard.reflectionAnswers.value[key] = value)"
          @update-notes="wizard.notes.value = $event"
        />
      </div>
    </AppCard>

    <!-- Navigation -->
    <div class="flex items-center justify-between">
      <div>
        <AppButton
          v-if="!wizard.isFirstStep.value || (wizard.isRatingStep.value && wizard.currentAreaIndex.value > 0)"
          variant="text"
          @click="wizard.back()"
        >
          {{ t('exerciseWizards.wheelOfLife.back') }}
        </AppButton>
        <AppButton v-else-if="showCancel" variant="text" @click="$emit('cancel')">
          {{ t('exerciseWizards.wheelOfLife.cancel') }}
        </AppButton>
      </div>

      <div class="flex gap-2">
        <AppButton
          v-if="wizard.isLastStep.value"
          variant="filled"
          @click="handleSave"
          :disabled="saving"
        >
          {{ t('exerciseWizards.wheelOfLife.save') }}
        </AppButton>
        <AppButton
          v-else
          variant="filled"
          :disabled="!canAdvance"
          @click="wizard.next()"
        >
          {{ wizard.isRatingStep.value && !wizard.isLastArea.value ? t('exerciseWizards.wheelOfLife.nextArea') : t('exerciseWizards.wheelOfLife.continue') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useT } from '@/composables/useT'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import WheelOfLifeRadialChart from './WheelOfLifeRadialChart.vue'
import WheelAreaRater from './WheelAreaRater.vue'
import WheelReflectionPrompts from './WheelReflectionPrompts.vue'
import type { WheelOfLifeArea } from '@/domain/exercises'
import { useWheelOfLifeWizard, type WheelOfLifeMode } from '@/composables/useWheelOfLifeWizard'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    mode?: WheelOfLifeMode
    comparisonAreas?: WheelOfLifeArea[]
    presetAreas?: WheelOfLifeArea[]
    showCancel?: boolean
  }>(),
  {
    mode: 'standalone',
    comparisonAreas: undefined,
    presetAreas: undefined,
    showCancel: false,
  },
)

const emit = defineEmits<{
  saved: [snapshotId: string]
  cancel: []
}>()

const wizard = useWheelOfLifeWizard({
  mode: props.mode,
  presetAreas: props.presetAreas,
  comparisonAreas: props.comparisonAreas,
})

const saving = ref(false)

const canAdvance = computed(() => {
  if (wizard.isLoadingAreas.value) return false
  if (wizard.isRatingStep.value && !wizard.isLastArea.value) return true
  return wizard.canProceed.value
})

async function handleSave() {
  saving.value = true
  try {
    const snapshotId = await wizard.save()
    emit('saved', snapshotId)
  } finally {
    saving.value = false
  }
}

</script>
