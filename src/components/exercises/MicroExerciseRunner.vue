<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex items-center justify-center gap-2 mb-2">
      <span
        v-for="(step, idx) in steps"
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
        <AppCard padding="lg" class="space-y-4" :style="cardStyle">
          <h2 class="text-lg font-semibold text-on-surface">
            {{ tg(stepKey(currentStep, 'title')) }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg(stepKey(currentStep, 'description')) }}
          </p>
          <ExerciseStepWhy :text="optionalText(stepKey(currentStep, 'why'))" />

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
            <ExerciseRangeInput
              v-model="sliderValues[currentStep.key]!"
              :min="currentStep.min"
              :max="currentStep.max"
              :step="currentStep.step ?? 1"
            />
            <div class="flex items-center justify-between text-xs text-on-surface-variant">
              <span>{{ tg(stepKey(currentStep, 'minLabel')) }}</span>
              <span class="text-sm font-medium text-on-surface">
                {{ sliderValues[currentStep.key] }}
              </span>
              <span>{{ tg(stepKey(currentStep, 'maxLabel')) }}</span>
            </div>
          </div>

          <EmotionGroupPicker
            v-else-if="currentStep.type === 'emotionPick'"
            v-model="emotionStates[currentStep.key]!.selections"
            v-model:quadrant="emotionStates[currentStep.key]!.quadrant"
          />

          <div
            v-else-if="currentStep.type === 'choice'"
            class="micro-choice"
            :role="currentStep.multiple ? 'group' : 'radiogroup'"
            :aria-label="tg(stepKey(currentStep, 'title'))"
          >
            <button
              v-for="option in currentStep.options"
              :key="option"
              type="button"
              class="mg-v2-pill micro-choice__option"
              :class="{ 'mg-v2-pill--primary mg-v2-pill--selected': isChosen(currentStep.key, option) }"
              :role="currentStep.multiple ? undefined : 'radio'"
              :aria-pressed="currentStep.multiple ? isChosen(currentStep.key, option) : undefined"
              :aria-checked="currentStep.multiple ? undefined : isChosen(currentStep.key, option)"
              @click="toggleChoice(currentStep, option)"
            >
              {{ tg(stepKey(currentStep, `options.${option}`)) }}
            </button>
          </div>

          <MicroBreathTimer
            v-else-if="currentStep.type === 'breathTimer'"
            :phase-seconds="currentStep.phaseSeconds"
            :total-seconds="currentStep.totalSeconds"
            :storage-key="`${definition.slug}:${currentStep.key}`"
            @started="Object.assign(breathStates[currentStep.key]!, $event)"
            @progress="breathStates[currentStep.key]!.elapsed = $event"
            @done="Object.assign(breathStates[currentStep.key]!, { done: true, elapsed: $event })"
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
import EmotionGroupPicker from '@/components/emotion/EmotionGroupPicker.vue'
import ExerciseRangeInput from '@/components/exercises/ExerciseRangeInput.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import MicroBreathTimer from '@/components/exercises/MicroBreathTimer.vue'
import { useT } from '@/composables/useT'
import { getQuadrantTintStyle, type Quadrant } from '@/domain/emotion'
import type { EmotionGroupSelection } from '@/domain/emotionGroups'
import type {
  MicroExerciseDefinition,
  MicroExerciseStep,
  MicroStepValue,
} from '@/domain/microExercises'
import { hasStepsAfter, type MicroChoiceAnswers, visibleMicroSteps } from '@/utils/microExerciseFlow'

// The runner never persists — the host view owns persistence (same
// contract as the bespoke wizards' @saved).
const props = defineProps<{ definition: MicroExerciseDefinition }>()

const emit = defineEmits<{
  saved: [payload: { responses: Record<string, MicroStepValue> }]
}>()

const { t, tg } = useT()

const stepIndex = ref(0)

function stepKey(step: MicroExerciseStep, field: string): string {
  return `exerciseWizards.micro.${props.definition.i18nKey}.${step.key}.${field}`
}

/** Copy that a step may omit (e.g. `why`): '' when the key is missing. */
function optionalText(key: string): string {
  const value = tg(key)
  return value === key ? '' : value
}

// Working state per step type, keyed by step key. The host remounts the
// runner per exercise (`:key="definition.slug"`), so init runs once.
const textValues = reactive<Record<string, string>>({})
const listValues = reactive<Record<string, string[]>>({})
const sliderValues = reactive<Record<string, number>>({})
// Group picker as in the emotion log: group slug + optional 1–5 intensity.
const emotionStates = reactive<
  Record<string, { selections: EmotionGroupSelection[]; quadrant: Quadrant | null }>
>({})
// The timer reports the rhythm the user started with (it may differ from
// the step's defaults) and the seconds actually breathed.
const breathStates = reactive<
  Record<
    string,
    {
      elapsed: number
      done: boolean
      phaseSeconds?: [number, number, number, number]
      totalSeconds?: number
    }
  >
>({})
/** Single choice: '' until answered; multiple choice: picked ids. */
const choiceValues = reactive<Record<string, string | string[]>>({})

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
      emotionStates[step.key] = { selections: [], quadrant: null }
      break
    case 'breathTimer':
      breathStates[step.key] = { elapsed: 0, done: false }
      break
    case 'choice':
      choiceValues[step.key] = step.multiple ? [] : ''
      break
    case 'info':
      break
  }
}

// Only steps whose `showWhen` matches the current choices take part in the
// flow — dots, validation and saved responses all follow this list. A
// condition always points at an earlier step, so answering the current
// step never reshuffles the steps before it.
const choiceAnswers = computed<MicroChoiceAnswers>(() => {
  const answers: MicroChoiceAnswers = {}
  for (const [key, value] of Object.entries(choiceValues)) {
    answers[key] = value === '' ? undefined : value
  }
  return answers
})
const steps = computed(() => visibleMicroSteps(props.definition.steps, choiceAnswers.value))
const currentStep = computed(
  () => steps.value[Math.min(stepIndex.value, steps.value.length - 1)]!,
)
/** An open quadrant tints the card, as in the emotion log editor. */
const cardStyle = computed(() => {
  const step = currentStep.value
  return step.type === 'emotionPick'
    ? getQuadrantTintStyle(emotionStates[step.key]?.quadrant ?? null)
    : undefined
})
const isLastStep = computed(
  () => !hasStepsAfter(props.definition.steps, currentStep.value.key, choiceAnswers.value),
)

function isChosen(key: string, option: string): boolean {
  const value = choiceValues[key]
  return Array.isArray(value) ? value.includes(option) : value === option
}

function toggleChoice(step: MicroExerciseStep, option: string): void {
  if (step.type !== 'choice') return
  const value = choiceValues[step.key]
  if (Array.isArray(value)) {
    choiceValues[step.key] = value.includes(option)
      ? value.filter((picked) => picked !== option)
      : [...value, option]
    return
  }
  choiceValues[step.key] = option
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
      return (emotionStates[step.key]?.selections.length ?? 0) > 0
    case 'choice': {
      const value = choiceValues[step.key]
      return Array.isArray(value) ? value.length > 0 : Boolean(value)
    }
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
  // Hidden branches are dropped even if the user typed into them before
  // changing an earlier answer.
  for (const step of steps.value) {
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
        if (state && state.selections.length > 0) {
          responses[step.key] = state.selections.map((selection) => ({ ...selection }))
        }
        break
      }
      case 'choice': {
        const value = choiceValues[step.key]
        if (Array.isArray(value) ? value.length > 0 : value) {
          responses[step.key] = Array.isArray(value) ? [...value] : value
        }
        break
      }
      case 'breathTimer': {
        const state = breathStates[step.key]
        responses[step.key] = {
          completedSeconds: state?.elapsed ?? 0,
          ...(state?.phaseSeconds && {
            phaseSeconds: [...state.phaseSeconds] as [number, number, number, number],
            totalSeconds: state.totalSeconds,
          }),
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

<style scoped>
.micro-choice {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}

/* Answer chips are the product pill, one size up so a whole answer reads well. */
.micro-choice__option {
  min-height: 2.25rem;
  padding: 0 var(--mg-space-4);
  font-size: var(--mg-font-size-sm);
  cursor: pointer;
}

.micro-choice__option:not(.mg-v2-pill--selected) {
  color: var(--mg-color-ink);
}

.micro-choice__option:not(.mg-v2-pill--selected):hover {
  background: var(--mg-color-paper);
}
</style>
