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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.legacyLetter.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.legacyLetter.intro.description') }}
          </p>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.legacyLetter.intro.secondaryDescription') }}
          </p>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              "{{ t('exerciseWizards.legacyLetter.intro.quote') }}"
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>
          <EmotionSelector v-model="emotionIdsBefore" :label="t('exerciseWizards.legacyLetter.intro.emotionLabel')" />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'warmup'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Warmup -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'warmup'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.legacyLetter.warmup.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.legacyLetter.warmup.description') }}
          </p>
          <div class="space-y-3">
            <div v-for="prompt in warmUpPromptList" :key="prompt" class="space-y-2">
              <button
                type="button"
                class="neo-selector p-4 w-full text-left"
                :class="selectedPromptKeys.has(prompt) && 'neo-selector--active'"
                @click="togglePrompt(prompt)"
              >
                <p class="text-sm text-on-surface">{{ prompt }}</p>
              </button>
              <Transition
                enter-active-class="transition-all duration-200"
                leave-active-class="transition-all duration-150"
                enter-from-class="opacity-0 max-h-0"
                leave-to-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-40"
                leave-from-class="opacity-100 max-h-40"
              >
                <div v-if="selectedPromptKeys.has(prompt)" class="pl-2">
                  <textarea
                    v-model="warmUpResponses[prompt]"
                    :placeholder="t('exerciseWizards.legacyLetter.warmup.responsePlaceholder')"
                    class="neo-input neo-focus w-full p-3 text-sm resize-none"
                    rows="3"
                  />
                </div>
              </Transition>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledPromptCount < 2"
            @click="currentStep = 'write'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.legacyLetter.write.title') }}</h2>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.legacyLetter.write.hint') }}
            </p>
          </div>
          <textarea
            v-model="letterText"
            :placeholder="t('exerciseWizards.legacyLetter.write.placeholder')"
            class="neo-input neo-focus w-full p-4 text-sm resize-none"
            rows="16"
          />

          <!-- Cross-references -->
          <div v-if="coreValues.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.legacyLetter.write.valuesTitle') }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="value in coreValues"
                :key="value"
                class="neo-pill text-xs px-2.5 py-0.5"
              >
                {{ value }}
              </span>
            </div>
          </div>

          <div v-if="purposeStatement" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.legacyLetter.write.purposeTitle') }}
            </p>
            <div class="neo-embedded p-3">
              <p class="text-sm text-on-surface-variant italic">{{ purposeStatement }}</p>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'warmup'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="letterText.trim().length < 100"
            @click="currentStep = 'reflect'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Reflect -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'reflect'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.legacyLetter.reflect.title') }}</h2>

          <!-- Path choice (only show if no chat started yet) -->
          <div v-if="!showChat && messages.length === 0" class="space-y-3">
            <p class="text-sm text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.legacyLetter.reflect.description') }}
            </p>
            <div class="flex gap-3">
              <AppButton variant="tonal" class="flex-1" @click="skipChat">
                {{ t('exerciseWizards.legacyLetter.reflect.doneButton') }}
              </AppButton>
              <AppButton variant="tonal" class="flex-1" @click="startChat">
                <AppIcon name="auto_awesome" class="text-base mr-1.5" />
                {{ t('exerciseWizards.legacyLetter.reflect.discussButton') }}
              </AppButton>
            </div>
          </div>

          <!-- Chat interface -->
          <template v-if="showChat">
            <div
              ref="messageContainer"
              class="neo-surface rounded-xl p-4 h-96 overflow-y-auto space-y-3"
            >
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
                    <span class="text-sm">{{ t('exerciseWizards.legacyLetter.reflect.thinking') }}</span>
                  </div>
                </div>
              </div>

              <div ref="scrollAnchor" />
            </div>

            <!-- Error -->
            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>

            <!-- Input area -->
            <div v-if="!reachedMaxExchanges" class="flex gap-2 items-end">
              <textarea
                ref="inputRef"
                v-model="userInput"
                :placeholder="t('exerciseWizards.legacyLetter.reflect.placeholder')"
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
                {{ t('exerciseWizards.legacyLetter.reflect.sendButton') }}
              </AppButton>
            </div>

            <!-- Exchange status -->
            <div class="flex items-center justify-between">
              <p class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.legacyLetter.reflect.exchangeCount', { count: exchangeCount }) }}
              </p>
              <AppButton variant="tonal" @click="finishChat">
                {{ t('exerciseWizards.legacyLetter.reflect.finishButton') }}
              </AppButton>
            </div>
          </template>

          <!-- "What felt most true" (shown after finishing chat or choosing "I'm done") -->
          <template v-if="showReflectionInput">
            <div>
              <label class="text-sm font-medium text-on-surface">
                {{ t('exerciseWizards.legacyLetter.reflect.truthLabel') }}
              </label>
              <textarea
                v-model="reflectionInsight"
                :placeholder="t('exerciseWizards.legacyLetter.reflect.truthPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="4"
              />
            </div>
          </template>
        </AppCard>

        <div v-if="showReflectionInput" class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'write'">{{ t('common.buttons.back') }}</AppButton>
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
        <AppCard variant="raised" padding="lg" class="space-y-6">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.legacyLetter.summary.title') }}</h2>

          <!-- Letter text -->
          <div class="neo-embedded p-4">
            <p class="text-sm text-on-surface whitespace-pre-line leading-relaxed">
              {{ letterText }}
            </p>
          </div>

          <!-- Warm-up reflections -->
          <div v-if="filledPromptCount > 0">
            <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('exerciseWizards.legacyLetter.summary.warmupHeader') }}</h3>
            <div class="space-y-2">
              <div
                v-for="prompt in warmUpPromptList.filter(
                  (p) => selectedPromptKeys.has(p) && warmUpResponses[p]?.trim(),
                )"
                :key="prompt"
                class="neo-surface rounded-xl p-3"
              >
                <p class="text-xs font-medium text-on-surface-variant mb-1">{{ prompt }}</p>
                <p class="text-sm text-on-surface">{{ warmUpResponses[prompt] }}</p>
              </div>
            </div>
          </div>

          <!-- Reflection -->
          <div v-if="reflectionInsight.trim()">
            <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('exerciseWizards.legacyLetter.summary.reflectionHeader') }}</h3>
            <p class="text-sm text-on-surface-variant">{{ reflectionInsight }}</p>
          </div>

          <EmotionSelector v-model="emotionIdsAfter" :label="t('exerciseWizards.legacyLetter.summary.emotionLabel')" />

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.legacyLetter.summary.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.legacyLetter.summary.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'reflect'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">{{ t('common.buttons.save') }}</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useT } from '@/composables/useT'
import type { CreateLegacyLetterPayload, SocraticDialogueMessage } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateLegacyLetterPayload]
}>()

const { t, locale } = useT()
const valuesStore = useValuesDiscoveryStore()
const purposeStore = useTransformativePurposeStore()

onMounted(() => {
  valuesStore.loadDiscoveries()
  purposeStore.loadPurposes()
})

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_EXCHANGES = 3

// ─── Step State ────────────────────────────────────────────────────────────
type Step = 'intro' | 'warmup' | 'write' | 'reflect' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.legacyLetter.steps.intro'),
  t('exerciseWizards.legacyLetter.steps.warmup'),
  t('exerciseWizards.legacyLetter.steps.write'),
  t('exerciseWizards.legacyLetter.steps.reflect'),
  t('exerciseWizards.legacyLetter.steps.summary'),
])
const stepOrder: Step[] = ['intro', 'warmup', 'write', 'reflect', 'summary']

const currentVisualStep = computed(() => stepOrder.indexOf(currentStep.value))

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Warmup State ──────────────────────────────────────────────────────────
const warmUpPromptList = computed(() => [
  t('exerciseWizards.legacyLetter.warmup.prompts.p1'),
  t('exerciseWizards.legacyLetter.warmup.prompts.p2'),
  t('exerciseWizards.legacyLetter.warmup.prompts.p3'),
  t('exerciseWizards.legacyLetter.warmup.prompts.p4'),
  t('exerciseWizards.legacyLetter.warmup.prompts.p5'),
])

const selectedPromptKeys = ref<Set<string>>(new Set())
const warmUpResponses = reactive<Record<string, string>>({})

function togglePrompt(prompt: string) {
  if (selectedPromptKeys.value.has(prompt)) {
    const next = new Set(selectedPromptKeys.value)
    next.delete(prompt)
    selectedPromptKeys.value = next
  } else {
    const next = new Set(selectedPromptKeys.value)
    next.add(prompt)
    selectedPromptKeys.value = next
  }
}

const filledPromptCount = computed(() => {
  return warmUpPromptList.value.filter(
    (p) => selectedPromptKeys.value.has(p) && warmUpResponses[p]?.trim(),
  ).length
})

// ─── Write State ───────────────────────────────────────────────────────────
const letterText = ref('')

const coreValues = computed(() => {
  return valuesStore.latestDiscovery?.coreValues ?? []
})

const purposeStatement = computed(() => {
  return purposeStore.latestPurpose?.purposeStatement ?? ''
})

// ─── Reflect State ─────────────────────────────────────────────────────────
const showChat = ref(false)
const showReflectionInput = ref(false)
const reflectionInsight = ref('')
const llmAssistUsed = ref(false)

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

function skipChat() {
  showReflectionInput.value = true
}

async function startChat() {
  showChat.value = true
  llmAssistUsed.value = true
  await sendFirstMessage()
}

function finishChat() {
  showChat.value = false
  showReflectionInput.value = true
}

async function sendFirstMessage() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { legacyLetterDiscuss } = await import('@/services/logotherapyLLMAssists')

    const response = await legacyLetterDiscuss({
      userMessage: 'I have written my legacy letter and would like to reflect on it.',
      letterText: letterText.value.trim(),
      coreValues: coreValues.value.length > 0 ? coreValues.value : undefined,
      purposeStatement: purposeStatement.value || undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.legacyLetter.errors.startFailed')
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
    const { legacyLetterDiscuss } = await import('@/services/logotherapyLLMAssists')

    const previousMessages = messages.value.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await legacyLetterDiscuss({
      userMessage,
      previousMessages,
      letterText: letterText.value.trim(),
      coreValues: coreValues.value.length > 0 ? coreValues.value : undefined,
      purposeStatement: purposeStatement.value || undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.legacyLetter.errors.responseFailed')
    messages.value.pop()
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Emotions & Notes State ────────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const notes = ref('')

// ─── Save ──────────────────────────────────────────────────────────────────
function handleSave() {
  // Build warmUpPrompts as Record<string, string>
  const warmUpPrompts: Record<string, string> = {}
  for (const prompt of warmUpPromptList.value) {
    if (selectedPromptKeys.value.has(prompt) && warmUpResponses[prompt]?.trim()) {
      warmUpPrompts[prompt] = warmUpResponses[prompt].trim()
    }
  }

  const payload: CreateLegacyLetterPayload = {
    warmUpPrompts,
    letterText: letterText.value.trim(),
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    messages: messages.value.length > 0 ? messages.value.map((m) => ({ ...m })) : undefined,
    reflectionInsight: reflectionInsight.value.trim() || undefined,
    llmAssistUsed: llmAssistUsed.value || undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
