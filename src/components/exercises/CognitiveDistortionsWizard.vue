<template>
  <div class="space-y-6">
    <!-- Mode Toggle -->
    <div class="flex justify-center">
      <div class="neo-segmented">
        <button
          type="button"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': mode === 'learning' }"
          @click="switchMode('learning')"
        >
          {{ t('exerciseWizards.cognitiveDistortions.modeToggle.learning') }}
        </button>
        <button
          type="button"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': mode === 'applied' }"
          @click="switchMode('applied')"
        >
          {{ t('exerciseWizards.cognitiveDistortions.modeToggle.applied') }}
        </button>
      </div>
    </div>

    <!-- Step indicator -->
    <div class="flex items-center justify-center gap-2">
      <button
        v-for="(_label, idx) in currentStepLabels"
        :key="idx"
        type="button"
        class="w-8 h-8 rounded-full text-xs font-semibold transition-all neo-focus"
        :class="stepCircleClass(idx)"
        @click="idx < step && (step = idx)"
      >
        {{ idx + 1 }}
      </button>
    </div>

    <!-- ================================================================ -->
    <!-- LEARNING MODE                                                     -->
    <!-- ================================================================ -->
    <template v-if="mode === 'learning'">
      <!-- Learning Step 1: Intro -->
      <template v-if="step === 0">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.learningIntro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.cognitiveDistortions.learningIntro.description1') }}
          </p>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.cognitiveDistortions.learningIntro.description2') }}
          </p>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="step = 1">
            {{ t('exerciseWizards.cognitiveDistortions.learningIntro.startButton') }}
          </AppButton>
        </div>
      </template>

      <!-- Learning Step 2: Distortion Cards Carousel -->
      <template v-if="step === 1">
        <AppCard padding="lg" class="space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-on-surface">{{ currentDistortion.name }}</h2>
            <span class="text-xs font-medium text-on-surface-variant">
              {{ t('exerciseWizards.cognitiveDistortions.carousel.ofCount', { current: carouselIndex + 1, total: distortions.length }) }}
            </span>
          </div>

          <!-- Aliases -->
          <p v-if="currentDistortion.aliases.length" class="text-xs text-on-surface-variant italic">
            {{ t('exerciseWizards.cognitiveDistortions.carousel.alsoKnownAs', { aliases: currentDistortion.aliases.join(', ') }) }}
          </p>

          <!-- Definition -->
          <p class="text-sm text-on-surface leading-relaxed">
            {{ currentDistortion.definition }}
          </p>

          <!-- Example -->
          <div class="neo-embedded p-4">
            <p class="text-xs font-semibold text-on-surface-variant mb-1">{{ t('exerciseWizards.cognitiveDistortions.carousel.example') }}</p>
            <p class="text-sm text-on-surface italic">{{ currentDistortion.example }}</p>
          </div>

          <!-- Sounds like -->
          <div>
            <p class="text-xs font-semibold text-on-surface-variant mb-1">{{ t('exerciseWizards.cognitiveDistortions.carousel.soundsLike') }}</p>
            <p class="text-sm text-on-surface">{{ currentDistortion.soundsLike }}</p>
          </div>

          <!-- Reality check -->
          <div>
            <p class="text-xs font-semibold text-on-surface-variant mb-1">{{ t('exerciseWizards.cognitiveDistortions.carousel.realityCheck') }}</p>
            <p class="text-sm text-on-surface">{{ currentDistortion.realityCheck }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton
            variant="text"
            :disabled="carouselIndex === 0"
            @click="carouselIndex--"
          >
            {{ t('exerciseWizards.cognitiveDistortions.carousel.previous') }}
          </AppButton>
          <AppButton
            v-if="carouselIndex < distortions.length - 1"
            variant="text"
            @click="carouselIndex++"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
          <AppButton
            v-else
            variant="filled"
            @click="step = 2"
          >
            {{ t('exerciseWizards.cognitiveDistortions.carousel.selfCheckButton') }}
          </AppButton>
        </div>
      </template>

      <!-- Learning Step 3: Self-Check -->
      <template v-if="step === 2">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.selfCheck.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.cognitiveDistortions.selfCheck.description') }}
          </p>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="d in distortions"
              :key="d.id"
              type="button"
              class="neo-pill px-3 py-1.5 text-xs font-medium neo-focus"
              :class="{ 'neo-pill--primary': learningDraft.recognizedIds.has(d.id) }"
              @click="toggleRecognized(d.id)"
            >
              {{ d.name }}
            </button>
          </div>
        </AppCard>

        <!-- Personal reflections per selected distortion -->
        <template v-if="learningDraft.recognizedIds.size > 0">
          <AppCard padding="lg" class="space-y-4">
            <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.selfCheck.personalReflections') }}</h3>
            <p class="text-sm text-on-surface-variant">
              {{ t('exerciseWizards.cognitiveDistortions.selfCheck.personalReflectionsDescription') }}
            </p>
            <div class="space-y-3">
              <div
                v-for="id in sortedRecognizedIds"
                :key="id"
                class="space-y-1"
              >
                <label class="text-xs font-semibold text-on-surface-variant">
                  {{ distortionById(id)?.name }}
                </label>
                <textarea
                  :value="learningDraft.personalExamples[id] ?? ''"
                  rows="2"
                  :placeholder="t('exerciseWizards.cognitiveDistortions.selfCheck.personalExamplePlaceholder')"
                  class="neo-input w-full p-2 text-sm resize-none"
                  @input="learningDraft.personalExamples[id] = ($event.target as HTMLTextAreaElement).value"
                />
              </div>
            </div>
          </AppCard>
        </template>

        <div class="flex justify-between">
          <AppButton variant="text" @click="step = 1">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="learningDraft.recognizedIds.size === 0"
            @click="step = 3"
          >
            {{ t('exerciseWizards.cognitiveDistortions.selfCheck.seeSummary') }}
          </AppButton>
        </div>
      </template>

      <!-- Learning Step 4: Summary -->
      <template v-if="step === 3">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.learningSummary.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.cognitiveDistortions.learningSummary.recognizedCount', { recognized: learningDraft.recognizedIds.size, total: distortions.length }) }}
          </p>

          <div class="space-y-3">
            <div
              v-for="id in sortedRecognizedIds"
              :key="id"
              class="neo-embedded p-3 space-y-1"
            >
              <p class="text-sm font-semibold text-on-surface">{{ distortionById(id)?.name }}</p>
              <p
                v-if="learningDraft.personalExamples[id]"
                class="text-xs text-on-surface-variant italic"
              >
                {{ learningDraft.personalExamples[id] }}
              </p>
            </div>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="step = 2">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleLearningSave">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </template>
    </template>

    <!-- ================================================================ -->
    <!-- APPLIED MODE                                                      -->
    <!-- ================================================================ -->
    <template v-if="mode === 'applied'">
      <!-- Applied Step 1: Enter Thought -->
      <template v-if="step === 0">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.appliedThought.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.cognitiveDistortions.appliedThought.description') }}
          </p>

          <!-- Source type (manual only for now) -->
          <div class="flex items-center gap-2">
            <span class="neo-pill px-3 py-1 text-xs font-medium neo-pill--primary">{{ t('exerciseWizards.cognitiveDistortions.appliedThought.manualLabel') }}</span>
          </div>

          <textarea
            v-model="appliedDraft.thought"
            rows="4"
            :placeholder="t('exerciseWizards.cognitiveDistortions.appliedThought.placeholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>
        <div class="flex justify-end">
          <AppButton
            variant="filled"
            :disabled="!appliedDraft.thought.trim()"
            @click="step = 1"
          >
            {{ t('exerciseWizards.cognitiveDistortions.appliedThought.analyseButton') }}
          </AppButton>
        </div>
      </template>

      <!-- Applied Step 2: Select Distortions -->
      <template v-if="step === 1">
        <AppCard padding="lg" class="space-y-3">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.appliedDistortions.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.cognitiveDistortions.appliedDistortions.description') }}
          </p>
          <div class="neo-embedded p-3">
            <p class="text-sm text-on-surface italic">"{{ appliedDraft.thought }}"</p>
          </div>
        </AppCard>

        <!-- Selectable distortion cards -->
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="d in distortions"
            :key="d.id"
            type="button"
            class="text-left p-4 transition-all neo-focus"
            :class="appliedDraft.selectedIds.has(d.id)
              ? 'neo-selector--active'
              : 'neo-selector'"
            @click="toggleAppliedDistortion(d.id)"
          >
            <p class="text-sm font-semibold text-on-surface">{{ d.name }}</p>
            <p class="text-xs text-on-surface-variant mt-0.5">{{ d.definition }}</p>
          </button>
        </div>

        <!-- Explanation fields for selected distortions -->
        <template v-if="appliedDraft.selectedIds.size > 0">
          <AppCard padding="lg" class="space-y-4">
            <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.appliedDistortions.whyApply') }}</h3>
            <div class="space-y-3">
              <div
                v-for="id in sortedAppliedIds"
                :key="id"
                class="space-y-1"
              >
                <label class="text-xs font-semibold text-on-surface-variant">
                  {{ distortionById(id)?.name }}
                </label>
                <textarea
                  :value="appliedDraft.explanations[id] ?? ''"
                  rows="2"
                  :placeholder="t('exerciseWizards.cognitiveDistortions.appliedDistortions.explanationPlaceholder')"
                  class="neo-input w-full p-2 text-sm resize-none"
                  @input="appliedDraft.explanations[id] = ($event.target as HTMLTextAreaElement).value"
                />
              </div>
            </div>
          </AppCard>
        </template>

        <!-- LLM Assist -->
        <AppCard padding="lg" class="space-y-3">
          <AppButton
            variant="tonal"
            :disabled="llmLoading"
            @click="handleLLMAssist"
          >
            <SparklesIcon class="w-5 h-5" />
            {{ llmLoading ? t('exerciseWizards.cognitiveDistortions.appliedDistortions.llmLoading') : t('exerciseWizards.cognitiveDistortions.appliedDistortions.llmLabel') }}
          </AppButton>

          <div
            v-if="llmResponse"
            class="neo-panel mt-3"
          >
            <p class="text-xs font-semibold text-on-surface-variant mb-2">{{ t('exerciseWizards.cognitiveDistortions.appliedDistortions.aiSuggestions') }}</p>
            <p class="text-sm text-on-surface whitespace-pre-line">{{ llmResponse }}</p>
          </div>
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="step = 0">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="appliedDraft.selectedIds.size === 0"
            @click="step = 2"
          >
            {{ t('exerciseWizards.cognitiveDistortions.appliedDistortions.seeResults') }}
          </AppButton>
        </div>
      </template>

      <!-- Applied Step 3: Results + Save -->
      <template v-if="step === 2">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.appliedResults.title') }}</h2>
          <div class="neo-embedded p-3">
            <p class="text-sm text-on-surface italic">"{{ appliedDraft.thought }}"</p>
          </div>

          <div class="space-y-4 mt-2">
            <div
              v-for="id in sortedAppliedIds"
              :key="id"
              class="neo-embedded p-3 space-y-2"
            >
              <p class="text-sm font-semibold text-on-surface">{{ distortionById(id)?.name }}</p>
              <p
                v-if="appliedDraft.explanations[id]"
                class="text-xs text-on-surface-variant"
              >
                {{ appliedDraft.explanations[id] }}
              </p>

              <!-- Reframe field -->
              <div class="space-y-1 mt-1">
                <label class="text-xs font-semibold text-on-surface-variant">{{ t('exerciseWizards.cognitiveDistortions.appliedResults.reframe') }}</label>
                <textarea
                  :value="appliedDraft.reframes[id] ?? ''"
                  rows="2"
                  :placeholder="t('exerciseWizards.cognitiveDistortions.appliedResults.reframePlaceholder')"
                  class="neo-input w-full p-2 text-sm resize-none"
                  @input="appliedDraft.reframes[id] = ($event.target as HTMLTextAreaElement).value"
                />
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Notes -->
        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.cognitiveDistortions.appliedResults.additionalNotes') }}</h3>
          <textarea
            v-model="appliedDraft.notes"
            rows="3"
            :placeholder="t('exerciseWizards.cognitiveDistortions.appliedResults.notesPlaceholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="step = 1">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleAppliedSave">
            {{ t('common.buttons.save') }}
          </AppButton>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { SparklesIcon } from '@heroicons/vue/24/solid'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { spotDistortions } from '@/services/cbtLLMAssists'
import { useT } from '@/composables/useT'
import distortionsMeta from '@/data/cognitiveDistortions-meta.json'
import enDistortions from '@/locales/en/distortions.json'
import plDistortions from '@/locales/pl/distortions.json'
import type {
  CognitiveDistortion,
  CreateDistortionAssessmentPayload,
  IdentifiedDistortion,
} from '@/domain/exercises'

const { t, locale } = useT()

type DistortionTranslation = { name: string; aliases: string[]; definition: string; example: string; soundsLike: string; realityCheck: string }
const translationsByLocale: Record<string, Record<string, DistortionTranslation>> = { en: enDistortions, pl: plDistortions }

const distortions = computed<CognitiveDistortion[]>(() => {
  const loc = translationsByLocale[locale.value] ?? translationsByLocale['en']
  return distortionsMeta.map((meta) => {
    const trans = (loc as Record<string, DistortionTranslation>)[meta.id] ?? (translationsByLocale['en'] as Record<string, DistortionTranslation>)[meta.id]
    return {
      id: meta.id,
      name: trans?.name ?? meta.id,
      aliases: trans?.aliases ?? [],
      definition: trans?.definition ?? '',
      example: trans?.example ?? '',
      soundsLike: trans?.soundsLike ?? '',
      realityCheck: trans?.realityCheck ?? '',
    }
  })
})

const emit = defineEmits<{
  saved: [data: CreateDistortionAssessmentPayload]
}>()

// ── Mode & step ──────────────────────────────────────────────────────────
const mode = ref<'learning' | 'applied'>('learning')
const step = ref(0)

const learningStepLabels = computed(() => [
  t('exerciseWizards.cognitiveDistortions.learningSteps.intro'),
  t('exerciseWizards.cognitiveDistortions.learningSteps.learn'),
  t('exerciseWizards.cognitiveDistortions.learningSteps.selfCheck'),
  t('exerciseWizards.cognitiveDistortions.learningSteps.summary'),
])
const appliedStepLabels = computed(() => [
  t('exerciseWizards.cognitiveDistortions.appliedSteps.thought'),
  t('exerciseWizards.cognitiveDistortions.appliedSteps.distortions'),
  t('exerciseWizards.cognitiveDistortions.appliedSteps.results'),
])

const currentStepLabels = computed(() =>
  mode.value === 'learning' ? learningStepLabels.value : appliedStepLabels.value,
)

function switchMode(newMode: 'learning' | 'applied') {
  mode.value = newMode
  step.value = 0
}

function stepCircleClass(idx: number): string {
  if (idx === step.value) return 'neo-step-active'
  if (idx < step.value) return 'neo-step-completed cursor-pointer'
  return 'neo-step-future'
}

// ── Helpers ──────────────────────────────────────────────────────────────
function distortionById(id: string): CognitiveDistortion | undefined {
  return distortions.value.find((d) => d.id === id)
}

// ── Learning mode state ──────────────────────────────────────────────────
const carouselIndex = ref(0)

const currentDistortion = computed(() => distortions.value[carouselIndex.value])

const learningDraft = reactive({
  recognizedIds: new Set<string>(),
  personalExamples: {} as Record<string, string>,
})

const sortedRecognizedIds = computed(() =>
  distortions.value.filter((d) => learningDraft.recognizedIds.has(d.id)).map((d) => d.id),
)

function toggleRecognized(id: string) {
  if (learningDraft.recognizedIds.has(id)) {
    learningDraft.recognizedIds.delete(id)
    delete learningDraft.personalExamples[id]
  } else {
    learningDraft.recognizedIds.add(id)
  }
}

function handleLearningSave() {
  const personalExamples: Record<string, string> = {}
  for (const id of learningDraft.recognizedIds) {
    const ex = learningDraft.personalExamples[id]?.trim()
    if (ex) personalExamples[id] = ex
  }

  const payload: CreateDistortionAssessmentPayload = {
    mode: 'learning',
    recognizedDistortionIds: [...learningDraft.recognizedIds],
    personalExamples: Object.keys(personalExamples).length > 0 ? personalExamples : undefined,
  }
  emit('saved', payload)
}

// ── Applied mode state ───────────────────────────────────────────────────
const appliedDraft = reactive({
  thought: '',
  selectedIds: new Set<string>(),
  explanations: {} as Record<string, string>,
  reframes: {} as Record<string, string>,
  notes: '',
})

const llmLoading = ref(false)
const llmResponse = ref('')
const llmUsed = ref(false)

const sortedAppliedIds = computed(() =>
  distortions.value.filter((d) => appliedDraft.selectedIds.has(d.id)).map((d) => d.id),
)

function toggleAppliedDistortion(id: string) {
  if (appliedDraft.selectedIds.has(id)) {
    appliedDraft.selectedIds.delete(id)
    delete appliedDraft.explanations[id]
    delete appliedDraft.reframes[id]
  } else {
    appliedDraft.selectedIds.add(id)
  }
}

async function handleLLMAssist() {
  if (!appliedDraft.thought.trim()) return
  llmLoading.value = true
  try {
    llmResponse.value = await spotDistortions({ thought: appliedDraft.thought, locale: locale.value })
    llmUsed.value = true
  } catch (err) {
    console.error('LLM assist failed:', err)
    llmResponse.value = t('errors.generic.somethingWentWrong')
  } finally {
    llmLoading.value = false
  }
}

function handleAppliedSave() {
  const identifiedDistortions: IdentifiedDistortion[] = [...appliedDraft.selectedIds].map(
    (id) => ({
      distortionId: id,
      explanation: appliedDraft.explanations[id]?.trim() ?? '',
      reframe: appliedDraft.reframes[id]?.trim() || undefined,
    }),
  )

  const payload: CreateDistortionAssessmentPayload = {
    mode: 'applied',
    thought: appliedDraft.thought,
    sourceType: 'manual',
    identifiedDistortions,
    llmAssistUsed: llmUsed.value,
    notes: appliedDraft.notes.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
