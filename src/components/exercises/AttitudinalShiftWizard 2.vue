<template>
  <div class="space-y-6">
    <!-- Step indicator dots -->
    <div class="flex flex-col items-center gap-2">
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
                ? 'neo-step-active w-6'
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.attitudinalShift.intro.title') }}</h2>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              "{{ t('exerciseWizards.attitudinalShift.intro.quote') }}"
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.attitudinalShift.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.attitudinalShift.intro.exampleTitle') }}
            </p>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <span class="text-xs font-semibold text-error mt-0.5">{{ t('exerciseWizards.attitudinalShift.intro.exampleBeforeLabel') }}</span>
                <p class="text-sm text-on-surface">
                  "{{ t('exerciseWizards.attitudinalShift.intro.exampleBefore') }}"
                </p>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-xs font-semibold text-primary mt-0.5">{{ t('exerciseWizards.attitudinalShift.intro.exampleAfterLabel') }}</span>
                <p class="text-sm text-on-surface">
                  "{{ t('exerciseWizards.attitudinalShift.intro.exampleAfter') }}"
                </p>
              </div>
            </div>
          </div>
          <p class="text-xs text-on-surface-variant italic">
            {{ t('exerciseWizards.attitudinalShift.intro.exampleNote') }}
          </p>
          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.attitudinalShift.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'statements'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Statements -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'statements'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.attitudinalShift.statements.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.attitudinalShift.statements.description') }}
          </p>

          <!-- Shadow Beliefs integration -->
          <div v-if="shadowBeliefs.length > 0" class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.attitudinalShift.statements.shadowTitle') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(belief, i) in shadowBeliefs"
                :key="i"
                type="button"
                class="neo-pill text-xs cursor-pointer hover:opacity-80 transition-opacity"
                @click="addFromShadowBelief(belief)"
              >
                {{ belief.text }}
              </button>
            </div>
          </div>

          <div
            v-for="(statement, index) in statements"
            :key="statement.id"
            class="space-y-2 neo-surface p-3 rounded-xl"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1">
                <textarea
                  v-model="statement.belief"
                  :placeholder="t('exerciseWizards.attitudinalShift.statements.placeholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
              </div>
              <button
                v-if="statements.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="statements.splice(index, 1)"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          <AppButton
            v-if="statements.length < 5"
            variant="text"
            @click="addStatement"
          >
            <PlusIcon class="w-4 h-4 mr-1" />
            {{ t('exerciseWizards.attitudinalShift.statements.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledStatements.length < 3"
            @click="enterShiftStep"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Shift (Per-statement carousel) -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'shift'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.attitudinalShift.shift.title') }}</h2>
            <span class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.attitudinalShift.shift.counter', { current: currentStatementIndex + 1, total: filledStatements.length }) }}
            </span>
          </div>

          <!-- Current "because" statement -->
          <div class="neo-embedded p-4">
            <p class="text-sm text-on-surface italic">
              "{{ currentStatement.belief }}"
            </p>
          </div>

          <!-- Acknowledge -->
          <p class="text-xs text-on-surface-variant">
            {{ t('exerciseWizards.attitudinalShift.shift.acknowledgment') }}
          </p>

          <!-- LLM assist -->
          <div class="space-y-2">
            <AppButton
              v-if="!currentLlmResponse && !isLlmLoading"
              variant="tonal"
              @click="handleReframeAssist"
            >
              <SparklesIcon class="w-4 h-4 mr-1" />
              {{ t('exerciseWizards.attitudinalShift.shift.helpButton') }}
            </AppButton>
            <div v-if="isLlmLoading" class="text-sm text-on-surface-variant">{{ t('exerciseWizards.attitudinalShift.shift.thinking') }}</div>
            <div v-if="currentLlmResponse" class="neo-panel p-4">
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ currentLlmResponse }}</p>
            </div>
            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
          </div>

          <!-- Reframe -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.attitudinalShift.shift.reframeLabel') }}
            </label>
            <p class="text-xs text-on-surface-variant mb-1">
              {{ t('exerciseWizards.attitudinalShift.shift.formatHint') }}
            </p>
            <textarea
              v-model="currentStatement.reframe"
              :placeholder="t('exerciseWizards.attitudinalShift.shift.reframePlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
              rows="3"
            />
          </div>

          <!-- Carousel navigation -->
          <div class="flex justify-between pt-2">
            <AppButton
              variant="text"
              :disabled="currentStatementIndex === 0"
              @click="currentStatementIndex--"
            >
              {{ t('exerciseWizards.attitudinalShift.shift.previousButton') }}
            </AppButton>
            <AppButton
              v-if="currentStatementIndex < filledStatements.length - 1"
              variant="tonal"
              @click="currentStatementIndex++"
            >
              {{ t('exerciseWizards.attitudinalShift.shift.nextStatement') }}
            </AppButton>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'statements'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!allReframed"
            @click="currentStep = 'review'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Review -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'review'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.attitudinalShift.review.title') }}</h2>
          <div class="space-y-4">
            <div
              v-for="statement in filledStatements"
              :key="statement.id"
              class="grid grid-cols-2 gap-3"
            >
              <div class="neo-embedded p-3">
                <p class="text-xs font-semibold text-on-surface-variant mb-1">{{ t('exerciseWizards.attitudinalShift.review.beforeHeader') }}</p>
                <p class="text-sm text-on-surface-variant">{{ statement.belief }}</p>
              </div>
              <div class="neo-surface p-3 rounded-xl border-l-2 border-primary/30">
                <p class="text-xs font-semibold text-primary mb-1">{{ t('exerciseWizards.attitudinalShift.review.afterHeader') }}</p>
                <p class="text-sm text-on-surface">{{ statement.reframe }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.attitudinalShift.review.surprisedLabel') }}
              </label>
              <input
                v-model="surpriseReflection"
                type="text"
                :placeholder="t('exerciseWizards.attitudinalShift.review.answerPlaceholder')"
                class="neo-input neo-focus w-full p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.attitudinalShift.review.trueSelfLabel') }}
              </label>
              <input
                v-model="truestReflection"
                type="text"
                :placeholder="t('exerciseWizards.attitudinalShift.review.answerPlaceholder')"
                class="neo-input neo-focus w-full p-2.5 text-sm mt-1"
              />
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'shift'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'summary'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.attitudinalShift.summary.title') }}</h2>

          <!-- All statement pairs -->
          <div class="space-y-3">
            <div
              v-for="statement in filledStatements"
              :key="statement.id"
              class="neo-surface p-3 rounded-xl space-y-1"
            >
              <p class="text-xs text-on-surface-variant line-through">{{ statement.belief }}</p>
              <p class="text-sm text-on-surface font-medium">{{ statement.reframe }}</p>
            </div>
          </div>

          <!-- Reflections -->
          <div v-if="surpriseReflection || truestReflection" class="space-y-1">
            <p v-if="surpriseReflection" class="text-xs text-on-surface-variant">
              <span class="font-semibold">{{ t('exerciseWizards.attitudinalShift.summary.surprisedLabel') }}</span> {{ surpriseReflection }}
            </p>
            <p v-if="truestReflection" class="text-xs text-on-surface-variant">
              <span class="font-semibold">{{ t('exerciseWizards.attitudinalShift.summary.trueSelfLabel') }}</span> {{ truestReflection }}
            </p>
          </div>

          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.attitudinalShift.summary.emotionLabel')"
          />

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.attitudinalShift.summary.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.attitudinalShift.summary.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>

          <!-- Optional commitment -->
          <div class="space-y-2">
            <label class="flex items-center gap-3 text-sm text-on-surface cursor-pointer">
              <input
                v-model="wantsCommitment"
                type="checkbox"
                class="neo-checkbox"
              />
              {{ t('exerciseWizards.attitudinalShift.summary.commitmentCheckbox') }}
            </label>
            <select
              v-if="wantsCommitment"
              v-model="commitmentStatementIndex"
              class="neo-input neo-focus w-full p-2 text-sm"
            >
              <option
                v-for="(statement, idx) in filledStatements"
                :key="statement.id"
                :value="idx"
              >
                {{ (statement.reframe ?? '').slice(0, 60) }}{{ (statement.reframe ?? '').length > 60 ? '...' : '' }}
              </option>
            </select>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'review'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">{{ t('common.buttons.save') }}</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useT } from '@/composables/useT'
import type { CreateAttitudinalShiftPayload, BecauseStatement } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateAttitudinalShiftPayload, commitmentReframe?: string]
}>()

const { t, locale } = useT()
const shadowBeliefsStore = useShadowBeliefsStore()

onMounted(() => {
  shadowBeliefsStore.loadBeliefs()
})

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'statements' | 'shift' | 'review' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.attitudinalShift.steps.intro'),
  t('exerciseWizards.attitudinalShift.steps.statements'),
  t('exerciseWizards.attitudinalShift.steps.shift'),
  t('exerciseWizards.attitudinalShift.steps.review'),
  t('exerciseWizards.attitudinalShift.steps.summary'),
])
const stepOrder: Step[] = ['intro', 'statements', 'shift', 'review', 'summary']

const currentVisualStep = computed(() => stepOrder.indexOf(currentStep.value))

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const notes = ref('')
const surpriseReflection = ref('')
const truestReflection = ref('')
const wantsCommitment = ref(false)
const commitmentStatementIndex = ref(0)

interface EditableStatement {
  id: string
  belief: string
  reframe: string
  shadowBeliefId?: string
}

function createStatement(belief = '', shadowBeliefId?: string): EditableStatement {
  return {
    id: crypto.randomUUID(),
    belief,
    reframe: '',
    shadowBeliefId,
  }
}

const statements = reactive<EditableStatement[]>([
  createStatement(),
  createStatement(),
  createStatement(),
])

function addStatement() {
  statements.push(createStatement())
}

// ─── Shadow Beliefs Integration ──────────────────────────────────────────────
interface ShadowBeliefItem {
  text: string
  sourceId: string
}

const shadowBeliefs = computed<ShadowBeliefItem[]>(() => {
  const latest = shadowBeliefsStore.latestBeliefs
  if (!latest) return []
  return latest.selfSabotagingBeliefs.map((text) => ({
    text,
    sourceId: latest.id,
  }))
})

function addFromShadowBelief(belief: ShadowBeliefItem) {
  if (statements.length < 5) {
    // Find first empty statement or add new
    const empty = statements.find((s) => !s.belief.trim())
    const template = t('exerciseWizards.attitudinalShift.shadowTemplate', { belief: belief.text.toLowerCase() })
    if (empty) {
      empty.belief = template
      empty.shadowBeliefId = belief.sourceId
    } else {
      statements.push(createStatement(template, belief.sourceId))
    }
  }
}

// ─── Carousel State ──────────────────────────────────────────────────────────
const currentStatementIndex = ref(0)

const filledStatements = computed(() =>
  statements.filter((s) => s.belief.trim().length > 0),
)

const currentStatement = computed(() => filledStatements.value[currentStatementIndex.value])

const allReframed = computed(() =>
  filledStatements.value.every((s) => (s.reframe ?? '').trim().length > 0),
)

function enterShiftStep() {
  currentStatementIndex.value = 0
  currentStep.value = 'shift'
}

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isLlmLoading = ref(false)
const llmError = ref('')
const llmAssistUsed = ref(false)

// Per-statement LLM responses
const llmResponses = reactive<Map<string, string>>(new Map())

const currentLlmResponse = computed(() => {
  if (!currentStatement.value) return ''
  return llmResponses.get(currentStatement.value.id) ?? ''
})

async function handleReframeAssist() {
  if (!currentStatement.value) return
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { reframeAttitudinalShift } = await import('@/services/logotherapyLLMAssists')

    const response = await reframeAttitudinalShift({
      belief: currentStatement.value.belief,
      locale: locale.value,
    })
    llmResponses.set(currentStatement.value.id, response)
    llmAssistUsed.value = true
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.attitudinalShift.errors.reframeFailed')
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payloadStatements: BecauseStatement[] = filledStatements.value.map((s) => ({
    id: s.id,
    belief: s.belief.trim(),
    reframe: s.reframe.trim() || undefined,
    shadowBeliefId: s.shadowBeliefId,
  }))

  const payload: CreateAttitudinalShiftPayload = {
    statements: payloadStatements,
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    llmAssistUsed: llmAssistUsed.value || undefined,
    notes: notes.value.trim() || undefined,
  }

  const commitmentReframe = wantsCommitment.value
    ? filledStatements.value[commitmentStatementIndex.value]?.reframe?.trim()
    : undefined

  emit('saved', payload, commitmentReframe)
}
</script>
