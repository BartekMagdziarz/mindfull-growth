<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="p-2 neo-back-btn text-neu-muted"
        @click="handleCancel"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-neu-text">{{ t('planning.reflection.yearly.title') }}</h1>
        <p class="text-sm text-neu-muted">{{ t('planning.reflection.yearly.heading') }}</p>
      </div>
    </div>

    <!-- Step Progress Indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          type="button"
          class="flex-1 group"
          :class="{ 'cursor-pointer': index <= draft.activeStep, 'cursor-default': index > draft.activeStep }"
          :disabled="index > draft.activeStep"
          @click="goToStep(index)"
        >
          <div class="flex flex-col items-center">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              :class="getStepCircleClasses(index)"
            >
              <CheckIcon v-if="index < draft.activeStep" class="w-5 h-5" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span
              class="mt-2 text-xs font-medium transition-colors hidden sm:block"
              :class="index === draft.activeStep ? 'text-primary' : 'text-neu-muted'"
            >
              {{ step.title }}
            </span>
          </div>
        </button>
      </div>
      <div class="relative mt-4">
        <div class="absolute top-0 left-0 w-full neo-progress-track" />
        <div
          class="absolute top-0 left-0 neo-progress-fill"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <!-- Loading State -->
    <AppCard v-if="isLoading" padding="lg">
      <div class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-neu-muted">
          <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading reflection data...</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error" padding="lg">
      <div class="text-center py-8">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">Try Again</AppButton>
      </div>
    </AppCard>

    <!-- Step Content -->
    <template v-else>
      <!-- Step 0: Framing -->
      <div v-if="draft.activeStep === 0">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-neu-text">{{ t('planning.reflection.yearly.framing.title') }}</h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.reflection.yearly.framing.description') }}
          </p>
          <p class="text-neu-muted text-sm">
            The sequence starts with strengths before correction, meaning before measurement.
            Every step is optional and skippable.
          </p>
          <div class="neo-surface rounded-xl p-4">
            <p class="text-sm text-neu-text font-medium">What this reflection covers:</p>
            <ul class="mt-2 space-y-1 text-sm text-neu-muted">
              <li>1. {{ t('planning.reflection.yearly.framing.processSteps.step1') }}</li>
              <li>2. {{ t('planning.reflection.yearly.framing.processSteps.step2') }}</li>
              <li>3. {{ t('planning.reflection.yearly.framing.processSteps.step3') }}</li>
              <li>4. {{ t('planning.reflection.yearly.framing.processSteps.step4') }}</li>
              <li>5. {{ t('planning.reflection.yearly.framing.processSteps.step5') }}</li>
              <li>6. {{ t('planning.reflection.yearly.framing.processSteps.step6') }}</li>
              <li>7. {{ t('planning.reflection.yearly.framing.processSteps.step7') }}</li>
              <li>8. {{ t('planning.reflection.yearly.framing.processSteps.step8') }}</li>
            </ul>
          </div>
        </AppCard>
      </div>

      <!-- Step 1: Successes by Area -->
      <div v-if="draft.activeStep === 1">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <TrophyIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.successes.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.reflection.yearly.successes.description') }}
          </p>
        </AppCard>

        <div class="space-y-4">
          <AppCard
            v-for="(area, index) in draft.successesByArea"
            :key="index"
            padding="lg"
            class="space-y-3"
          >
            <h3 class="text-base font-semibold text-neu-text">{{ area.area }}</h3>
            <ListInputSection
              v-model="area.whatWentWell"
              title="What went well"
              icon="trophy"
              placeholder="Add a win"
              empty-message="What went well in this area?"
            />
            <div>
              <label class="block text-sm font-medium text-neu-text mb-1">Surprises</label>
              <input
                v-model="area.surprises"
                type="text"
                placeholder="What surprised you?"
                class="neo-input w-full p-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neu-text mb-1">Learnings</label>
              <input
                v-model="area.learnings"
                type="text"
                placeholder="What did you learn?"
                class="neo-input w-full p-2 text-sm"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-neu-text mb-1">More of</label>
                <input
                  v-model="area.moreOf"
                  type="text"
                  placeholder="Want more of..."
                  class="neo-input w-full p-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-neu-text mb-1">Less of</label>
                <input
                  v-model="area.lessOf"
                  type="text"
                  placeholder="Want less of..."
                  class="neo-input w-full p-2 text-sm"
                />
              </div>
            </div>
          </AppCard>
        </div>

        <div v-if="draft.successesByArea.length === 0" class="mt-4">
          <AppCard padding="lg" class="text-center">
            <p class="text-neu-muted text-sm">
              No life areas defined yet. Add life areas in the Life Areas view to reflect on them here.
            </p>
          </AppCard>
        </div>
      </div>

      <!-- Step 2: Challenges -->
      <div v-if="draft.activeStep === 2">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <ShieldCheckIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.challenges.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.reflection.yearly.challenges.description') }}
          </p>
        </AppCard>

        <div class="space-y-4">
          <AppCard
            v-for="(item, index) in draft.challenges"
            :key="index"
            padding="lg"
            class="space-y-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-1">{{ t('planning.reflection.yearly.challenges.prompt') }}</label>
                <input
                  v-model="item.challenge"
                  type="text"
                  :placeholder="t('planning.reflection.yearly.challenges.placeholder')"
                  class="neo-input w-full p-2 text-sm"
                />
              </div>
              <button
                type="button"
                class="p-2 rounded-lg text-neu-muted hover:text-error hover:bg-section transition-colors mt-5"
                @click="removeChallenge(index)"
                aria-label="Remove challenge"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
            <div>
              <label class="block text-sm font-medium text-neu-text mb-1">
                Who or what helped you overcome this challenge?
              </label>
              <textarea
                v-model="item.whoOrWhatHelped"
                rows="2"
                placeholder="People, resources, mindset shifts..."
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neu-text mb-1">
                What did you learn while overcoming this challenge?
              </label>
              <textarea
                v-model="item.whatYouLearned"
                rows="2"
                placeholder="Insights, skills, new perspectives..."
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>
        </div>

        <button
          type="button"
          class="mt-4 flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
          @click="addChallenge"
        >
          <PlusIcon class="w-4 h-4" />
          Add a challenge
        </button>
      </div>

      <!-- Step 3: Favorite Experiences -->
      <div v-if="draft.activeStep === 3">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <StarIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.experiences.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Counter recency bias — look back at the whole year and note what brought you joy,
            wonder, and growth.
          </p>
        </AppCard>

        <div class="space-y-4">
          <ListInputSection
            v-model="draft.favoriteExperiences.books"
            :title="t('planning.reflection.yearly.experiences.books.title')"
            icon="book"
            :placeholder="t('planning.reflection.yearly.experiences.books.placeholder')"
            empty-message="Any books that stuck with you this year?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.learnings"
            :title="t('planning.reflection.yearly.experiences.learnings.title')"
            icon="lightbulb"
            :placeholder="t('planning.reflection.yearly.experiences.learnings.placeholder')"
            empty-message="Courses, workshops, skills you picked up?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.movies"
            :title="t('planning.reflection.yearly.experiences.movies.title')"
            icon="star"
            :placeholder="t('planning.reflection.yearly.experiences.movies.placeholder')"
            empty-message="Any movies or shows that left an impression?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.photosAndVideos"
            title="Photos & Videos"
            icon="star"
            placeholder="Describe a favorite photo or video"
            empty-message="Any favorite captured moments?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.trips"
            :title="t('planning.reflection.yearly.experiences.trips.title')"
            icon="mountain"
            :placeholder="t('planning.reflection.yearly.experiences.trips.placeholder')"
            empty-message="Any memorable trips or getaways?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.events"
            :title="t('planning.reflection.yearly.experiences.events.title')"
            icon="star"
            :placeholder="t('planning.reflection.yearly.experiences.events.placeholder')"
            empty-message="Concerts, conferences, celebrations?"
          />
          <ListInputSection
            v-model="draft.favoriteExperiences.moments"
            :title="t('planning.reflection.yearly.experiences.moments.title')"
            icon="star"
            :placeholder="t('planning.reflection.yearly.experiences.moments.placeholder')"
            empty-message="Small or big moments that made the year special?"
          />
        </div>
      </div>

      <!-- Step 4: Gratitude -->
      <div v-if="draft.activeStep === 4">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <HeartIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.gratitude.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Close the year with appreciation and grounding. List the people, experiences,
            and opportunities you're grateful for.
          </p>
        </AppCard>

        <div class="space-y-4">
          <ListInputSection
            v-model="draft.gratitude.people"
            :title="t('planning.reflection.yearly.gratitude.people.title')"
            icon="star"
            :placeholder="t('planning.reflection.yearly.gratitude.people.placeholder')"
            empty-message="Who are you grateful for?"
          />
          <ListInputSection
            v-model="draft.gratitude.experiences"
            :title="t('planning.reflection.yearly.gratitude.things.title')"
            icon="trophy"
            :placeholder="t('planning.reflection.yearly.gratitude.things.placeholder')"
            empty-message="What experiences are you grateful for?"
          />
          <ListInputSection
            v-model="draft.gratitude.opportunities"
            :title="t('planning.reflection.yearly.gratitude.places.title')"
            icon="lightbulb"
            :placeholder="t('planning.reflection.yearly.gratitude.places.placeholder')"
            empty-message="What opportunities are you grateful for?"
          />
        </div>
      </div>

      <!-- Step 5: Health Reflection -->
      <div v-if="draft.activeStep === 5">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <HeartIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.health.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Reflect on your physical and mental well-being this year. The insights you gather
            here will help shape healthier choices going forward.
          </p>
        </AppCard>

        <!-- Chart Placeholder -->
        <AppCard padding="lg" class="mb-6">
          <div class="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neu-border/30 rounded-xl">
            <ChartBarIcon class="w-10 h-10 text-neu-muted/40 mb-3" />
            <p class="text-sm font-medium text-neu-muted">Health Trends Chart</p>
            <p class="text-xs text-neu-muted/60 mt-1">
              Interactive health data visualization coming soon
            </p>
          </div>
        </AppCard>

        <!-- Reflective Prompts -->
        <div class="space-y-4">
          <AppCard padding="lg" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-2">
                  What did you do this year that noticeably improved your physical or mental health?
                </label>
                <textarea
                  v-model="draft.healthReflection.whatImproved"
                  rows="3"
                  placeholder="New habits, activities, changes you made..."
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-2">
                  How did those improvements affect other areas of your life (energy, mood, relationships, work)?
                </label>
                <textarea
                  v-model="draft.healthReflection.howItHelped"
                  rows="3"
                  placeholder="Ripple effects you noticed..."
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">3</span>
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-2">
                  What habits or behaviors negatively impacted your health this year?
                </label>
                <textarea
                  v-model="draft.healthReflection.whatHindered"
                  rows="3"
                  placeholder="Patterns you'd like to change..."
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">4</span>
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-2">
                  Which healthy habits do you want to protect and continue into next year?
                </label>
                <textarea
                  v-model="draft.healthReflection.habitsToKeep"
                  rows="3"
                  placeholder="Habits worth keeping..."
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">5</span>
              <div class="flex-1">
                <label class="block text-sm font-medium text-neu-text mb-2">
                  If you could make one health-related change for the coming year, what would it be and why?
                </label>
                <textarea
                  v-model="draft.healthReflection.oneChangeForNextYear"
                  rows="3"
                  placeholder="Your one big health intention..."
                  class="neo-input w-full p-3 text-sm resize-none"
                />
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- Step 6: Forgiveness -->
      <div v-if="draft.activeStep === 6">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <HeartIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.forgiveness.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.reflection.yearly.forgiveness.description') }}
          </p>
          <p class="text-neu-muted text-sm">
            Write it down here. Do good for yourself and forgive. Carrying resentment only weighs
            you down — letting it go is a gift you give yourself.
          </p>
          <textarea
            v-model="draft.forgiveness"
            rows="6"
            placeholder="What would you like to forgive and release..."
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>
      </div>

      <!-- Step 7: Letting Go -->
      <div v-if="draft.activeStep === 7">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <ArrowUpOnSquareIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.yearly.lettingGo.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.reflection.yearly.lettingGo.description') }}
          </p>
          <p class="text-neu-muted text-sm">
            Write it down, think about it, and let it all go. Make space for what's ahead.
          </p>
          <textarea
            v-model="draft.lettingGo"
            rows="6"
            placeholder="What are you ready to let go of..."
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>
      </div>

      <!-- Step 8: Summary -->
      <div v-if="draft.activeStep === 8">
        <AppCard padding="lg" class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-neu-text">{{ t('planning.reflection.yearly.summary.title') }}</h2>
            <p class="text-neu-muted text-sm">
              Summarize your year in a phrase, capture your biggest wins and lessons,
              and note what you want to carry into the next year.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.reflection.yearly.summary.wordOfTheYear') }}
            </label>
            <input
              v-model="draft.yearInOnePhrase"
              type="text"
              :placeholder="t('planning.reflection.yearly.summary.wordPlaceholder')"
              class="neo-input w-full p-3 text-lg"
            />
          </div>

          <ListInputSection
            v-model="draft.biggestWins"
            title="Biggest Wins"
            icon="trophy"
            placeholder="Add a win"
            empty-message="What were your biggest accomplishments?"
          />

          <ListInputSection
            v-model="draft.biggestLessons"
            title="Biggest Lessons"
            icon="lightbulb"
            placeholder="Add a lesson"
            empty-message="What were your biggest learnings?"
          />

          <div>
            <label class="block text-sm font-medium text-neu-text mb-1">
              Carry Forward
            </label>
            <textarea
              v-model="draft.carryForward"
              rows="3"
              placeholder="What do you want to take into the next year?"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </div>
        </AppCard>

        <AppCard v-if="saveError" padding="md" class="mt-4 border-error/50">
          <div class="flex items-start gap-3 text-error">
            <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ t('planning.reflection.yearly.saveError') }}</p>
              <p class="text-sm mt-1">{{ saveError }}</p>
            </div>
          </div>
        </AppCard>
      </div>
    </template>

    <!-- Footer Actions -->
    <div
      v-if="!isLoading && !error"
      class="fixed bottom-0 left-0 right-0 neo-footer p-4"
    >
      <div class="max-w-3xl mx-auto flex justify-between items-center">
        <AppButton
          v-if="draft.activeStep > 0"
          variant="text"
          @click="handleBack"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          Back
        </AppButton>
        <div v-else />

        <div class="flex gap-3">
          <AppButton
            v-if="canSkip"
            variant="text"
            @click="handleSkip"
          >
            Skip
          </AppButton>
          <AppButton
            variant="filled"
            :disabled="isSaving"
            @click="handleNext"
          >
            {{ nextButtonText }}
            <svg
              v-if="isSaving"
              class="animate-spin h-4 w-4 ml-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <ArrowRightIcon v-else class="w-4 h-4 ml-2" />
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpOnSquareIcon,
  CheckIcon,
  ChartBarIcon,
  TrophyIcon,
  StarIcon,
  HeartIcon,
  ShieldCheckIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import ListInputSection from '@/components/forms/ListInputSection.vue'
import { useT } from '@/composables/useT'
import { useYearlyReflectionDraft } from '@/composables/useYearlyReflectionDraft'
import { useYearlyReflectionStore } from '@/stores/yearlyReflection.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'

const route = useRoute()
const router = useRouter()
const { t } = useT()

const planId = computed(() => route.params.planId as string)

interface Step {
  id: string
  title: string
}

const steps = computed<Step[]>(() => [
  { id: 'framing', title: t('planning.reflection.yearly.steps.framing.title') },
  { id: 'successes', title: t('planning.reflection.yearly.steps.successes.title') },
  { id: 'challenges', title: t('planning.reflection.yearly.steps.challenges.title') },
  { id: 'experiences', title: t('planning.reflection.yearly.steps.experiences.title') },
  { id: 'gratitude', title: t('planning.reflection.yearly.steps.gratitude.title') },
  { id: 'health', title: t('planning.reflection.yearly.steps.health.title') },
  { id: 'forgiveness', title: t('planning.reflection.yearly.steps.forgiveness.title') },
  { id: 'lettingGo', title: t('planning.reflection.yearly.steps.lettingGo.title') },
  { id: 'summary', title: t('planning.reflection.yearly.steps.summary.title') },
])

// Stores
const yearlyReflectionStore = useYearlyReflectionStore()
const yearlyPlanStore = useYearlyPlanStore()
const lifeAreaStore = useLifeAreaStore()

// Draft
const { draft, ready: draftReady, clearDraft, hasDraft } = useYearlyReflectionDraft(planId.value)

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const isSaving = ref(false)
const saveError = ref<string | null>(null)

// Navigation
const canSkip = computed(() => {
  return draft.value.activeStep < steps.value.length - 1
})

const nextButtonText = computed(() => {
  if (draft.value.activeStep === steps.value.length - 1) {
    return isSaving.value ? 'Saving...' : t('planning.reflection.yearly.saveButton.complete')
  }
  const nextStep = steps.value[draft.value.activeStep + 1]
  return nextStep ? `Continue to ${nextStep.title}` : 'Next'
})

const progressWidth = computed(() => {
  const progress = ((draft.value.activeStep + 1) / steps.value.length) * 100
  return `${progress}%`
})

function getStepCircleClasses(index: number) {
  if (index < draft.value.activeStep) return 'neo-step-completed'
  if (index === draft.value.activeStep) return 'neo-step-active'
  return 'neo-step-future'
}

function goToStep(index: number) {
  if (index <= draft.value.activeStep) {
    draft.value.activeStep = index
  }
}

function handleBack() {
  if (draft.value.activeStep > 0) draft.value.activeStep--
}

async function handleNext() {
  if (draft.value.activeStep < steps.value.length - 1) {
    draft.value.activeStep++
  } else {
    await handleSave()
  }
}

function handleSkip() {
  handleNext()
}

function handleCancel() {
  router.push('/planning')
}

// Challenges management
function addChallenge() {
  draft.value.challenges.push({
    challenge: '',
    whoOrWhatHelped: '',
    whatYouLearned: '',
  })
}

function removeChallenge(index: number) {
  draft.value.challenges.splice(index, 1)
}

// Persistence
async function handleSave() {
  isSaving.value = true
  saveError.value = null

  try {
    const existingReflection = yearlyReflectionStore.getReflectionByPlanId(planId.value)

    const payload = {
      yearlyPlanId: planId.value,
      yearInOnePhrase: draft.value.yearInOnePhrase.trim() || undefined,
      biggestWins: draft.value.biggestWins.filter((w) => w.trim()),
      biggestLessons: draft.value.biggestLessons.filter((l) => l.trim()),
      carryForward: draft.value.carryForward.trim() || undefined,
      successesByArea: draft.value.successesByArea
        .filter((a) => a.whatWentWell.length > 0 || a.surprises || a.learnings)
        .map((a) => ({
          area: a.area,
          whatWentWell: a.whatWentWell.filter((w) => w.trim()),
          surprises: a.surprises.trim() || undefined,
          learnings: a.learnings.trim() || undefined,
          moreOf: a.moreOf.trim() || undefined,
          lessOf: a.lessOf.trim() || undefined,
        })),
      challenges: draft.value.challenges
        .filter((c) => c.challenge.trim())
        .map((c) => ({
          challenge: c.challenge.trim(),
          whoOrWhatHelped: c.whoOrWhatHelped.trim(),
          whatYouLearned: c.whatYouLearned.trim(),
        })),
      favoriteExperiences: {
        books: draft.value.favoriteExperiences.books.filter((b) => b.trim()),
        learnings: draft.value.favoriteExperiences.learnings.filter((l) => l.trim()),
        movies: draft.value.favoriteExperiences.movies.filter((m) => m.trim()),
        photosAndVideos: draft.value.favoriteExperiences.photosAndVideos.filter((p) => p.trim()),
        trips: draft.value.favoriteExperiences.trips.filter((t) => t.trim()),
        events: draft.value.favoriteExperiences.events.filter((e) => e.trim()),
        moments: draft.value.favoriteExperiences.moments.filter((m) => m.trim()),
      },
      gratitude: {
        people: draft.value.gratitude.people.filter((p) => p.trim()),
        experiences: draft.value.gratitude.experiences.filter((e) => e.trim()),
        opportunities: draft.value.gratitude.opportunities.filter((o) => o.trim()),
      },
      healthReflection: {
        whatImproved: draft.value.healthReflection.whatImproved.trim() || undefined,
        howItHelped: draft.value.healthReflection.howItHelped.trim() || undefined,
        whatHindered: draft.value.healthReflection.whatHindered.trim() || undefined,
        habitsToKeep: draft.value.healthReflection.habitsToKeep.trim() || undefined,
        oneChangeForNextYear: draft.value.healthReflection.oneChangeForNextYear.trim() || undefined,
      },
      forgiveness: draft.value.forgiveness.trim() || undefined,
      lettingGo: draft.value.lettingGo.trim() || undefined,
    }

    if (existingReflection) {
      await yearlyReflectionStore.completeReflection(existingReflection.id, payload)
    } else {
      const created = await yearlyReflectionStore.createReflection({
        ...payload,
        completedAt: new Date().toISOString(),
      })
      if (!payload.yearInOnePhrase && !created.completedAt) {
        await yearlyReflectionStore.completeReflection(created.id, {})
      }
    }

    clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error saving yearly reflection:', err)
  } finally {
    isSaving.value = false
  }
}

// Data loading
async function loadData() {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      draftReady,
      yearlyPlanStore.loadYearlyPlans(),
      yearlyReflectionStore.loadYearlyReflections(),
      lifeAreaStore.loadLifeAreas(),
    ])

    // Load existing reflection data if resuming
    const existingReflection = yearlyReflectionStore.getReflectionByPlanId(planId.value)
    if (existingReflection && !hasDraft()) {
      draft.value.yearInOnePhrase = existingReflection.yearInOnePhrase || ''
      draft.value.biggestWins = existingReflection.biggestWins || []
      draft.value.biggestLessons = existingReflection.biggestLessons || []
      draft.value.carryForward = existingReflection.carryForward || ''
      if (existingReflection.successesByArea) {
        draft.value.successesByArea = existingReflection.successesByArea.map((a) => ({
          area: a.area,
          whatWentWell: a.whatWentWell || [],
          surprises: a.surprises || '',
          learnings: a.learnings || '',
          moreOf: a.moreOf || '',
          lessOf: a.lessOf || '',
        }))
      }
      if (existingReflection.challenges) {
        draft.value.challenges = existingReflection.challenges.map((c) => ({
          challenge: c.challenge || '',
          whoOrWhatHelped: c.whoOrWhatHelped || '',
          whatYouLearned: c.whatYouLearned || '',
        }))
      }
      if (existingReflection.favoriteExperiences) {
        draft.value.favoriteExperiences = {
          books: existingReflection.favoriteExperiences.books || [],
          learnings: existingReflection.favoriteExperiences.learnings || [],
          movies: existingReflection.favoriteExperiences.movies || [],
          photosAndVideos: existingReflection.favoriteExperiences.photosAndVideos || [],
          trips: existingReflection.favoriteExperiences.trips || [],
          events: existingReflection.favoriteExperiences.events || [],
          moments: existingReflection.favoriteExperiences.moments || [],
        }
      }
      if (existingReflection.gratitude) {
        draft.value.gratitude = {
          people: existingReflection.gratitude.people || [],
          experiences: existingReflection.gratitude.experiences || [],
          opportunities: existingReflection.gratitude.opportunities || [],
        }
      }
      if (existingReflection.healthReflection) {
        draft.value.healthReflection = {
          whatImproved: existingReflection.healthReflection.whatImproved || '',
          howItHelped: existingReflection.healthReflection.howItHelped || '',
          whatHindered: existingReflection.healthReflection.whatHindered || '',
          habitsToKeep: existingReflection.healthReflection.habitsToKeep || '',
          oneChangeForNextYear: existingReflection.healthReflection.oneChangeForNextYear || '',
        }
      }
      draft.value.forgiveness = existingReflection.forgiveness || ''
      draft.value.lettingGo = existingReflection.lettingGo || ''
    }

    // Pre-populate successes areas from life areas if empty
    if (draft.value.successesByArea.length === 0 && lifeAreaStore.activeLifeAreas.length > 0) {
      draft.value.successesByArea = lifeAreaStore.activeLifeAreas.map((la) => ({
        area: la.name,
        whatWentWell: [],
        surprises: '',
        learnings: '',
        moreOf: '',
        lessOf: '',
      }))
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load reflection data'
    console.error('Error loading reflection data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
