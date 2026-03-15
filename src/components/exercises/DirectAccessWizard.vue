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
            <h2 class="text-lg font-bold text-on-surface">{{ t('exerciseWizards.directAccess.partSelect.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.directAccess.partSelect.description') }}
            </p>

            <div v-if="!partStore.sortedParts.length" class="neo-surface p-4 rounded-xl">
              <p class="text-sm text-on-surface-variant" v-html="t('exerciseWizards.directAccess.partSelect.emptyState')" />
            </div>

            <PartSelector
              v-else
              v-model="partId"
              :parts="partStore.sortedParts"
              :label="t('exerciseWizards.directAccess.partSelect.label')"
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

      <!-- Step 2: Self Check -->
      <template v-else-if="currentStep === 'self-check'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.directAccess.selfCheck.title') }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.directAccess.selfCheck.description') }}
            </p>

            <div class="neo-surface p-6 rounded-xl text-center">
              <p class="text-lg font-semibold text-on-surface">
                {{ t('exerciseWizards.directAccess.selfCheck.question', { partName: selectedPartName }) }}
              </p>
            </div>

            <div class="space-y-3">
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="selfCheckPassed ? 'shadow-neu-pressed ring-2 ring-primary' : ''"
                @click="handleSelfCheck(true)"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="wb_sunny" class="text-xl text-yellow-500 shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.directAccess.selfCheck.options.selfEnergy') }}</span>
                </div>
              </button>
              <button
                class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                :class="showBreathing ? 'shadow-neu-pressed ring-2 ring-orange-400' : ''"
                @click="handleSelfCheck(false)"
              >
                <div class="flex items-center gap-3">
                  <AppIcon name="error" class="text-xl text-orange-500 shrink-0" />
                  <span class="text-sm text-on-surface">{{ t('exerciseWizards.directAccess.selfCheck.options.notQuite') }}</span>
                </div>
              </button>
            </div>

            <!-- Breathing pause -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
            >
              <div v-if="showBreathing" class="neo-surface p-6 rounded-2xl flex flex-col items-center gap-4">
                <div
                  class="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
                  :class="breathingActive ? 'breathing-circle' : ''"
                >
                  <span class="text-xs text-primary font-medium">{{ breathingLabel }}</span>
                </div>
                <p class="text-sm text-on-surface-variant">
                  {{ breathingActive ? t('exerciseWizards.directAccess.selfCheck.breathingInstructions') : (breathingDone ? t('exerciseWizards.directAccess.selfCheck.breathingDone') : t('exerciseWizards.directAccess.selfCheck.breathingPrompt')) }}
                </p>
                <AppButton
                  v-if="!breathingActive && !breathingDone"
                  variant="tonal"
                  @click="startBreathing()"
                >
                  {{ t('exerciseWizards.directAccess.selfCheck.breathingButton') }}
                </AppButton>

                <Transition
                  enter-active-class="transition-all duration-200"
                  enter-from-class="opacity-0"
                >
                  <button
                    v-if="breathingDone"
                    class="w-full neo-surface shadow-neu-raised-sm rounded-xl p-4 text-left transition-all hover:-translate-y-px neo-focus"
                    @click="selfCheckPassed = true; nextStep()"
                  >
                    <div class="flex items-center gap-3">
                      <AppIcon name="wb_sunny" class="text-xl text-yellow-500 shrink-0" />
                      <span class="text-sm text-on-surface">{{ t('exerciseWizards.directAccess.selfCheck.continueButton') }}</span>
                    </div>
                  </button>
                </Transition>
              </div>
            </Transition>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
          </div>
        </div>
      </template>

      <!-- Step 3: Dialogue -->
      <template v-else-if="currentStep === 'dialogue'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">
              {{ t('exerciseWizards.directAccess.dialogue.title', { partName: selectedPartName }) }}
            </h2>

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
            <div
              ref="chatContainer"
              class="space-y-3 max-h-96 overflow-y-auto p-2"
            >
              <div v-if="!messages.length" class="text-center py-8">
                <p class="text-sm text-on-surface-variant">
                  {{ t('exerciseWizards.directAccess.dialogue.emptyState') }}
                </p>
              </div>

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

              <!-- Loading -->
              <div v-if="isLoadingResponse" class="flex justify-start">
                <div class="neo-surface shadow-neu-pressed rounded-2xl px-4 py-3 max-w-[85%]">
                  <p class="text-xs font-medium text-on-surface-variant mb-1">{{ selectedPartName }}</p>
                  <div class="flex gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style="animation-delay: 0ms" />
                    <span class="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style="animation-delay: 150ms" />
                    <span class="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style="animation-delay: 300ms" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Error message -->
            <p v-if="llmError" class="text-xs text-error">
              {{ llmError }}
            </p>

            <!-- Input -->
            <div class="flex gap-2">
              <textarea
                v-model="messageInput"
                rows="2"
                :placeholder="t('exerciseWizards.directAccess.dialogue.placeholder')"
                class="neo-input w-full p-3 text-sm resize-none"
                @keydown.enter.exact.prevent="handleSend"
              />
              <AppButton
                variant="filled"
                :disabled="!messageInput.trim() || isLoadingResponse"
                class="shrink-0 self-end"
                @click="handleSend"
              >
                {{ t('exerciseWizards.directAccess.dialogue.sendButton') }}
              </AppButton>
            </div>
          </AppCard>

          <!-- Insight form -->
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            leave-active-class="transition-all duration-150"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <AppCard v-if="showInsightForm" padding="md" class="space-y-3">
              <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.directAccess.dialogue.insightForm.title') }}</h3>
              <textarea
                v-model="insightContent"
                rows="2"
                :placeholder="t('exerciseWizards.directAccess.dialogue.insightForm.placeholder')"
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
                <AppButton variant="text" @click="closeInsightForm()">{{ t('common.buttons.cancel') }}</AppButton>
                <AppButton
                  variant="filled"
                  :disabled="!insightContent.trim() || !insightTag"
                  @click="handleAddInsight"
                >
                  {{ t('exerciseWizards.directAccess.dialogue.insightForm.saveButton') }}
                </AppButton>
              </div>
            </AppCard>
          </Transition>

          <!-- Saved insights -->
          <div v-if="insights.length" class="space-y-2">
            <h3 class="text-sm font-semibold text-on-surface">{{ t('exerciseWizards.directAccess.dialogue.savedInsights') }}</h3>
            <IFSInsightCard
              v-for="insight in insights"
              :key="insight.id"
              :insight="insight"
              :part-name="selectedPartName"
              @delete="removeInsight(insight.id)"
            />
          </div>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="!canAdvance" @click="nextStep()">
              {{ t('exerciseWizards.directAccess.dialogue.endButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 4: Summary -->
      <template v-else-if="currentStep === 'summary'">
        <div class="space-y-6">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.directAccess.summary.title') }}</h2>

            <div class="neo-surface p-3 rounded-lg flex items-center justify-between">
              <span class="text-sm text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.messageCount') }}</span>
              <span class="text-lg font-bold text-primary">{{ messages.length }}</span>
            </div>

            <div v-if="insights.length" class="space-y-2">
              <p class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.insightsLabel') }}</p>
              <IFSInsightCard
                v-for="insight in insights"
                :key="insight.id"
                :insight="insight"
                :part-name="selectedPartName"
                @delete="removeInsight(insight.id)"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.summaryLabel') }}</label>
              <textarea
                v-model="summary"
                rows="3"
                :placeholder="t('exerciseWizards.directAccess.summary.summaryPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>

            <!-- Discoveries -->
            <div class="space-y-3">
              <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.directAccess.summary.discoveryHeading', { partName: selectedPartName }) }}</p>
              <div class="space-y-2">
                <div>
                  <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.discoveries.job.label') }}</label>
                  <input
                    v-model="partJobDiscovered"
                    type="text"
                    class="neo-input w-full text-sm"
                    :placeholder="t('exerciseWizards.directAccess.summary.discoveries.job.placeholder')"
                  />
                </div>
                <div>
                  <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.discoveries.fear.label') }}</label>
                  <input
                    v-model="partFearDiscovered"
                    type="text"
                    class="neo-input w-full text-sm"
                    :placeholder="t('exerciseWizards.directAccess.summary.discoveries.fear.placeholder')"
                  />
                </div>
                <div>
                  <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.directAccess.summary.discoveries.need.label') }}</label>
                  <input
                    v-model="partNeedDiscovered"
                    type="text"
                    class="neo-input w-full text-sm"
                    :placeholder="t('exerciseWizards.directAccess.summary.discoveries.need.placeholder')"
                  />
                </div>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="nextStep()">
              {{ t('exerciseWizards.directAccess.summary.reviewButton') }}
            </AppButton>
          </div>
        </div>
      </template>

      <!-- Step 5: Save -->
      <template v-else-if="currentStep === 'save'">
        <div class="space-y-6">
          <AppCard variant="raised" padding="lg" class="space-y-4">
            <h2 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.directAccess.save.title') }}</h2>

            <!-- Review summary -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.partLabel') }}</span>
                <span class="text-sm font-medium text-on-surface">{{ selectedPartName }}</span>
                <PartRoleBadge v-if="selectedPartRole" :role="selectedPartRole" />
              </div>

              <div class="neo-surface p-3 rounded-lg grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.stats.messages') }}</p>
                  <p class="text-lg font-bold text-primary">{{ messages.length }}</p>
                </div>
                <div>
                  <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.stats.insights') }}</p>
                  <p class="text-lg font-bold text-primary">{{ insights.length }}</p>
                </div>
              </div>

              <div v-if="partJobDiscovered || partFearDiscovered || partNeedDiscovered" class="space-y-1">
                <p class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.discoveries.heading') }}</p>
                <p v-if="partJobDiscovered" class="text-xs text-on-surface">
                  <span class="text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.discoveries.job') }}</span> {{ partJobDiscovered }}
                </p>
                <p v-if="partFearDiscovered" class="text-xs text-on-surface">
                  <span class="text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.discoveries.fear') }}</span> {{ partFearDiscovered }}
                </p>
                <p v-if="partNeedDiscovered" class="text-xs text-on-surface">
                  <span class="text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.discoveries.need') }}</span> {{ partNeedDiscovered }}
                </p>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.directAccess.save.notesLabel') }}</label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="t('exerciseWizards.directAccess.save.notesPlaceholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="prevStep()">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? t('exerciseWizards.directAccess.save.saving') : t('exerciseWizards.directAccess.save.saveButton') }}
            </AppButton>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import PartSelector from '@/components/exercises/ifs/PartSelector.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import PartDialogueBubble from '@/components/exercises/ifs/PartDialogueBubble.vue'
import IFSInsightCard from '@/components/exercises/ifs/IFSInsightCard.vue'
import { useDirectAccessWizard, type DirectAccessStep } from '@/composables/useDirectAccessWizard'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'
import type { IFSInsight } from '@/domain/exercises'

const emit = defineEmits<{
  saved: []
}>()

const { t } = useT()

const partStore = useIFSPartStore()

const STEPS: DirectAccessStep[] = [
  'part-select', 'self-check', 'dialogue', 'summary', 'save',
]

const stepLabels = computed(() => [
  t('exerciseWizards.directAccess.steps.partSelect'),
  t('exerciseWizards.directAccess.steps.selfCheck'),
  t('exerciseWizards.directAccess.steps.dialogue'),
  t('exerciseWizards.directAccess.steps.summary'),
  t('exerciseWizards.directAccess.steps.save'),
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  partId,
  selfCheckPassed,
  messages,
  insights,
  isLoadingResponse,
  llmError,
  sendMessage,
  addInsight,
  removeInsight,
  summary,
  partJobDiscovered,
  partFearDiscovered,
  partNeedDiscovered,
  notes,
  isSaving,
  save,
} = useDirectAccessWizard()

// Part helpers
const selectedPart = computed(() => partId.value ? partStore.getPartById(partId.value) : null)
const selectedPartName = computed(() => selectedPart.value?.name ?? 'Part')
const selectedPartRole = computed(() => selectedPart.value?.role ?? null)
const selectedPartColor = computed(() => {
  switch (selectedPart.value?.role) {
    case 'manager': return '#60a5fa'
    case 'firefighter': return '#fb923c'
    case 'exile': return '#c084fc'
    default: return undefined
  }
})

// Message input
const messageInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)

const suggestedQuestions = computed(() => {
  const questions = t('exerciseWizards.directAccess.dialogue.suggestedQuestions')
  return Array.isArray(questions) ? questions : [
    'What is your job?',
    'What are you protecting?',
    'What would happen if you stopped?',
    'What do you need from me?',
    'How old are you?',
  ]
})

async function handleSend() {
  if (!messageInput.value.trim() || isLoadingResponse.value || !selectedPart.value) return
  const content = messageInput.value.trim()
  messageInput.value = ''
  await sendMessage(content, selectedPart.value)
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// Self-check
const showBreathing = ref(false)
const breathingActive = ref(false)
const breathingDone = ref(false)
const breathingLabel = ref(t('exerciseWizards.directAccess.selfCheck.breathing.ready'))
let breathingTimer: ReturnType<typeof setTimeout> | null = null

function handleSelfCheck(present: boolean) {
  if (present) {
    selfCheckPassed.value = true
    setTimeout(() => nextStep(), 200)
  } else {
    showBreathing.value = true
  }
}

function startBreathing() {
  breathingActive.value = true
  let cycle = 0
  const maxCycles = 3

  function runCycle() {
    if (cycle >= maxCycles) {
      breathingActive.value = false
      breathingDone.value = true
      breathingLabel.value = t('exerciseWizards.directAccess.selfCheck.breathing.complete')
      return
    }
    breathingLabel.value = t('exerciseWizards.directAccess.selfCheck.breathing.breatheIn')
    breathingTimer = setTimeout(() => {
      breathingLabel.value = t('exerciseWizards.directAccess.selfCheck.breathing.hold')
      breathingTimer = setTimeout(() => {
        breathingLabel.value = t('exerciseWizards.directAccess.selfCheck.breathing.breatheOut')
        breathingTimer = setTimeout(() => {
          cycle++
          runCycle()
        }, 4000)
      }, 2000)
    }, 4000)
  }
  runCycle()
}

// Insight form
const showInsightForm = ref(false)
const insightContent = ref('')
const insightTag = ref<IFSInsight['tag'] | null>(null)
const bookmarkedIndices = ref(new Set<number>())

const insightTags = computed<{ value: IFSInsight['tag']; label: string; activeClass: string }[]>(() => [
  { value: 'core-fear', label: t('exerciseWizards.directAccess.dialogue.insightTags.coreFear'), activeClass: 'bg-red-100 text-red-700' },
  { value: 'need', label: t('exerciseWizards.directAccess.dialogue.insightTags.need'), activeClass: 'bg-green-100 text-green-700' },
  { value: 'positive-intention', label: t('exerciseWizards.directAccess.dialogue.insightTags.positiveIntention'), activeClass: 'bg-blue-100 text-blue-700' },
  { value: 'memory', label: t('exerciseWizards.directAccess.dialogue.insightTags.memory'), activeClass: 'bg-amber-100 text-amber-700' },
  { value: 'belief', label: t('exerciseWizards.directAccess.dialogue.insightTags.belief'), activeClass: 'bg-purple-100 text-purple-700' },
  { value: 'other', label: t('exerciseWizards.directAccess.dialogue.insightTags.other'), activeClass: 'bg-neu-base text-on-surface' },
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

// Cleanup
onUnmounted(() => {
  if (breathingTimer) clearTimeout(breathingTimer)
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
