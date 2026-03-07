<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex items-center justify-center gap-2 mb-2">
      <span
        v-for="(label, idx) in visibleStepLabels"
        :key="idx"
        class="w-2.5 h-2.5 rounded-full transition-all duration-200"
        :class="
          idx < currentVisualStep
            ? 'neo-step-completed'
            : idx === currentVisualStep
              ? 'neo-step-active w-6'
              : 'neo-step-future'
        "
        :title="label"
      />
    </div>

    <!-- Step 1: Capture Worry -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'capture'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.capture.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.capture.description') }}
          </p>
          <textarea
            v-model="worry"
            rows="4"
            :placeholder="t('exerciseWizards.worryTree.capture.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.capture.emotionsTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.capture.emotionsDescription') }}
          </p>
          <EmotionSelector
            v-model="selectedEmotionIds"
            :show-selected-section="true"
          />
          <div v-if="selectedEmotionIds.length > 0" class="space-y-2">
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.worryTree.capture.intensityLabel', { value: emotionBeforeIntensity }) }}
            </label>
            <input
              v-model.number="emotionBeforeIntensity"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.worryTree.capture.intensityMin') }}</span>
              <span>{{ t('exerciseWizards.worryTree.capture.intensityMax') }}</span>
            </div>
          </div>
        </AppCard>

        <div class="flex justify-end">
          <AppButton
            variant="filled"
            :disabled="!canAdvanceFromCapture"
            @click="currentStep = 'classify'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Classify Worry -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'classify'" class="space-y-4">
        <AppCard padding="lg" class="space-y-3">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.classify.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.classify.description') }}
          </p>
        </AppCard>

        <button
          type="button"
          :class="[
            'neo-selector neo-focus w-full text-left p-5 space-y-1',
            worryType === 'real-problem' ? 'neo-selector--active' : '',
          ]"
          @click="selectWorryType('real-problem')"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              :class="
                worryType === 'real-problem'
                  ? 'border-primary bg-primary'
                  : 'border-outline'
              "
            >
              <div
                v-if="worryType === 'real-problem'"
                class="w-2 h-2 rounded-full bg-on-primary"
              />
            </div>
            <div>
              <p class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.classify.realProblem') }}</p>
              <p class="text-sm text-on-surface-variant">
                {{ t('exerciseWizards.worryTree.classify.realProblemDescription') }}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          :class="[
            'neo-selector neo-focus w-full text-left p-5 space-y-1',
            worryType === 'hypothetical' ? 'neo-selector--active' : '',
          ]"
          @click="selectWorryType('hypothetical')"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              :class="
                worryType === 'hypothetical'
                  ? 'border-primary bg-primary'
                  : 'border-outline'
              "
            >
              <div
                v-if="worryType === 'hypothetical'"
                class="w-2 h-2 rounded-full bg-on-primary"
              />
            </div>
            <div>
              <p class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.classify.hypothetical') }}</p>
              <p class="text-sm text-on-surface-variant">
                {{ t('exerciseWizards.worryTree.classify.hypotheticalDescription') }}
              </p>
            </div>
          </div>
        </button>

        <div class="flex justify-start">
          <AppButton variant="text" @click="currentStep = 'capture'">{{ t('common.buttons.back') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3a: Real Problem — Can Act Now? -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'can-act'" class="space-y-4">
        <AppCard padding="lg" class="space-y-3">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.canAct.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.canAct.description') }}
          </p>
        </AppCard>

        <button
          type="button"
          :class="[
            'neo-selector neo-focus w-full text-left p-5',
            canActNow === true ? 'neo-selector--active' : '',
          ]"
          @click="selectCanActNow(true)"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              :class="
                canActNow === true
                  ? 'border-primary bg-primary'
                  : 'border-outline'
              "
            >
              <div
                v-if="canActNow === true"
                class="w-2 h-2 rounded-full bg-on-primary"
              />
            </div>
            <div>
              <p class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.canAct.yesTitle') }}</p>
              <p class="text-sm text-on-surface-variant">
                {{ t('exerciseWizards.worryTree.canAct.yesDescription') }}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          :class="[
            'neo-selector neo-focus w-full text-left p-5',
            canActNow === false ? 'neo-selector--active' : '',
          ]"
          @click="selectCanActNow(false)"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              :class="
                canActNow === false
                  ? 'border-primary bg-primary'
                  : 'border-outline'
              "
            >
              <div
                v-if="canActNow === false"
                class="w-2 h-2 rounded-full bg-on-primary"
              />
            </div>
            <div>
              <p class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.canAct.noTitle') }}</p>
              <p class="text-sm text-on-surface-variant">
                {{ t('exerciseWizards.worryTree.canAct.noDescription') }}
              </p>
            </div>
          </div>
        </button>

        <div class="flex justify-start">
          <AppButton variant="text" @click="currentStep = 'classify'">{{ t('common.buttons.back') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3a-yes: Action Plan -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'action-plan'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.actionPlan.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.actionPlan.description') }}
          </p>
          <textarea
            v-model="actionPlan"
            rows="3"
            :placeholder="t('exerciseWizards.worryTree.actionPlan.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-1">
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.worryTree.actionPlan.whenLabel') }}</label>
            <input
              v-model="actionDate"
              type="date"
              class="neo-input neo-focus w-full p-2.5 text-sm"
            />
          </div>
          <label class="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
            <input
              v-model="createCommitment"
              type="checkbox"
              class="neo-checkbox"
            />
            {{ t('exerciseWizards.worryTree.actionPlan.createCommitment') }}
          </label>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'can-act'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!actionPlan.trim()"
            @click="currentStep = 'recheck'"
          >
            {{ t('exerciseWizards.worryTree.actionPlan.complete') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3a-no: Schedule It -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'schedule'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.schedule.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.schedule.description') }}
          </p>
          <textarea
            v-model="actionPlan"
            rows="3"
            :placeholder="t('exerciseWizards.worryTree.schedule.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
          <div class="space-y-1">
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.worryTree.schedule.whenLabel') }}</label>
            <input
              v-model="actionDate"
              type="date"
              class="neo-input neo-focus w-full p-2.5 text-sm"
            />
          </div>
        </AppCard>

        <AppCard variant="flat" padding="md">
          <p class="text-sm text-on-surface-variant italic leading-relaxed">
            {{ t('exerciseWizards.worryTree.schedule.encouragement') }}
          </p>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'can-act'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'recheck'">
            {{ t('exerciseWizards.worryTree.schedule.complete') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3b: Hypothetical Worry — Letting Go -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'letting-go'" class="space-y-4">
        <AppCard padding="lg" class="space-y-3">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.lettingGo.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.worryTree.lettingGo.description') }}
          </p>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.lettingGo.choosePrompt') }}
          </p>
        </AppCard>

        <button
          v-for="technique in lettingGoTechniques"
          :key="technique.id"
          type="button"
          :class="[
            'neo-selector neo-focus w-full text-left p-4 space-y-1',
            selectedTechnique === technique.id ? 'neo-selector--active' : '',
          ]"
          @click="selectTechnique(technique.id)"
        >
          <p class="text-base font-semibold text-on-surface">{{ technique.name }}</p>
          <p class="text-sm text-on-surface-variant">{{ technique.description }}</p>
        </button>

        <div class="flex justify-start">
          <AppButton variant="text" @click="currentStep = 'classify'">{{ t('common.buttons.back') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Emotion Re-check -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'recheck'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.worryTree.recheck.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.worryTree.recheck.description') }}
          </p>

          <!-- Before emotion display -->
          <div v-if="emotionBeforeName" class="neo-embedded p-3 space-y-1">
            <p class="text-xs font-medium text-on-surface-variant uppercase tracking-wide">{{ t('exerciseWizards.worryTree.recheck.before') }}</p>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-on-surface">{{ emotionBeforeName }}</span>
              <span class="text-sm font-semibold text-primary">{{ emotionBeforeIntensity }}%</span>
            </div>
          </div>

          <!-- After intensity slider -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.worryTree.recheck.nowLabel', { emotion: emotionBeforeName ?? '', value: emotionAfterIntensity }) }}
            </label>
            <input
              v-model.number="emotionAfterIntensity"
              type="range"
              min="0"
              max="100"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.worryTree.recheck.intensityMin') }}</span>
              <span>{{ t('exerciseWizards.worryTree.recheck.intensityMax') }}</span>
            </div>
          </div>

          <!-- Before/After comparison -->
          <div class="flex items-center gap-4 pt-2">
            <div class="flex-1 text-center">
              <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.worryTree.recheck.before') }}</p>
              <p class="text-2xl font-bold text-on-surface">{{ emotionBeforeIntensity }}%</p>
            </div>
            <ArrowRightIcon class="w-5 h-5 text-on-surface-variant flex-shrink-0" />
            <div class="flex-1 text-center">
              <p class="text-xs text-on-surface-variant mb-1">{{ t('exerciseWizards.worryTree.recheck.after') }}</p>
              <p
                class="text-2xl font-bold"
                :class="intensityDelta < 0 ? 'text-success' : intensityDelta > 0 ? 'text-error' : 'text-on-surface'"
              >
                {{ emotionAfterIntensity }}%
              </p>
            </div>
          </div>
          <p
            v-if="intensityDelta !== 0"
            class="text-center text-sm"
            :class="intensityDelta < 0 ? 'text-success' : 'text-on-surface-variant'"
          >
            {{ intensityDelta < 0 ? t('exerciseWizards.worryTree.recheck.decrease', { value: Math.abs(intensityDelta) }) : t('exerciseWizards.worryTree.recheck.increase', { value: intensityDelta }) }}
          </p>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="goBackFromRecheck">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'
import type {
  EmotionRating,
  LettingGoTechnique,
  CreateWorryTreeEntryPayload,
} from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateWorryTreeEntryPayload]
}>()

const emotionStore = useEmotionStore()
const { t } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step =
  | 'capture'
  | 'classify'
  | 'can-act'
  | 'action-plan'
  | 'schedule'
  | 'letting-go'
  | 'recheck'

const currentStep = ref<Step>('capture')

// ─── Form State ──────────────────────────────────────────────────────────────
const worry = ref('')
const selectedEmotionIds = ref<string[]>([])
const emotionBeforeIntensity = ref(50)
const emotionAfterIntensity = ref(50)

const worryType = ref<'real-problem' | 'hypothetical' | null>(null)
const canActNow = ref<boolean | null>(null)

const actionPlan = ref('')
const actionDate = ref('')
const createCommitment = ref(false)

const selectedTechnique = ref<LettingGoTechnique | null>(null)

// ─── Letting Go Techniques ──────────────────────────────────────────────────
const lettingGoTechniques = computed<{ id: LettingGoTechnique; name: string; description: string }[]>(() => [
  {
    id: 'leaves-on-stream',
    name: t('exerciseWizards.worryTree.lettingGo.techniques.leavesOnStream.name'),
    description: t('exerciseWizards.worryTree.lettingGo.techniques.leavesOnStream.description'),
  },
  {
    id: 'refocus',
    name: t('exerciseWizards.worryTree.lettingGo.techniques.refocus.name'),
    description: t('exerciseWizards.worryTree.lettingGo.techniques.refocus.description'),
  },
  {
    id: 'worry-time',
    name: t('exerciseWizards.worryTree.lettingGo.techniques.worryTime.name'),
    description: t('exerciseWizards.worryTree.lettingGo.techniques.worryTime.description'),
  },
  {
    id: 'acceptance',
    name: t('exerciseWizards.worryTree.lettingGo.techniques.acceptance.name'),
    description: t('exerciseWizards.worryTree.lettingGo.techniques.acceptance.description'),
  },
])

// ─── Computed ────────────────────────────────────────────────────────────────
const emotionBeforeName = computed(() => {
  if (selectedEmotionIds.value.length === 0) return null
  const emotion = emotionStore.getEmotionById(selectedEmotionIds.value[0])
  return emotion?.name ?? null
})

const canAdvanceFromCapture = computed(() => {
  return worry.value.trim().length > 0 && selectedEmotionIds.value.length > 0
})

const intensityDelta = computed(() => {
  return emotionAfterIntensity.value - emotionBeforeIntensity.value
})

// Visual step index for the dots indicator
const currentVisualStep = computed(() => {
  switch (currentStep.value) {
    case 'capture':
      return 0
    case 'classify':
      return 1
    case 'can-act':
    case 'action-plan':
    case 'schedule':
    case 'letting-go':
      return 2
    case 'recheck':
      return 3
    default:
      return 0
  }
})

const visibleStepLabels = computed(() => [
  t('exerciseWizards.worryTree.steps.capture'),
  t('exerciseWizards.worryTree.steps.classify'),
  t('exerciseWizards.worryTree.steps.respond'),
  t('exerciseWizards.worryTree.steps.recheck'),
])

// ─── Actions ─────────────────────────────────────────────────────────────────
function selectWorryType(type: 'real-problem' | 'hypothetical') {
  worryType.value = type
  // Auto-advance after a brief moment
  setTimeout(() => {
    if (type === 'real-problem') {
      currentStep.value = 'can-act'
    } else {
      currentStep.value = 'letting-go'
    }
  }, 200)
}

function selectCanActNow(value: boolean) {
  canActNow.value = value
  setTimeout(() => {
    if (value) {
      currentStep.value = 'action-plan'
    } else {
      currentStep.value = 'schedule'
    }
  }, 200)
}

function selectTechnique(technique: LettingGoTechnique) {
  selectedTechnique.value = technique
  setTimeout(() => {
    currentStep.value = 'recheck'
  }, 200)
}

function goBackFromRecheck() {
  if (worryType.value === 'hypothetical') {
    currentStep.value = 'letting-go'
  } else if (canActNow.value === true) {
    currentStep.value = 'action-plan'
  } else {
    currentStep.value = 'schedule'
  }
}

function handleSave() {
  const emotionBefore: EmotionRating = {
    emotionId: selectedEmotionIds.value[0],
    intensity: emotionBeforeIntensity.value,
  }

  const emotionAfter: EmotionRating = {
    emotionId: selectedEmotionIds.value[0],
    intensity: emotionAfterIntensity.value,
  }

  const payload: CreateWorryTreeEntryPayload = {
    worry: worry.value.trim(),
    worryType: worryType.value!,
    emotionBefore,
    emotionAfter,
    canActNow: worryType.value === 'real-problem' ? canActNow.value ?? undefined : undefined,
    actionPlan:
      worryType.value === 'real-problem' && actionPlan.value.trim()
        ? actionPlan.value.trim()
        : undefined,
    actionDate:
      worryType.value === 'real-problem' && actionDate.value
        ? actionDate.value
        : undefined,
    lettingGoTechnique:
      worryType.value === 'hypothetical' ? selectedTechnique.value ?? undefined : undefined,
  }

  emit('saved', payload)
}
</script>
