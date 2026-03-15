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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.dereflection.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.dereflection.intro.description') }}
          </p>
          <div class="neo-embedded p-3">
            <p class="text-xs text-on-surface-variant italic">
              "{{ t('exerciseWizards.dereflection.intro.quote') }}"
            </p>
            <p class="text-xs text-on-surface-variant mt-1">— Viktor Frankl</p>
          </div>
          <EmotionSelector
            v-model="emotionIdsBefore"
            :label="t('exerciseWizards.dereflection.intro.emotionLabel')"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'fixation'">{{ t('common.buttons.start') }}</AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Fixation -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'fixation'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.dereflection.fixation.title') }}</h2>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.dereflection.fixation.whatLabel') }}
            </label>
            <textarea
              v-model="fixation"
              :placeholder="t('exerciseWizards.dereflection.fixation.whatPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>

          <RatingSlider
            v-model="fixationIntensity"
            :label="t('exerciseWizards.dereflection.fixation.energyLabel')"
            :min="1"
            :max="5"
          />
          <div class="flex justify-between text-xs text-on-surface-variant -mt-2">
            <span>{{ t('exerciseWizards.dereflection.fixation.energyMin') }}</span>
            <span>{{ t('exerciseWizards.dereflection.fixation.energyMax') }}</span>
          </div>

          <div>
            <label class="text-sm font-medium text-on-surface">
              {{ t('exerciseWizards.dereflection.fixation.impactLabel') }}
            </label>
            <textarea
              v-model="fixationImpact"
              :placeholder="t('exerciseWizards.dereflection.fixation.impactPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!fixation.trim() || !fixationImpact.trim()"
            @click="currentStep = 'redirections'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Redirections -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'redirections'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.dereflection.redirections.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.dereflection.redirections.description') }}
          </p>

          <!-- Suggestions from Wheel of Life / Purpose -->
          <div v-if="suggestions.length > 0 || purposeStatement" class="neo-surface p-4 rounded-xl space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.dereflection.redirections.suggestionsTitle') }}
            </p>
            <div v-if="suggestions.length > 0">
              <p class="text-xs text-on-surface-variant mb-2">
                {{ t('exerciseWizards.dereflection.redirections.suggestionsSubtext') }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="suggestion in suggestions"
                  :key="suggestion"
                  type="button"
                  class="neo-pill text-xs px-2.5 py-1 cursor-pointer hover:opacity-80"
                  @click="addSuggestionAsRedirection(suggestion)"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>
            <div v-if="purposeStatement">
              <p class="text-xs text-on-surface-variant">
                {{ t('exerciseWizards.dereflection.redirections.purposeText') }} <span class="text-on-surface font-medium italic">"{{ purposeStatement }}"</span>
              </p>
            </div>
          </div>

          <!-- Redirections list -->
          <div v-for="(item, index) in redirections" :key="index" class="space-y-2 neo-surface p-3 rounded-xl">
            <div class="flex items-start gap-2">
              <span class="text-xs font-semibold text-on-surface-variant mt-2">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <textarea
                  v-model="item.description"
                  :placeholder="t('exerciseWizards.dereflection.redirections.activityPlaceholder')"
                  class="neo-input neo-focus w-full p-3 text-sm resize-none"
                  rows="2"
                />
                <select
                  v-model="item.lifeAreaId"
                  class="neo-input neo-focus w-full p-2 text-sm"
                >
                  <option value="">{{ t('exerciseWizards.dereflection.redirections.lifeAreaSelect') }}</option>
                  <option v-for="area in lifeAreas" :key="area.id" :value="area.id">
                    {{ area.name }}
                  </option>
                </select>
              </div>
              <button
                v-if="redirections.length > 1"
                type="button"
                class="p-1 text-on-surface-variant hover:text-error"
                @click="redirections.splice(index, 1)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </div>
          <AppButton
            variant="text"
            @click="redirections.push({ description: '', lifeAreaId: '' })"
          >
            <AppIcon name="add" class="text-base mr-1" />
            {{ t('exerciseWizards.dereflection.redirections.addAnother') }}
          </AppButton>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'fixation'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="filledRedirections.length < 3"
            @click="currentStep = 'commit'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Commit -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'commit'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.dereflection.commit.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.dereflection.commit.description') }}
          </p>

          <div v-for="(item, index) in filledRedirections" :key="index" class="space-y-2">
            <label class="flex items-start gap-3 neo-surface p-3 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                :checked="chosenRedirections.includes(item.description)"
                class="mt-1 neo-checkbox"
                @change="toggleChosen(item.description)"
              />
              <span class="text-sm text-on-surface">{{ item.description }}</span>
            </label>
            <div
              v-if="chosenRedirections.includes(item.description)"
              class="pl-8 space-y-2"
            >
              <div>
                <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.dereflection.commit.whenLabel') }}</label>
                <input
                  v-model="commitPlans[item.description + '_when']"
                  type="text"
                  :placeholder="t('exerciseWizards.dereflection.commit.whenPlaceholder')"
                  class="neo-input neo-focus w-full p-2 text-sm mt-0.5"
                />
              </div>
              <div>
                <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.dereflection.commit.pullbackLabel') }}</label>
                <input
                  v-model="commitPlans[item.description + '_fallback']"
                  type="text"
                  :placeholder="t('exerciseWizards.dereflection.commit.pullbackPlaceholder')"
                  class="neo-input neo-focus w-full p-2 text-sm mt-0.5"
                />
              </div>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'redirections'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="chosenRedirections.length === 0"
            @click="currentStep = 'summary'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.dereflection.summary.title') }}</h2>

          <!-- Fixation -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.dereflection.summary.fixationHeader') }}</p>
            <p class="text-sm text-on-surface">{{ fixation }}</p>
            <p class="text-xs text-on-surface-variant mt-1">
              {{ t('exerciseWizards.dereflection.summary.intensityLabel', { value: fixationIntensity, impact: fixationImpact }) }}
            </p>
          </div>

          <!-- Redirections -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">{{ t('exerciseWizards.dereflection.summary.redirectionsHeader') }}</p>
            <div class="space-y-1">
              <div v-for="item in filledRedirections" :key="item.description" class="text-sm text-on-surface">
                {{ item.description }}
                <span v-if="item.lifeAreaId" class="text-xs text-on-surface-variant">
                  ({{ getLifeAreaName(item.lifeAreaId) }})
                </span>
              </div>
            </div>
          </div>

          <!-- Chosen commitments -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-1">
              {{ t('exerciseWizards.dereflection.summary.commitmentsHeader') }}
            </p>
            <div class="space-y-1">
              <div v-for="chosen in chosenRedirections" :key="chosen" class="text-sm text-on-surface">
                {{ chosen }}
              </div>
            </div>
          </div>

          <!-- After emotions -->
          <EmotionSelector
            v-model="emotionIdsAfter"
            :label="t('exerciseWizards.dereflection.summary.emotionLabel')"
          />

          <!-- Notes -->
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.dereflection.summary.notesLabel') }}
            </label>
            <textarea
              v-model="notes"
              :placeholder="t('exerciseWizards.dereflection.summary.notesPlaceholder')"
              class="neo-input neo-focus w-full p-3 text-sm resize-none mt-1"
              rows="3"
            />
          </div>
        </AppCard>
        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'commit'">{{ t('common.buttons.back') }}</AppButton>
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
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useTransformativePurposeStore } from '@/stores/transformativePurpose.store'
import { useT } from '@/composables/useT'
import type { CreateDereflectionPayload, DereflectionRedirection } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateDereflectionPayload]
}>()

const { t } = useT()
const lifeAreaStore = useLifeAreaStore()
const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
const purposeStore = useTransformativePurposeStore()

onMounted(() => {
  lifeAreaStore.loadLifeAreas()
  lifeAreaAssessmentStore.loadAssessments()
  purposeStore.loadPurposes()
})

const lifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)

// Suggestions from Wheel of Life (high-satisfaction areas)
const suggestions = computed(() => {
  const latest = lifeAreaAssessmentStore.latestFullAssessment
  if (!latest) return []
  return latest.items
    .filter((item) => item.score >= 7)
    .map((item) => item.lifeAreaNameSnapshot)
})

const purposeStatement = computed(() => {
  return purposeStore.latestPurpose?.purposeStatement ?? ''
})

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'fixation' | 'redirections' | 'commit' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.dereflection.steps.intro'),
  t('exerciseWizards.dereflection.steps.fixation'),
  t('exerciseWizards.dereflection.steps.redirections'),
  t('exerciseWizards.dereflection.steps.commit'),
  t('exerciseWizards.dereflection.steps.summary'),
])

const stepOrder: Step[] = ['intro', 'fixation', 'redirections', 'commit', 'summary']

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
const fixation = ref('')
const fixationIntensity = ref(3)
const fixationImpact = ref('')

interface RedirectionItem {
  description: string
  lifeAreaId: string
}

const redirections = reactive<RedirectionItem[]>([
  { description: '', lifeAreaId: '' },
  { description: '', lifeAreaId: '' },
  { description: '', lifeAreaId: '' },
])

const chosenRedirections = ref<string[]>([])
const commitPlans = reactive<Record<string, string>>({})

// ─── Computed ────────────────────────────────────────────────────────────────
const filledRedirections = computed(() => {
  return redirections.filter((r) => r.description.trim().length > 0)
})

function toPayloadRedirections(items: RedirectionItem[]): DereflectionRedirection[] {
  return items
    .filter((r) => r.description.trim().length > 0)
    .map((r) => ({
      description: r.description.trim(),
      ...(r.lifeAreaId ? { lifeAreaId: r.lifeAreaId } : {}),
    }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toggleChosen(description: string) {
  const idx = chosenRedirections.value.indexOf(description)
  if (idx >= 0) {
    chosenRedirections.value.splice(idx, 1)
  } else {
    chosenRedirections.value.push(description)
  }
}

function addSuggestionAsRedirection(suggestion: string) {
  // Add to first empty slot or append
  const emptyIdx = redirections.findIndex((r) => r.description.trim() === '')
  if (emptyIdx >= 0) {
    redirections[emptyIdx].description = suggestion
  } else {
    redirections.push({ description: suggestion, lifeAreaId: '' })
  }
}

function getLifeAreaName(id: string): string {
  return lifeAreaStore.sortedLifeAreas.find((a) => a.id === id)?.name ?? 'Unknown'
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateDereflectionPayload = {
    fixation: fixation.value.trim(),
    fixationIntensity: fixationIntensity.value,
    fixationImpact: fixationImpact.value.trim(),
    redirections: toPayloadRedirections(redirections),
    chosenRedirections: [...chosenRedirections.value],
    emotionIdsBefore: emotionIdsBefore.value.length > 0 ? [...emotionIdsBefore.value] : undefined,
    emotionIdsAfter: emotionIdsAfter.value.length > 0 ? [...emotionIdsAfter.value] : undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
