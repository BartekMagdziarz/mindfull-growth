<template>
  <div class="space-y-6">
    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         SETUP MODE (creating a new log)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <template v-if="mode === 'setup'">
      <!-- Step indicator dots -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-1.5" role="group" aria-label="Wizard progress">
          <button
            v-for="(label, idx) in setupStepLabels"
            :key="idx"
            type="button"
            :aria-label="`Step ${idx + 1}: ${label}${idx < currentSetupVisualStep ? ' (completed)' : idx === currentSetupVisualStep ? ' (current)' : ''}`"
            class="w-2.5 h-2.5 rounded-full transition-all duration-200"
            :class="
              idx < currentSetupVisualStep
                ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
                : idx === currentSetupVisualStep
                  ? 'neo-step-active w-6'
                  : 'neo-step-future w-2.5 h-2.5'
            "
            @click="idx < currentSetupVisualStep && goToSetupStepByIndex(idx)"
          />
        </div>
        <span class="text-xs font-medium text-on-surface-variant">
          {{ setupStepLabels[currentSetupVisualStep] }}
        </span>
      </div>

      <!-- Setup Step 1: Intro -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="setupStep === 'intro'" class="space-y-4">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.positiveDataLog.intro.title') }}</h2>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.positiveDataLog.intro.description') }}
            </p>
            <div class="neo-surface p-4 space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.positiveDataLog.intro.howItWorks') }}
              </p>
              <div class="space-y-2">
                <div class="flex items-start gap-3">
                  <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">1</span>
                  <p class="text-sm text-on-surface">{{ t('exerciseWizards.positiveDataLog.intro.step1') }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">2</span>
                  <p class="text-sm text-on-surface">{{ t('exerciseWizards.positiveDataLog.intro.step2') }}</p>
                </div>
                <div class="flex items-start gap-3">
                  <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">3</span>
                  <p class="text-sm text-on-surface">{{ t('exerciseWizards.positiveDataLog.intro.step3') }}</p>
                </div>
              </div>
            </div>
          </AppCard>
          <div class="flex justify-end">
            <AppButton variant="filled" @click="setupStep = 'target-belief'">
              {{ t('common.buttons.start') }}
            </AppButton>
          </div>
        </div>
      </Transition>

      <!-- Setup Step 2: Target Belief -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="setupStep === 'target-belief'" class="space-y-4">
          <AppCard padding="lg" class="space-y-4">
            <h2 class="text-lg font-semibold text-on-surface">
              {{ t('exerciseWizards.positiveDataLog.targetBelief.title') }}
            </h2>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.positiveDataLog.targetBelief.description') }}
            </p>
            <textarea
              v-model="targetBelief"
              rows="3"
              :placeholder="t('exerciseWizards.positiveDataLog.targetBelief.placeholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
            />
          </AppCard>

          <AppCard padding="lg" class="space-y-3">
            <h3 class="text-base font-semibold text-on-surface">
              {{ t('exerciseWizards.positiveDataLog.targetBelief.believabilityTitle') }}
            </h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.positiveDataLog.targetBelief.believabilityLabel') }}</label>
                <span class="text-sm font-semibold text-primary">{{ believabilityInitial }}%</span>
              </div>
              <input
                v-model.number="believabilityInitial"
                type="range"
                min="0"
                max="100"
                step="1"
                class="neo-focus w-full accent-primary"
              />
              <div class="flex justify-between text-xs text-on-surface-variant">
                <span>{{ t('exerciseWizards.positiveDataLog.targetBelief.notAtAll') }}</span>
                <span>{{ t('exerciseWizards.positiveDataLog.targetBelief.completely') }}</span>
              </div>
            </div>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="setupStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
            <AppButton
              variant="filled"
              :disabled="!targetBelief.trim()"
              @click="setupStep = 'confirmation'"
            >
              {{ t('common.buttons.next') }}
            </AppButton>
          </div>
        </div>
      </Transition>

      <!-- Setup Step 3: Confirmation -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="setupStep === 'confirmation'" class="space-y-4">
          <AppCard variant="raised" padding="lg" class="space-y-5">
            <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.positiveDataLog.confirmation.title') }}</h2>

            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.positiveDataLog.confirmation.targetBeliefLabel') }}
              </p>
              <div class="neo-panel p-3">
                <p class="text-sm text-on-surface italic">"{{ targetBelief }}"</p>
              </div>
            </div>

            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.positiveDataLog.confirmation.initialBelievability') }}
              </p>
              <p class="text-2xl font-bold text-on-surface">{{ believabilityInitial }}%</p>
            </div>

            <p class="text-sm text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.positiveDataLog.confirmation.description') }}
            </p>
          </AppCard>

          <div class="flex justify-between">
            <AppButton variant="text" @click="setupStep = 'target-belief'">{{ t('common.buttons.back') }}</AppButton>
            <AppButton variant="filled" @click="handleCreate">
              {{ t('exerciseWizards.positiveDataLog.confirmation.createLog') }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </template>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         LOG MODE (adding entries to an existing log)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <template v-else-if="mode === 'log' && existingLog">
      <!-- Header: Target belief + current believability -->
      <div class="neo-panel p-4 space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {{ t('exerciseWizards.positiveDataLog.log.targetBeliefLabel') }}
        </p>
        <p class="text-sm text-on-surface italic">"{{ existingLog.targetBelief }}"</p>
        <div class="flex items-center gap-3">
          <span class="text-xs text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.currentBelievability') }}</span>
          <span class="text-sm font-semibold text-primary">
            {{ existingLog.believabilityLatest ?? existingLog.believabilityInitial }}%
          </span>
          <span v-if="believabilityChange !== 0" class="text-xs" :class="believabilityChange < 0 ? 'text-success' : 'text-error'">
            {{ t('exerciseWizards.positiveDataLog.log.fromStart', { change: (believabilityChange > 0 ? '+' : '') + believabilityChange }) }}
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-on-surface-variant">
          <AppIcon name="assignment" class="text-base" />
          <span>{{ existingLog.entries.length === 1 ? t('exerciseWizards.positiveDataLog.log.entryLogged', { count: existingLog.entries.length }) : t('exerciseWizards.positiveDataLog.log.entriesLogged', { count: existingLog.entries.length }) }}</span>
        </div>
      </div>

      <!-- Add Entry Section -->
      <AppCard padding="lg" class="space-y-4">
        <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.positiveDataLog.log.addEvidenceTitle') }}</h2>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.positiveDataLog.log.addEvidenceDescription') }}
        </p>

        <div class="space-y-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.dateLabel') }}</label>
            <input
              v-model="newEntryDate"
              type="date"
              class="neo-input neo-focus w-full p-2.5 text-sm"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.evidenceLabel') }}</label>
            <textarea
              v-model="newEntryEvidence"
              rows="3"
              :placeholder="t('exerciseWizards.positiveDataLog.log.evidencePlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.notesLabel') }}</label>
            <textarea
              v-model="newEntryNotes"
              rows="2"
              :placeholder="t('exerciseWizards.positiveDataLog.log.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none"
            />
          </div>

          <div class="flex justify-end">
            <AppButton
              variant="filled"
              :disabled="!newEntryEvidence.trim()"
              @click="handleAddEntry"
            >
              <AppIcon name="add" class="text-base" />
              {{ t('exerciseWizards.positiveDataLog.log.addEvidence') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <!-- Re-rate Section -->
      <AppCard padding="lg" class="space-y-4">
        <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.positiveDataLog.log.rerateTitle') }}</h3>
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.positiveDataLog.log.rerateDescription') }}
        </p>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.positiveDataLog.log.believabilityNow') }}</label>
            <span class="text-sm font-semibold text-primary">{{ rerateValue }}%</span>
          </div>
          <input
            v-model.number="rerateValue"
            type="range"
            min="0"
            max="100"
            step="1"
            class="neo-focus w-full accent-primary"
          />
          <div class="flex justify-between text-xs text-on-surface-variant">
            <span>{{ t('exerciseWizards.positiveDataLog.log.notAtAll') }}</span>
            <span>{{ t('exerciseWizards.positiveDataLog.log.completely') }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.initial') }}</p>
            <p class="font-semibold text-on-surface">{{ existingLog.believabilityInitial }}%</p>
          </div>
          <AppIcon name="arrow_forward" class="text-base text-on-surface-variant flex-shrink-0" />
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">{{ t('exerciseWizards.positiveDataLog.log.now') }}</p>
            <p
              class="font-semibold"
              :class="rerateValue < existingLog.believabilityInitial ? 'text-success' : rerateValue > existingLog.believabilityInitial ? 'text-error' : 'text-on-surface'"
            >
              {{ rerateValue }}%
            </p>
          </div>
        </div>
        <div class="flex justify-end">
          <AppButton
            variant="tonal"
            :disabled="rerateValue === (existingLog.believabilityLatest ?? existingLog.believabilityInitial)"
            @click="handleUpdateRating"
          >
            {{ t('exerciseWizards.positiveDataLog.log.updateRating') }}
          </AppButton>
        </div>
      </AppCard>

      <!-- Entries Timeline -->
      <div v-if="sortedEntries.length > 0" class="space-y-3">
        <h3 class="text-base font-semibold text-on-surface">
          {{ t('exerciseWizards.positiveDataLog.log.evidenceTimeline') }}
          <span class="text-sm font-normal text-on-surface-variant ml-1">
            ({{ sortedEntries.length }})
          </span>
        </h3>
        <AppCard
          v-for="entry in sortedEntries"
          :key="entry.id"
          padding="md"
        >
          <div class="flex justify-between items-start group">
            <div class="flex-1 space-y-1">
              <p class="text-xs text-on-surface-variant">
                {{ formatEntryDate(entry.date) }}
              </p>
              <p class="text-sm text-on-surface">{{ entry.evidence }}</p>
              <p v-if="entry.notes" class="text-xs text-on-surface-variant italic mt-1">
                {{ entry.notes }}
              </p>
            </div>
            <button
              type="button"
              class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
              :aria-label="t('exerciseWizards.positiveDataLog.aria.deleteEntry')"
              @click="handleRemoveEntry(entry.id)"
            >
              <AppIcon name="delete" class="text-base" />
            </button>
          </div>
        </AppCard>
      </div>

      <!-- LLM Review Assist -->
      <AppCard v-if="sortedEntries.length >= 3" padding="lg" class="space-y-3">
        <AppButton
          variant="tonal"
          :disabled="isReviewLoading"
          @click="handleReviewAssist"
        >
          <AppIcon name="auto_awesome" class="text-base" />
          {{ isReviewLoading ? t('exerciseWizards.positiveDataLog.log.reviewLoading') : t('exerciseWizards.positiveDataLog.log.reviewLabel') }}
        </AppButton>
        <div v-if="reviewSummary" class="neo-panel p-4 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('exerciseWizards.positiveDataLog.log.progressReview') }}
          </p>
          <p class="text-sm text-on-surface whitespace-pre-line">{{ reviewSummary }}</p>
        </div>
        <p v-if="reviewError" class="text-xs text-error">{{ reviewError }}</p>
      </AppCard>

      <!-- Empty state for no entries yet -->
      <div v-if="sortedEntries.length === 0" class="neo-embedded p-6 text-center">
        <AppIcon name="assignment" class="text-4xl text-on-surface-variant mx-auto mb-2 block" />
        <p class="text-sm text-on-surface-variant">
          {{ t('exerciseWizards.positiveDataLog.log.noEvidenceYet') }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type {
  PositiveDataLog,
  PositiveDataEntry,
  CreatePositiveDataLogPayload,
} from '@/domain/exercises'

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  mode: 'setup' | 'log'
  existingLog?: PositiveDataLog
}

const props = defineProps<Props>()
const { t, locale } = useT()

const emit = defineEmits<{
  created: [data: CreatePositiveDataLogPayload]
  updated: [data: { entries: PositiveDataEntry[]; believabilityLatest?: number }]
  entryAdded: [entry: PositiveDataEntry]
  entryRemoved: [entryId: string]
}>()

// ─── Setup Mode State ─────────────────────────────────────────────────────────
type SetupStep = 'intro' | 'target-belief' | 'confirmation'

const setupStep = ref<SetupStep>('intro')

const setupStepLabels = computed(() => [
  t('exerciseWizards.positiveDataLog.setupSteps.intro'),
  t('exerciseWizards.positiveDataLog.setupSteps.targetBelief'),
  t('exerciseWizards.positiveDataLog.setupSteps.confirmation'),
])

const setupStepOrder: SetupStep[] = ['intro', 'target-belief', 'confirmation']

const currentSetupVisualStep = computed(() => {
  return setupStepOrder.indexOf(setupStep.value)
})

function goToSetupStepByIndex(idx: number) {
  if (idx >= 0 && idx < setupStepOrder.length) {
    setupStep.value = setupStepOrder[idx]
  }
}

// Setup form fields
const targetBelief = ref('')
const believabilityInitial = ref(50)

function handleCreate() {
  const payload: CreatePositiveDataLogPayload = {
    targetBelief: targetBelief.value.trim(),
    entries: [],
    believabilityInitial: believabilityInitial.value,
  }
  emit('created', payload)
}

// ─── Log Mode State ───────────────────────────────────────────────────────────
const newEntryDate = ref(todayISO())
const newEntryEvidence = ref('')
const newEntryNotes = ref('')
const rerateValue = ref(
  props.existingLog?.believabilityLatest ?? props.existingLog?.believabilityInitial ?? 50,
)

const sortedEntries = computed(() => {
  if (!props.existingLog) return []
  return [...props.existingLog.entries].sort((a, b) => b.date.localeCompare(a.date))
})

const believabilityChange = computed(() => {
  if (!props.existingLog) return 0
  const current = props.existingLog.believabilityLatest ?? props.existingLog.believabilityInitial
  return current - props.existingLog.believabilityInitial
})

function handleAddEntry() {
  const entry: PositiveDataEntry = {
    id: crypto.randomUUID(),
    date: newEntryDate.value,
    evidence: newEntryEvidence.value.trim(),
    notes: newEntryNotes.value.trim() || undefined,
  }
  emit('entryAdded', entry)
  // Reset form
  newEntryEvidence.value = ''
  newEntryNotes.value = ''
  newEntryDate.value = todayISO()
}

function handleRemoveEntry(entryId: string) {
  emit('entryRemoved', entryId)
}

function handleUpdateRating() {
  emit('updated', { entries: props.existingLog?.entries ?? [], believabilityLatest: rerateValue.value })
}

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isReviewLoading = ref(false)
const reviewSummary = ref('')
const reviewError = ref('')

async function handleReviewAssist() {
  if (!props.existingLog || props.existingLog.entries.length === 0) return
  isReviewLoading.value = true
  reviewError.value = ''
  try {
    const { reviewPositiveDataLog } = await import('@/services/cbtLLMAssists')
    reviewSummary.value = await reviewPositiveDataLog({
      targetBelief: props.existingLog.targetBelief,
      entries: props.existingLog.entries.map((e) => ({ date: e.date, evidence: e.evidence })),
      believabilityInitial: props.existingLog.believabilityInitial,
      believabilityLatest: props.existingLog.believabilityLatest,
      locale: locale.value,
    })
  } catch (err) {
    reviewError.value = err instanceof Error ? err.message : t('exerciseWizards.positiveDataLog.errors.reviewFailed')
  } finally {
    isReviewLoading.value = false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatEntryDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>
