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

    <!-- Steps -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Step 1: Select Protector -->
      <template v-if="currentStep === 'select-protector'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.protectorAppreciation.selectProtector.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.protectorAppreciation.selectProtector.description') }}
            </p>

            <div v-if="!protectorParts.length" class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface-variant" v-html="t('exerciseWizards.protectorAppreciation.selectProtector.emptyState')" />
            </div>

            <PartSelector
              v-else
              v-model="partId"
              :parts="partStore.sortedParts"
              :filter-role="['manager', 'firefighter']"
              :label="tg('exerciseWizards.protectorAppreciation.selectProtector.label')"
              :allow-create="false"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Understanding Its Job -->
      <template v-else-if="currentStep === 'understand-job'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.protectorAppreciation.understandJob.title', { partName: selectedPartName }) }}</h2>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.protectorAppreciation.understandJob.triggersLabel') }}
              </label>
              <textarea
                v-model="activationTriggers"
                rows="3"
                :placeholder="t('exerciseWizards.protectorAppreciation.understandJob.triggersPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.protectorAppreciation.understandJob.behaviorsLabel') }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="b in behaviorOptions"
                  :key="b.value"
                  class="neo-pill text-xs px-3 py-1.5 neo-focus transition-all"
                  :class="behaviors.includes(b.value)
                    ? 'bg-primary/20 text-primary shadow-neu-pressed'
                    : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                  @click="toggleBehavior(b.value)"
                >
                  {{ b.label }}
                </button>
              </div>
            </div>

            <!-- Custom behaviors -->
            <div v-if="behaviors.includes('custom')" class="space-y-2">
              <div class="flex gap-2">
                <input
                  v-model="customBehaviorInput"
                  type="text"
                  class="neo-input flex-1 text-sm"
                  :placeholder="t('exerciseWizards.protectorAppreciation.understandJob.customBehaviorPlaceholder')"
                  @keydown.enter.prevent="handleAddCustom"
                />
                <AppButton
                  variant="tonal"
                  :disabled="!customBehaviorInput.trim()"
                  @click="handleAddCustom"
                >
                  {{ t('exerciseWizards.protectorAppreciation.understandJob.addButton') }}
                </AppButton>
              </div>
              <div v-if="customBehaviors.length" class="flex flex-wrap gap-1">
                <span
                  v-for="cb in customBehaviors"
                  :key="cb"
                  class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary flex items-center gap-1"
                >
                  {{ cb }}
                  <button class="hover:text-error neo-focus" @click="removeCustomBehavior(cb)">&times;</button>
                </span>
              </div>
            </div>

            <RatingSlider
              v-model="workloadRating"
              :label="t('exerciseWizards.protectorAppreciation.understandJob.workloadLabel')"
              :min="1"
              :max="10"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.protectorAppreciation.understandJob.workloadMin') }}</span>
              <span>{{ t('exerciseWizards.protectorAppreciation.understandJob.workloadMax') }}</span>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Write Appreciation Letter -->
      <template v-else-if="currentStep === 'write-letter'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              {{ t('exerciseWizards.protectorAppreciation.appreciationLetter.title', { partName: selectedPartName }) }}
            </h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.protectorAppreciation.appreciationLetter.description') }}
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="prompt in letterPrompts"
                :key="prompt"
                class="neo-pill text-xs px-3 py-1.5 bg-primary/10 text-primary neo-focus hover:bg-primary/20 transition-colors"
                @click="appendToLetter(prompt)"
              >
                {{ prompt }}
              </button>
            </div>

            <textarea
              v-model="appreciationLetter"
              rows="8"
              :placeholder="t('exerciseWizards.protectorAppreciation.appreciationLetter.placeholder', { partName: selectedPartName })"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Part's Response -->
      <template v-else-if="currentStep === 'part-response'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              {{ t('exerciseWizards.protectorAppreciation.response.title', { partName: selectedPartName }) }}
            </h2>

            <div v-if="!responseMode" class="space-y-3">
              <p class="text-sm text-on-surface-variant">
                {{ tg('exerciseWizards.protectorAppreciation.response.promptQuestion', { partName: selectedPartName }) }}
              </p>
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                @click="handleResponseMode('ai')"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="auto_awesome" class="text-xl text-status-warn shrink-0" />
                  <div>
                    <span class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.protectorAppreciation.response.aiOption') }}</span>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('exerciseWizards.protectorAppreciation.response.aiOptionDescription') }}</p>
                  </div>
                </div>
              </button>
              <div class="flex justify-end">
                <ProfileContextToggle v-model="useProfileResponse" />
              </div>
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                @click="handleResponseMode('self')"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="edit" class="text-xl text-primary shrink-0" />
                  <div>
                    <span class="text-sm font-medium text-on-surface">{{ tg('exerciseWizards.protectorAppreciation.response.selfOption') }}</span>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('exerciseWizards.protectorAppreciation.response.selfOptionDescription') }}</p>
                  </div>
                </div>
              </button>
            </div>

            <!-- AI response -->
            <template v-if="responseMode === 'ai'">
              <div v-if="isLoadingResponse" class="neo-surface p-8 rounded-xl flex flex-col items-center gap-3">
                <div class="flex gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms" />
                  <span class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms" />
                  <span class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms" />
                </div>
                <p class="text-sm text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.response.thinking', { partName: selectedPartName }) }}</p>
              </div>

              <div v-else-if="partResponse" class="space-y-3">
                <AppCard
                  variant="inset"
                  padding="md"
                  :class="selectedPartRole === 'manager' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-orange-400'"
                >
                  <p class="text-xs font-medium text-on-surface-variant mb-1">{{ t('exerciseWizards.protectorAppreciation.response.partSays', { partName: selectedPartName }) }}</p>
                  <textarea
                    v-model="partResponse"
                    rows="4"
                    class="neo-input w-full p-3 text-sm resize-none"
                  />
                </AppCard>
                <div class="flex flex-wrap items-center gap-2">
                  <AppButton variant="tonal" @click="handleRegenerate">
                    {{ t('exerciseWizards.protectorAppreciation.response.regenerate') }}
                  </AppButton>
                  <ProfileContextToggle v-model="useProfileResponse" />
                </div>
              </div>

              <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
            </template>

            <!-- Self-written response -->
            <template v-if="responseMode === 'self'">
              <textarea
                v-model="partResponse"
                rows="5"
                :placeholder="t('exerciseWizards.protectorAppreciation.response.selfPlaceholder', { partName: selectedPartName })"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </template>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Commitment -->
      <template v-else-if="currentStep === 'commitment'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.protectorAppreciation.commitment.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.protectorAppreciation.commitment.description', { partName: selectedPartName }) }}
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in commitmentChips"
                :key="chip"
                class="neo-pill text-xs px-3 py-1.5 neo-focus transition-all"
                :class="commitment === chip ? 'bg-primary/20 text-primary shadow-neu-pressed' : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                @click="commitment = chip"
              >
                {{ chip }}
              </button>
            </div>

            <textarea
              v-model="commitment"
              rows="3"
              :placeholder="t('exerciseWizards.protectorAppreciation.commitment.placeholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              {{ commitment.trim() ? t('common.buttons.next') : t('exerciseWizards.protectorAppreciation.commitment.skipButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 6: Check-In Scheduling -->
      <template v-else-if="currentStep === 'check-in'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.protectorAppreciation.checkIn.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ tg('exerciseWizards.protectorAppreciation.checkIn.description', { partName: selectedPartName }) }}
            </p>

            <div class="space-y-3">
              <button
                v-for="freq in frequencyOptions"
                :key="freq.value ?? 'none'"
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="checkInFrequency === freq.value ? 'shadow-neu-pressed ring-2 ring-primary' : ''"
                @click="checkInFrequency = freq.value"
              >
                <span class="text-sm text-on-surface">{{ freq.label }}</span>
              </button>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              {{ t('exerciseWizards.protectorAppreciation.checkIn.reviewButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 7: Summary & Save -->
      <template v-else-if="currentStep === 'summary'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.protectorAppreciation.summary.title') }}</h2>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.protector') }}</span>
                <span class="text-sm font-medium text-on-surface">{{ selectedPartName }}</span>
                <PartRoleBadge v-if="selectedPartRole" :role="selectedPartRole" />
              </div>

              <div class="neo-surface p-3 rounded-lg flex items-center justify-between">
                <span class="text-sm text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.workload') }}</span>
                <span class="text-lg font-bold text-primary">{{ workloadRating }}/10</span>
              </div>

              <div v-if="behaviors.length" class="space-y-1">
                <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.behaviors') }}</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="b in displayBehaviors"
                    :key="b"
                    class="neo-pill text-xs px-2 py-0.5 bg-neu-base text-on-surface-variant"
                  >
                    {{ b }}
                  </span>
                </div>
              </div>

              <div>
                <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.letterExcerpt') }}</p>
                <p class="text-xs text-on-surface line-clamp-3">{{ appreciationLetter }}</p>
              </div>

              <div v-if="partResponse">
                <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.response') }}</p>
                <p class="text-xs text-on-surface italic line-clamp-2">"{{ partResponse }}"</p>
              </div>

              <p v-if="commitment" class="text-xs text-on-surface">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.commitment') }}</span> {{ commitment }}
              </p>

              <p v-if="checkInFrequency" class="text-xs text-on-surface">
                <span class="text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.sections.checkIn') }}</span> {{ checkInFrequency }}
              </p>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.protectorAppreciation.summary.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.protectorAppreciation.summary.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.protectorAppreciation.summary.saving') : t('exerciseWizards.protectorAppreciation.summary.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import ProfileContextToggle from '@/components/profile/ProfileContextToggle.vue'
import {
  useProtectorAppreciationWizard,
  type ProtectorAppreciationStep,
} from '@/composables/useProtectorAppreciationWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import type { IFSProtectorBehavior } from '@/domain/exercises'

const { t, tg, tList } = useT()

const emit = defineEmits<{
  saved: []
}>()

const partStore = useIFSPartStore()
const userPreferencesStore = useUserPreferencesStore()
const useProfileResponse = ref(userPreferencesStore.profileContextDefault)

const STEPS: ProtectorAppreciationStep[] = [
  'select-protector', 'understand-job', 'write-letter', 'part-response',
  'commitment', 'check-in', 'summary',
]

const stepLabels = computed(() => [
  t('exerciseWizards.protectorAppreciation.steps.selectProtector'),
  t('exerciseWizards.protectorAppreciation.steps.understandJob'),
  t('exerciseWizards.protectorAppreciation.steps.appreciationLetter'),
  t('exerciseWizards.protectorAppreciation.steps.response'),
  t('exerciseWizards.protectorAppreciation.steps.commitment'),
  t('exerciseWizards.protectorAppreciation.steps.checkIn'),
  t('exerciseWizards.protectorAppreciation.steps.summary'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  partId,
  activationTriggers,
  behaviors,
  customBehaviors,
  workloadRating,
  toggleBehavior,
  addCustomBehavior,
  removeCustomBehavior,
  appreciationLetter,
  partResponse,
  responseMode,
  isLoadingResponse,
  llmError,
  generateResponse,
  commitment,
  checkInFrequency,
  notes,
  isSaving,
  save,
} = useProtectorAppreciationWizard()

// Part helpers
const selectedPart = computed(() => partId.value ? partStore.getPartById(partId.value) : null)
const selectedPartName = computed(() => selectedPart.value?.name ?? t('exerciseWizards.protectorAppreciation.selectProtector.defaultName'))
const selectedPartRole = computed(() => selectedPart.value?.role ?? null)

const protectorParts = computed(() =>
  partStore.sortedParts.filter((p) => p.role === 'manager' || p.role === 'firefighter')
)

// Behavior options
const behaviorOptions = computed((): { value: IFSProtectorBehavior; label: string }[] => [
  { value: 'perfectionism', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.perfectionism') },
  { value: 'control', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.control') },
  { value: 'avoidance', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.avoidance') },
  { value: 'numbing', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.numbing') },
  { value: 'people-pleasing', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.peoplePleasing') },
  { value: 'overthinking', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.overthinking') },
  { value: 'anger', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.anger') },
  { value: 'withdrawal', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.withdrawal') },
  { value: 'distraction', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.distraction') },
  { value: 'caretaking', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.caretaking') },
  { value: 'custom', label: t('exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.custom') },
])

const customBehaviorInput = ref('')

function handleAddCustom() {
  if (customBehaviorInput.value.trim()) {
    addCustomBehavior(customBehaviorInput.value)
    customBehaviorInput.value = ''
  }
}

// Display helpers
const displayBehaviors = computed(() => [
  ...behaviors.value.filter((b) => b !== 'custom'),
  ...customBehaviors.value,
])

// Letter prompts
const letterPrompts = computed(() => [
  t('exerciseWizards.protectorAppreciation.appreciationLetter.letterPrompts.iSeeThat', { partName: selectedPartName.value }),
  t('exerciseWizards.protectorAppreciation.appreciationLetter.letterPrompts.iKnow'),
  t('exerciseWizards.protectorAppreciation.appreciationLetter.letterPrompts.thankYou'),
  t('exerciseWizards.protectorAppreciation.appreciationLetter.letterPrompts.iWantYouToKnow'),
])

function appendToLetter(prompt: string) {
  if (appreciationLetter.value && !appreciationLetter.value.endsWith('\n')) {
    appreciationLetter.value += '\n'
  }
  appreciationLetter.value += prompt
}

// Response mode
function handleResponseMode(mode: 'ai' | 'self') {
  responseMode.value = mode
  if (mode === 'ai' && selectedPart.value) {
    generateResponse(selectedPart.value, { useProfile: useProfileResponse.value })
  }
}

function handleRegenerate() {
  if (selectedPart.value) {
    partResponse.value = ''
    generateResponse(selectedPart.value, { useProfile: useProfileResponse.value })
  }
}

// Commitment chips
const commitmentChips = computed(() => tList('exerciseWizards.protectorAppreciation.commitment.chips'))

// Frequency options
const frequencyOptions = computed((): { value: 'weekly' | 'biweekly' | 'monthly' | null; label: string }[] => [
  { value: 'weekly', label: t('exerciseWizards.protectorAppreciation.checkIn.frequencyOptions.weekly') },
  { value: 'biweekly', label: t('exerciseWizards.protectorAppreciation.checkIn.frequencyOptions.biweekly') },
  { value: 'monthly', label: t('exerciseWizards.protectorAppreciation.checkIn.frequencyOptions.monthly') },
  { value: null, label: t('exerciseWizards.protectorAppreciation.checkIn.frequencyOptions.none') },
])

// Save
async function handleSave() {
  await save()
  emit('saved')
}
</script>
