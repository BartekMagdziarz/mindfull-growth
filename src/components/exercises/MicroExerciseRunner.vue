<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex items-center justify-center gap-2 mb-2">
      <span
        v-for="(step, idx) in definition.steps"
        :key="step.key"
        class="w-2.5 h-2.5 rounded-full transition-all duration-200"
        :class="
          idx < stepIndex
            ? 'neo-step-completed'
            : idx === stepIndex
              ? 'neo-step-active w-6'
              : 'neo-step-future'
        "
        :title="tg(stepKey(step, 'title'))"
      />
    </div>

    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div :key="currentStep.key" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">
            {{ tg(stepKey(currentStep, 'title')) }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg(stepKey(currentStep, 'description')) }}
          </p>

          <textarea
            v-if="currentStep.type === 'textarea'"
            v-model="textValues[currentStep.key]"
            rows="4"
            :placeholder="tg(stepKey(currentStep, 'placeholder'))"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />

          <div v-else-if="currentStep.type === 'textList'" class="space-y-2">
            <input
              v-for="(_, index) in listValues[currentStep.key]"
              :key="index"
              v-model="listValues[currentStep.key]![index]"
              type="text"
              :placeholder="tg(stepKey(currentStep, 'placeholder'))"
              class="neo-input neo-focus w-full p-3 text-sm"
            />
          </div>

          <div v-else-if="currentStep.type === 'slider'" class="space-y-2">
            <input
              v-model.number="sliderValues[currentStep.key]"
              type="range"
              :min="currentStep.min"
              :max="currentStep.max"
              :step="currentStep.step ?? 1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex items-center justify-between text-xs text-on-surface-variant">
              <span>{{ tg(stepKey(currentStep, 'minLabel')) }}</span>
              <span class="text-sm font-medium text-on-surface">
                {{ sliderValues[currentStep.key] }}
              </span>
              <span>{{ tg(stepKey(currentStep, 'maxLabel')) }}</span>
            </div>
          </div>

          <div v-else-if="currentStep.type === 'emotionPick'" class="space-y-4">
            <EmotionSelector
              v-model="emotionStates[currentStep.key]!.ids"
              v-model:quadrant="emotionStates[currentStep.key]!.quadrant"
              :show-selected-section="true"
            />
            <div v-if="emotionStates[currentStep.key]!.ids.length > 0" class="space-y-2">
              <label class="text-sm font-medium text-on-surface">
                {{
                  t('exerciseWizards.micro.shared.intensityLabel', {
                    value: emotionStates[currentStep.key]!.intensity,
                  })
                }}
              </label>
              <input
                v-model.number="emotionStates[currentStep.key]!.intensity"
                type="range"
                min="0"
                max="100"
                step="1"
                class="neo-focus w-full accent-primary"
              />
            </div>
          </div>

          <MicroBreathTimer
            v-else-if="currentStep.type === 'breathTimer'"
            :phase-seconds="currentStep.phaseSeconds"
            :total-seconds="currentStep.totalSeconds"
            @progress="breathStates[currentStep.key]!.elapsed = $event"
            @done="breathStates[currentStep.key]!.done = true"
          />
        </AppCard>

        <div class="flex items-center justify-between">
          <AppButton v-if="stepIndex > 0" variant="text" @click="stepIndex--">
            {{ t('common.buttons.back') }}
          </AppButton>
          <span v-else />
          <AppButton variant="filled" :disabled="!canAdvance" @click="advance()">
            {{ isLastStep ? t('common.buttons.save') : t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import MicroBreathTimer from '@/components/exercises/MicroBreathTimer.vue'
import { useT } from '@/composables/useT'
import type { Quadrant } from '@/domain/emotion'
import type {
  MicroExerciseDefinition,
  MicroExerciseStep,
  MicroStepValue,
} from '@/domain/microExercises'

// The runner never persists — the host view owns persistence (same
// contract as the bespoke wizards' @saved).
const props = defineProps<{ definition: MicroExerciseDefinition }>()

const emit = defineEmits<{
  saved: [payload: { responses: Record<string, MicroStepValue> }]
}>()

const { t, tg } = useT()

const stepIndex = ref(0)
const currentStep = computed(() => props.definition.steps[stepIndex.value]!)
const isLastStep = computed(() => stepIndex.value === props.definition.steps.length - 1)

function stepKey(step: MicroExerciseStep, field: string): string {
  return `exerciseWizards.micro.${props.definition.i18nKey}.${step.key}.${field}`
}

// Working state per step type, keyed by step key. The host remounts the
// runner per exercise (`:key="definition.slug"`), so init runs once.
const textValues = reactive<Record<string, string>>({})
const listValues = reactive<Record<string, string[]>>({})
const sliderValues = reactive<Record<string, number>>({})
const emotionStates = reactive<
  Record<string, { ids: string[]; quadrant: Quadrant | null; intensity: number }>
>({})
const breathStates = reactive<Record<string, { elapsed: number; done: boolean }>>({})

for (const step of props.definition.steps) {
  switch (step.type) {
    case 'textarea':
      textValues[step.key] = ''
      break
    case 'textList':
      listValues[step.key] = Array.from({ length: step.prompts }, () => '')
      break
    case 'slider':
      sliderValues[step.key] = Math.round((step.min + step.max) / 2)
      break
    case 'emotionPick':
      emotionStates[step.key] = { ids: [], quadrant: null, intensity: 50 }
      break
    case 'breathTimer':
      breathStates[step.key] = { elapsed: 0, done: false }
      break
    case 'info':
      break
  }
}

const canAdvance = computed(() => {
  const step = currentStep.value
  if (step.optional) return true
  switch (step.type) {
    case 'info':
    case 'slider':
      return true
    case 'textarea':
      return (textValues[step.key] ?? '').trim().length > 0
    case 'textList':
      return (listValues[step.key] ?? []).some((value) => value.trim().length > 0)
    case 'emotionPick':
      return (emotionStates[step.key]?.ids.length ?? 0) > 0
    case 'breathTimer': {
      const state = breathStates[step.key]
      // A meaningful stretch of breathing counts even if the full timer
      // did not run out.
      return state !== undefined && (state.done || state.elapsed >= 10)
    }
  }
})

function buildResponses(): Record<string, MicroStepValue> {
  const responses: Record<string, MicroStepValue> = {}
  for (const step of props.definition.steps) {
    switch (step.type) {
      case 'info':
        break
      case 'textarea': {
        const value = (textValues[step.key] ?? '').trim()
        if (value) responses[step.key] = value
        break
      }
      case 'textList': {
        const items = (listValues[step.key] ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (items.length > 0) responses[step.key] = items
        break
      }
      case 'slider':
        responses[step.key] = sliderValues[step.key] ?? step.min
        break
      case 'emotionPick': {
        const state = emotionStates[step.key]
        if (state && state.ids.length > 0) {
          responses[step.key] = state.ids.map((emotionId) => ({
            emotionId,
            intensity: state.intensity,
          }))
        }
        break
      }
      case 'breathTimer': {
        const state = breathStates[step.key]
        responses[step.key] = {
          completedSeconds: state?.done ? step.totalSeconds : (state?.elapsed ?? 0),
        }
        break
      }
    }
  }
  return responses
}

function advance(): void {
  if (isLastStep.value) {
    emit('saved', { responses: buildResponses() })
    return
  }
  stepIndex.value += 1
}
</script>
