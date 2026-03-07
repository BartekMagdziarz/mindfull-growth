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
      <!-- Step 1: Part Selection -->
      <template v-if="currentStep === 'part-select'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-bold text-on-surface">Parts Dialogue Journal</h2>
            <p class="text-sm text-on-surface-variant">
              Write a dialogue between your Self and a part. You write both sides of the conversation,
              practicing your own internal listening.
            </p>

            <PartSelector
              v-model="partId"
              :parts="partStore.sortedParts"
              label="Which part would you like to dialogue with?"
              :allow-create="false"
            />
          </AppCard>

          <div class="flex justify-end">
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Next
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 2: Set Intention -->
      <template v-else-if="currentStep === 'intention'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Set Your Intention</h2>
            <p class="text-sm text-on-surface-variant">
              What do you hope to explore in this dialogue with {{ selectedPartName }}?
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in intentionChips"
                :key="chip"
                class="neo-pill text-xs px-3 py-1.5 neo-focus transition-all"
                :class="intention === chip ? 'bg-primary/20 text-primary shadow-neu-pressed' : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                @click="intention = chip"
              >
                {{ chip }}
              </button>
            </div>

            <textarea
              v-model="intention"
              rows="3"
              placeholder="What do you want to explore?"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Begin Dialogue
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Dialogue Editor -->
      <template v-else-if="currentStep === 'dialogue'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              Dialogue with {{ selectedPartName }}
            </h2>

            <!-- Speaker toggle -->
            <div class="flex gap-2">
              <button
                class="flex-1 neo-focus rounded-xl py-2 text-sm font-medium transition-all"
                :class="currentSpeaker === 'self'
                  ? 'neo-surface shadow-neu-pressed bg-primary/10 text-primary'
                  : 'neo-surface shadow-neu-raised-sm text-on-surface-variant hover:-translate-y-px'"
                @click="currentSpeaker = 'self'"
              >
                Self
              </button>
              <button
                class="flex-1 neo-focus rounded-xl py-2 text-sm font-medium transition-all"
                :class="currentSpeaker === 'part'
                  ? 'neo-surface shadow-neu-pressed text-on-surface' + (selectedPartRole === 'manager' ? ' bg-blue-100' : selectedPartRole === 'firefighter' ? ' bg-orange-100' : selectedPartRole === 'exile' ? ' bg-purple-100' : ' bg-neu-base')
                  : 'neo-surface shadow-neu-raised-sm text-on-surface-variant hover:-translate-y-px'"
                @click="currentSpeaker = 'part'"
              >
                {{ selectedPartName }}
              </button>
            </div>

            <!-- Suggested questions -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="q in suggestedQuestions"
                :key="q"
                class="neo-pill text-xs px-3 py-1.5 bg-primary/10 text-primary neo-focus hover:bg-primary/20 transition-colors"
                @click="messageInput = q"
              >
                {{ q }}
              </button>
            </div>

            <!-- Message history -->
            <div ref="chatContainer" class="space-y-3 max-h-96 overflow-y-auto p-2">
              <div v-if="!messages.length" class="text-center py-8">
                <p class="text-sm text-on-surface-variant">
                  Write as Self first, then switch to {{ selectedPartName }}'s voice.
                </p>
              </div>

              <PartDialogueBubble
                v-for="(msg, idx) in messages"
                :key="idx"
                :message="msg"
                :speaker="msg.role === 'user' ? 'self' : 'part'"
                :part-name="selectedPartName"
                :part-color="selectedPartColor"
              />
            </div>

            <!-- Input -->
            <div class="flex gap-2">
              <textarea
                v-model="messageInput"
                rows="2"
                :placeholder="currentSpeaker === 'self' ? 'Write as Self...' : `Write as ${selectedPartName}...`"
                class="neo-input w-full p-3 text-sm resize-none"
                @keydown.enter.exact.prevent="handleAddMessage"
              />
              <AppButton
                variant="filled"
                :disabled="!messageInput.trim()"
                class="shrink-0 self-end"
                @click="handleAddMessage"
              >
                Add
              </AppButton>
            </div>

            <!-- LLM assist -->
            <div class="flex items-center gap-2">
              <AppButton
                variant="tonal"
                :disabled="isLoadingAssist || messages.length === 0"
                @click="handleRequestAssist"
              >
                {{ isLoadingAssist ? 'Thinking...' : 'Help me hear this part' }}
              </AppButton>
            </div>

            <!-- LLM suggestion -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              leave-active-class="transition-all duration-150"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="llmSuggestion" class="neo-surface shadow-neu-raised-sm rounded-xl p-4 space-y-3">
                <p class="text-xs font-medium text-on-surface-variant">
                  {{ selectedPartName }} might say:
                </p>
                <textarea
                  v-model="editableSuggestion"
                  rows="3"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
                <div class="flex gap-2 justify-end">
                  <AppButton variant="text" @click="discardSuggestion()">Discard</AppButton>
                  <AppButton variant="filled" @click="handleAcceptSuggestion">Accept</AppButton>
                </div>
              </div>
            </Transition>

            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              Review Insights
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Insights Review -->
      <template v-else-if="currentStep === 'insights'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Capture Insights</h2>
            <p class="text-sm text-on-surface-variant">
              Review your dialogue and tag any important moments.
            </p>

            <!-- Dialogue review -->
            <div class="space-y-2 max-h-64 overflow-y-auto p-2">
              <PartDialogueBubble
                v-for="(msg, idx) in messages"
                :key="idx"
                :message="msg"
                :speaker="msg.role === 'user' ? 'self' : 'part'"
                :part-name="selectedPartName"
                :part-color="selectedPartColor"
                :is-bookmarked="bookmarkedIndices.has(idx)"
                @bookmark="openInsightForm(idx)"
              />
            </div>

            <!-- Insight form -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              leave-active-class="transition-all duration-150"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="showInsightForm" class="neo-surface shadow-neu-raised-sm rounded-xl p-4 space-y-3">
                <h3 class="text-sm font-semibold text-on-surface">Tag this moment</h3>
                <textarea
                  v-model="insightContent"
                  rows="2"
                  placeholder="What did you notice?"
                  class="neo-input w-full p-3 text-sm resize-none"
                />
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="tag in insightTags"
                    :key="tag.value"
                    class="neo-pill text-xs px-2 py-1 neo-focus transition-all"
                    :class="insightTag === tag.value ? `${tag.activeClass} shadow-neu-pressed` : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
                    @click="insightTag = tag.value"
                  >
                    {{ tag.label }}
                  </button>
                </div>
                <div class="flex gap-2 justify-end">
                  <AppButton variant="text" @click="closeInsightForm()">Cancel</AppButton>
                  <AppButton
                    variant="filled"
                    :disabled="!insightContent.trim() || !insightTag"
                    @click="handleAddInsight"
                  >
                    Save Insight
                  </AppButton>
                </div>
              </div>
            </Transition>

            <!-- Saved insights -->
            <div v-if="insights.length" class="space-y-2">
              <h3 class="text-sm font-semibold text-on-surface">Saved Insights</h3>
              <IFSInsightCard
                v-for="insight in insights"
                :key="insight.id"
                :insight="insight"
                :part-name="selectedPartName"
                @delete="removeInsight(insight.id)"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              Summary & Save
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Summary & Save -->
      <template v-else-if="currentStep === 'summary'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">Save Dialogue</h2>

            <!-- Review -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm text-on-surface-variant">Part:</span>
                <span class="text-sm font-medium text-on-surface">{{ selectedPartName }}</span>
                <PartRoleBadge v-if="selectedPartRole" :role="selectedPartRole" />
              </div>

              <div class="neo-surface p-3 rounded-lg grid grid-cols-3 gap-3">
                <div>
                  <p class="text-xs text-on-surface-variant">Messages</p>
                  <p class="text-lg font-bold text-primary">{{ messages.length }}</p>
                </div>
                <div>
                  <p class="text-xs text-on-surface-variant">Insights</p>
                  <p class="text-lg font-bold text-primary">{{ insights.length }}</p>
                </div>
                <div>
                  <p class="text-xs text-on-surface-variant">AI Assist</p>
                  <p class="text-lg font-bold" :class="llmAssistUsed ? 'text-amber-500' : 'text-on-surface-variant'">
                    {{ llmAssistUsed ? 'Yes' : 'No' }}
                  </p>
                </div>
              </div>

              <div>
                <p class="text-xs text-on-surface-variant">Intention</p>
                <p class="text-sm text-on-surface">{{ intention }}</p>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">Summary (optional)</label>
              <textarea
                v-model="summary"
                rows="3"
                placeholder="What was the main takeaway?"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">Notes (optional)</label>
              <textarea
                v-model="notes"
                rows="2"
                placeholder="Any additional notes..."
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">Back</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'Saving...' : 'Save Dialogue' }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import PartDialogueBubble from '@/components/exercises/ifs/PartDialogueBubble.vue'
import IFSInsightCard from '@/components/exercises/ifs/IFSInsightCard.vue'
import { usePartsDialogueWizard, type PartsDialogueStep } from '@/composables/usePartsDialogueWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'
import type { IFSInsight } from '@/domain/exercises'

const { t } = useT()

const emit = defineEmits<{
  saved: []
}>()

const partStore = useIFSPartStore()

const STEPS: PartsDialogueStep[] = [
  'part-select', 'intention', 'dialogue', 'insights', 'summary',
]

const stepLabels = computed(() => [
  t('exerciseWizards.partsDialogue.steps.partSelect'),
  t('exerciseWizards.partsDialogue.steps.intention'),
  t('exerciseWizards.partsDialogue.steps.dialogue'),
  t('exerciseWizards.partsDialogue.steps.insights'),
  t('exerciseWizards.partsDialogue.steps.summary'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  partId,
  intention,
  messages,
  currentSpeaker,
  addMessage,
  llmAssistUsed,
  isLoadingAssist,
  llmSuggestion,
  llmError,
  requestAssist,
  acceptSuggestion,
  discardSuggestion,
  insights,
  addInsight,
  removeInsight,
  summary,
  notes,
  isSaving,
  save,
} = usePartsDialogueWizard()

// Part helpers
const selectedPart = computed(() => partId.value ? partStore.getPartById(partId.value) : null)
const selectedPartName = computed(() => selectedPart.value?.name ?? t('exerciseWizards.partsDialogue.partSelect.defaultName'))
const selectedPartRole = computed(() => selectedPart.value?.role ?? null)
const selectedPartColor = computed(() => {
  switch (selectedPart.value?.role) {
    case 'manager': return '#60a5fa'
    case 'firefighter': return '#fb923c'
    case 'exile': return '#c084fc'
    default: return undefined
  }
})

// Intention chips
const intentionChips = computed(() => t('exerciseWizards.partsDialogue.intention.chips') as unknown as string[])

// Suggested questions
const suggestedQuestions = computed(() => t('exerciseWizards.partsDialogue.dialogue.suggestedQuestions') as unknown as string[])

// Message input
const messageInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

function handleAddMessage() {
  if (!messageInput.value.trim()) return
  addMessage(messageInput.value.trim())
  messageInput.value = ''
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// LLM assist
const editableSuggestion = ref('')

watch(llmSuggestion, (val) => {
  editableSuggestion.value = val
})

function handleRequestAssist() {
  if (!selectedPart.value) return
  requestAssist(selectedPart.value)
}

function handleAcceptSuggestion() {
  // Use the potentially edited suggestion
  if (editableSuggestion.value.trim()) {
    llmSuggestion.value = editableSuggestion.value.trim()
  }
  acceptSuggestion()
  nextTick(() => scrollToBottom())
}

// Insight form
const showInsightForm = ref(false)
const insightContent = ref('')
const insightTag = ref<IFSInsight['tag'] | null>(null)
const bookmarkedIndices = ref(new Set<number>())

const insightTags = computed((): { value: IFSInsight['tag']; label: string; activeClass: string }[] => [
  { value: 'core-fear', label: t('exerciseWizards.partsDialogue.insights.insightTags.coreFear'), activeClass: 'bg-red-100 text-red-700' },
  { value: 'need', label: t('exerciseWizards.partsDialogue.insights.insightTags.need'), activeClass: 'bg-green-100 text-green-700' },
  { value: 'positive-intention', label: t('exerciseWizards.partsDialogue.insights.insightTags.positiveIntention'), activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'memory', label: t('exerciseWizards.partsDialogue.insights.insightTags.memory'), activeClass: 'bg-amber-100 text-amber-700' },
  { value: 'belief', label: t('exerciseWizards.partsDialogue.insights.insightTags.belief'), activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'other', label: t('exerciseWizards.partsDialogue.insights.insightTags.other'), activeClass: 'bg-neu-base text-on-surface' },
])

function openInsightForm(messageIdx: number) {
  if (bookmarkedIndices.value.has(messageIdx)) {
    bookmarkedIndices.value.delete(messageIdx)
    return
  }
  bookmarkedIndices.value.add(messageIdx)
  showInsightForm.value = true
  insightContent.value = ''
  insightTag.value = null
}

function closeInsightForm() {
  showInsightForm.value = false
  insightContent.value = ''
  insightTag.value = null
}

function handleAddInsight() {
  if (!insightContent.value.trim() || !insightTag.value) return
  addInsight(insightContent.value.trim(), insightTag.value)
  closeInsightForm()
}

// Save
async function handleSave() {
  await save()
  emit('saved')
}
</script>
