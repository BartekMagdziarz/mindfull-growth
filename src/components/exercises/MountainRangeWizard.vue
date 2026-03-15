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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.mountainRange.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.mountainRange.intro.mapTitle') }}
            </p>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <AppIcon name="trending_up" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.mountainRange.intro.peaksName') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.mountainRange.intro.peaksDescription') }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <AppIcon name="trending_down" class="text-base text-on-surface-variant flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.mountainRange.intro.valleysName') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.mountainRange.intro.valleysDescription') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.mountainRange.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'peaks'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Peaks -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'peaks'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.peaks.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.mountainRange.peaks.description') }}
          </p>
          <div
            v-for="(event, index) in peakEvents"
            :key="event.id"
            class="space-y-2 neo-surface p-3 rounded-xl"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="event.description"
                  :placeholder="t('exerciseWizards.mountainRange.peaks.eventPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="3"
                />
                <div class="flex items-center gap-3">
                  <label class="text-xs text-on-surface-variant whitespace-nowrap">{{ t('exerciseWizards.mountainRange.peaks.ageLabel') }}</label>
                  <input
                    v-model.number="event.ageOrYear"
                    type="number"
                    min="0"
                    max="120"
                    class="neo-input neo-focus w-20 p-2 text-sm text-center"
                  />
                </div>
                <textarea
                  v-model="event.reflection"
                  :placeholder="t('exerciseWizards.mountainRange.peaks.meaningPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <EmotionSelector
                  v-model="event.emotionIds"
                  :label="t('exerciseWizards.mountainRange.peaks.emotionLabel')"
                />
              </div>
              <button
                v-if="peakEvents.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="removePeak(index)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            v-if="peakEvents.length < 7"
            variant="text"
            @click="addPeak"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.mountainRange.peaks.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledPeaks.length < 3"
            @click="currentStep = 'valleys'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Valleys -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'valleys'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.valleys.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.mountainRange.valleys.description') }}
          </p>
          <p class="text-xs text-on-surface-variant italic">
            {{ t('exerciseWizards.mountainRange.valleys.takeYourTime') }}
          </p>
          <div
            v-for="(event, index) in valleyEvents"
            :key="event.id"
            class="space-y-2 neo-surface p-3 rounded-xl"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="event.description"
                  :placeholder="t('exerciseWizards.mountainRange.valleys.eventPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="4"
                />
                <div class="flex items-center gap-3">
                  <label class="text-xs text-on-surface-variant whitespace-nowrap">{{ t('exerciseWizards.mountainRange.valleys.ageLabel') }}</label>
                  <input
                    v-model.number="event.ageOrYear"
                    type="number"
                    min="0"
                    max="120"
                    class="neo-input neo-focus w-20 p-2 text-sm text-center"
                  />
                </div>
                <textarea
                  v-model="event.reflection"
                  :placeholder="t('exerciseWizards.mountainRange.valleys.growthPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="4"
                />
                <EmotionSelector
                  v-model="event.emotionIds"
                  :label="t('exerciseWizards.mountainRange.peaks.emotionLabel')"
                />
              </div>
              <button
                v-if="valleyEvents.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="removeValley(index)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            v-if="valleyEvents.length < 5"
            variant="text"
            @click="addValley"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.mountainRange.valleys.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'peaks'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledValleys.length < 2"
            @click="currentStep = 'timeline'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Timeline Visualization -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'timeline'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.timeline.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.mountainRange.timeline.description') }}
          </p>
          <MountainRangeTimeline
            :events="allFilledEvents"
            :selected-event-id="selectedEventId"
            @select="selectedEventId = $event"
          />
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'valleys'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'themes'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Themes -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'themes'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.themes.title') }}</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.mountainRange.themes.peaksCommonLabel') }}
              </label>
              <textarea
                v-model="peakPatterns"
                :placeholder="t('exerciseWizards.mountainRange.themes.peaksPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="3"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.mountainRange.themes.valleysCommonLabel') }}
              </label>
              <textarea
                v-model="valleyPatterns"
                :placeholder="t('exerciseWizards.mountainRange.themes.valleysPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="3"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.mountainRange.themes.connectionLabel') }}
              </label>
              <textarea
                v-model="valleyToPeakConnection"
                :placeholder="t('exerciseWizards.mountainRange.themes.connectionPlaceholder')"
                class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
                rows="3"
              />
            </div>
          </div>

          <!-- LLM Synthesis -->
          <div class="space-y-2">
            <AppButton
              v-if="!llmSynthesis && !isLlmLoading"
              variant="tonal"
              @click="handleSynthesisAssist"
            >
              <AppIcon name="auto_awesome" class="text-base mr-1" />
              {{ t('exerciseWizards.mountainRange.themes.analyzeButton') }}
            </AppButton>
            <div v-if="isLlmLoading" class="text-sm text-on-surface-variant">{{ t('exerciseWizards.mountainRange.themes.thinking') }}</div>
            <div v-if="llmSynthesis" class="neo-panel p-4">
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmSynthesis }}</p>
            </div>
            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'timeline'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'future'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Future Peaks -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'future'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.mountainRange.future.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.mountainRange.future.description') }}
          </p>
          <div
            v-for="(peak, index) in futurePeaks"
            :key="index"
            class="space-y-2 neo-surface p-3 rounded-xl"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="peak.description"
                  :placeholder="t('exerciseWizards.mountainRange.future.peakPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <select
                  v-model="peak.lifeAreaId"
                  class="neo-input neo-focus w-full p-2 text-sm"
                >
                  <option value="">{{ t('exerciseWizards.mountainRange.future.lifeAreaSelect') }}</option>
                  <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                    {{ area.name }}
                  </option>
                </select>
              </div>
              <button
                v-if="futurePeaks.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="futurePeaks.splice(index, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            v-if="futurePeaks.length < 3"
            variant="text"
            @click="futurePeaks.push({ description: '', lifeAreaId: '' })"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.mountainRange.future.addAnother') }}
          </AppButton>

          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.mountainRange.future.emotionLabel')"
          />

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.mountainRange.future.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.mountainRange.future.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'themes'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">{{ t('common.buttons.save') }}</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import MountainRangeTimeline from '@/components/exercises/MountainRangeTimeline.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useT } from '@/composables/useT'
import type { CreateMountainRangePayload, MountainRangeEvent } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateMountainRangePayload]
}>()

const { t, locale } = useT()
const lifeAreaStore = useLifeAreaStore()
const valuesDiscoveryStore = useValuesDiscoveryStore()

onMounted(() => {
  lifeAreaStore.loadLifeAreas()
  valuesDiscoveryStore.loadDiscoveries()
})

const lifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'peaks' | 'valleys' | 'timeline' | 'themes' | 'future'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.mountainRange.steps.intro'),
  t('exerciseWizards.mountainRange.steps.peaks'),
  t('exerciseWizards.mountainRange.steps.valleys'),
  t('exerciseWizards.mountainRange.steps.timeline'),
  t('exerciseWizards.mountainRange.steps.themes'),
  t('exerciseWizards.mountainRange.steps.future'),
])
const stepOrder: Step[] = ['intro', 'peaks', 'valleys', 'timeline', 'themes', 'future']

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
const selectedEventId = ref<string>()

interface EditableEvent {
  id: string
  type: 'peak' | 'valley'
  description: string
  ageOrYear: number
  emotionIds: string[]
  reflection: string
}

function createEvent(type: 'peak' | 'valley'): EditableEvent {
  return {
    id: crypto.randomUUID(),
    type,
    description: '',
    ageOrYear: 0,
    emotionIds: [],
    reflection: '',
  }
}

const peakEvents = reactive<EditableEvent[]>([
  createEvent('peak'),
  createEvent('peak'),
  createEvent('peak'),
])

const valleyEvents = reactive<EditableEvent[]>([
  createEvent('valley'),
  createEvent('valley'),
])

function addPeak() {
  peakEvents.push(createEvent('peak'))
}

function removePeak(index: number) {
  peakEvents.splice(index, 1)
}

function addValley() {
  valleyEvents.push(createEvent('valley'))
}

function removeValley(index: number) {
  valleyEvents.splice(index, 1)
}

// ─── Theme State ─────────────────────────────────────────────────────────────
const peakPatterns = ref('')
const valleyPatterns = ref('')
const valleyToPeakConnection = ref('')

// ─── Future Peaks ────────────────────────────────────────────────────────────
const futurePeaks = reactive<{ description: string; lifeAreaId: string }[]>([
  { description: '', lifeAreaId: '' },
])

// ─── Computed ────────────────────────────────────────────────────────────────
function isFilled(event: EditableEvent): boolean {
  return event.description.trim().length > 0 && event.ageOrYear > 0
}

const filledPeaks = computed(() => peakEvents.filter(isFilled))
const filledValleys = computed(() => valleyEvents.filter(isFilled))

const allFilledEvents = computed<MountainRangeEvent[]>(() => {
  return [...filledPeaks.value, ...filledValleys.value].map((e) => ({
    id: e.id,
    type: e.type,
    description: e.description.trim(),
    ageOrYear: e.ageOrYear,
    emotionIds: e.emotionIds.length > 0 ? [...e.emotionIds] : undefined,
    reflection: e.reflection.trim() || undefined,
  }))
})

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isLlmLoading = ref(false)
const llmSynthesis = ref('')
const llmError = ref('')

async function handleSynthesisAssist() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { synthesizeMountainRange } = await import('@/services/logotherapyLLMAssists')

    const coreValues = valuesDiscoveryStore.latestDiscovery?.coreValues ?? []

    llmSynthesis.value = await synthesizeMountainRange({
      events: allFilledEvents.value,
      peakPatterns: peakPatterns.value.trim() || undefined,
      valleyPatterns: valleyPatterns.value.trim() || undefined,
      coreValues: coreValues.length > 0 ? coreValues : undefined,
      locale: locale.value,
    })
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.mountainRange.errors.themesFailed')
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const filledFuturePeaks = futurePeaks
    .filter((p) => p.description.trim().length > 0)
    .map((p) => p.description.trim())

  const payload: CreateMountainRangePayload = {
    events: allFilledEvents.value,
    peakPatterns: peakPatterns.value.trim() || undefined,
    valleyPatterns: valleyPatterns.value.trim() || undefined,
    valleyToPeakConnection: valleyToPeakConnection.value.trim() || undefined,
    llmSynthesis: llmSynthesis.value || undefined,
    futurePeaks: filledFuturePeaks.length > 0 ? filledFuturePeaks : undefined,
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
