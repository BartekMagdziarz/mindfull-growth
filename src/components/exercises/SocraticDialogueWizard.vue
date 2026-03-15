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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.socraticDialogue.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.socraticDialogue.intro.description') }}
          </p>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.socraticDialogue.intro.quote') }}
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>
          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.socraticDialogue.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'focus'">{{ t('common.buttons.start') }}</AppButton>
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.socraticDialogue.focus.title') }}</h2>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="mode in focusModes"
              :key="mode.value"
              type="button"
              class="neo-selector p-4 text-left"
              :class="selectedFocus === mode.value && 'neo-selector--active'"
              @click="selectedFocus = mode.value"
            >
              <AppIcon :name="mode.icon" class="text-2xl text-primary mb-2" />
              <p class="text-sm font-semibold text-on-surface">{{ mode.label }}</p>
              <p class="text-xs text-on-surface-variant">{{ mode.description }}</p>
            </button>
          </div>
          <textarea
            v-if="selectedFocus === 'custom'"
            v-model="customFocusText"
            :placeholder="t('exerciseWizards.socraticDialogue.focus.customPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
            rows="2"
          />
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="selectedFocus === 'custom' && !customFocusText.trim()"
            @click="currentStep = 'context'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Context (Optional) -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'context'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.socraticDialogue.context.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.socraticDialogue.context.description') }}
          </p>

          <!-- Journal entry -->
          <div>
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.socraticDialogue.context.journalLabel') }}</label>
            <select
              v-model="selectedJournalId"
              class="neo-input neo-focus w-full p-2 text-sm mt-1"
            >
              <option value="">{{ t('exerciseWizards.socraticDialogue.context.noneOption') }}</option>
              <option v-for="entry in recentJournals" :key="entry.id" :value="entry.id">
                {{ entry.title || t('exerciseWizards.socraticDialogue.context.untitled') }} — {{ formatDate(entry.createdAt) }}
              </option>
            </select>
          </div>

          <!-- Life Area -->
          <div>
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.socraticDialogue.context.lifeAreaLabel') }}</label>
            <select
              v-model="selectedLifeAreaId"
              class="neo-input neo-focus w-full p-2 text-sm mt-1"
            >
              <option value="">{{ t('exerciseWizards.socraticDialogue.context.noneOption') }}</option>
              <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                {{ area.name }}
              </option>
            </select>
          </div>

          <!-- Additional context -->
          <div>
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.socraticDialogue.context.additionalLabel') }}</label>
            <textarea
              v-model="additionalContext"
              :placeholder="t('exerciseWizards.socraticDialogue.context.additionalPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'focus'">{{ t('common.buttons.back') }}</AppButton>
          <div class="flex gap-2">
            <AppButton variant="text" @click="currentStep = 'dialogue'">{{ t('exerciseWizards.socraticDialogue.context.skipButton') }}</AppButton>
            <AppButton variant="filled" @click="currentStep = 'dialogue'">{{ t('common.buttons.next') }}</AppButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Dialogue -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'dialogue'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.socraticDialogue.dialogue.title') }}</h2>

          <!-- Message area -->
          <div
            ref="messageContainer"
            class="neo-surface rounded-xl p-4 h-96 overflow-y-auto space-y-3"
          >
            <div v-if="messages.length === 0 && !isLlmLoading" class="text-center text-on-surface-variant py-8">
              <p class="text-sm">{{ t('exerciseWizards.socraticDialogue.dialogue.starting') }}</p>
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
              <div class="max-w-[80%] rounded-lg px-4 py-2 bg-surface-variant text-on-surface-variant">
                <div class="flex items-center gap-2">
                  <div class="animate-spin w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full"></div>
                  <span class="text-sm">{{ t('exerciseWizards.socraticDialogue.dialogue.thinking') }}</span>
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
              :placeholder="t('exerciseWizards.socraticDialogue.dialogue.placeholder')"
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
              {{ t('exerciseWizards.socraticDialogue.dialogue.sendButton') }}
            </AppButton>
          </div>

          <!-- Exchange status -->
          <div class="flex items-center justify-between">
            <p v-if="reachedMaxExchanges" class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.socraticDialogue.dialogue.maxReached') }}
            </p>
            <p v-else-if="canFinish" class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.socraticDialogue.dialogue.continueOrFinish') }}
            </p>
            <p v-else class="text-xs text-on-surface-variant">
              {{ t('exerciseWizards.socraticDialogue.dialogue.exchangeProgress', { current: exchangeCount, min: MIN_EXCHANGES }) }}
            </p>

            <AppButton
              v-if="canFinish || reachedMaxExchanges"
              variant="tonal"
              @click="currentStep = 'insights'"
            >
              {{ t('exerciseWizards.socraticDialogue.dialogue.finishButton') }}
            </AppButton>
          </div>
        </AppCard>
      </div>
    </Transition>

    <!-- Step 5: Insights -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'insights'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.socraticDialogue.insights.title') }}</h2>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.socraticDialogue.insights.insightLabel') }}
            </label>
            <textarea
              v-model="insightPrimary"
              :placeholder="t('exerciseWizards.socraticDialogue.insights.insightPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.socraticDialogue.insights.rememberLabel') }}
            </label>
            <textarea
              v-model="insightRemember"
              :placeholder="t('exerciseWizards.socraticDialogue.insights.rememberPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="2"
            />
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="createJournalEntry" class="neo-checkbox" />
            <span class="text-sm text-on-surface">{{ t('exerciseWizards.socraticDialogue.insights.journalCheckbox') }}</span>
          </label>

          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.socraticDialogue.insights.emotionLabel')"
          />

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.socraticDialogue.insights.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.socraticDialogue.insights.notesPlaceholder')"
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'
import type {
  CreateSocraticDialoguePayload,
  SocraticDialogueMessage,
  SocraticFocus,
} from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateSocraticDialoguePayload]
}>()

const { t, locale } = useT()
const journalStore = useJournalStore()
const lifeAreaStore = useLifeAreaStore()

onMounted(() => {
  journalStore.loadEntries()
  lifeAreaStore.loadLifeAreas()
})

const lifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const recentJournals = computed(() => journalStore.sortedEntries.slice(0, 10))

// ─── Constants ─────────────────────────────────────────────────────────────
const MIN_EXCHANGES = 3
const MAX_EXCHANGES = 7

// ─── Step State ────────────────────────────────────────────────────────────
type Step = 'intro' | 'focus' | 'context' | 'dialogue' | 'insights'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.socraticDialogue.steps.intro'),
  t('exerciseWizards.socraticDialogue.steps.focus'),
  t('exerciseWizards.socraticDialogue.steps.context'),
  t('exerciseWizards.socraticDialogue.steps.dialogue'),
  t('exerciseWizards.socraticDialogue.steps.insights'),
])
const stepOrder: Step[] = ['intro', 'focus', 'context', 'dialogue', 'insights']

const currentVisualStep = computed(() => stepOrder.indexOf(currentStep.value))

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Focus State ───────────────────────────────────────────────────────────
const focusModes = computed(() => [
  { value: 'meaning' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.meaning.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.meaning.description'), icon: 'auto_awesome' },
  { value: 'emptiness' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.emptiness.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.emptiness.description'), icon: 'cloud' },
  { value: 'suffering' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.suffering.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.suffering.description'), icon: 'favorite' },
  { value: 'values' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.values.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.values.description'), icon: 'balance' },
  { value: 'decision' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.decision.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.decision.description'), icon: 'compare_arrows' },
  { value: 'custom' as SocraticFocus, label: t('exerciseWizards.socraticDialogue.focus.modes.other.label'), description: t('exerciseWizards.socraticDialogue.focus.modes.other.description'), icon: 'edit_note' },
])

const selectedFocus = ref<SocraticFocus>('meaning')
const customFocusText = ref('')

// ─── Context State ─────────────────────────────────────────────────────────
const selectedJournalId = ref('')
const selectedLifeAreaId = ref('')
const additionalContext = ref('')

// ─── Dialogue State ────────────────────────────────────────────────────────
const messages = ref<SocraticDialogueMessage[]>([])
const userInput = ref('')
const isLlmLoading = ref(false)
const llmError = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)
const scrollAnchor = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const exchangeCount = computed(() => Math.floor(messages.value.length / 2))
const canFinish = computed(() => exchangeCount.value >= MIN_EXCHANGES)
const reachedMaxExchanges = computed(() => exchangeCount.value >= MAX_EXCHANGES)

function buildContextSummary(): string {
  const parts: string[] = []

  if (selectedJournalId.value) {
    const entry = journalStore.sortedEntries.find((e) => e.id === selectedJournalId.value)
    if (entry) {
      parts.push(`Journal entry: "${entry.title || 'Untitled'}" — ${entry.body?.slice(0, 300) ?? ''}`)
    }
  }

  if (selectedLifeAreaId.value) {
    const area = lifeAreas.value.find((a) => a.id === selectedLifeAreaId.value)
    if (area) {
      parts.push(`Life Area: ${area.name}`)
    }
  }

  if (additionalContext.value.trim()) {
    parts.push(`Additional context: ${additionalContext.value.trim()}`)
  }

  return parts.join('\n')
}

async function scrollToBottom() {
  await nextTick()
  scrollAnchor.value?.scrollIntoView({ behavior: 'smooth' })
}

async function sendFirstMessage() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { socraticDialogueTurn } = await import('@/services/logotherapyLLMAssists')
    const contextSummary = buildContextSummary()

    const response = await socraticDialogueTurn({
      focus: selectedFocus.value,
      customFocus: customFocusText.value || undefined,
      userMessage: 'I am ready to begin.',
      contextSummary: contextSummary || undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.socraticDialogue.errors.startFailed')
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
    const { socraticDialogueTurn } = await import('@/services/logotherapyLLMAssists')

    const previousMessages = messages.value.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await socraticDialogueTurn({
      focus: selectedFocus.value,
      customFocus: customFocusText.value || undefined,
      userMessage,
      previousMessages,
      contextSummary: buildContextSummary() || undefined,
      locale: locale.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    })

    await scrollToBottom()
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.socraticDialogue.errors.responseFailed')
    // Remove the user message on error so they can retry
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

// ─── Insights State ────────────────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const insightPrimary = ref('')
const insightRemember = ref('')
const createJournalEntry = ref(false)
const notes = ref('')

// ─── Save ──────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateSocraticDialoguePayload = {
    focus: selectedFocus.value,
    customFocus: selectedFocus.value === 'custom' ? customFocusText.value.trim() : undefined,
    journalEntryId: selectedJournalId.value || undefined,
    lifeAreaId: selectedLifeAreaId.value || undefined,
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    messages: messages.value.map((m) => ({ ...m })),
    insightPrimary: insightPrimary.value.trim() || undefined,
    insightRemember: insightRemember.value.trim() || undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays < 1) return t('exerciseWizards.socraticDialogue.time.today')
  if (diffDays < 7) return t('exerciseWizards.socraticDialogue.time.daysAgo', { count: diffDays })

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
</script>
