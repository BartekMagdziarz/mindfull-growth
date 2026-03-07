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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.tragicOptimism.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.tragicOptimism.intro.description') }}
          </p>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              "{{ t('exerciseWizards.tragicOptimism.intro.quote') }}"
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>

          <!-- Professional guidance banner -->
          <div class="neo-warning p-4 rounded-xl border-l-4 border-orange-400">
            <div class="flex items-start gap-3">
              <ExclamationTriangleIcon class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div class="text-sm text-on-surface">
                <p class="font-semibold mb-1">{{ t('exerciseWizards.tragicOptimism.intro.warningTitle') }}</p>
                <p>
                  {{ t('exerciseWizards.tragicOptimism.intro.warningText') }}
                </p>
              </div>
            </div>
          </div>

          <EmotionSelector v-model="emotionIdsBefore" :label="t('exerciseWizards.tragicOptimism.intro.emotionLabel')" />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'focus'">
            {{ t('exerciseWizards.tragicOptimism.intro.startButton') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Focus -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'focus'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">
            {{ t('exerciseWizards.tragicOptimism.focus.title') }}
          </h2>
          <div class="space-y-3">
            <button
              v-for="mode in focusModes"
              :key="mode.value"
              type="button"
              class="neo-selector p-4 w-full text-left"
              :class="selectedFocus === mode.value && 'neo-selector--active'"
              @click="selectedFocus = mode.value"
            >
              <div class="flex items-start gap-3">
                <component :is="mode.icon" class="w-6 h-6 flex-shrink-0 mt-0.5" :class="mode.iconClass" />
                <div>
                  <p class="text-sm font-semibold text-on-surface">{{ mode.label }}</p>
                  <p class="text-xs text-on-surface-variant mt-0.5">{{ mode.description }}</p>
                </div>
              </div>
            </button>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'write'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Write -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'write'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.tragicOptimism.write.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.tragicOptimism.write.description') }}
          </p>
          <textarea
            v-model="freeWriting"
            :placeholder="t('exerciseWizards.tragicOptimism.write.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
            rows="12"
          />
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'focus'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="freeWriting.trim().length < 50"
            @click="currentStep = 'guided'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Guided Questions -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'guided'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.tragicOptimism.guided.title') }}</h2>
          <div
            v-for="(question, idx) in guidedQuestions"
            :key="idx"
            class="neo-surface rounded-xl p-4 space-y-2"
          >
            <label class="text-sm font-medium text-on-surface">{{ question }}</label>
            <textarea
              v-model="guidedAnswers[idx]"
              :placeholder="t('exerciseWizards.tragicOptimism.guided.placeholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
              rows="4"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'write'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'dialogue'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Dialogue -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'dialogue'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.tragicOptimism.dialogue.title') }}</h2>

          <!-- Professional guidance reminder -->
          <p class="text-xs text-on-surface-variant italic">
            {{ t('exerciseWizards.tragicOptimism.dialogue.reminder') }}
          </p>

          <!-- Message area -->
          <div
            ref="messageContainer"
            class="neo-surface rounded-xl p-4 h-96 overflow-y-auto space-y-3"
          >
            <div
              v-if="messages.length === 0 && !isLlmLoading"
              class="text-center text-on-surface-variant py-8"
            >
              <p class="text-sm">{{ t('exerciseWizards.tragicOptimism.dialogue.starting') }}</p>
            </div>

            <div
              v-for="(message, index) in messages"
              :key="`${message.timestamp}-${index}`"
              :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <div
                :class="[
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary-strong text-on-primary'
                    : 'bg-surface-variant text-on-surface-variant',
                ]"
              >
                <p class="whitespace-pre-wrap break-words text-sm">{{ message.content }}</p>
              </div>
            </div>

            <!-- Loading indicator -->
            <div v-if="isLlmLoading" class="flex justify-start">
              <div
                class="max-w-[80%] rounded-lg px-4 py-2 bg-surface-variant text-on-surface-variant"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="animate-spin w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full"
                  ></div>
                  <span class="text-sm">{{ t('exerciseWizards.tragicOptimism.dialogue.thinking') }}</span>
                </div>
              </div>
            </div>

            <!-- Scroll anchor -->
            <div ref="scrollAnchor" />
          </div>

          <!-- Error -->
          <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>

          <!-- Input area -->
          <div v-if="!reachedMaxExchanges" class="flex gap-2 items-end">
            <textarea
              ref="inputRef"
              v-model="userInput"
              :placeholder="t('exerciseWizards.tragicOptimism.dialogue.placeholder')"
              :disabled="isLlmLoading"
              class="neo-input neo-focus flex-1 p-3 resize-none min-h-[44px] max-h-[120px] text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              rows="1"
              @keydown.enter.exact.prevent="handleSend"
            />
            <AppButton
              variant="filled"
              :disabled="!userInput.trim() || isLlmLoading"
              @click="handleSend"
            >
              {{ t('exerciseWizards.tragicOptimism.dialogue.sendButton') }}
            </AppButton>
          </div>

          <!-- Exchange status -->
          <div class="flex items-center justify-between">
            <p v-if="reachedMaxExchanges" class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.tragicOptimism.dialogue.completed') }}
            </p>
            <p v-else class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.tragicOptimism.dialogue.exchangeCount', { count: exchangeCount }) }}
            </p>

            <AppButton variant="tonal" @click="currentStep = 'insights'">
              {{ t('exerciseWizards.tragicOptimism.dialogue.finishButton') }}
            </AppButton>
          </div>
        </AppCard>
      </div>
    </Transition>

    <!-- Step 6: Insights -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'insights'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.tragicOptimism.insights.title') }}</h2>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.tragicOptimism.insights.meaningLabel') }}
            </label>
            <textarea
              v-model="insightMeaning"
              :placeholder="t('exerciseWizards.tragicOptimism.insights.meaningPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.tragicOptimism.insights.carryLabel') }}
            </label>
            <textarea
              v-model="insightCarryForward"
              :placeholder="t('exerciseWizards.tragicOptimism.insights.carryPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>

          <EmotionSelector v-model="emotionIdsAfter" :label="t('exerciseWizards.tragicOptimism.insights.emotionLabel')" />

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.tragicOptimism.insights.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.tragicOptimism.insights.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'dialogue'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">{{ t('common.buttons.save') }}</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  ExclamationTriangleIcon,
  HeartIcon,
  ScaleIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useT } from '@/composables/useT'
import type {
  CreateTragicOptimismPayload,
  SocraticDialogueMessage,
  TragicTriadFocus,
} from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateTragicOptimismPayload]
}>()

const { t, locale } = useT()

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_EXCHANGES = 5

// ─── Step State ────────────────────────────────────────────────────────────
type Step = 'intro' | 'focus' | 'write' | 'guided' | 'dialogue' | 'insights'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.tragicOptimism.steps.intro'),
  t('exerciseWizards.tragicOptimism.steps.focus'),
  t('exerciseWizards.tragicOptimism.steps.write'),
  t('exerciseWizards.tragicOptimism.steps.guided'),
  t('exerciseWizards.tragicOptimism.steps.dialogue'),
  t('exerciseWizards.tragicOptimism.steps.insights'),
])
const stepOrder: Step[] = ['intro', 'focus', 'write', 'guided', 'dialogue', 'insights']

const currentVisualStep = computed(() => stepOrder.indexOf(currentStep.value))

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Focus State ───────────────────────────────────────────────────────────
const focusModes = computed(() => [
  {
    value: 'suffering' as TragicTriadFocus,
    label: t('exerciseWizards.tragicOptimism.focus.modes.suffering.label'),
    description: t('exerciseWizards.tragicOptimism.focus.modes.suffering.description'),
    icon: HeartIcon,
    iconClass: 'text-rose-600',
  },
  {
    value: 'guilt' as TragicTriadFocus,
    label: t('exerciseWizards.tragicOptimism.focus.modes.guilt.label'),
    description: t('exerciseWizards.tragicOptimism.focus.modes.guilt.description'),
    icon: ScaleIcon,
    iconClass: 'text-amber-600',
  },
  {
    value: 'finitude' as TragicTriadFocus,
    label: t('exerciseWizards.tragicOptimism.focus.modes.finitude.label'),
    description: t('exerciseWizards.tragicOptimism.focus.modes.finitude.description'),
    icon: ClockIcon,
    iconClass: 'text-indigo-600',
  },
])

const selectedFocus = ref<TragicTriadFocus>('suffering')

// ─── Write State ───────────────────────────────────────────────────────────
const freeWriting = ref('')

// ─── Guided Questions ──────────────────────────────────────────────────────
const QUESTIONS = computed<Record<TragicTriadFocus, string[]>>(() => ({
  suffering: [
    t('exerciseWizards.tragicOptimism.guided.suffering.q1'),
    t('exerciseWizards.tragicOptimism.guided.suffering.q2'),
    t('exerciseWizards.tragicOptimism.guided.suffering.q3'),
  ],
  guilt: [
    t('exerciseWizards.tragicOptimism.guided.guilt.q1'),
    t('exerciseWizards.tragicOptimism.guided.guilt.q2'),
    t('exerciseWizards.tragicOptimism.guided.guilt.q3'),
  ],
  finitude: [
    t('exerciseWizards.tragicOptimism.guided.finitude.q1'),
    t('exerciseWizards.tragicOptimism.guided.finitude.q2'),
    t('exerciseWizards.tragicOptimism.guided.finitude.q3'),
  ],
}))

const guidedQuestions = computed(() => QUESTIONS.value[selectedFocus.value])
const guidedAnswers = ref(['', '', ''])

// Reset guided answers when focus changes
watch(selectedFocus, () => {
  guidedAnswers.value = ['', '', '']
})

// ─── Dialogue State ────────────────────────────────────────────────────────
const messages = ref<SocraticDialogueMessage[]>([])
const userInput = ref('')
const isLlmLoading = ref(false)
const llmError = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)
const scrollAnchor = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const exchangeCount = computed(() => Math.floor(messages.value.length / 2))
const reachedMaxExchanges = computed(() => exchangeCount.value >= MAX_EXCHANGES)

async function scrollToBottom() {
  await nextTick()
  scrollAnchor.value?.scrollIntoView({ behavior: 'smooth' })
}

async function sendFirstMessage() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { tragicOptimismTurn } = await import('@/services/logotherapyLLMAssists')

    const response = await tragicOptimismTurn({
      focus: selectedFocus.value,
      userMessage: 'I am ready to begin.',
      freeWriting: freeWriting.value.trim() || undefined,
      guidedAnswers: guidedAnswers.value.filter((a) => a.trim()).length > 0
        ? guidedAnswers.value.filter((a) => a.trim())
        : undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.tragicOptimism.errors.startFailed')
  } finally {
    isLlmLoading.value = false
  }
}

async function handleSend() {
  if (!userInput.value.trim() || isLlmLoading.value || reachedMaxExchanges.value) return

  const userMessage = userInput.value.trim()
  userInput.value = ''

  messages.value.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  })

  await scrollToBottom()

  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { tragicOptimismTurn } = await import('@/services/logotherapyLLMAssists')

    const previousMessages = messages.value.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await tragicOptimismTurn({
      focus: selectedFocus.value,
      userMessage,
      previousMessages,
      freeWriting: freeWriting.value.trim() || undefined,
      guidedAnswers: guidedAnswers.value.filter((a) => a.trim()).length > 0
        ? guidedAnswers.value.filter((a) => a.trim())
        : undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.tragicOptimism.errors.responseFailed')
    messages.value.pop()
  } finally {
    isLlmLoading.value = false
  }
}

// Auto-send first LLM message when entering dialogue step
watch(currentStep, async (newStep) => {
  if (newStep === 'dialogue' && messages.value.length === 0) {
    await sendFirstMessage()
  }
})

// ─── Emotions & Insights State ─────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const insightMeaning = ref('')
const insightCarryForward = ref('')
const notes = ref('')

// ─── Save ──────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateTragicOptimismPayload = {
    focus: selectedFocus.value,
    freeWriting: freeWriting.value.trim(),
    guidedAnswers: guidedAnswers.value.map((a) => a.trim()),
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    messages: messages.value.length > 0 ? messages.value.map((m) => ({ ...m })) : undefined,
    insightMeaning: insightMeaning.value.trim() || undefined,
    insightCarryForward: insightCarryForward.value.trim() || undefined,
    llmAssistUsed: messages.value.length > 0 ? true : undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
