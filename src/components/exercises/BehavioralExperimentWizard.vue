<template>
  <div class="space-y-6">
    <!-- Step indicator dots (intro doesn't count — 6 dots) -->
    <div v-if="currentStep !== 'intro'" class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < currentVisualStep ? ' (completed)' : idx === currentVisualStep ? ' (current)' : ''}`"
          class="w-2.5 h-2.5 rounded-full transition-all duration-200"
          :class="
            idx < currentVisualStep
              ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
              : idx === currentVisualStep
                ? 'neo-step-active w-3.5 h-3.5'
                : 'neo-step-future w-2.5 h-2.5'
          "
          @click="idx < currentVisualStep && goToStepByIndex(idx)"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[currentVisualStep] }}
      </span>
    </div>

    <!-- Step 1: Intro -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'intro'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.behavioralExperiment.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.intro.howItWorks') }}
            </p>
            <div class="flex items-center gap-3 text-sm text-on-surface flex-wrap">
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.behavioralExperiment.intro.pillBelief') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.behavioralExperiment.intro.pillPredict') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.behavioralExperiment.intro.pillTest') }}</span>
              <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
              <span class="neo-pill px-3 py-1 text-xs">{{ t('exerciseWizards.behavioralExperiment.intro.pillLearn') }}</span>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.behavioralExperiment.intro.howItWorksDescription') }}
            </p>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'belief'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Target Belief -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'belief'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.belief.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralExperiment.belief.description') }}
          </p>
          <textarea
            v-model="targetBelief"
            rows="3"
            :placeholder="t('exerciseWizards.behavioralExperiment.belief.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-2">
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.behavioralExperiment.belief.believabilityLabel', { value: believabilityBefore }) }}
            </label>
            <input
              v-model.number="believabilityBefore"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.behavioralExperiment.belief.notAtAll') }}</span>
              <span>{{ t('exerciseWizards.behavioralExperiment.belief.completely') }}</span>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!targetBelief.trim()"
            @click="currentStep = 'prediction'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Prediction -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'prediction'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.prediction.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralExperiment.prediction.description') }}
          </p>
          <textarea
            v-model="prediction"
            rows="3"
            :placeholder="t('exerciseWizards.behavioralExperiment.prediction.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-2">
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.behavioralExperiment.prediction.confidenceLabel', { value: predictionConfidence }) }}
            </label>
            <input
              v-model.number="predictionConfidence"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.behavioralExperiment.prediction.notAtAll') }}</span>
              <span>{{ t('exerciseWizards.behavioralExperiment.prediction.completelyCertain') }}</span>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'belief'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!prediction.trim()"
            @click="currentStep = 'design'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Experiment Design -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'design'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.design.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralExperiment.design.description') }}
          </p>
          <textarea
            v-model="experimentDesign"
            rows="4"
            :placeholder="t('exerciseWizards.behavioralExperiment.design.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-1">
            <label class="text-xs font-medium text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.design.whenLabel') }}
            </label>
            <input
              v-model="experimentWhen"
              type="date"
              class="neo-input neo-focus w-full p-2.5 text-sm"
            />
          </div>

          <!-- LLM Assist -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="!targetBelief.trim() || !prediction.trim() || isDesignLoading"
              @click="handleDesignAssist"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isDesignLoading ? t('exerciseWizards.behavioralExperiment.design.llmLoading') : t('exerciseWizards.behavioralExperiment.design.llmLabel') }}
            </AppButton>
            <div v-if="designSuggestion" class="neo-panel p-4 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.behavioralExperiment.design.suggestedExperiment') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ designSuggestion }}</p>
            </div>
            <p v-if="designError" class="text-xs text-error">{{ designError }}</p>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'prediction'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!experimentDesign.trim()"
            @click="currentStep = 'safety'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Safety Behaviors -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'safety'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.safety.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.behavioralExperiment.safety.description') }}
          </p>
          <div class="space-y-2">
            <div
              v-for="(behavior, index) in safetyBehaviors"
              :key="index"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
              <input
                :value="behavior"
                type="text"
                :placeholder="t('exerciseWizards.behavioralExperiment.safety.placeholder')"
                class="neo-input neo-focus flex-1 p-2 text-sm"
                @input="safetyBehaviors[index] = ($event.target as HTMLInputElement).value"
              />
              <button
                v-if="safetyBehaviors.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="removeSafetyBehavior(index)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
            <AppButton variant="text" @click="safetyBehaviors.push('')">
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.behavioralExperiment.safety.addBehavior') }}
            </AppButton>
          </div>
        </AppCard>

        <!-- Planned vs. Complete choice -->
        <AppCard variant="flat" padding="md" class="space-y-3">
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.behavioralExperiment.safety.saveChoiceDescription') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <AppButton variant="outlined" class="flex-1" @click="handleSaveAsPlanned">
              {{ t('exerciseWizards.behavioralExperiment.safety.saveAsPlanned') }}
            </AppButton>
            <AppButton variant="filled" class="flex-1" @click="currentStep = 'outcome'">
              {{ t('exerciseWizards.behavioralExperiment.safety.recordOutcomeNow') }}
            </AppButton>
          </div>
        </AppCard>

        <div class="flex justify-start">
          <AppButton variant="text" @click="currentStep = 'design'">{{ t('common.buttons.back') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Outcome -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'outcome'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.outcome.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralExperiment.outcome.description') }}
          </p>

          <!-- Prediction reminder -->
          <div class="neo-panel p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {{ t('exerciseWizards.behavioralExperiment.outcome.predictionLabel') }}
            </p>
            <p class="text-sm text-on-surface italic">"{{ prediction }}"</p>
          </div>

          <textarea
            v-model="outcome"
            rows="4"
            :placeholder="t('exerciseWizards.behavioralExperiment.outcome.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.outcome.learnedTitle') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralExperiment.outcome.learnedDescription') }}
          </p>
          <textarea
            v-model="whatLearned"
            rows="3"
            :placeholder="t('exerciseWizards.behavioralExperiment.outcome.learnedPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.outcome.rerateTitle') }}</h2>
          <div class="neo-panel p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {{ t('exerciseWizards.behavioralExperiment.outcome.targetBeliefLabel') }}
            </p>
            <p class="text-sm text-on-surface italic">"{{ targetBelief }}"</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.behavioralExperiment.outcome.rerateLabel', { value: believabilityAfter }) }}
            </label>
            <input
              v-model.number="believabilityAfter"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.behavioralExperiment.outcome.notAtAll') }}</span>
              <span>{{ t('exerciseWizards.behavioralExperiment.outcome.completely') }}</span>
            </div>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'safety'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!outcome.trim()"
            @click="currentStep = 'summary'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 7: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralExperiment.summary.title') }}</h2>

          <!-- Belief -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.targetBelief') }}
            </p>
            <p class="text-sm text-on-surface">"{{ targetBelief }}"</p>
          </div>

          <!-- Before / After believability -->
          <div class="flex items-center gap-4">
            <div class="flex-1 text-center">
              <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.behavioralExperiment.summary.before') }}</p>
              <p class="text-2xl font-bold text-on-surface">{{ believabilityBefore }}%</p>
            </div>
            <AppIcon name="arrow_forward" class="text-xl text-on-surface-variant flex-shrink-0" />
            <div class="flex-1 text-center">
              <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.behavioralExperiment.summary.after') }}</p>
              <p
                class="text-2xl font-bold"
                :class="
                  believabilityAfter < believabilityBefore
                    ? 'text-success'
                    : believabilityAfter > believabilityBefore
                      ? 'text-error'
                      : 'text-on-surface'
                "
              >
                {{ believabilityAfter }}%
              </p>
            </div>
          </div>
          <p
            v-if="believabilityDelta !== 0"
            class="text-center text-sm"
            :class="believabilityDelta < 0 ? 'text-success' : 'text-on-surface-variant'"
          >
            {{
              believabilityDelta < 0
                ? t('exerciseWizards.behavioralExperiment.summary.decreaseInBelievability', { value: Math.abs(believabilityDelta) })
                : t('exerciseWizards.behavioralExperiment.summary.increaseInBelievability', { value: believabilityDelta })
            }}
          </p>

          <!-- Prediction -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.predictionLabel', { confidence: predictionConfidence }) }}
            </p>
            <p class="text-sm text-on-surface">"{{ prediction }}"</p>
          </div>

          <!-- Design -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.experiment') }}
            </p>
            <p class="text-sm text-on-surface">{{ experimentDesign }}</p>
            <p v-if="experimentWhen" class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.scheduled', { date: experimentWhen }) }}
            </p>
          </div>

          <!-- Safety behaviors -->
          <div v-if="filledSafetyBehaviors.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.safetyBehaviors') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="behavior in filledSafetyBehaviors"
                :key="behavior"
                class="text-xs text-on-surface"
              >
                &#8226; {{ behavior }}
              </li>
            </ul>
          </div>

          <!-- Outcome -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.outcome') }}
            </p>
            <p class="text-sm text-on-surface">{{ outcome }}</p>
          </div>

          <!-- What learned -->
          <div v-if="whatLearned.trim()" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralExperiment.summary.keyLearning') }}
            </p>
            <p class="text-sm text-on-surface">{{ whatLearned }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'outcome'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSaveCompleted">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { CreateBehavioralExperimentPayload } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateBehavioralExperimentPayload]
}>()

const { t, locale } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'belief' | 'prediction' | 'design' | 'safety' | 'outcome' | 'summary'
const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.behavioralExperiment.steps.belief'),
  t('exerciseWizards.behavioralExperiment.steps.prediction'),
  t('exerciseWizards.behavioralExperiment.steps.design'),
  t('exerciseWizards.behavioralExperiment.steps.safety'),
  t('exerciseWizards.behavioralExperiment.steps.outcome'),
  t('exerciseWizards.behavioralExperiment.steps.summary'),
])

const currentVisualStep = computed(() => {
  switch (currentStep.value) {
    case 'belief':
      return 0
    case 'prediction':
      return 1
    case 'design':
      return 2
    case 'safety':
      return 3
    case 'outcome':
      return 4
    case 'summary':
      return 5
    default:
      return 0
  }
})

function goToStepByIndex(idx: number) {
  const stepMap: Step[] = ['belief', 'prediction', 'design', 'safety', 'outcome', 'summary']
  if (idx >= 0 && idx < stepMap.length) {
    currentStep.value = stepMap[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const targetBelief = ref('')
const believabilityBefore = ref(50)
const prediction = ref('')
const predictionConfidence = ref(50)
const experimentDesign = ref('')
const experimentWhen = ref('')
const safetyBehaviors = ref<string[]>([''])
const outcome = ref('')
const whatLearned = ref('')
const believabilityAfter = ref(50)

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isDesignLoading = ref(false)
const designSuggestion = ref('')
const designError = ref('')
const llmAssistUsed = ref(false)

async function handleDesignAssist() {
  isDesignLoading.value = true
  designError.value = ''
  try {
    const { designBehavioralExperiment } = await import('@/services/cbtLLMAssists')
    designSuggestion.value = await designBehavioralExperiment({
      targetBelief: targetBelief.value,
      prediction: prediction.value,
      predictionConfidence: predictionConfidence.value,
      locale: locale.value,
    })
    llmAssistUsed.value = true
  } catch (err) {
    designError.value = err instanceof Error ? err.message : t('exerciseWizards.behavioralExperiment.errors.designFailed')
  } finally {
    isDesignLoading.value = false
  }
}

// ─── Computed ────────────────────────────────────────────────────────────────
const filledSafetyBehaviors = computed(() =>
  safetyBehaviors.value.filter((b) => b.trim().length > 0),
)

const believabilityDelta = computed(() =>
  believabilityAfter.value - believabilityBefore.value,
)

// ─── Actions ─────────────────────────────────────────────────────────────────
function removeSafetyBehavior(index: number) {
  safetyBehaviors.value.splice(index, 1)
}

function handleSaveAsPlanned() {
  const payload: CreateBehavioralExperimentPayload = {
    targetBelief: targetBelief.value.trim(),
    believabilityBefore: believabilityBefore.value,
    prediction: prediction.value.trim(),
    predictionConfidence: predictionConfidence.value,
    experimentDesign: experimentDesign.value.trim(),
    experimentWhen: experimentWhen.value || undefined,
    safetyBehaviors: filledSafetyBehaviors.value.length > 0
      ? filledSafetyBehaviors.value
      : undefined,
    status: 'planned',
    llmAssistUsed: llmAssistUsed.value || undefined,
  }
  emit('saved', payload)
}

function handleSaveCompleted() {
  const payload: CreateBehavioralExperimentPayload = {
    targetBelief: targetBelief.value.trim(),
    believabilityBefore: believabilityBefore.value,
    prediction: prediction.value.trim(),
    predictionConfidence: predictionConfidence.value,
    experimentDesign: experimentDesign.value.trim(),
    experimentWhen: experimentWhen.value || undefined,
    safetyBehaviors: filledSafetyBehaviors.value.length > 0
      ? filledSafetyBehaviors.value
      : undefined,
    status: 'completed',
    outcome: outcome.value.trim(),
    whatLearned: whatLearned.value.trim() || undefined,
    believabilityAfter: believabilityAfter.value,
    llmAssistUsed: llmAssistUsed.value || undefined,
  }
  emit('saved', payload)
}
</script>
