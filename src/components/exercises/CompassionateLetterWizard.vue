<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <ExerciseStepper :labels="stepLabels" :current="currentVisualStep" @go="goToStepByIndex($event)" />

    <!-- Step 1: Intro -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'intro'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ tg('exerciseWizards.compassionateLetter.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.intro.pillarsTitle') }}
            </p>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <AppIcon name="favorite" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.compassionateLetter.intro.selfKindness') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.compassionateLetter.intro.selfKindnessDescription') }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <AppIcon name="group" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.compassionateLetter.intro.commonHumanity') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.compassionateLetter.intro.commonHumanityDescription') }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <AppIcon name="visibility" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.compassionateLetter.intro.mindfulness') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.compassionateLetter.intro.mindfulnessDescription') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'situation'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Situation -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'situation'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.situation.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg('exerciseWizards.compassionateLetter.situation.description') }}
          </p>
          <textarea
            v-model="situation"
            rows="5"
            :placeholder="t('exerciseWizards.compassionateLetter.situation.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!situation.trim()"
            @click="currentStep = 'emotions'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Emotions -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'emotions'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <div class="flex items-center gap-1.5">
            <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.emotions.title') }}</h2>
          </div>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.compassionateLetter.emotions.description') }}
          </p>
          <EmotionSelector
            v-model="selectedEmotionIds"
            v-model:families="selectedEmotionFamilyIds"
            v-model:quadrant="activeEmotionQuadrant"
            :show-selected-section="true"
            :allow-family-only="true"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'situation'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="selectedEmotionIds.length === 0 && selectedEmotionFamilyIds.length === 0"
            @click="currentStep = 'critic'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Self-Critical Voice -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'critic'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.critic.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.compassionateLetter.critic.description') }}
          </p>
          <ExerciseStepWhy :text="tg('exerciseWizards.compassionateLetter.critic.why')" />

          <div class="space-y-2">
            <div v-for="(_item, idx) in selfCriticalThoughts" :key="idx" class="flex gap-2 group">
              <input
                v-model="selfCriticalThoughts[idx]"
                class="neo-input neo-focus flex-1 p-2.5 text-sm"
                :placeholder="t('exerciseWizards.compassionateLetter.critic.placeholder')"
              />
              <button
                v-if="selfCriticalThoughts.length > 1"
                type="button"
                class="text-on-surface-variant hover:text-error p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                @click="selfCriticalThoughts.splice(idx, 1)"
              >
                <AppIcon name="close" class="text-xl" />
              </button>
            </div>
            <AppButton variant="text" @click="selfCriticalThoughts.push('')">
              <AppIcon name="add" class="text-base mr-1" /> {{ t('exerciseWizards.compassionateLetter.critic.addThought') }}
            </AppButton>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'emotions'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledSelfCriticalThoughts.length === 0"
            @click="currentStep = 'response'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Compassionate Response -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'response'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.response.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ tg('exerciseWizards.compassionateLetter.response.description') }}
          </p>
          <ExerciseStepWhy :text="tg('exerciseWizards.compassionateLetter.response.why')" />
          <textarea
            v-model="compassionateResponse"
            rows="8"
            :placeholder="tg('exerciseWizards.compassionateLetter.response.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />

          <!-- LLM Assist -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <AppButton
                variant="tonal"
                :disabled="isLlmLoading || !situation.trim() || filledSelfCriticalThoughts.length === 0"
                @click="handleCompassionateAssist"
              >
                <AppIcon name="auto_awesome" class="text-base mr-1.5" />
                {{ isLlmLoading ? t('exerciseWizards.compassionateLetter.response.llmLoading') : t('exerciseWizards.compassionateLetter.response.llmLabel') }}
              </AppButton>
              <ProfileContextToggle v-model="useProfileCompassionate" />
            </div>

            <div v-if="llmResponse" class="neo-panel p-4 mt-3">
              <p class="text-xs text-on-surface-variant mb-2 italic">
                {{ t('exerciseWizards.compassionateLetter.response.llmHint') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ llmResponse }}</p>
              <AppButton variant="text" class="mt-2" @click="insertDraft">
                {{ t('exerciseWizards.compassionateLetter.check.insertDraft') }}
              </AppButton>
            </div>
            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'critic'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!compassionateResponse.trim()"
            @click="currentStep = 'check'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5b: Read the letter back (Gilbert's checklist) -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'check'" class="space-y-4" data-testid="letter-check">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.check.title') }}</h2>
          <p class="text-sm text-on-surface-variant">{{ tg('exerciseWizards.compassionateLetter.check.description') }}</p>
          <ExerciseStepWhy :text="tg('exerciseWizards.compassionateLetter.check.why')" />
          <blockquote class="neo-panel p-4 text-sm text-on-surface whitespace-pre-line">{{ compassionateResponse }}</blockquote>
          <ul class="space-y-2">
            <li v-for="item in CHECKLIST_ITEMS" :key="item">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-0.5"
                  :checked="checklist.includes(item)"
                  @change="toggleChecklist(item)"
                />
                <span class="text-sm text-on-surface">{{ t(`exerciseWizards.compassionateLetter.check.items.${item}`) }}</span>
              </label>
            </li>
          </ul>
          <p v-if="letterHasAdvice" class="text-sm text-on-surface-variant">{{ tg('exerciseWizards.compassionateLetter.check.warning') }}</p>
          <p v-if="letterTooShort" class="text-xs text-on-surface-variant">{{ t('exerciseWizards.compassionateLetter.check.lengthNote') }}</p>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'response'">{{ t('exerciseWizards.compassionateLetter.check.editLetter') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'takeaways'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Takeaways -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'takeaways'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.takeaways.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.compassionateLetter.takeaways.description') }}
          </p>
          <ExerciseStepWhy :text="tg('exerciseWizards.compassionateLetter.takeaways.why')" />

          <div class="space-y-2">
            <div v-for="(_item, idx) in takeaways" :key="idx" class="flex gap-2 group">
              <input
                v-model="takeaways[idx]"
                class="neo-input neo-focus flex-1 p-2.5 text-sm"
                :placeholder="t('exerciseWizards.compassionateLetter.takeaways.placeholder')"
              />
              <button
                v-if="takeaways.length > 1"
                type="button"
                class="text-on-surface-variant hover:text-error p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                @click="takeaways.splice(idx, 1)"
              >
                <AppIcon name="close" class="text-xl" />
              </button>
            </div>
            <AppButton variant="text" @click="takeaways.push('')">
              <AppIcon name="add" class="text-base mr-1" /> {{ t('exerciseWizards.compassionateLetter.takeaways.addTakeaway') }}
            </AppButton>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'check'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledTakeaways.length === 0"
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.compassionateLetter.summary.title') }}</h2>

          <!-- Situation summary -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.summary.situation') }}
            </p>
            <p class="text-sm text-on-surface">{{ situation }}</p>
          </div>

          <!-- Emotions -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.summary.emotions') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="id in selectedEmotionIds"
                :key="id"
                class="exercise-pill px-2.5 py-0.5 text-xs font-medium"
                :style="getEmotionChipStyle(id)"
              >
                {{ getEmotionName(id) }}
              </span>
            </div>
          </div>

          <!-- Self-critical thoughts -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.summary.innerCritic') }}
            </p>
            <div class="neo-embedded p-3 space-y-1.5">
              <p
                v-for="(thought, idx) in filledSelfCriticalThoughts"
                :key="idx"
                class="text-xs text-on-surface-variant italic"
              >
                "{{ thought }}"
              </p>
            </div>
          </div>

          <!-- Compassionate response -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.summary.compassionateResponse') }}
            </p>
            <p class="text-sm text-on-surface whitespace-pre-line leading-relaxed">
              {{ compassionateResponse }}
            </p>
          </div>

          <!-- Takeaways -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.compassionateLetter.summary.takeaways') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="(takeaway, idx) in filledTakeaways"
                :key="idx"
                class="text-sm text-on-surface"
              >
                &#8226; {{ takeaway }}
              </li>
            </ul>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'takeaways'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import ExerciseStepper from './ExerciseStepper.vue'
import { ref, reactive, computed, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import ProfileContextToggle from '@/components/profile/ProfileContextToggle.vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import { getQuadrant, getQuadrantChipStyle } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { CreateCompassionateLetterPayload } from '@/domain/exercises'

/** Prefill from a path moment (`?momentId=`): the situation and the critic's sentence — editable. */
const props = defineProps<{ seed?: { situation?: string; criticThought?: string } }>()

const emit = defineEmits<{
  saved: [data: CreateCompassionateLetterPayload]
}>()

const emotionStore = useEmotionStore()
const userPreferencesStore = useUserPreferencesStore()
const { t, tg, locale } = useT()
const useProfileCompassionate = ref(userPreferencesStore.profileContextDefault)

// ─── Step State ──────────────────────────────────────────────────────────────
type Step =
  | 'intro'
  | 'situation'
  | 'emotions'
  | 'critic'
  | 'response'
  | 'check'
  | 'takeaways'
  | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.compassionateLetter.steps.intro'),
  t('exerciseWizards.compassionateLetter.steps.situation'),
  t('exerciseWizards.compassionateLetter.steps.emotions'),
  t('exerciseWizards.compassionateLetter.steps.innerCritic'),
  t('exerciseWizards.compassionateLetter.steps.response'),
  t('exerciseWizards.compassionateLetter.steps.check'),
  t('exerciseWizards.compassionateLetter.steps.takeaways'),
  t('exerciseWizards.compassionateLetter.steps.summary'),
])

const stepOrder: Step[] = [
  'intro',
  'situation',
  'emotions',
  'critic',
  'response',
  'check',
  'takeaways',
  'summary',
]

const currentVisualStep = computed(() => {
  return stepOrder.indexOf(currentStep.value)
})

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const situation = ref('')
const selectedEmotionIds = ref<string[]>([])
const selectedEmotionFamilyIds = ref<string[]>([])
const activeEmotionQuadrant = ref<Quadrant | null>(null)
const selfCriticalThoughts = reactive<string[]>([''])
const compassionateResponse = ref('')
const takeaways = reactive<string[]>([''])
/** Gilbert's six qualities, ticked while reading the letter back (never required). */
const checklist = ref<string[]>([])
const CHECKLIST_ITEMS = ['care', 'sensitivity', 'tolerance', 'nonJudgement', 'warmth', 'nextStep'] as const
/** A soft floor: a letter that does its work usually needs a few hundred characters. */
const SOFT_MIN_LENGTH = 300
const letterTooShort = computed(() => compassionateResponse.value.trim().length < SOFT_MIN_LENGTH)
const letterHasAdvice = computed(() => /\b(powinien|powinn|musisz|musi|should|must)/i.test(compassionateResponse.value))

function toggleChecklist(item: string) {
  checklist.value = checklist.value.includes(item) ? checklist.value.filter((c) => c !== item) : [...checklist.value, item]
}

watch(
  () => props.seed,
  (seed) => {
    if (!seed) return
    if (seed.situation && !situation.value.trim()) situation.value = seed.situation
    if (seed.criticThought && !selfCriticalThoughts[0]?.trim()) selfCriticalThoughts[0] = seed.criticThought
  },
  { immediate: true },
)

/** The AI draft goes into the editor as a starting point, never as the finished letter. */
function insertDraft() {
  if (!llmResponse.value) return
  const current = compassionateResponse.value.trim()
  compassionateResponse.value = current ? `${current}\n\n${llmResponse.value}` : llmResponse.value
}

// ─── Computed ────────────────────────────────────────────────────────────────
const filledSelfCriticalThoughts = computed(() =>
  selfCriticalThoughts.filter((t) => t.trim().length > 0),
)

const filledTakeaways = computed(() =>
  takeaways.filter((t) => t.trim().length > 0),
)

// ─── Emotion Helpers ─────────────────────────────────────────────────────────
function getEmotionName(id: string): string {
  const emotion = emotionStore.getEmotionById(id)
  return emotion?.name ?? t('common.unknown')
}

function getEmotionChipStyle(id: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(id)
  if (!emotion) return {}
  return getQuadrantChipStyle(getQuadrant(emotion))
}

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isLlmLoading = ref(false)
const llmResponse = ref('')
const llmError = ref('')
const llmAssistUsed = ref(false)

async function handleCompassionateAssist() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { guideCompassionateResponse } = await import('@/services/cbtLLMAssists')
    const emotions = selectedEmotionIds.value.map((id) => {
      const emotion = emotionStore.getEmotionById(id)
      return { name: emotion?.name ?? t('common.unknown') }
    })
    llmResponse.value = await guideCompassionateResponse({
      situation: situation.value,
      emotions,
      selfCriticalThoughts: filledSelfCriticalThoughts.value,
      locale: locale.value,
      useProfile: useProfileCompassionate.value,
    })
    llmAssistUsed.value = true
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.compassionateLetter.errors.guidanceFailed')
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateCompassionateLetterPayload = {
    situation: situation.value.trim(),
    emotionIds: [...selectedEmotionIds.value],
    emotionFamilyIds: [...selectedEmotionFamilyIds.value],
    selfCriticalThoughts: filledSelfCriticalThoughts.value,
    compassionateResponse: compassionateResponse.value.trim(),
    takeaways: filledTakeaways.value,
    checklist: checklist.value.length ? [...checklist.value] : undefined,
    llmAssistUsed: llmAssistUsed.value || undefined,
  }
  emit('saved', payload)
}
</script>
