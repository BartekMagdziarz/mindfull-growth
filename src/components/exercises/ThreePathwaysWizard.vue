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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.threePathways.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.threePathways.intro.pathwaysTitle') }}
            </p>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <AppIcon name="edit" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.threePathways.intro.creativeName') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.threePathways.intro.creativeDescription') }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <AppIcon name="favorite" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.threePathways.intro.experientialName') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.threePathways.intro.experientialDescription') }}
                  </p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <AppIcon name="verified_user" class="text-base text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.threePathways.intro.attitudinalName') }}</p>
                  <p class="text-xs text-on-surface-variant">
                    {{ t('exerciseWizards.threePathways.intro.attitudinalDescription') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              {{ t('exerciseWizards.threePathways.intro.quote') }}
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>
          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.threePathways.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'creative'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Creative Values -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'creative'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.creative.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.threePathways.creative.description') }}
          </p>
          <div v-for="(item, index) in creativeValues" :key="index" class="space-y-2 neo-surface p-3 rounded-xl">
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="item.description"
                  :placeholder="t('exerciseWizards.threePathways.creative.placeholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <RatingSlider
                  v-model="item.engagementRating"
                  :label="t('exerciseWizards.threePathways.creative.engagementLabel')"
                  :min="1"
                  :max="5"
                />
                <select
                  v-model="item.lifeAreaId"
                  class="neo-input neo-focus w-full p-2 text-sm"
                >
                  <option value="">{{ t('exerciseWizards.threePathways.creative.lifeAreaSelect') }}</option>
                  <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                    {{ area.name }}
                  </option>
                </select>
              </div>
              <button
                v-if="creativeValues.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="creativeValues.splice(index, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            variant="text"
            @click="creativeValues.push({ description: '', engagementRating: 3, lifeAreaId: '' })"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.threePathways.creative.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledCreativeValues.length < 3"
            @click="currentStep = 'experiential'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Experiential Values -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'experiential'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.experiential.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.threePathways.experiential.description') }}
          </p>
          <div v-for="(item, index) in experientialValues" :key="index" class="space-y-2 neo-surface p-3 rounded-xl">
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="item.description"
                  :placeholder="t('exerciseWizards.threePathways.experiential.placeholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <RatingSlider
                  v-model="item.engagementRating"
                  :label="t('exerciseWizards.threePathways.experiential.engagementLabel')"
                  :min="1"
                  :max="5"
                />
                <select
                  v-model="item.lifeAreaId"
                  class="neo-input neo-focus w-full p-2 text-sm"
                >
                  <option value="">{{ t('exerciseWizards.threePathways.experiential.lifeAreaSelect') }}</option>
                  <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                    {{ area.name }}
                  </option>
                </select>
              </div>
              <button
                v-if="experientialValues.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="experientialValues.splice(index, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            variant="text"
            @click="experientialValues.push({ description: '', engagementRating: 3, lifeAreaId: '' })"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.threePathways.experiential.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'creative'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledExperientialValues.length < 3"
            @click="currentStep = 'attitudinal'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Attitudinal Values -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'attitudinal'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.attitudinal.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.threePathways.attitudinal.description') }}
          </p>
          <div v-for="(item, index) in attitudinalValues" :key="index" class="space-y-2 neo-surface p-3 rounded-xl">
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="item.description"
                  :placeholder="t('exerciseWizards.threePathways.attitudinal.placeholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <RatingSlider
                  v-model="item.engagementRating"
                  :label="t('exerciseWizards.threePathways.attitudinal.engagementLabel')"
                  :min="1"
                  :max="5"
                />
                <select
                  v-model="item.lifeAreaId"
                  class="neo-input neo-focus w-full p-2 text-sm"
                >
                  <option value="">{{ t('exerciseWizards.threePathways.attitudinal.lifeAreaSelect') }}</option>
                  <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                    {{ area.name }}
                  </option>
                </select>
              </div>
              <button
                v-if="attitudinalValues.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="attitudinalValues.splice(index, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            variant="text"
            @click="attitudinalValues.push({ description: '', engagementRating: 3, lifeAreaId: '' })"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.threePathways.attitudinal.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'experiential'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledAttitudinalValues.length < 1"
            @click="currentStep = 'synthesis'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 5: Synthesis -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'synthesis'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.synthesis.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.threePathways.synthesis.summaryText', {
              creative: filledCreativeValues.length,
              experiential: filledExperientialValues.length,
              attitudinal: filledAttitudinalValues.length
            }) }}
          </p>

          <!-- Three-column summary -->
          <div class="grid grid-cols-3 gap-3">
            <div class="neo-surface p-3 rounded-xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">{{ t('exerciseWizards.threePathways.synthesis.columnCreative') }}</p>
              <ul class="space-y-1">
                <li v-for="item in filledCreativeValues" :key="item.description" class="text-xs text-on-surface">
                  {{ item.description.slice(0, 40) }}{{ item.description.length > 40 ? '...' : '' }}
                  <span class="text-on-surface-variant">({{ item.engagementRating }}/5)</span>
                </li>
              </ul>
            </div>
            <div class="neo-surface p-3 rounded-xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">{{ t('exerciseWizards.threePathways.synthesis.columnExperiential') }}</p>
              <ul class="space-y-1">
                <li v-for="item in filledExperientialValues" :key="item.description" class="text-xs text-on-surface">
                  {{ item.description.slice(0, 40) }}{{ item.description.length > 40 ? '...' : '' }}
                  <span class="text-on-surface-variant">({{ item.engagementRating }}/5)</span>
                </li>
              </ul>
            </div>
            <div class="neo-surface p-3 rounded-xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">{{ t('exerciseWizards.threePathways.synthesis.columnAttitudinal') }}</p>
              <ul class="space-y-1">
                <li v-for="item in filledAttitudinalValues" :key="item.description" class="text-xs text-on-surface">
                  {{ item.description.slice(0, 40) }}{{ item.description.length > 40 ? '...' : '' }}
                  <span class="text-on-surface-variant">({{ item.engagementRating }}/5)</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- LLM Synthesis -->
          <div class="space-y-2">
            <AppButton
              v-if="!llmResponse && !isLlmLoading"
              variant="tonal"
              @click="handleSynthesisAssist"
            >
              <AppIcon name="auto_awesome" class="text-base mr-1" />
              {{ t('exerciseWizards.threePathways.synthesis.analyzeButton') }}
            </AppButton>
            <div v-if="isLlmLoading" class="text-sm text-on-surface-variant">{{ t('exerciseWizards.threePathways.synthesis.thinking') }}</div>
            <div v-if="llmResponse" class="neo-panel p-4">
              <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmResponse }}</p>
            </div>
            <p v-if="llmError" class="text-xs text-error">{{ llmError }}</p>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'attitudinal'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'summary'">{{ t('common.buttons.next') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 6: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.threePathways.summary.title') }}</h2>

          <!-- Creative Values -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
              {{ t('exerciseWizards.threePathways.summary.creativeHeader') }}
            </p>
            <div class="space-y-1">
              <div v-for="item in filledCreativeValues" :key="item.description" class="text-sm text-on-surface">
                {{ item.description }}
                <span class="text-on-surface-variant text-xs">{{ t('exerciseWizards.threePathways.summary.engagementLabel', { value: item.engagementRating }) }}</span>
              </div>
            </div>
          </div>

          <!-- Experiential Values -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
              {{ t('exerciseWizards.threePathways.summary.experientialHeader') }}
            </p>
            <div class="space-y-1">
              <div v-for="item in filledExperientialValues" :key="item.description" class="text-sm text-on-surface">
                {{ item.description }}
                <span class="text-on-surface-variant text-xs">{{ t('exerciseWizards.threePathways.summary.engagementLabel', { value: item.engagementRating }) }}</span>
              </div>
            </div>
          </div>

          <!-- Attitudinal Values -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
              {{ t('exerciseWizards.threePathways.summary.attitudinalHeader') }}
            </p>
            <div class="space-y-1">
              <div v-for="item in filledAttitudinalValues" :key="item.description" class="text-sm text-on-surface">
                {{ item.description }}
                <span class="text-on-surface-variant text-xs">{{ t('exerciseWizards.threePathways.summary.engagementLabel', { value: item.engagementRating }) }}</span>
              </div>
            </div>
          </div>

          <!-- LLM Synthesis -->
          <div v-if="llmResponse">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
              {{ t('exerciseWizards.threePathways.summary.aiSynthesisHeader') }}
            </p>
            <p class="text-sm text-on-surface whitespace-pre-wrap">{{ llmResponse }}</p>
          </div>

          <!-- After emotions -->
          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.threePathways.summary.emotionLabel')"
          />

          <!-- Notes -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.threePathways.summary.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.threePathways.summary.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'synthesis'">{{ t('common.buttons.back') }}</AppButton>
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
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useT } from '@/composables/useT'
import type { CreateThreePathwaysPayload, MeaningPathwayItem } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateThreePathwaysPayload]
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
type Step = 'intro' | 'creative' | 'experiential' | 'attitudinal' | 'synthesis' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.threePathways.steps.intro'),
  t('exerciseWizards.threePathways.steps.creative'),
  t('exerciseWizards.threePathways.steps.experiential'),
  t('exerciseWizards.threePathways.steps.attitudinal'),
  t('exerciseWizards.threePathways.steps.synthesis'),
  t('exerciseWizards.threePathways.steps.summary'),
])

const stepOrder: Step[] = ['intro', 'creative', 'experiential', 'attitudinal', 'synthesis', 'summary']

const currentVisualStep = computed(() => {
  return stepOrder.indexOf(currentStep.value)
})

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const emotionIdsBefore = ref<string[]>([])
const emotionIdsAfter = ref<string[]>([])
const notes = ref('')

interface PathwayItem {
  description: string
  engagementRating: number
  lifeAreaId: string
}

const creativeValues = reactive<PathwayItem[]>([
  { description: '', engagementRating: 3, lifeAreaId: '' },
  { description: '', engagementRating: 3, lifeAreaId: '' },
  { description: '', engagementRating: 3, lifeAreaId: '' },
])

const experientialValues = reactive<PathwayItem[]>([
  { description: '', engagementRating: 3, lifeAreaId: '' },
  { description: '', engagementRating: 3, lifeAreaId: '' },
  { description: '', engagementRating: 3, lifeAreaId: '' },
])

const attitudinalValues = reactive<PathwayItem[]>([
  { description: '', engagementRating: 3, lifeAreaId: '' },
])

// ─── Computed ────────────────────────────────────────────────────────────────
function toPayloadItems(items: PathwayItem[]): MeaningPathwayItem[] {
  return items
    .filter((i) => i.description.trim().length > 0)
    .map((i) => ({
      description: i.description.trim(),
      engagementRating: i.engagementRating,
      ...(i.lifeAreaId ? { lifeAreaId: i.lifeAreaId } : {}),
    }))
}

const filledCreativeValues = computed(() => toPayloadItems(creativeValues))
const filledExperientialValues = computed(() => toPayloadItems(experientialValues))
const filledAttitudinalValues = computed(() => toPayloadItems(attitudinalValues))

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isLlmLoading = ref(false)
const llmResponse = ref('')
const llmError = ref('')

async function handleSynthesisAssist() {
  isLlmLoading.value = true
  llmError.value = ''
  try {
    const { synthesizeThreePathways } = await import('@/services/logotherapyLLMAssists')

    const lifeAreaNames = lifeAreas.value.map((a) => a.name)
    const coreValues = valuesDiscoveryStore.latestDiscovery?.coreValues ?? []

    llmResponse.value = await synthesizeThreePathways({
      creativeValues: filledCreativeValues.value,
      experientialValues: filledExperientialValues.value,
      attitudinalValues: filledAttitudinalValues.value,
      lifeAreaNames: lifeAreaNames.length > 0 ? lifeAreaNames : undefined,
      coreValues: coreValues.length > 0 ? coreValues : undefined,
      locale: locale.value,
    })
  } catch (err) {
    llmError.value = err instanceof Error ? err.message : t('exerciseWizards.threePathways.errors.analyzeFailed')
  } finally {
    isLlmLoading.value = false
  }
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateThreePathwaysPayload = {
    creativeValues: filledCreativeValues.value,
    experientialValues: filledExperientialValues.value,
    attitudinalValues: filledAttitudinalValues.value,
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    llmSynthesis: llmResponse.value || undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
