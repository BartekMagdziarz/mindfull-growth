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
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.intro.title') }}</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            {{ t('exerciseWizards.behavioralActivation.intro.description') }}
          </p>
          <div class="neo-surface p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralActivation.intro.howItWorks') }}
            </p>
            <div class="space-y-2">
              <div class="flex items-start gap-3">
                <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">1</span>
                <p class="text-sm text-on-surface">{{ t('exerciseWizards.behavioralActivation.intro.step1') }}</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">2</span>
                <p class="text-sm text-on-surface">{{ t('exerciseWizards.behavioralActivation.intro.step2') }}</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="neo-pill px-3 py-1 text-xs flex-shrink-0">3</span>
                <p class="text-sm text-on-surface">{{ t('exerciseWizards.behavioralActivation.intro.step3') }}</p>
              </div>
            </div>
          </div>
        </AppCard>
        <div class="flex justify-end">
          <AppButton variant="filled" @click="currentStep = 'mood-baseline'">
            {{ t('common.buttons.start') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 2: Mood Baseline -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'mood-baseline'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.moodBaseline.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralActivation.moodBaseline.description') }}
          </p>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-on-surface">{{ t('exerciseWizards.behavioralActivation.moodBaseline.overallMoodLabel') }}</label>
              <span class="text-sm font-semibold text-primary">{{ overallMoodStart }}/10</span>
            </div>
            <input
              v-model.number="overallMoodStart"
              type="range"
              min="0"
              max="10"
              step="1"
              class="neo-focus w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-on-surface-variant">
              <span>{{ t('exerciseWizards.behavioralActivation.moodBaseline.moodMin') }}</span>
              <span>{{ t('exerciseWizards.behavioralActivation.moodBaseline.moodMid') }}</span>
              <span>{{ t('exerciseWizards.behavioralActivation.moodBaseline.moodMax') }}</span>
            </div>
          </div>
        </AppCard>

        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.moodBaseline.weekStartTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralActivation.moodBaseline.weekStartDescription') }}
          </p>
          <input
            v-model="weekStartDate"
            type="date"
            class="neo-input neo-focus w-full p-2.5 text-sm"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'intro'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="currentStep = 'plan-activities'">
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 3: Plan Activities -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'plan-activities'" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.planActivities.title') }}</h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralActivation.planActivities.description') }}
          </p>

          <!-- Add activity form -->
          <div class="neo-surface p-4 space-y-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.behavioralActivation.planActivities.activityNameLabel') }}</label>
              <input
                v-model="newActivityName"
                class="neo-input neo-focus w-full p-2.5 text-sm"
                :placeholder="t('exerciseWizards.behavioralActivation.planActivities.activityNamePlaceholder')"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.behavioralActivation.planActivities.categoryLabel') }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in categories"
                  :key="cat.id"
                  type="button"
                  :class="[
                    'neo-selector neo-focus px-3 py-1.5 text-xs font-medium rounded-xl',
                    newActivityCategory === cat.id ? 'neo-selector--active' : '',
                  ]"
                  @click="newActivityCategory = cat.id"
                >
                  <span
                    class="inline-block w-2 h-2 rounded-full mr-1.5"
                    :class="cat.dotClass"
                  />
                  {{ cat.label }}
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-on-surface-variant">{{ t('exerciseWizards.behavioralActivation.planActivities.scheduledDateLabel') }}</label>
              <input
                v-model="newActivityDate"
                type="date"
                class="neo-input neo-focus w-full p-2.5 text-sm"
              />
            </div>

            <div class="flex justify-end">
              <AppButton
                variant="tonal"
                :disabled="!canAddActivity"
                @click="addActivity"
              >
                <AppIcon name="add" class="text-base" />
                {{ t('exerciseWizards.behavioralActivation.planActivities.addActivity') }}
              </AppButton>
            </div>
          </div>

          <!-- LLM Assist: Suggest Activities -->
          <div class="border-t border-neu-border/20 pt-4 space-y-3">
            <AppButton
              variant="tonal"
              :disabled="isSuggestLoading"
              @click="handleSuggestActivities"
            >
              <AppIcon name="auto_awesome" class="text-base" />
              {{ isSuggestLoading ? t('exerciseWizards.behavioralActivation.planActivities.suggestLoading') : t('exerciseWizards.behavioralActivation.planActivities.suggestLabel') }}
            </AppButton>
            <div v-if="suggestResult" class="neo-panel p-4 space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('exerciseWizards.behavioralActivation.planActivities.suggestedActivities') }}
              </p>
              <p class="text-sm text-on-surface whitespace-pre-line">{{ suggestResult }}</p>
            </div>
            <p v-if="suggestError" class="text-xs text-error">{{ suggestError }}</p>
          </div>
        </AppCard>

        <!-- Added activities list -->
        <div v-if="activities.length > 0" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('exerciseWizards.behavioralActivation.planActivities.plannedActivities') }}
            <span class="text-sm font-normal text-on-surface-variant ml-1">
              ({{ activities.length }})
            </span>
          </h3>
          <AppCard
            v-for="(act, idx) in activities"
            :key="act.id"
            padding="md"
          >
            <div class="flex justify-between items-start group">
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                    :class="getCategoryColorClass(act.category)"
                  >
                    {{ getCategoryLabel(act.category) }}
                  </span>
                  <span class="text-xs text-on-surface-variant">
                    {{ formatActivityDate(act.date) }}
                  </span>
                </div>
                <p class="text-sm font-medium text-on-surface">{{ act.activity }}</p>
              </div>
              <button
                type="button"
                class="p-1 rounded text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                :aria-label="`Remove ${act.activity}`"
                @click="removeActivity(idx)"
              >
                <AppIcon name="close" class="text-base" />
              </button>
            </div>
          </AppCard>
        </div>

        <!-- Minimum activities notice -->
        <p
          v-if="activities.length > 0 && activities.length < 3"
          class="text-xs text-on-surface-variant text-center"
        >
          {{ t('exerciseWizards.behavioralActivation.planActivities.addMoreCount', { n: 3 - activities.length, word: activities.length === 2 ? 'activity' : 'activities' }) }}
        </p>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'mood-baseline'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton
            variant="filled"
            :disabled="activities.length < 3"
            @click="currentStep = 'summary'"
          >
            {{ t('common.buttons.next') }}
          </AppButton>
        </div>
      </div>
    </Transition>

    <!-- Step 4: Summary -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="currentStep === 'summary'" class="space-y-4">
        <AppCard variant="raised" padding="lg" class="space-y-5">
          <h2 class="text-lg font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.summary.title') }}</h2>

          <!-- Week info -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralActivation.summary.weekStarting') }}
            </p>
            <p class="text-sm text-on-surface">
              {{ formatActivityDate(weekStartDate) }}
            </p>
          </div>

          <!-- Baseline mood -->
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralActivation.summary.baselineMood') }}
            </p>
            <p class="text-2xl font-bold text-on-surface">{{ overallMoodStart }}/10</p>
          </div>

          <!-- Activities grouped by category -->
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralActivation.summary.activities') }} ({{ activities.length }})
            </p>
            <div
              v-for="group in groupedActivities"
              :key="group.category"
              class="space-y-2"
            >
              <div class="flex items-center gap-2">
                <span
                  class="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="getCategoryColorClass(group.category)"
                >
                  {{ getCategoryLabel(group.category) }}
                </span>
                <span class="text-xs text-on-surface-variant">
                  ({{ group.items.length }})
                </span>
              </div>
              <div class="neo-embedded p-3 space-y-1.5">
                <div
                  v-for="act in group.items"
                  :key="act.id"
                  class="flex items-center justify-between"
                >
                  <p class="text-sm text-on-surface">{{ act.activity }}</p>
                  <span class="text-xs text-on-surface-variant flex-shrink-0 ml-3">
                    {{ formatActivityDate(act.date) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Track activities section -->
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.summary.trackTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.behavioralActivation.summary.trackDescription') }}
          </p>

          <div class="space-y-3">
            <div
              v-for="act in activities"
              :key="act.id"
              class="neo-surface p-3 space-y-2"
            >
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                  :class="
                    act.completed
                      ? 'bg-primary border-primary text-on-primary'
                      : 'border-neu-border/50 bg-transparent'
                  "
                  :aria-label="`Mark ${act.activity} as ${act.completed ? 'incomplete' : 'complete'}`"
                  @click="act.completed = !act.completed"
                >
                  <AppIcon v-if="act.completed" name="check" class="text-sm" />
                </button>
                <div class="flex-1">
                  <p
                    class="text-sm font-medium"
                    :class="act.completed ? 'text-on-surface' : 'text-on-surface-variant'"
                  >
                    {{ act.activity }}
                  </p>
                  <span
                    class="inline-block px-1.5 py-0.5 text-xs rounded-full mt-0.5"
                    :class="getCategoryColorClass(act.category)"
                  >
                    {{ getCategoryLabel(act.category) }}
                  </span>
                </div>
              </div>

              <!-- Mood tracking (shown when completed) -->
              <Transition
                enter-active-class="transition-opacity duration-200"
                leave-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
              >
                <div v-if="act.completed" class="pl-8 space-y-2">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.behavioralActivation.summary.moodBefore') }}</label>
                      <span class="text-xs font-semibold text-primary">{{ act.moodBefore ?? '-' }}/10</span>
                    </div>
                    <input
                      :value="act.moodBefore ?? 5"
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      class="neo-focus w-full accent-primary"
                      @input="act.moodBefore = Number(($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.behavioralActivation.summary.moodAfter') }}</label>
                      <span class="text-xs font-semibold text-primary">{{ act.moodAfter ?? '-' }}/10</span>
                    </div>
                    <input
                      :value="act.moodAfter ?? 5"
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      class="neo-focus w-full accent-primary"
                      @input="act.moodAfter = Number(($event.target as HTMLInputElement).value)"
                    />
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </AppCard>

        <!-- LLM Assist: Week Review -->
        <AppCard v-if="activities.some((a) => a.completed)" padding="lg" class="space-y-3">
          <AppButton
            variant="tonal"
            :disabled="isReviewLoading"
            @click="handleReviewWeek"
          >
            <AppIcon name="auto_awesome" class="text-base" />
            {{ isReviewLoading ? t('exerciseWizards.behavioralActivation.summary.reviewLoading') : t('exerciseWizards.behavioralActivation.summary.reviewLabel') }}
          </AppButton>
          <div v-if="reviewResult" class="neo-panel p-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('exerciseWizards.behavioralActivation.summary.weekReview') }}
            </p>
            <p class="text-sm text-on-surface whitespace-pre-line">{{ reviewResult }}</p>
          </div>
          <p v-if="reviewError" class="text-xs text-error">{{ reviewError }}</p>
        </AppCard>

        <!-- Optional notes -->
        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.behavioralActivation.summary.notesTitle') }}</h3>
          <textarea
            v-model="notes"
            rows="3"
            :placeholder="t('exerciseWizards.behavioralActivation.summary.notesPlaceholder')"
            class="neo-input neo-focus w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <div class="flex justify-between">
          <AppButton variant="text" @click="currentStep = 'plan-activities'">{{ t('common.buttons.back') }}</AppButton>
          <AppButton variant="filled" @click="handleSave">
            {{ t('exerciseWizards.behavioralActivation.summary.savePlan') }}
          </AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type {
  CreateBehavioralActivationPayload,
  BehavioralActivationActivity,
  ActivityCategory,
} from '@/domain/exercises'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

const emit = defineEmits<{
  saved: [data: CreateBehavioralActivationPayload]
}>()

const { t, locale } = useT()

// ─── Step State ──────────────────────────────────────────────────────────────
type Step = 'intro' | 'mood-baseline' | 'plan-activities' | 'summary'

const currentStep = ref<Step>('intro')

const stepLabels = computed(() => [
  t('exerciseWizards.behavioralActivation.steps.intro'),
  t('exerciseWizards.behavioralActivation.steps.moodBaseline'),
  t('exerciseWizards.behavioralActivation.steps.planActivities'),
  t('exerciseWizards.behavioralActivation.steps.summary'),
])

const stepOrder: Step[] = ['intro', 'mood-baseline', 'plan-activities', 'summary']

const currentVisualStep = computed(() => {
  return stepOrder.indexOf(currentStep.value)
})

function goToStepByIndex(idx: number) {
  if (idx >= 0 && idx < stepOrder.length) {
    currentStep.value = stepOrder[idx]
  }
}

// ─── Category Definitions ────────────────────────────────────────────────────
const categories = computed(() => [
  { id: 'pleasure' as ActivityCategory, label: t('exerciseWizards.behavioralActivation.planActivities.categories.pleasure'), colorClass: 'bg-emerald-100 text-emerald-700', dotClass: 'bg-emerald-500' },
  { id: 'mastery' as ActivityCategory, label: t('exerciseWizards.behavioralActivation.planActivities.categories.mastery'), colorClass: 'bg-blue-100 text-blue-700', dotClass: 'bg-blue-500' },
  { id: 'social' as ActivityCategory, label: t('exerciseWizards.behavioralActivation.planActivities.categories.social'), colorClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-500' },
  { id: 'physical' as ActivityCategory, label: t('exerciseWizards.behavioralActivation.planActivities.categories.physical'), colorClass: 'bg-rose-100 text-rose-700', dotClass: 'bg-rose-500' },
  { id: 'values-aligned' as ActivityCategory, label: t('exerciseWizards.behavioralActivation.planActivities.categories.values'), colorClass: 'bg-purple-100 text-purple-700', dotClass: 'bg-purple-500' },
])

function getCategoryColorClass(cat: ActivityCategory): string {
  return categories.value.find((c) => c.id === cat)?.colorClass ?? ''
}

function getCategoryLabel(cat: ActivityCategory): string {
  return categories.value.find((c) => c.id === cat)?.label ?? cat
}

// ─── Form State ──────────────────────────────────────────────────────────────
const overallMoodStart = ref(5)
const weekStartDate = ref(getCurrentWeekStart())
const activities = reactive<BehavioralActivationActivity[]>([])
const notes = ref('')

// New activity form
const newActivityName = ref('')
const newActivityCategory = ref<ActivityCategory>('pleasure')
const newActivityDate = ref(getCurrentWeekStart())

const canAddActivity = computed(() => {
  return newActivityName.value.trim().length > 0
})

function addActivity() {
  if (!canAddActivity.value) return

  const activity: BehavioralActivationActivity = {
    id: crypto.randomUUID(),
    date: newActivityDate.value,
    activity: newActivityName.value.trim(),
    category: newActivityCategory.value,
    completed: false,
  }

  activities.push(activity)

  // Reset form
  newActivityName.value = ''
  newActivityCategory.value = 'pleasure'
}

function removeActivity(idx: number) {
  activities.splice(idx, 1)
}

// ─── LLM Assist: Suggest Activities ──────────────────────────────────────
const isSuggestLoading = ref(false)
const suggestResult = ref('')
const suggestError = ref('')

async function handleSuggestActivities() {
  isSuggestLoading.value = true
  suggestError.value = ''
  try {
    const { suggestActivities } = await import('@/services/cbtLLMAssists')
    suggestResult.value = await suggestActivities({
      overallMood: overallMoodStart.value,
      existingActivities: activities.map((a) => ({
        activity: a.activity,
        category: a.category,
      })),
      locale: locale.value,
    })
  } catch (err) {
    suggestError.value = err instanceof Error ? err.message : 'Failed to get suggestions'
  } finally {
    isSuggestLoading.value = false
  }
}

// ─── LLM Assist: Week Review ─────────────────────────────────────────────
const isReviewLoading = ref(false)
const reviewResult = ref('')
const reviewError = ref('')

async function handleReviewWeek() {
  isReviewLoading.value = true
  reviewError.value = ''
  try {
    const { reviewActivationWeek } = await import('@/services/cbtLLMAssists')
    reviewResult.value = await reviewActivationWeek({
      overallMoodStart: overallMoodStart.value,
      activities: activities.map((a) => ({
        activity: a.activity,
        category: a.category,
        completed: a.completed,
        moodBefore: a.moodBefore,
        moodAfter: a.moodAfter,
      })),
      locale: locale.value,
    })
  } catch (err) {
    reviewError.value = err instanceof Error ? err.message : 'Failed to generate review'
  } finally {
    isReviewLoading.value = false
  }
}

// ─── Grouped Activities ──────────────────────────────────────────────────────
const groupedActivities = computed(() => {
  const groups: { category: ActivityCategory; items: BehavioralActivationActivity[] }[] = []

  for (const cat of categories.value) {
    const items = activities.filter((a) => a.category === cat.id)
    if (items.length > 0) {
      groups.push({ category: cat.id, items })
    }
  }

  return groups
})

// ─── Save ────────────────────────────────────────────────────────────────────
function handleSave() {
  const payload: CreateBehavioralActivationPayload = {
    weekStartDate: weekStartDate.value,
    activities: activities.map((a) => ({
      ...a,
      moodBefore: a.completed ? a.moodBefore : undefined,
      moodAfter: a.completed ? a.moodAfter : undefined,
    })),
    overallMoodStart: overallMoodStart.value,
    notes: notes.value.trim() || undefined,
  }
  emit('saved', payload)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCurrentWeekStart(): string {
  return getPeriodBounds(getPeriodRefsForDate(new Date()).week).start
}

function formatActivityDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
</script>
