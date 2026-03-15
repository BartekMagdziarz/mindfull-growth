<template>
  <div class="space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          class="rounded-full transition-all duration-200"
          :class="idx < stepIndex
            ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
            : idx === stepIndex
              ? 'neo-step-active w-3.5 h-3.5'
              : 'neo-step-future w-2.5 h-2.5'"
          @click="idx < stepIndex && goToStep(STEPS[idx])"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex] }}
      </span>
    </div>

    <!-- Step 1: Check-In -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <template v-if="currentStep === 'check-in'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.unblending.checkIn.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.unblending.checkIn.subtitle') }}
            </p>
            <div class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface leading-relaxed" v-html="t('exerciseWizards.unblending.checkIn.description')">
              </p>
            </div>

            <EmotionSelector
              v-model="beforeEmotionIds"
              :label="t('exerciseWizards.unblending.checkIn.emotionLabel')"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" @click="nextStep()">
              {{ t('exerciseWizards.unblending.checkIn.beginButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Awareness -->
      <template v-else-if="currentStep === 'awareness'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.awareness.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.unblending.awareness.description') }}
            </p>

            <div class="space-y-3">
              <button
                v-for="option in awarenessOptions"
                :key="option.value"
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="awarenessChoice === option.value ? 'shadow-neu-pressed ring-2 ring-primary' : ''"
                @click="handleAwarenessChoice(option.value)"
              >
                <div class="flex items-center gap-3">
                  <AppIcon :name="option.icon" class="text-xl text-on-surface-variant shrink-0" />
                  <span class="text-sm text-on-surface">{{ option.label }}</span>
                </div>
              </button>
            </div>

            <Transition
              enter-active-class="transition-all duration-200"
              leave-active-class="transition-all duration-150"
              enter-from-class="opacity-0 -translate-y-2"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="awarenessChoice === 'no'" class="neo-surface p-3 rounded-lg">
                <p class="text-sm text-on-surface-variant italic">
                  {{ t('exerciseWizards.unblending.awareness.noResponse') }}
                </p>
              </div>
            </Transition>

            <PartSelector
              v-model="blendedPartId"
              :parts="partStore.sortedParts"
              :label="t('exerciseWizards.unblending.awareness.partLabel')"
              :allow-create="false"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: The Magic Question -->
      <template v-else-if="currentStep === 'magic-question'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.magicQuestion.title') }}</h2>

            <div class="neo-surface p-6 rounded-xl text-center">
              <p class="text-lg font-semibold text-on-surface">
                {{ t('exerciseWizards.unblending.magicQuestion.question') }}
              </p>
            </div>

            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.unblending.magicQuestion.description') }}
            </p>

            <div class="space-y-3">
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="selfEnergyPresent === true ? 'shadow-neu-pressed ring-2 ring-primary' : ''"
                @click="handleMagicAnswer(true)"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="wb_sunny" class="text-xl text-yellow-500 shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.unblending.magicQuestion.options.selfEnergy') }}</span>
                </div>
              </button>
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="selfEnergyPresent === false ? 'shadow-neu-pressed ring-2 ring-primary' : ''"
                @click="handleMagicAnswer(false)"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="error" class="text-xl text-orange-500 shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.unblending.magicQuestion.options.reactive') }}</span>
                </div>
              </button>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Secondary Part Check (conditional) -->
      <template v-else-if="currentStep === 'secondary-check'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.secondaryCheck.title') }}</h2>
            <p class="text-sm text-on-surface">
              {{ t('exerciseWizards.unblending.secondaryCheck.description') }}
            </p>

            <!-- Breathing circle -->
            <div class="neo-surface p-6 rounded-2xl flex flex-col items-center gap-4">
              <div
                class="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
                :class="breathingActive ? 'breathing-circle' : ''"
              >
                <span class="text-xs text-primary font-medium">{{ breathingLabel }}</span>
              </div>
              <p class="text-sm text-on-surface-variant">
                {{ breathingActive ? t('exerciseWizards.unblending.secondaryCheck.breathingInstructions') : (breathingCompleted ? t('exerciseWizards.unblending.secondaryCheck.afterQuestion') : t('exerciseWizards.unblending.secondaryCheck.breathingPrompt')) }}
              </p>
              <AppButton
                v-if="!breathingActive && !breathingCompleted"
                variant="tonal"
                @click="startBreathing()"
              >
                {{ t('exerciseWizards.unblending.secondaryCheck.breathingButton') }}
              </AppButton>
            </div>

            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0"
            >
              <div v-if="breathingCompleted" class="space-y-4">
                <p class="text-sm text-on-surface">{{ t('exerciseWizards.unblending.secondaryCheck.afterQuestion') }}</p>
                <div class="space-y-3">
                  <button
                    class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                    @click="selfEnergyPresent = true; nextStep()"
                  >
                    <div class="flex items-center gap-3">
                      <AppIcon name="wb_sunny" class="text-xl text-yellow-500 shrink-0" />
                      <span class="text-sm text-on-surface">{{ t('exerciseWizards.unblending.secondaryCheck.options.better') }}</span>
                    </div>
                  </button>
                  <button
                    class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                    @click="nextStep()"
                  >
                    <div class="flex items-center gap-3">
                      <AppIcon name="error" class="text-xl text-orange-500 shrink-0" />
                      <span class="text-sm text-on-surface">{{ t('exerciseWizards.unblending.secondaryCheck.options.stillReactive') }}</span>
                    </div>
                  </button>
                </div>

                <PartSelector
                  v-model="secondaryPartId"
                  :parts="partStore.sortedParts"
                  :label="t('exerciseWizards.unblending.secondaryCheck.partLabel')"
                  :allow-create="false"
                />
              </div>
            </Transition>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Stepping-Back Request -->
      <template v-else-if="currentStep === 'stepping-back'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.steppingBack.title') }}</h2>

            <div class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface leading-relaxed">
                {{ t('exerciseWizards.unblending.steppingBack.description') }}
              </p>
            </div>

            <!-- Countdown timer -->
            <div class="neo-surface p-8 rounded-2xl flex flex-col items-center gap-4">
              <div class="relative w-20 h-20">
                <svg class="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor"
                    class="text-neu-border/20" stroke-width="4" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor"
                    class="text-primary transition-all duration-1000"
                    stroke-width="4"
                    stroke-linecap="round"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="countdownOffset"
                  />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary">
                  {{ countdownSeconds }}
                </span>
              </div>
              <p class="text-sm text-on-surface-variant">
                {{ countdownActive ? t('exerciseWizards.unblending.steppingBack.timerPrompt') : (countdownDone ? t('exerciseWizards.unblending.steppingBack.timerDone') : t('exerciseWizards.unblending.steppingBack.timerTap')) }}
              </p>
              <AppButton
                v-if="!countdownActive && !countdownDone"
                variant="tonal"
                @click="startCountdown()"
              >
                {{ t('exerciseWizards.unblending.steppingBack.beginButton') }}
              </AppButton>
            </div>

            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0"
            >
              <div v-if="countdownDone" class="space-y-2">
                <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.unblending.steppingBack.shiftLabel') }}</label>
                <textarea
                  v-model="shiftNotes"
                  rows="2"
                  :placeholder="t('exerciseWizards.unblending.steppingBack.shiftPlaceholder')"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </Transition>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Closing -->
      <template v-else-if="currentStep === 'closing'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.closing.title') }}</h2>

            <RatingSlider
              v-model="shiftRating"
              :label="t('exerciseWizards.unblending.closing.sliderLabel')"
              :min="1"
              :max="10"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.unblending.closing.minLabel') }}</span>
              <span>{{ t('exerciseWizards.unblending.closing.maxLabel') }}</span>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Post-Check -->
      <template v-else-if="currentStep === 'post-check'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.unblending.postCheck.title') }}</h2>

            <EmotionSelector
              v-model="afterEmotionIds"
              :label="t('exerciseWizards.unblending.postCheck.emotionLabel')"
            />

            <!-- Before/After comparison -->
            <div v-if="beforeEmotionIds.length || afterEmotionIds.length" class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.unblending.postCheck.comparisonLabels.before') }}</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="eid in beforeEmotionIds"
                    :key="eid"
                    class="neo-pill text-xs px-2 py-0.5 bg-neu-base text-on-surface-variant"
                  >
                    {{ getEmotionName(eid) }}
                  </span>
                  <span v-if="!beforeEmotionIds.length" class="text-xs text-on-surface-variant">—</span>
                </div>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.unblending.postCheck.comparisonLabels.after') }}</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="eid in afterEmotionIds"
                    :key="eid"
                    class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary"
                  >
                    {{ getEmotionName(eid) }}
                  </span>
                  <span v-if="!afterEmotionIds.length" class="text-xs text-on-surface-variant">—</span>
                </div>
              </div>
            </div>

            <!-- Shift rating -->
            <div class="neo-surface p-3 rounded-lg flex items-center justify-between">
              <span class="text-sm text-on-surface-variant">{{ t('exerciseWizards.unblending.postCheck.spaceLabel') }}</span>
              <span class="text-lg font-bold text-primary">{{ shiftRating }}/10</span>
            </div>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.unblending.postCheck.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.unblending.postCheck.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.unblending.postCheck.saving') : t('exerciseWizards.unblending.postCheck.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import { useUnblendingWizard, type UnblendingStep } from '@/composables/useUnblendingWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()

const partStore = useIFSPartStore()
const emotionStore = useEmotionStore()

const STEPS: UnblendingStep[] = [
  'check-in', 'awareness', 'magic-question', 'secondary-check',
  'stepping-back', 'closing', 'post-check',
]

const stepLabels = computed(() => [
  t('exerciseWizards.unblending.steps.checkIn'),
  t('exerciseWizards.unblending.steps.awareness'),
  t('exerciseWizards.unblending.steps.magicQuestion'),
  t('exerciseWizards.unblending.steps.secondaryCheck'),
  t('exerciseWizards.unblending.steps.steppingBack'),
  t('exerciseWizards.unblending.steps.closing'),
  t('exerciseWizards.unblending.steps.postCheck'),
])

const {
  currentStep,
  stepIndex,
  nextStep,
  prevStep,
  goToStep,
  beforeEmotionIds,
  afterEmotionIds,
  blendedPartId,
  secondaryPartId,
  selfEnergyPresent,
  shiftRating,
  breathingCompleted,
  shiftNotes,
  notes,
  isSaving,
  save,
} = useUnblendingWizard()

// Awareness step
const awarenessChoice = ref<'yes' | 'maybe' | 'no' | null>(null)

const awarenessOptions = computed(() => [
  { value: 'yes' as const, label: t('exerciseWizards.unblending.awareness.options.yes'), icon: 'arrow_forward' },
  { value: 'maybe' as const, label: t('exerciseWizards.unblending.awareness.options.maybe'), icon: 'help' },
  { value: 'no' as const, label: t('exerciseWizards.unblending.awareness.options.no'), icon: 'mood' },
])

function handleAwarenessChoice(choice: 'yes' | 'maybe' | 'no') {
  awarenessChoice.value = choice
}

// Magic question
function handleMagicAnswer(present: boolean) {
  selfEnergyPresent.value = present
  setTimeout(() => nextStep(), 200)
}

// Breathing animation
const breathingActive = ref(false)
const breathingLabel = ref(t('exerciseWizards.unblending.secondaryCheck.breathingLabel.ready'))
let breathingTimer: ReturnType<typeof setTimeout> | null = null

function startBreathing() {
  breathingActive.value = true
  let cycle = 0
  const maxCycles = 3

  function runCycle() {
    if (cycle >= maxCycles) {
      breathingActive.value = false
      breathingCompleted.value = true
      breathingLabel.value = t('exerciseWizards.unblending.secondaryCheck.breathingLabel.complete')
      return
    }

    breathingLabel.value = t('exerciseWizards.unblending.secondaryCheck.breathingLabel.breatheIn')
    breathingTimer = setTimeout(() => {
      breathingLabel.value = t('exerciseWizards.unblending.secondaryCheck.breathingLabel.hold')
      breathingTimer = setTimeout(() => {
        breathingLabel.value = t('exerciseWizards.unblending.secondaryCheck.breathingLabel.breatheOut')
        breathingTimer = setTimeout(() => {
          cycle++
          runCycle()
        }, 4000)
      }, 2000)
    }, 4000)
  }

  runCycle()
}

// Countdown timer
const countdownSeconds = ref(15)
const countdownActive = ref(false)
const countdownDone = ref(false)
let countdownInterval: ReturnType<typeof setInterval> | null = null

const circumference = 2 * Math.PI * 36
const countdownOffset = computed(() => {
  return circumference * (1 - countdownSeconds.value / 15)
})

function startCountdown() {
  countdownActive.value = true
  countdownSeconds.value = 15

  countdownInterval = setInterval(() => {
    countdownSeconds.value--
    if (countdownSeconds.value <= 0) {
      if (countdownInterval) clearInterval(countdownInterval)
      countdownActive.value = false
      countdownDone.value = true
    }
  }, 1000)
}

// Emotion name lookup
function getEmotionName(id: string): string {
  return emotionStore.getEmotionById(id)?.name ?? id
}

// Save
async function handleSave() {
  await save()
  emit('saved')
}

// Cleanup timers
onUnmounted(() => {
  if (breathingTimer) clearTimeout(breathingTimer)
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style scoped>
.breathing-circle {
  animation: breathe 10s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.3); }
  60% { transform: scale(1.3); }
}
</style>
