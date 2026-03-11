<template>
  <div class="space-y-6">
    <!-- Step indicator dots (intro excluded from dots) -->
    <div v-if="currentStep !== 'intro'" class="flex flex-col items-center gap-2">
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
                ? 'neo-step-active w-3.5 h-3.5'
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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.gradedExposure.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.gradedExposure.intro.fearLadder') }}
            </p>
            <!-- Simple visual: low → high anxiety ladder -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-3">
                <span class="w-16 text-right text-xs font-medium text-red-600">{{ t('exerciseWizards.gradedExposure.intro.high') }}</span>
                <div class="flex-1 h-3 rounded-full bg-red-100" />
              </div>
              <div class="flex items-center gap-3">
                <span class="w-16 text-right text-xs font-medium text-amber-600">{{ t('exerciseWizards.gradedExposure.intro.medium') }}</span>
                <div class="flex-1 h-3 rounded-full bg-amber-100" />
              </div>
              <div class="flex items-center gap-3">
                <span class="w-16 text-right text-xs font-medium text-emerald-600">{{ t('exerciseWizards.gradedExposure.intro.low') }}</span>
                <div class="flex-1 h-3 rounded-full bg-emerald-100" />
              </div>
            </div>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              {{ t('exerciseWizards.gradedExposure.intro.ladderDescription') }}
            </p>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'fear-target'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Fear Target -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'fear-target'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.fearTarget.fearTitle') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.gradedExposure.fearTarget.fearDescription') }}
          </p>
          <textarea
            v-model="fearTarget"
            rows="3"
            :placeholder="t('exerciseWizards.gradedExposure.fearTarget.fearPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.fearTarget.goalTitle') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.gradedExposure.fearTarget.goalDescription') }}
          </p>
          <textarea
            v-model="ultimateGoal"
            rows="3"
            :placeholder="t('exerciseWizards.gradedExposure.fearTarget.goalPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="!fearTarget.trim() || !ultimateGoal.trim()"
            @click="currentStep = 'build-hierarchy'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Build Hierarchy -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'build-hierarchy'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.buildHierarchy.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.gradedExposure.buildHierarchy.description') }}
          </p>

          <!-- Add new item form -->
          <div class="space-y-3">
            <input
              v-model="newItemSituation"
              type="text"
              :placeholder="t('exerciseWizards.gradedExposure.buildHierarchy.situationPlaceholder')"
              class="neo-input neo-focus w-full p-2.5 text-sm"
              @keyup.enter="addItem"
            />
            <div class="space-y-2">
              <label class="text-sm font-medium text-on-surface">
                {{ t('exerciseWizards.gradedExposure.buildHierarchy.distressLabel') }} <span :class="sudsColorClass(newItemSuds)" class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">{{ newItemSuds }}</span>
              </label>
              <input
                v-model.number="newItemSuds"
                type="range"
                min="0"
                max="100"
                step="1"
                class="neo-focus w-full accent-primary"
              />
              <div class="flex justify-between text-xs text-on-surface-variant">
                <span>{{ t('exerciseWizards.gradedExposure.buildHierarchy.distressMin') }}</span>
                <span>{{ t('exerciseWizards.gradedExposure.buildHierarchy.distressMax') }}</span>
              </div>
            </div>
            <AppButton
              variant="tonal"
              :disabled="!newItemSituation.trim()"
              @click="addItem"
            >
              <PlusIcon class="w-4 h-4" />
              {{ t('exerciseWizards.gradedExposure.buildHierarchy.addToLadder') }}
            </AppButton>
          </div>

          <!-- LLM Assist: Brainstorm Steps -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="isBrainstormLoading"
              @click="handleBrainstormSteps"
            >
              <SparklesIcon class="w-4 h-4" />
              {{ isBrainstormLoading ? t('exerciseWizards.gradedExposure.buildHierarchy.llmLoading') : t('exerciseWizards.gradedExposure.buildHierarchy.llmLabel') }}
            </AppButton>
            <div v-if="brainstormResult" class="neo-panel p-4 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.gradedExposure.buildHierarchy.suggestedSteps') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ brainstormResult }}</p>
            </div>
            <p v-if="brainstormError" class="text-xs text-error">{{ brainstormError }}</p>
          </div>
        </AppCard>

        <!-- Fear ladder visualization -->
        <AppCard v-if="sortedItems.length > 0" padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('exerciseWizards.gradedExposure.buildHierarchy.yourLadder') }} ({{ items.length }})
          </h3>

          <div class="relative">
            <!-- Connecting line on left -->
            <div
              v-if="sortedItems.length > 1"
              class="absolute left-[19px] top-4 bottom-4 w-0.5 bg-neu-border/30"
            />

            <!-- Items sorted low → high -->
            <div class="space-y-3">
              <div
                v-for="(item, idx) in sortedItems"
                :key="item.id"
                class="relative flex items-start gap-3 group"
              >
                <!-- Step dot -->
                <div
                  class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  :class="sudsColorClass(item.sudsRating)"
                >
                  {{ item.sudsRating }}
                </div>

                <!-- Item content -->
                <div class="flex-1 min-w-0 pt-2">
                  <p class="text-sm text-on-surface">{{ item.situation }}</p>
                  <p class="text-xs text-on-surface-variant mt-0.5">
                    {{ t('exerciseWizards.gradedExposure.buildHierarchy.stepOfTotal', { step: idx + 1, total: sortedItems.length }) }}
                  </p>
                </div>

                <!-- Remove button -->
                <button
                  type="button"
                  class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-2"
                  @click="removeItem(item.id)"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Tip panel -->
        <div class="neo-panel p-4 space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{{ t('exerciseWizards.gradedExposure.buildHierarchy.tipTitle') }}</p>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.gradedExposure.buildHierarchy.tipDescription') }}
          </p>
        </div>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'fear-target'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="items.length < 3"
            @click="currentStep = 'safety-behaviors'"
          >
            {{ t('common.buttons.next') }}
            <span v-if="items.length < 3" class="text-xs ml-1 opacity-70">
              {{ t('exerciseWizards.gradedExposure.buildHierarchy.moreNeeded', { n: 3 - items.length }) }}
            </span>
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Safety Behaviors -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'safety-behaviors'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.gradedExposure.safetyBehaviors.description') }}
          </p>

          <div class="space-y-2">
            <div
              v-for="(behavior, index) in safetyBehaviors"
              :key="index"
              class="flex items-center gap-2 group"
            >
              <span class="text-primary text-sm flex-shrink-0">&#8226;</span>
              <input
                :value="behavior"
                type="text"
                :placeholder="t('exerciseWizards.gradedExposure.safetyBehaviors.placeholder')"
                class="neo-input neo-focus flex-1 p-2 text-sm"
                @input="safetyBehaviors[index] = ($event.target as HTMLInputElement).value"
              />
              <button
                v-if="safetyBehaviors.length > 1"
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                @click="removeSafetyBehavior(index)"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
            <AppButton variant="text" @click="safetyBehaviors.push('')">
              <PlusIcon class="w-4 h-4" />
              {{ t('exerciseWizards.gradedExposure.safetyBehaviors.addBehavior') }}
            </AppButton>
          </div>
        </AppCard>

        <!-- Examples -->
        <div class="neo-embedded p-4 space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('exerciseWizards.gradedExposure.safetyBehaviors.commonExamples') }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.avoidingEyeContact') }}</span>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.exitPlan') }}</span>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.bringingFriend') }}</span>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.checkingPhone') }}</span>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.overPreparing') }}</span>
            <span class="neo-pill px-2.5 py-0.5 text-xs">{{ t('exerciseWizards.gradedExposure.safetyBehaviors.examples.usingSubstances') }}</span>
          </div>
        </div>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'build-hierarchy'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
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
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.summary.title') }}</h2>

          <!-- Fear target & goal -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.gradedExposure.summary.fearTarget') }}
            </p>
            <p class="text-sm text-on-surface">{{ fearTarget }}</p>
          </div>

          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.gradedExposure.summary.ultimateGoal') }}
            </p>
            <p class="text-sm text-on-surface">{{ ultimateGoal }}</p>
          </div>

          <!-- Full fear ladder -->
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.gradedExposure.summary.fearLadder', { count: sortedItems.length }) }}
            </p>
            <div class="relative">
              <!-- Connecting line -->
              <div
                v-if="sortedItems.length > 1"
                class="absolute left-[15px] top-3 bottom-3 w-0.5 bg-neu-border/30"
              />

              <div class="space-y-2">
                <div
                  v-for="item in sortedItems"
                  :key="item.id"
                  class="relative flex items-center gap-3"
                >
                  <div
                    class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    :class="sudsColorClass(item.sudsRating)"
                  >
                    {{ item.sudsRating }}
                  </div>
                  <span class="text-sm text-on-surface">{{ item.situation }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Safety behaviors -->
          <div v-if="filledSafetyBehaviors.length > 0" class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.gradedExposure.summary.safetyBehaviors') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="behavior in filledSafetyBehaviors"
                :key="behavior"
                class="text-xs text-on-surface"
              >
                &#8226; {{ behavior }}
              </li>
            </ul>
          </div>
        </AppCard>

        <!-- Notes (optional) -->
        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.gradedExposure.summary.notesTitle') }}</h3>
          <textarea
            v-model="notes"
            rows="2"
            :placeholder="t('exerciseWizards.gradedExposure.summary.notesPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'safety-behaviors'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">
            {{ t('exerciseWizards.gradedExposure.summary.saveHierarchy') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { CreateGradedExposureHierarchyPayload, ExposureItem } from '@/domain/exercises'

const emit = defineEmits<{
  saved: [data: CreateGradedExposureHierarchyPayload]
}>()

const { t, locale } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'fear-target' | 'build-hierarchy' | 'safety-behaviors' | 'summary'
const currentStep = ref<Step>('intro')

// Step dots (intro excluded from dots)
const stepLabels = computed(() => [
  t('exerciseWizards.gradedExposure.steps.fear'),
  t('exerciseWizards.gradedExposure.steps.buildLadder'),
  t('exerciseWizards.gradedExposure.steps.safety'),
  t('exerciseWizards.gradedExposure.steps.summary'),
])

const currentVisualStep = computed(() => {
  switch (currentStep.value) {
    case 'fear-target':
      return 0
    case 'build-hierarchy':
      return 1
    case 'safety-behaviors':
      return 2
    case 'summary':
      return 3
    default:
      return 0
  }
})

function goToStepByIndex(idx: number) {
  const stepMap: Step[] = ['fear-target', 'build-hierarchy', 'safety-behaviors', 'summary']
  if (idx >= 0 && idx < stepMap.length) {
    currentStep.value = stepMap[idx]
  }
}

// ─── Form State ──────────────────────────────────────────────────────────────
const fearTarget = ref('')
const ultimateGoal = ref('')
const items = ref<ExposureItem[]>([])
const newItemSituation = ref('')
const newItemSuds = ref(50)
const safetyBehaviors = ref<string[]>([''])
const notes = ref('')

// ─── Computed ────────────────────────────────────────────────────────────────
const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => a.sudsRating - b.sudsRating)
})

const filledSafetyBehaviors = computed(() =>
  safetyBehaviors.value.filter((b) => b.trim().length > 0),
)

// ─── LLM Assist ──────────────────────────────────────────────────────────────
const isBrainstormLoading = ref(false)
const brainstormResult = ref('')
const brainstormError = ref('')

async function handleBrainstormSteps() {
  if (!fearTarget.value.trim() || !ultimateGoal.value.trim()) return
  isBrainstormLoading.value = true
  brainstormError.value = ''
  try {
    const { brainstormExposureSteps } = await import('@/services/cbtLLMAssists')
    brainstormResult.value = await brainstormExposureSteps({
      fearTarget: fearTarget.value,
      ultimateGoal: ultimateGoal.value,
      existingItems: items.value.length > 0
        ? items.value.map((item) => ({ situation: item.situation, sudsRating: item.sudsRating }))
        : undefined,
      locale: locale.value,
    })
  } catch (err) {
    brainstormError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isBrainstormLoading.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sudsColorClass(rating: number): string {
  if (rating <= 30) return 'bg-emerald-100 text-emerald-700'
  if (rating <= 60) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function addItem() {
  if (!newItemSituation.value.trim()) return
  items.value.push({
    id: crypto.randomUUID(),
    situation: newItemSituation.value.trim(),
    sudsRating: newItemSuds.value,
    completed: false,
    attempts: [],
  })
  newItemSituation.value = ''
  newItemSuds.value = 50
}

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
}

function removeSafetyBehavior(index: number) {
  safetyBehaviors.value.splice(index, 1)
}

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateGradedExposureHierarchyPayload = {
    fearTarget: fearTarget.value.trim(),
    ultimateGoal: ultimateGoal.value.trim(),
    items: sortedItems.value,
    safetyBehaviors: filledSafetyBehaviors.value.length > 0
      ? filledSafetyBehaviors.value
      : undefined,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}
</script>
