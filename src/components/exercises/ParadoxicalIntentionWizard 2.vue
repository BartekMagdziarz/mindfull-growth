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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.paradoxicalIntention.intro.description') }}
          </p>

          <!-- Classic examples -->
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.paradoxicalIntention.intro.examplesTitle') }}
            </p>
            <div class="space-y-2 text-sm text-on-surface">
              <p>
                {{ t('exerciseWizards.paradoxicalIntention.intro.example1') }}
              </p>
              <p>
                {{ t('exerciseWizards.paradoxicalIntention.intro.example2') }}
              </p>
            </div>
          </div>

          <p class="text-sm text-on-surface-variant italic">
            {{ t('exerciseWizards.paradoxicalIntention.intro.keyInsight') }}
          </p>

          <!-- Boundary notice (permanent, not dismissible) -->
          <div class="neo-warning p-4 rounded-xl">
            <div class="flex items-start gap-3">
              <ExclamationTriangleIcon class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div class="text-sm text-on-surface">
                <p class="font-semibold mb-1">{{ t('exerciseWizards.paradoxicalIntention.intro.boundaryTitle') }}</p>
                <p>
                  {{ t('exerciseWizards.paradoxicalIntention.intro.boundaryText') }}
                </p>
              </div>
            </div>
          </div>

          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.paradoxicalIntention.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'fears'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Fears -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'fears'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.fears.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.paradoxicalIntention.fears.description') }}
          </p>

          <div v-for="(fear, index) in fears" :key="fear.id" class="neo-surface p-4 space-y-3 rounded-xl">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.fears.fearLabel', { n: index + 1 }) }}</span>
              <button
                v-if="fears.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="fears.splice(index, 1)"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>

            <div>
              <label class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.paradoxicalIntention.fears.whatLabel') }}
              </label>
              <textarea
                v-model="fear.description"
                :placeholder="t('exerciseWizards.paradoxicalIntention.fears.whatPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="2"
              />
            </div>

            <div>
              <label class="text-xs font-medium text-on-surface-variant">
                {{ t('exerciseWizards.paradoxicalIntention.fears.whatHappensLabel') }}
              </label>
              <textarea
                v-model="fear.anticipatedCatastrophe"
                :placeholder="t('exerciseWizards.paradoxicalIntention.fears.whatHappensPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="2"
              />
            </div>
          </div>

          <AppButton
            v-if="fears.length < 3"
            variant="text"
            @click="addFear"
          >
            <PlusIcon class="w-4 h-4 mr-1" />
            {{ t('exerciseWizards.paradoxicalIntention.fears.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="validFears.length === 0"
            @click="currentStep = 'craft'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Craft (carousel) -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'craft'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.craft.title') }}</h2>
            <span class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.paradoxicalIntention.craft.counter', { current: currentFearIndex + 1, total: validFears.length }) }}
            </span>
          </div>

          <!-- Current fear display -->
          <div class="neo-embedded p-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.paradoxicalIntention.craft.fearHeader') }}</p>
            <p class="text-sm text-on-surface">{{ currentFear.description }}</p>
            <p class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.paradoxicalIntention.craft.youFear', { fear: currentFear.anticipatedCatastrophe }) }}
            </p>
          </div>

          <!-- Instructions -->
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.paradoxicalIntention.craft.description') }}
          </p>

          <!-- Paradoxical intention input -->
          <textarea
            v-model="paradoxicalIntentions[currentFear.id]"
            :placeholder="t('exerciseWizards.paradoxicalIntention.craft.placeholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
            rows="3"
          />

          <!-- LLM Assist -->
          <AppButton
            variant="tonal"
            :disabled="isLlmLoading"
            @click="handleMakeFunnier"
          >
            <SparklesIcon class="w-4 h-4 mr-1" />
            {{ isLlmLoading ? t('exerciseWizards.paradoxicalIntention.craft.thinking') : t('exerciseWizards.paradoxicalIntention.craft.funnier') }}
          </AppButton>

          <div v-if="llmSuggestions[currentFear.id]" class="neo-panel p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
              {{ t('exerciseWizards.paradoxicalIntention.craft.suggestionHeader') }}
            </p>
            <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmSuggestions[currentFear.id] }}</p>
          </div>

          <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>

          <!-- Carousel navigation -->
          <div v-if="validFears.length > 1" class="flex justify-between items-center pt-4 border-t border-neu-border/20">
            <AppButton variant="text" :disabled="currentFearIndex === 0" @click="currentFearIndex--">
              {{ t('exerciseWizards.paradoxicalIntention.craft.previousFear') }}
            </AppButton>
            <AppButton variant="text" :disabled="currentFearIndex === validFears.length - 1" @click="currentFearIndex++">
              {{ t('exerciseWizards.paradoxicalIntention.craft.nextFear') }}
            </AppButton>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'fears'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!allFearsHaveIntention"
            @click="currentStep = 'practice'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Practice -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'practice'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.practice.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.paradoxicalIntention.practice.description') }}
          </p>

          <div v-for="fear in validFears" :key="fear.id" class="neo-surface p-4 space-y-3 rounded-xl">
            <div class="neo-embedded p-3">
              <p class="text-sm font-medium text-on-surface">{{ fear.description }}</p>
              <p class="text-xs text-primary italic mt-1">
                "{{ paradoxicalIntentions[fear.id] }}"
              </p>
            </div>

            <div>
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.paradoxicalIntention.practice.scriptLabel') }}</label>
              <textarea
                v-model="practiceScripts[fear.id]"
                :placeholder="t('exerciseWizards.paradoxicalIntention.practice.scriptPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="2"
              />
            </div>
          </div>

          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.paradoxicalIntention.practice.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'craft'">{{ t('common.buttons.back') }}</AppButton>
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.paradoxicalIntention.summary.title') }}</h2>

          <div v-for="fear in validFears" :key="fear.id" class="space-y-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.paradoxicalIntention.summary.fearHeader') }}</p>
              <p class="text-sm text-on-surface">{{ fear.description }}</p>
              <p class="text-xs text-on-surface-variant italic">{{ fear.anticipatedCatastrophe }}</p>
            </div>
            <div v-if="paradoxicalIntentions[fear.id]">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.paradoxicalIntention.summary.intentionHeader') }}</p>
              <p class="text-sm text-primary font-medium">{{ paradoxicalIntentions[fear.id] }}</p>
            </div>
            <div v-if="practiceScripts[fear.id]">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.paradoxicalIntention.summary.scriptHeader') }}</p>
              <p class="text-sm text-on-surface">{{ practiceScripts[fear.id] }}</p>
            </div>
            <hr v-if="validFears.indexOf(fear) < validFears.length - 1" class="border-neu-border/20" />
          </div>

          <!-- Notes -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.paradoxicalIntention.summary.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.paradoxicalIntention.summary.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'practice'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">{{ t('common.buttons.save') }}</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import { useT } from '@/composables/useT'
import type { CreateParadoxicalIntentionPayload } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateParadoxicalIntentionPayload]
}>()

const { t, locale } = useT()

// ─── Step State ────────────────────────────────────────────────────────────
type Step = 'intro' | 'fears' | 'craft' | 'practice' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.paradoxicalIntention.steps.intro'),
  t('exerciseWizards.paradoxicalIntention.steps.fears'),
  t('exerciseWizards.paradoxicalIntention.steps.craft'),
  t('exerciseWizards.paradoxicalIntention.steps.practice'),
  t('exerciseWizards.paradoxicalIntention.steps.summary'),
])
const stepOrder: Step[] = ['intro', 'fears', 'craft', 'practice', 'summary']

const currentVisualStep = computed(() => stepOrder.indexOf(currentStep.value))

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Fears State ───────────────────────────────────────────────────────────
interface FearDraft {
  id: string
  description: string
  anticipatedCatastrophe: string
}

const fears = reactive<FearDraft[]>([
  { id: crypto.randomUUID(), description: '', anticipatedCatastrophe: '' },
])

function addFear() {
  if (fears.length < 3) {
    fears.push({ id: crypto.randomUUID(), description: '', anticipatedCatastrophe: '' })
  }
}

const validFears = computed(() =>
  fears.filter((f) => f.description.trim() && f.anticipatedCatastrophe.trim()),
)

// ─── Craft State ───────────────────────────────────────────────────────────
const currentFearIndex = ref(0)
const paradoxicalIntentions = reactive<Record<string, string>>({})
const practiceScripts = reactive<Record<string, string>>({})
const llmSuggestions = reactive<Record<string, string>>({})
const isLlmLoading = ref(false)
const llmError = ref('')
const llmAssistUsed = ref(false)

const currentFear = computed(() => validFears.value[currentFearIndex.value])

const allFearsHaveIntention = computed(() =>
  validFears.value.every((f) => paradoxicalIntentions[f.id]?.trim()),
)

async function handleMakeFunnier() {
  const fear = currentFear.value
  if (!fear) return

  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { craftParadoxicalIntention } = await import('@/services/logotherapyLLMAssists')

    const response = await craftParadoxicalIntention({
      fear: fear.description,
      anticipatedCatastrophe: fear.anticipatedCatastrophe,
      userAttempt: paradoxicalIntentions[fear.id] || undefined,
      locale: locale.value,
    })

    llmSuggestions[fear.id] = response
    llmAssistUsed.value = true
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.paradoxicalIntention.errors.suggestionFailed')
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Form State ────────────────────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const notes = ref('')

// ─── Save ──────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateParadoxicalIntentionPayload = {
    fears: validFears.value.map((f) => ({
      id: f.id,
      description: f.description.trim(),
      anticipatedCatastrophe: f.anticipatedCatastrophe.trim(),
      paradoxicalIntention: paradoxicalIntentions[f.id]?.trim() || undefined,
      practiceScript: practiceScripts[f.id]?.trim() || undefined,
    })),
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    llmAssistUsed: llmAssistUsed.value || undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
