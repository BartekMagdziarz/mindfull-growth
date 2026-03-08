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
        <h1 class="text-xl font-bold text-neu-text">{{ t('planning.weekly.title') }}</h1>
        <p class="text-sm text-neu-muted">{{ weekRangeLabel }}</p>
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
            <!-- Step Circle -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              :class="getStepCircleClasses(index)"
            >
              <CheckIcon v-if="index < draft.activeStep" class="w-5 h-5" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <!-- Step Label -->
            <span
              class="mt-2 text-xs font-medium transition-colors"
              :class="index === draft.activeStep ? 'text-primary' : 'text-neu-muted'"
            >
              {{ step.title }}
            </span>
            <span
              class="text-xs transition-colors hidden sm:block"
              :class="index === draft.activeStep ? 'text-neu-muted' : 'text-neu-muted/60'"
            >
              {{ step.subtitle }}
            </span>
          </div>
        </button>
      </div>
      <!-- Progress Line -->
      <div class="relative mt-4">
        <div class="absolute top-0 left-0 w-full neo-progress-track" />
        <div
          class="absolute top-0 left-0 neo-progress-fill"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <!-- Loading State -->
    <AppCard v-if="isLoading" padding="lg" >
      <div class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-on-surface-variant">
          <svg
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading weekly planning data...</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error" padding="lg" >
      <div class="text-center py-8">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">
          {{ t('common.buttons.tryAgain') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Step Content -->
    <template v-else>
      <!-- Step 1: Period + Battery Trends -->
      <div v-if="draft.activeStep === 0">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <CalendarDaysIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.heading') }}
          </h2>
          <p class="text-neu-muted text-sm mb-6">
            Choose the date range for this weekly plan.
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="week-start" class="block text-sm font-medium text-neu-text mb-1">
                {{ t('planning.weekly.period.startDate') }}
              </label>
              <input
                id="week-start"
                v-model="draft.startDate"
                type="date"
                class="w-full px-3 py-2 neo-input"
              />
            </div>
            <div>
              <label for="week-end" class="block text-sm font-medium text-neu-text mb-1">
                {{ t('planning.weekly.period.endDate') }}
              </label>
              <input
                id="week-end"
                v-model="draft.endDate"
                type="date"
                class="w-full px-3 py-2 neo-input"
              />
            </div>
          </div>

          <div class="mt-4">
            <label for="week-name" class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.weekly.period.customName') }} <span class="text-neu-muted font-normal">{{ t('planning.weekly.period.optional') }}</span>
            </label>
            <input
              id="week-name"
              v-model="draft.name"
              type="text"
              placeholder="e.g., Recovery Week"
              class="w-full px-3 py-2 neo-input"
            />
          </div>

          <p v-if="periodValidationError" class="mt-4 text-sm text-error">
            {{ periodValidationError }}
          </p>
        </AppCard>

        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <BoltIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.batteries.title') }}
          </h2>
          <p class="text-neu-muted text-sm mb-5">
            {{ t('planning.weekly.batteries.subtitle') }}
          </p>

          <div class="flex items-center gap-4 text-xs text-neu-muted mb-4">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-3 h-[2px] rounded-full bg-warning" />
              {{ t('planning.weekly.batteries.legendDemand') }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="w-3 h-[2px] rounded-full bg-primary" />
              {{ t('planning.weekly.batteries.legendState') }}
            </span>
          </div>

          <div v-if="batteryTrendHasData" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="panel in batteryTrendPanels"
              :key="panel.key"
              class="rounded-xl border border-neu-border/25 bg-neu-base p-4"
            >
              <div class="flex items-center justify-between gap-3 mb-2">
                <p class="text-sm font-semibold text-neu-text">{{ panel.title }}</p>
                <p class="text-[11px] text-neu-muted">{{ t('planning.weekly.batteries.lastWeeks') }}</p>
              </div>
              <p class="text-xs text-neu-muted mb-3">
                {{ panel.description }}
              </p>
              <svg viewBox="0 0 120 38" class="w-full h-14" role="img" :aria-label="panel.title">
                <path d="M0 37 H120" class="stroke-neu-border/40" stroke-width="1" fill="none" />
                <path
                  :d="buildTrendPath(panel.points, 'demand')"
                  class="stroke-warning"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  :d="buildTrendPath(panel.points, 'state')"
                  class="stroke-primary"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="point in panel.points"
                  :key="point.weeklyPlanId"
                  class="inline-flex items-center gap-1 rounded-full border border-neu-border/35 px-2 py-0.5 text-[10px] text-neu-muted"
                >
                  <span>{{ point.label }}</span>
                  <span>D{{ point.demand ?? '-' }}</span>
                  <span>S{{ point.state ?? '-' }}</span>
                </span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-neu-muted">
            {{ t('planning.weekly.batteries.empty') }}
          </p>
        </AppCard>

        <!-- Constraints Note -->
        <AppCard padding="lg">
          <label for="constraints-note" class="block text-sm font-medium text-neu-text mb-2">
            {{ t('planning.weekly.constraints.noteLabel') }}
            <span class="text-neu-muted font-normal">{{ t('planning.weekly.period.optional') }}</span>
          </label>
          <textarea
            id="constraints-note"
            v-model="draft.constraintsNote"
            rows="2"
            :placeholder="t('planning.weekly.constraints.notePlaceholder')"
            class="w-full p-3 neo-input resize-none"
          />
          <p class="text-xs text-neu-muted mt-2">
            {{ t('planning.weekly.constraints.noteHint') }}
          </p>
        </AppCard>
      </div>

      <!-- Step 2: Review Active Projects -->
      <div v-if="draft.activeStep === 1">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <RocketLaunchIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.projectsStep.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Review your in-progress projects. Use "Add commitment" to quickly create
            a commitment linked to a project.
          </p>
        </AppCard>

        <!-- No Projects - Empty State -->
        <AppCard v-if="activeProjects.length === 0" padding="lg" >
          <div class="text-center py-8">
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full neo-icon-circle flex items-center justify-center"
            >
              <RocketLaunchIcon class="w-8 h-8 text-primary" />
            </div>
            <h3 class="text-lg font-semibold text-neu-text mb-2">
              {{ t('planning.weekly.projectsStep.emptyTitle') }}
            </h3>
            <p class="text-neu-muted text-sm mb-6 max-w-sm mx-auto">
              {{ t('planning.weekly.projectsStep.emptyDescription') }}
            </p>
            <AppButton variant="filled"  @click="goToMonthlyPlanning">
              Create Monthly Plan
              <ArrowRightIcon class="w-4 h-4 ml-2" />
            </AppButton>
          </div>
        </AppCard>

        <!-- Project List -->
        <div v-else class="space-y-3">
          <AppCard
            v-for="project in activeProjects"
            :key="project.id"
            padding="md"
                     >
            <div class="flex items-start gap-3">
              <!-- Focus Area Color -->
              <div
                class="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                :style="{ backgroundColor: getProjectLifeAreaColor(project) }"
              />

              <!-- Project Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-neu-text">{{ project.name }}</p>
                <p class="text-xs text-neu-muted">
                  {{ getProjectLifeAreaName(project) }}
                </p>
                <p v-if="project.objective" class="text-xs text-neu-muted mt-1">
                  Objective: {{ project.objective }}
                </p>
                <p class="text-[11px] text-neu-muted mt-1">
                  {{ trackerStore.getTrackersByProject(project.id).length }} trackers
                </p>
              </div>

              <!-- Status Badge -->
              <span
                :class="getStatusBadgeClasses(project.status)"
                class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
              >
                {{ getStatusLabel(project.status) }}
              </span>
            </div>

            <div class="mt-3 flex items-center justify-between gap-4">
              <!-- Add Commitment Button -->
              <button
                type="button"
                class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
                @click="handleAddCommitmentFromProject(project.id)"
              >
                <PlusIcon class="w-4 h-4" />
                {{ t('planning.weekly.commitmentsStep.addCommitment') }}
              </button>

              <!-- Focus toggle -->
              <div class="flex items-center gap-2 text-[11px] text-neu-muted">
                <span>{{ t('planning.weekly.projectsStep.focusedThisWeek') }}</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isProjectFocused(project.id)"
                  :class="[
                    'neo-toggle-track',
                    isProjectFocused(project.id)
                      ? 'neo-toggle-track--on'
                      : 'neo-toggle-track--off',
                  ]"
                  @click="toggleProjectFocus(project.id)"
                >
                  <span
                    :class="[
                      'neo-toggle-thumb',
                      isProjectFocused(project.id)
                        ? 'translate-x-5'
                        : 'translate-x-0.5',
                    ]"
                  />
                </button>
              </div>
            </div>
          </AppCard>

          <AppCard padding="lg" class="mt-4">
            <h3 class="text-base font-semibold text-neu-text mb-2">{{ t('planning.weekly.commitmentsStep.trackersTitle') }}</h3>
            <p class="text-sm text-neu-muted">
              Choose which weekly project trackers to keep active this week.
            </p>
            <p v-if="trackerSelectionNotice" class="mt-2 text-xs text-warning">
              {{ trackerSelectionNotice }}
            </p>

            <p
              v-if="focusedProjectsForTrackerSelection.length === 0"
              class="mt-3 text-sm text-neu-muted"
            >
              Focus at least one project above to choose trackers for this week.
            </p>
            <p
              v-else-if="weeklyTrackerGroups.length === 0"
              class="mt-3 text-sm text-neu-muted"
            >
              Focused projects do not have active weekly trackers yet.
            </p>

            <div v-else class="mt-4 space-y-4">
              <div v-for="group in weeklyTrackerGroups" :key="group.project.id" class="space-y-2">
                <h4 class="text-sm font-semibold text-neu-text">{{ group.project.name }}</h4>
                <label
                  v-for="tracker in group.trackers"
                  :key="tracker.id"
                  class="flex items-start gap-3 p-3 neo-checkbox-row"
                  :class="isWeeklyTrackerSelected(tracker.id) ? 'neo-checkbox-row--checked' : ''"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5 neo-checkbox"
                    :checked="isWeeklyTrackerSelected(tracker.id)"
                    @change="handleWeeklyTrackerSelectionChange(tracker.id, $event)"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-neu-text">{{ tracker.name }}</p>
                    <p class="text-xs text-neu-muted">
                      {{ tracker.cadence }} · {{ tracker.type }}
                    </p>
                    <div
                      v-if="shouldShowWeeklyTargetInput(tracker) && isWeeklyTrackerSelected(tracker.id)"
                      class="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
                    >
                      <label
                        class="text-xs font-medium text-neu-muted"
                        :for="`weekly-target-${tracker.id}`"
                      >
                        {{ t('planning.weekly.commitmentsStep.thisWeekTarget') }}
                      </label>
                      <input
                        :id="`weekly-target-${tracker.id}`"
                        type="number"
                        min="1"
                        class="w-full sm:w-24 px-2 py-1 text-sm neo-input"
                        :value="getWeeklyTrackerTargetValue(tracker.id)"
                        @input="handleWeeklyTrackerTargetInput(tracker.id, $event)"
                      />
                      <p class="text-[11px] text-neu-muted">
                        {{ t('planning.weekly.commitmentsStep.suggested') }} {{ weeklyTrackerTargetSuggestions[tracker.id] ?? 1 }}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </AppCard>

          <p class="text-xs text-neu-muted text-center mt-4">
            You can still add commitments without linking them to a project.
          </p>
        </div>

        <!-- Weekly Habits Section -->
        <AppCard v-if="weeklyHabitTrackers.length > 0" padding="lg" class="mt-4">
          <h3 class="text-base font-semibold text-neu-text mb-2 flex items-center gap-2">
            <ArrowPathIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.commitmentsStep.weeklyHabits') }}
          </h3>
          <p class="text-sm text-neu-muted">
            Choose which habit trackers to include this week.
          </p>

          <div class="mt-4 space-y-2">
            <label
              v-for="entry in weeklyHabitTrackers"
              :key="entry.tracker.id"
              class="flex items-start gap-3 p-3 neo-checkbox-row"
              :class="isWeeklyTrackerSelected(entry.tracker.id) ? 'neo-checkbox-row--checked' : ''"
            >
              <input
                type="checkbox"
                class="mt-0.5 neo-checkbox"
                :checked="isWeeklyTrackerSelected(entry.tracker.id)"
                @change="handleWeeklyTrackerSelectionChange(entry.tracker.id, $event)"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-neu-text">{{ entry.habit.name }}</p>
                <p class="text-xs text-neu-muted">
                  {{ getWeeklyHabitTrackerSummary(entry.tracker) }}
                </p>
              </div>
            </label>
          </div>
        </AppCard>
      </div>

      <!-- Step 3: Choose Commitments -->
      <div v-if="draft.activeStep === 2">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <ClipboardDocumentCheckIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.commitmentsStep.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Define the specific actions you'll take this week.
          </p>
        </AppCard>

        <!-- Commitment Form (Create/Edit) -->
        <DraftCommitmentForm
          v-if="showCommitmentForm"
          :commitment="commitmentToEdit"
          :projects="activeProjects"
          :life-areas="availableLifeAreas"
          :priorities="prioritiesForYear"
          :default-project-id="defaultProjectIdForForm"
          class="mb-4"
          @save="handleSaveCommitment"
          @cancel="closeCommitmentForm"
        />

        <!-- Commitments List -->
        <template v-else>
          <!-- Empty State -->
          <AppCard v-if="draft.commitments.length === 0" padding="lg" >
            <div class="text-center py-6">
              <div
                class="w-12 h-12 mx-auto mb-3 rounded-full neo-icon-circle flex items-center justify-center"
              >
                <ClipboardDocumentCheckIcon class="w-6 h-6 text-neu-muted" />
              </div>
              <p class="text-neu-muted mb-4">
                {{ t('planning.weekly.commitmentsStep.emptyDescription') }}
              </p>
              <AppButton variant="filled"  @click="openCreateCommitmentForm()">
                <PlusIcon class="w-4 h-4 mr-2" />
                {{ t('planning.weekly.commitmentsStep.addFirst') }}
              </AppButton>
            </div>
          </AppCard>

          <!-- Commitment Cards -->
          <div v-else class="space-y-3">
            <DraftCommitmentCard
              v-for="commitment in sortedCommitments"
              :key="commitment.id"
              :commitment="commitment"
              :project="getProjectForCommitment(commitment.projectId)"
              :life-areas="availableLifeAreas"
              :priorities="prioritiesForYear"
              @edit="openEditCommitmentForm"
              @delete="handleDeleteCommitment"
            />

            <!-- Add More Button -->
            <div class="flex justify-end">
              <AppButton variant="tonal" @click="openCreateCommitmentForm()">
                <PlusIcon class="w-4 h-4 mr-2" />
                {{ t('planning.weekly.commitmentsStep.addCommitment') }}
              </AppButton>
            </div>
          </div>

          <!-- Validation -->
          <p v-if="step3ValidationError" class="mt-4 text-sm text-error">
            {{ step3ValidationError }}
          </p>
        </template>
      </div>

      <!-- Step 4: Set Weekly Focus -->
      <div v-if="draft.activeStep === 3">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <SparklesIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.focusStep.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            Define what success looks like this week and how you'll handle obstacles.
          </p>
        </AppCard>

        <!-- Focus Sentence -->
        <AppCard padding="lg" class="mb-4">
          <label for="focus-sentence" class="block text-sm font-medium text-neu-text mb-2">
            {{ t('planning.weekly.focusStep.focusSentenceLabel') }}
            <span class="text-neu-muted font-normal">{{ t('planning.weekly.period.optional') }}</span>
          </label>
          <textarea
            id="focus-sentence"
            v-model="draft.focusSentence"
            rows="2"
            :placeholder="t('planning.weekly.focusStep.focusSentencePlaceholder')"
            class="w-full p-3 neo-input resize-none"
          />
        </AppCard>

        <!-- Adaptive Intention -->
        <AppCard padding="lg" >
          <label for="adaptive-intention" class="block text-sm font-medium text-neu-text mb-2">
            {{ t('planning.weekly.focusStep.adaptiveIntentionLabel') }}
            <span class="text-neu-muted font-normal">{{ t('planning.weekly.period.optional') }}</span>
          </label>
          <textarea
            id="adaptive-intention"
            v-model="draft.adaptiveIntention"
            rows="2"
            :placeholder="t('planning.weekly.focusStep.adaptiveIntentionPlaceholder')"
            class="w-full p-3 neo-input resize-none"
          />

          <p class="text-xs text-neu-muted mt-4 text-center">
            Both fields are optional. You can skip this step if you prefer.
          </p>
        </AppCard>

        <!-- Parts to Watch (IFS integration) -->
        <AppCard
          v-if="hasEnoughIFSParts && lastWeekMostActiveParts.length > 0"
          padding="lg"
          class="mt-4"
        >
          <h3 class="text-base font-semibold text-neu-text mb-2 flex items-center gap-2">
            <GlobeAltIcon class="w-5 h-5 text-primary" />
            {{ t('planning.weekly.focusStep.partsToWatch') }}
          </h3>
          <p class="text-sm text-neu-muted mb-3">
            Last week, your most active parts were:
          </p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="ap in lastWeekMostActiveParts"
              :key="ap.partId"
              class="neo-pill flex items-center gap-1.5 px-2.5 py-1 text-xs"
            >
              <span class="font-medium text-on-surface">{{ ap.partName }}</span>
              <span class="text-on-surface-variant">{{ ap.avgIntensity.toFixed(1) }}/10</span>
            </div>
          </div>
          <p class="text-xs text-neu-muted mt-3">
            Consider: Which parts might activate around this week's commitments?
          </p>
        </AppCard>
      </div>

      <!-- Step 5: Review & Confirm -->
      <div v-if="draft.activeStep === 4">
        <WeeklyReviewSummary
          :draft="draft"
          :week-range-label="weekRangeLabel"
          :life-areas="availableLifeAreas"
          :priorities="prioritiesForYear"
          :projects="activeProjects"
          :battery-trend-panels="batteryTrendPanels"
        />

        <!-- Save Error Display -->
        <AppCard v-if="saveError" padding="md" class="mt-4" style="border-color: rgb(var(--color-error) / 0.5) !important;">
          <div class="flex items-start gap-3 text-error">
            <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ t('planning.weekly.confirmStep.saveError') }}</p>
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
        <!-- Back Button -->
        <AppButton
          v-if="draft.activeStep > 0"
          variant="text"
                   @click="handleBack"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          {{ t('common.buttons.back') }}
        </AppButton>
        <div v-else />

        <!-- Next/Skip Buttons -->
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
                       :disabled="isSaving || !canProceed"
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
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <ArrowRightIcon v-else-if="draft.activeStep < 4" class="w-4 h-4 ml-2" />
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * WeeklyPlanningView - Multi-step weekly planning wizard
 *
 * This view guides users through the weekly planning process:
 * - Step 1: Period setup + battery trends + constraints note
 * - Step 2: Review active projects
 * - Step 3: Choose commitments
 * - Step 4: Set weekly focus
 * - Step 5: Review & confirm
 *
 * Draft state is persisted to sessionStorage so users can resume.
 * Final persistence to IndexedDB happens only in the Review step.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CalendarDaysIcon,
  BoltIcon,
  RocketLaunchIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  PlusIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import DraftCommitmentForm from '@/components/planning/weekly/DraftCommitmentForm.vue'
import DraftCommitmentCard from '@/components/planning/weekly/DraftCommitmentCard.vue'
import WeeklyReviewSummary from '@/components/planning/WeeklyReviewSummary.vue'
import { useT } from '@/composables/useT'
import {
  useWeeklyPlanningDraft,
  type DraftCommitment,
} from '@/composables/useWeeklyPlanningDraft'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useHabitStore } from '@/stores/habit.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import {
  getMonthRange,
  getWeekRange,
  formatPeriodDateRange,
  getYearFromDate,
  parseLocalISODate,
  toLocalISODateString,
} from '@/utils/periodUtils'
import { resolvePeriodTrackerSelection } from '@/services/periodTrackerSelection.service'
import type { Project, ProjectStatus, Tracker, WeeklyPlan } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import { buildWeeklyBatteryTrend } from '@/services/weeklyBatteryTrend.service'
import type { WeeklyBatteryTrendPoint } from '@/services/weeklyBatteryTrend.service'

// ============================================================================
// Route & Router
// ============================================================================

const { t } = useT()
const route = useRoute()
const router = useRouter()
const routePlanId = computed(() => route.params.planId as string | undefined)
const resolvedEditPlanId = ref<string | null>(null)
const lastLoadedRouteContext = ref<string | null>(null)
const hasLoadedRouteContext = ref(false)

function isIsoDateString(value?: string): value is string {
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

const routeEditPlanId = computed(() => {
  if (!routePlanId.value || routePlanId.value === 'new' || isIsoDateString(routePlanId.value)) {
    return null
  }
  return routePlanId.value
})

const effectiveEditPlanId = computed(() => resolvedEditPlanId.value ?? routeEditPlanId.value)
const isEditMode = computed(() => !!effectiveEditPlanId.value)

function resolveWeekRangeFromDateString(value?: string): { startDate: string; endDate: string } | null {
  if (!isIsoDateString(value)) return null
  const parsed = parseLocalISODate(value)
  if (Number.isNaN(parsed.getTime())) return null
  const range = getWeekRange(parsed)
  return {
    startDate: toLocalISODateString(range.start),
    endDate: toLocalISODateString(range.end),
  }
}

// ============================================================================
// Step Definitions
// ============================================================================

interface Step {
  id: string
  title: string
  subtitle: string
}

const steps = computed<Step[]>(() => [
  { id: 'capacity', title: t('planning.weekly.steps.capacity.title'), subtitle: t('planning.weekly.steps.capacity.subtitle') },
  { id: 'projects', title: t('planning.weekly.steps.projects.title'), subtitle: t('planning.weekly.steps.projects.subtitle') },
  { id: 'commitments', title: t('planning.weekly.steps.commitments.title'), subtitle: t('planning.weekly.steps.commitments.subtitle') },
  { id: 'focus', title: t('planning.weekly.steps.focus.title'), subtitle: t('planning.weekly.steps.focus.subtitle') },
  { id: 'confirm', title: t('planning.weekly.steps.confirm.title'), subtitle: t('planning.weekly.steps.confirm.subtitle') },
])

// ============================================================================
// Stores
// ============================================================================

const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const commitmentStore = useCommitmentStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const habitStore = useHabitStore()
const trackerStore = useTrackerStore()
const ifsPartStore = useIFSPartStore()
const ifsDailyCheckInStore = useIFSDailyCheckInStore()

// ============================================================================
// Week Computation
// ============================================================================

const defaultWeekRange = getWeekRange(new Date())
const routeWeekRange = resolveWeekRangeFromDateString(routePlanId.value)
const defaultStartDate = routeWeekRange
  ? routeWeekRange.startDate
  : toLocalISODateString(defaultWeekRange.start)
const defaultEndDate = routeWeekRange
  ? routeWeekRange.endDate
  : toLocalISODateString(defaultWeekRange.end)

// ============================================================================
// Draft State
// ============================================================================

const {
  draft,
  ready: draftReady,
  clearDraft,
  hasDraft,
  addCommitment,
  updateCommitment,
  deleteCommitment,
  getSortedCommitments,
  hasEmptyCommitmentNames,
  seedFromExisting,
  buildConstraintsNote,
} = useWeeklyPlanningDraft(
  routePlanId.value && routePlanId.value !== 'new' && !isIsoDateString(routePlanId.value)
    ? `plan-${routePlanId.value}`
    : defaultStartDate,
  {
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    name: '',
  }
)

const weekRangeLabel = computed(() =>
  formatPeriodDateRange(draft.value.startDate, draft.value.endDate)
)
const currentYear = computed(() => getYearFromDate(draft.value.startDate))
const canonicalPlanForDraft = computed(() => {
  return weeklyPlanStore.getCanonicalWeeklyPlanByPeriod(
    draft.value.startDate,
    draft.value.endDate
  )
})

interface BatteryTrendPanel {
  key: 'body' | 'mind' | 'emotion' | 'social'
  title: string
  description: string
  points: WeeklyBatteryTrendPoint[]
}

const batteryTrendPanels = computed<BatteryTrendPanel[]>(() => {
  const series = buildWeeklyBatteryTrend({
    weeklyPlans: weeklyPlanStore.weeklyPlans,
    weeklyReflections: weeklyReflectionStore.weeklyReflections,
    referenceStartDate: draft.value.startDate,
    lookbackWeeks: 6,
  })

  const byKey = new Map(series.map((item) => [item.battery, item.points]))

  return [
    {
      key: 'body',
      title: t('planning.weekly.batteries.body.title'),
      description: t('planning.weekly.batteries.body.description'),
      points: byKey.get('body') ?? [],
    },
    {
      key: 'mind',
      title: t('planning.weekly.batteries.mind.title'),
      description: t('planning.weekly.batteries.mind.description'),
      points: byKey.get('mind') ?? [],
    },
    {
      key: 'emotion',
      title: t('planning.weekly.batteries.emotion.title'),
      description: t('planning.weekly.batteries.emotion.description'),
      points: byKey.get('emotion') ?? [],
    },
    {
      key: 'social',
      title: t('planning.weekly.batteries.social.title'),
      description: t('planning.weekly.batteries.social.description'),
      points: byKey.get('social') ?? [],
    },
  ]
})

const batteryTrendHasData = computed(() =>
  batteryTrendPanels.value.some((panel) => panel.points.length > 0)
)

function getTrendValueY(value: number | null): number | null {
  if (value === null) return null
  // 1-5 scale mapped into svg y: 4 -> top padding, 34 -> bottom padding.
  const clamped = Math.min(5, Math.max(1, value))
  return 34 - ((clamped - 1) / 4) * 30
}

function buildTrendPath(
  points: WeeklyBatteryTrendPoint[],
  mode: 'demand' | 'state'
): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const singleY = getTrendValueY(points[0][mode])
    return singleY === null ? '' : `M 60 ${singleY} L 60 ${singleY}`
  }

  const stepX = 120 / (points.length - 1)
  let path = ''
  let hasStarted = false

  points.forEach((point, index) => {
    const y = getTrendValueY(point[mode])
    if (y === null) {
      hasStarted = false
      return
    }
    const x = Math.round(index * stepX)
    if (!hasStarted) {
      path += `M ${x} ${y} `
      hasStarted = true
      return
    }
    path += `L ${x} ${y} `
  })

  return path.trim()
}

// ============================================================================
// Loading State
// ============================================================================

const isLoading = ref(true)
const error = ref<string | null>(null)

// Habit generation guard

// ============================================================================
// Saving State (Step 5)
// ============================================================================

const isSaving = ref(false)
const saveError = ref<string | null>(null)
const trackerSelectionNotice = ref<string | null>(null)
const isPersistingTrackerSelectionRepair = ref(false)
const weeklyTrackerTargetSuggestions = ref<Record<string, number>>({})

// ============================================================================
// Projects & Life Areas
// ============================================================================

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const prioritiesForYear = computed(() => priorityStore.getPrioritiesByYear(currentYear.value))

const activeProjects = computed(() => {
  return projectStore.getNonTerminalProjects
})

const focusedProjectIdSet = computed(() => new Set(draft.value.focusedProjectIds))

function isProjectFocused(projectId: string): boolean {
  return focusedProjectIdSet.value.has(projectId)
}

function toggleProjectFocus(projectId: string): void {
  const next = new Set(draft.value.focusedProjectIds)
  if (next.has(projectId)) {
    next.delete(projectId)
  } else {
    next.add(projectId)
  }
  draft.value.focusedProjectIds = Array.from(next)
}

function getPrimaryLifeAreaForProject(project: Project): LifeArea | undefined {
  const id = project.lifeAreaIds?.[0]
  return id ? lifeAreaStore.getLifeAreaById(id) : undefined
}

function getProjectLifeAreaName(project: Project): string {
  return getPrimaryLifeAreaForProject(project)?.name || 'No life area'
}

function getProjectLifeAreaColor(project: Project): string {
  return getPrimaryLifeAreaForProject(project)?.color || 'rgb(var(--color-primary))'
}

function getProjectForCommitment(projectId?: string): Project | undefined {
  if (!projectId) return undefined
  return activeProjects.value.find((p) => p.id === projectId)
}

interface ProjectTrackerGroup {
  project: Project
  trackers: Tracker[]
}

const focusedProjectsForTrackerSelection = computed(() =>
  activeProjects.value.filter((project) => isProjectFocused(project.id))
)

const weeklyTrackerGroups = computed<ProjectTrackerGroup[]>(() => {
  return focusedProjectsForTrackerSelection.value
    .map((project) => ({
      project,
      trackers: trackerStore
        .getTrackersByProject(project.id)
        .filter((tracker) => tracker.isActive && tracker.cadence === 'weekly'),
    }))
    .filter((group) => group.trackers.length > 0)
})

const weeklyHabitTrackers = computed(() => {
  const activeWeeklyHabits = habitStore.habits.filter(
    (h) => h.isActive && !h.isPaused && h.cadence === 'weekly'
  )
  return activeWeeklyHabits
    .map((habit) => {
      const trackers = trackerStore.getTrackersByHabit(habit.id)
      return trackers.length > 0 ? { habit, tracker: trackers[0] } : null
    })
    .filter(Boolean) as { habit: typeof habitStore.habits[number]; tracker: Tracker }[]
})

const weeklySelectableTrackerIds = computed(() => [
  ...weeklyTrackerGroups.value.flatMap((group) => group.trackers.map((tracker) => tracker.id)),
  ...weeklyHabitTrackers.value.map((entry) => entry.tracker.id),
])

const weeklySelectionResolution = computed(() =>
  resolvePeriodTrackerSelection({
    selectedTrackerIds: draft.value.hasCustomTrackerSelection
      ? draft.value.selectedTrackerIds
      : undefined,
    eligibleTrackerIds: weeklySelectableTrackerIds.value,
  })
)

const effectiveWeeklySelectedTrackerIds = computed(
  () => weeklySelectionResolution.value.effectiveSelectedTrackerIds
)

const monthlyCountTrackersForWeeklyTarget = computed(() =>
  weeklyTrackerGroups.value.flatMap((group) =>
    group.trackers.filter(
      (tracker) =>
        tracker.cadence === 'monthly' &&
        tracker.type === 'adherence' &&
        effectiveWeeklySelectedTrackerIds.value.includes(tracker.id)
    )
  )
)

function isWeeklyTrackerSelected(trackerId: string): boolean {
  return effectiveWeeklySelectedTrackerIds.value.includes(trackerId)
}

function shouldShowWeeklyTargetInput(tracker: Tracker): boolean {
  return (
    tracker.cadence === 'monthly' &&
    tracker.type === 'adherence'
  )
}

function getWeeklyHabitTrackerSummary(tracker: Tracker): string {
  if (tracker.type === 'adherence') {
    return `${tracker.type} · target: ${tracker.targetCount ?? '–'}`
  }
  if (tracker.type === 'value') {
    return `${tracker.type} · target: ${tracker.targetValue ?? '–'}${tracker.unit ? ` ${tracker.unit}` : ''}`
  }
  return tracker.type
}

function normalizePositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.ceil(parsed))
}

function getWeeklyTrackerTargetValue(trackerId: string): number {
  const explicit = draft.value.weeklyTrackerTargets[trackerId]
  if (typeof explicit === 'number' && explicit > 0) {
    return normalizePositiveInt(explicit, 1)
  }
  return weeklyTrackerTargetSuggestions.value[trackerId] ?? 1
}

function handleWeeklyTrackerTargetInput(trackerId: string, event: Event): void {
  const input = event.target as HTMLInputElement | null
  if (!input) return
  const nextValue = normalizePositiveInt(input.value, weeklyTrackerTargetSuggestions.value[trackerId] ?? 1)
  draft.value.weeklyTrackerTargets = {
    ...draft.value.weeklyTrackerTargets,
    [trackerId]: nextValue,
  }
}

function isCheckedEvent(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false
}

function toggleWeeklyTrackerSelection(trackerId: string, selected: boolean): void {
  draft.value.hasCustomTrackerSelection = true
  trackerSelectionNotice.value = null
  const next = new Set(effectiveWeeklySelectedTrackerIds.value)
  if (selected) {
    next.add(trackerId)
    const trackerProject = weeklyTrackerGroups.value.find((group) =>
      group.trackers.some((tracker) => tracker.id === trackerId)
    )
    if (trackerProject && !draft.value.focusedProjectIds.includes(trackerProject.project.id)) {
      draft.value.focusedProjectIds = [...draft.value.focusedProjectIds, trackerProject.project.id]
    }
  } else {
    next.delete(trackerId)
    if (trackerId in draft.value.weeklyTrackerTargets) {
      const { [trackerId]: _removed, ...rest } = draft.value.weeklyTrackerTargets
      draft.value.weeklyTrackerTargets = rest
    }
  }
  draft.value.selectedTrackerIds = Array.from(next)
}

function handleWeeklyTrackerSelectionChange(trackerId: string, event: Event): void {
  toggleWeeklyTrackerSelection(trackerId, isCheckedEvent(event))
}

watch(
  weeklySelectionResolution,
  (resolution) => {
    if (!resolution.repairedSelectedTrackerIds) return
    if (areStringArraysEqual(resolution.repairedSelectedTrackerIds, draft.value.selectedTrackerIds)) {
      return
    }

    draft.value.hasCustomTrackerSelection = true
    draft.value.selectedTrackerIds = [...resolution.repairedSelectedTrackerIds]
    trackerSelectionNotice.value =
      resolution.repairMode === 'fallback'
        ? 'Tracker selection was repaired and reset to available trackers.'
        : 'Tracker selection was repaired to remove missing trackers.'

    if (!isEditMode.value || !effectiveEditPlanId.value || isPersistingTrackerSelectionRepair.value) return
    void persistWeeklyTrackerSelectionRepair(resolution.repairedSelectedTrackerIds)
  },
  { immediate: true }
)

async function persistWeeklyTrackerSelectionRepair(trackerIds: string[]) {
  if (!effectiveEditPlanId.value) return
  isPersistingTrackerSelectionRepair.value = true
  try {
    await weeklyPlanStore.updateWeeklyPlan(effectiveEditPlanId.value, { selectedTrackerIds: trackerIds })
  } catch (error) {
    console.error('Failed to persist repaired weekly tracker selection:', error)
  } finally {
    isPersistingTrackerSelectionRepair.value = false
  }
}

function getCompletedTicksForPeriod(period: Awaited<ReturnType<typeof trackerPeriodDexieRepository.getByTrackerIdAndPeriod>>): number {
  if (!period?.ticks?.length) return 0
  return period.ticks.filter((tick) => tick.completed).length
}

function countRemainingWeeksInMonthIncludingCurrent(weekStartDate: string): number {
  const weekStart = parseLocalISODate(weekStartDate)
  const monthRange = getMonthRange(weekStart)
  let cursor = getWeekRange(weekStart).start
  let count = 0

  while (cursor <= monthRange.end) {
    count += 1
    const next = new Date(cursor)
    next.setDate(next.getDate() + 7)
    cursor = next
  }

  return Math.max(1, count)
}

async function suggestWeeklyTargetForMonthlyTracker(tracker: Tracker): Promise<number> {
  const monthlyTarget = normalizePositiveInt(tracker.targetCount ?? 0, 1)
  const monthRange = getMonthRange(parseLocalISODate(draft.value.startDate))
  const monthStartDate = toLocalISODateString(monthRange.start)
  const monthEndDate = toLocalISODateString(monthRange.end)

  const periods = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
    tracker.id,
    monthStartDate,
    monthEndDate
  )
  const completedBeforeCurrentWeek = periods
    .filter((period) => period.startDate < draft.value.startDate)
    .reduce((total, period) => total + getCompletedTicksForPeriod(period), 0)

  const remainingTarget = Math.max(monthlyTarget - completedBeforeCurrentWeek, 0)
  const remainingWeeks = countRemainingWeeksInMonthIncludingCurrent(draft.value.startDate)

  return normalizePositiveInt(Math.ceil(remainingTarget / remainingWeeks), 1)
}

async function refreshWeeklyTrackerTargetSuggestions() {
  const suggestions: Record<string, number> = {}

  for (const tracker of monthlyCountTrackersForWeeklyTarget.value) {
    const suggested = await suggestWeeklyTargetForMonthlyTracker(tracker)
    suggestions[tracker.id] = suggested
  }

  weeklyTrackerTargetSuggestions.value = suggestions

  const nextTargets = { ...draft.value.weeklyTrackerTargets }
  for (const [trackerId, suggested] of Object.entries(suggestions)) {
    if (!(trackerId in nextTargets) || !nextTargets[trackerId] || nextTargets[trackerId] < 1) {
      nextTargets[trackerId] = suggested
    }
  }

  draft.value.weeklyTrackerTargets = nextTargets
}

watch(
  [monthlyCountTrackersForWeeklyTarget, () => draft.value.startDate],
  () => {
    void refreshWeeklyTrackerTargetSuggestions()
  },
  { immediate: true }
)

// ============================================================================
// Weekly Habit Trackers (Step 2)
// ============================================================================

// Focus-area helpers removed; commitments now link directly to life areas / priorities.

// ============================================================================
// IFS Parts to Watch (Step 4)
// ============================================================================

const hasEnoughIFSParts = computed(() => ifsPartStore.parts.length >= 3)

const lastWeekMostActiveParts = computed(() => {
  if (!hasEnoughIFSParts.value) return []
  // Get previous week date range
  const currentStart = parseLocalISODate(draft.value.startDate)
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - 6)
  const prevStartStr = toLocalISODateString(prevStart)
  const prevEndStr = toLocalISODateString(prevEnd)

  const partIntensities = new Map<string, number[]>()
  for (const checkIn of ifsDailyCheckInStore.checkIns) {
    if (checkIn.practiceType !== 'weather-report' || !checkIn.activeParts) continue
    const date = checkIn.createdAt.slice(0, 10)
    if (date < prevStartStr || date > prevEndStr) continue
    for (const ap of checkIn.activeParts) {
      if (!partIntensities.has(ap.partId)) {
        partIntensities.set(ap.partId, [])
      }
      partIntensities.get(ap.partId)!.push(ap.intensity)
    }
  }

  return [...partIntensities.entries()]
    .map(([partId, intensities]) => ({
      partId,
      partName: ifsPartStore.getPartById(partId)?.name ?? 'Unknown',
      avgIntensity: intensities.reduce((a, b) => a + b, 0) / intensities.length,
    }))
    .sort((a, b) => b.avgIntensity - a.avgIntensity)
    .slice(0, 3)
})

function getStatusLabel(status: ProjectStatus): string {
  return t(`planning.common.status.${status}`) || status
}

function getStatusBadgeClasses(status: ProjectStatus): string {
  const classes: Record<ProjectStatus, string> = {
    planned: 'bg-neu-base text-neu-muted shadow-neu-flat',
    active: 'bg-primary/5 text-primary/70 shadow-neu-flat',
    paused: 'bg-neu-base text-neu-muted shadow-neu-flat',
    completed: 'bg-success/5 text-success/60 shadow-neu-flat',
    abandoned: 'bg-neu-base text-neu-muted/60 shadow-neu-flat',
  }
  return classes[status] || 'bg-neu-base text-neu-muted shadow-neu-flat'
}

// ============================================================================
// Commitment Form State (Step 3)
// ============================================================================

const showCommitmentForm = ref(false)
const commitmentToEdit = ref<DraftCommitment | undefined>(undefined)
const defaultProjectIdForForm = ref<string | undefined>(undefined)

const sortedCommitments = computed(() => getSortedCommitments())

function openCreateCommitmentForm(projectId?: string) {
  commitmentToEdit.value = undefined
  defaultProjectIdForForm.value = projectId
  showCommitmentForm.value = true
}

function openEditCommitmentForm(id: string) {
  commitmentToEdit.value = draft.value.commitments.find((c) => c.id === id)
  defaultProjectIdForForm.value = undefined
  showCommitmentForm.value = true
}

function closeCommitmentForm() {
  showCommitmentForm.value = false
  commitmentToEdit.value = undefined
  defaultProjectIdForForm.value = undefined
}

async function handleSaveCommitment(
  data: Omit<DraftCommitment, 'id' | 'sortOrder' | 'status'>
) {
  if (commitmentToEdit.value) {
    updateCommitment(commitmentToEdit.value.id, data)
  } else {
    addCommitment(data)
  }
  closeCommitmentForm()
}

async function handleDeleteCommitment(id: string) {
  deleteCommitment(id)
}

function handleAddCommitmentFromProject(projectId: string) {
  // Advance to Step 3 and open form with project pre-selected
  draft.value.activeStep = 2
  openCreateCommitmentForm(projectId)
}

// resolveHabitPeriod and suppressHabitOccurrence removed — habits are pure trackers

// ============================================================================
// Validation
// ============================================================================

const periodValidationError = computed(() => {
  if (draft.value.activeStep !== 0) return ''
  if (!draft.value.startDate || !draft.value.endDate) {
    return 'Please choose a start and end date.'
  }
  if (draft.value.endDate < draft.value.startDate) {
    return 'End date must be after the start date.'
  }
  return ''
})

const step3ValidationError = computed(() => {
  if (draft.value.activeStep !== 2) return ''
  if (hasEmptyCommitmentNames()) {
    return 'All commitments must have a name.'
  }
  return ''
})

function validateCurrentStep(): boolean {
  if (draft.value.activeStep === 0) {
    return !periodValidationError.value
  }
  if (draft.value.activeStep === 2) {
    // Don't block if no commitments, but validate if there are any
    if (draft.value.commitments.length > 0) {
      return !step3ValidationError.value
    }
  }
  if (draft.value.activeStep === 4) {
    return canConfirm.value
  }
  return true
}

// ============================================================================
// Confirm & Persistence Logic (Step 5)
// ============================================================================

const canConfirm = computed(() => {
  // Validate commitments
  if (draft.value.commitments.length > 0) {
    if (hasEmptyCommitmentNames()) return false
  }
  return true
})

const canProceed = computed(() => {
  if (draft.value.activeStep === 2 && showCommitmentForm.value) {
    return false // Can't proceed while editing a commitment
  }
  if (draft.value.activeStep === 4) {
    return canConfirm.value
  }
  return validateCurrentStep()
})

const selectedTrackerIdsForPersistence = computed(() =>
  Array.from(new Set(effectiveWeeklySelectedTrackerIds.value))
)

async function handleConfirm(): Promise<void> {
  if (!canConfirm.value) {
    saveError.value = 'Please fix validation errors before saving.'
    return
  }

  isSaving.value = true
  saveError.value = null

  try {
    const targetPlanId = isEditMode.value
      ? effectiveEditPlanId.value
      : canonicalPlanForDraft.value?.id

    if (targetPlanId) {
      await handleConfirmEditMode(targetPlanId)
    } else {
      await handleConfirmCreateMode()
    }

    clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error saving weekly plan:', err)
  } finally {
    isSaving.value = false
  }
}

async function applyFocusWeekTags(weeklyPlanId: string): Promise<void> {
  if (activeProjects.value.length === 0) return
  const focusedIds = new Set(draft.value.focusedProjectIds)

  for (const project of activeProjects.value) {
    const current = project.focusWeekIds ?? []
    const next = new Set(current)
    const shouldFocus = focusedIds.has(project.id)

    if (shouldFocus) {
      next.add(weeklyPlanId)
    } else {
      next.delete(weeklyPlanId)
    }

    const nextArray = Array.from(next)
    if (!areStringArraysEqual(current, nextArray)) {
      await projectStore.updateProject(project.id, { focusWeekIds: nextArray })
    }
  }
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

// persistHabitOccurrences removed — habits are now pure trackers, no commitment generation

async function ensureSelectedTrackerPeriods(
  startDate: string,
  endDate: string,
  trackerIds: string[],
  weeklyTrackerTargets: Record<string, number>
): Promise<void> {
  for (const trackerId of trackerIds) {
    const tracker = trackerStore.getTrackerById(trackerId)
    if (!tracker) continue

    const isSupportedCadence = tracker.cadence === 'weekly'
    if (!isSupportedCadence) continue

    const weeklyTargetOverride =
      tracker.cadence === 'monthly' &&
      tracker.type === 'adherence' &&
      weeklyTrackerTargets[tracker.id]
        ? normalizePositiveInt(weeklyTrackerTargets[tracker.id], 1)
        : undefined

    const existing = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(tracker.id, startDate)
    if (existing) {
      if (
        weeklyTargetOverride !== undefined &&
        existing.periodTarget !== weeklyTargetOverride
      ) {
        await trackerPeriodDexieRepository.update(existing.id, {
          periodTarget: weeklyTargetOverride,
        })
      }
      continue
    }

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate,
      endDate,
      sourceType: 'planning',
      periodTarget: weeklyTargetOverride,
    })
  }
}

async function handleConfirmCreateMode(): Promise<void> {
  const commitmentIdMapping = new Map<string, string>()

  // 1. Create WeeklyPlan first (so commitments can reference weeklyPlanId)
  const createdPlan = await weeklyPlanStore.createWeeklyPlan({
    startDate: draft.value.startDate,
    endDate: draft.value.endDate,
    name: draft.value.name.trim() || undefined,
    constraintsNote: buildConstraintsNote(),
    focusSentence: draft.value.focusSentence.trim() || undefined,
    adaptiveIntention: draft.value.adaptiveIntention.trim() || undefined,
    selectedTrackerIds: selectedTrackerIdsForPersistence.value,
  })

  await ensureSelectedTrackerPeriods(
    createdPlan.startDate,
    createdPlan.endDate,
    selectedTrackerIdsForPersistence.value,
    draft.value.weeklyTrackerTargets
  )

  // 2. Create all commitments linked to the weekly plan
  for (const draftCommitment of draft.value.commitments) {
    const created = await commitmentStore.createCommitment({
      weeklyPlanId: createdPlan.id,
      name: draftCommitment.name.trim(),
      projectId: draftCommitment.projectId || undefined,
      lifeAreaIds: draftCommitment.lifeAreaIds,
      priorityIds: draftCommitment.priorityIds,

      status: 'planned',
      startDate: draft.value.startDate,
      endDate: draft.value.endDate,
      periodType: 'weekly' as const,
    })
    commitmentIdMapping.set(draftCommitment.id, created.id)
  }

  // 3. Apply focus tags to projects
  await applyFocusWeekTags(createdPlan.id)
}

async function handleConfirmEditMode(planIdOverride?: string): Promise<void> {
  // Load existing data for comparison
  const planId = planIdOverride ?? effectiveEditPlanId.value
  if (!planId) {
    throw new Error('Missing weekly plan id')
  }

  await Promise.all([
    commitmentStore.loadCommitments({ weeklyPlanId: planId }),
    weeklyPlanStore.loadWeeklyPlans(),
  ])

  const existingCommitments = commitmentStore.getCommitmentsByWeeklyPlanId(planId)
  const existingPlan = weeklyPlanStore.getWeeklyPlanById(planId)

  if (!existingPlan) {
    throw new Error('Weekly plan not found')
  }

  const existingCommitmentIds = new Set(existingCommitments.map((c) => c.id))
  const draftCommitmentIds = new Set(draft.value.commitments.map((c) => c.id))

  // Categorize commitments
  const commitmentsToCreate = draft.value.commitments.filter((c) => !existingCommitmentIds.has(c.id))
  const commitmentsToUpdate = draft.value.commitments.filter((c) => existingCommitmentIds.has(c.id))
  const commitmentsToDelete = existingCommitments.filter((c) => !draftCommitmentIds.has(c.id))

  const commitmentIdMapping = new Map<string, string>()

  // 1. Delete removed commitments
  for (const commitment of commitmentsToDelete) {
    await commitmentStore.deleteCommitment(commitment.id)
  }

  // 2. Create new commitments
  for (const draftCommitment of commitmentsToCreate) {
    const created = await commitmentStore.createCommitment({
      weeklyPlanId: existingPlan.id,
      name: draftCommitment.name.trim(),
      projectId: draftCommitment.projectId || undefined,
      lifeAreaIds: draftCommitment.lifeAreaIds,
      priorityIds: draftCommitment.priorityIds,

      status: 'planned',
      startDate: draft.value.startDate,
      endDate: draft.value.endDate,
      periodType: 'weekly' as const,
    })
    commitmentIdMapping.set(draftCommitment.id, created.id)
  }

  // 3. Update existing commitments (preserve status)
  for (const draftCommitment of commitmentsToUpdate) {
    await commitmentStore.updateCommitment(draftCommitment.id, {
      name: draftCommitment.name.trim(),
      projectId: draftCommitment.projectId || undefined,
      lifeAreaIds: draftCommitment.lifeAreaIds,
      priorityIds: draftCommitment.priorityIds,

      // Don't update status - preserve the existing value
    })
    commitmentIdMapping.set(draftCommitment.id, draftCommitment.id)
  }

  // 4. Update WeeklyPlan
  await weeklyPlanStore.updateWeeklyPlan(existingPlan.id, {
    startDate: draft.value.startDate,
    endDate: draft.value.endDate,
    name: draft.value.name.trim() || undefined,
    constraintsNote: buildConstraintsNote(),
    focusSentence: draft.value.focusSentence.trim() || undefined,
    adaptiveIntention: draft.value.adaptiveIntention.trim() || undefined,
    selectedTrackerIds: selectedTrackerIdsForPersistence.value,
  })

  await ensureSelectedTrackerPeriods(
    draft.value.startDate,
    draft.value.endDate,
    selectedTrackerIdsForPersistence.value,
    draft.value.weeklyTrackerTargets
  )

  // 5. Apply focus tags to projects
  await applyFocusWeekTags(existingPlan.id)
}

// ============================================================================
// Navigation
// ============================================================================

const canSkip = computed(() => {
  // Can skip Step 2 (projects review is informational) and Step 4 (focus is optional)
  return draft.value.activeStep === 1 || draft.value.activeStep === 3
})

const nextButtonText = computed(() => {
  switch (draft.value.activeStep) {
    case 0:
      return t('planning.weekly.nextButton.toProjects')
    case 1:
      return t('planning.weekly.nextButton.toCommitments')
    case 2:
      return t('planning.weekly.nextButton.toFocus')
    case 3:
      return t('planning.weekly.nextButton.toConfirm')
    case 4:
      return isSaving.value ? t('common.saving') : t('planning.weekly.nextButton.savePlan')
    default:
      return t('common.buttons.next')
  }
})

const progressWidth = computed(() => {
  const progress = ((draft.value.activeStep + 1) / steps.value.length) * 100
  return `${progress}%`
})

function getStepCircleClasses(index: number) {
  if (index < draft.value.activeStep) {
    return 'neo-step-completed'
  } else if (index === draft.value.activeStep) {
    return 'neo-step-active'
  } else {
    return 'neo-step-future'
  }
}

function goToStep(index: number) {
  if (index <= draft.value.activeStep) {
    draft.value.activeStep = index
  }
}

function handleBack() {
  if (draft.value.activeStep > 0) {
    draft.value.activeStep--
  }
}

async function handleNext() {
  if (!validateCurrentStep()) {
    return
  }

  if (draft.value.activeStep < steps.value.length - 1) {
    draft.value.activeStep++
  } else {
    await handleConfirm()
  }
}

function handleSkip() {
  handleNext()
}

function handleCancel() {
  router.push('/planning')
}

function goToMonthlyPlanning() {
  router.push('/planning/month/new')
}

// ============================================================================
// Data Loading
// ============================================================================

// generateHabitsForWeek removed — habits are now selected as trackers in Step 2

async function loadData() {
  const routeContext = `${route.path}::${routePlanId.value ?? 'new'}`
  const routeChanged = hasLoadedRouteContext.value && lastLoadedRouteContext.value !== routeContext

  isLoading.value = true
  error.value = null
  if (routeChanged) {
    clearDraft()
  }

  try {
    // Load focus areas, projects, and existing plan data
    await Promise.all([
      draftReady,
      projectStore.loadProjects(),
      weeklyPlanStore.loadWeeklyPlans(),
      weeklyReflectionStore.loadWeeklyReflections(),
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(currentYear.value),
      habitStore.loadHabits(),
      trackerStore.loadTrackers(),
      // IFS stores
      ifsPartStore.loadParts(),
      ifsDailyCheckInStore.loadCheckIns(),
    ])

    const routeWeek = resolveWeekRangeFromDateString(routePlanId.value)
    if (routeWeek && !hasDraft()) {
      draft.value.startDate = routeWeek.startDate
      draft.value.endDate = routeWeek.endDate
    }

    const planForRoute = resolvePlanForRoute(routeWeek)
    resolvedEditPlanId.value = planForRoute?.id ?? null

    if (effectiveEditPlanId.value) {
      await commitmentStore.loadCommitments({ weeklyPlanId: effectiveEditPlanId.value })
    }

    const existingPlanForEdit = effectiveEditPlanId.value
      ? weeklyPlanStore.getWeeklyPlanById(effectiveEditPlanId.value)
      : undefined
    const hasMismatchedDraftWindow =
      !!existingPlanForEdit &&
      hasDraft() &&
      (draft.value.startDate !== existingPlanForEdit.startDate ||
        draft.value.endDate !== existingPlanForEdit.endDate)

    const shouldForceSeed =
      routeChanged ||
      isIsoDateString(routePlanId.value) ||
      hasMismatchedDraftWindow
    if (effectiveEditPlanId.value && (!hasDraft() || shouldForceSeed)) {
      await seedFromExistingWeek(effectiveEditPlanId.value)
      draft.value.activeStep = 0
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
    console.error('Error loading weekly planning data:', err)
  } finally {
    isLoading.value = false
    lastLoadedRouteContext.value = routeContext
    hasLoadedRouteContext.value = true
  }
}

function resolvePlanForRoute(
  routeWeek: { startDate: string; endDate: string } | null
): WeeklyPlan | undefined {
  const planId = routePlanId.value
  if (planId && planId !== 'new' && !isIsoDateString(planId)) {
    return weeklyPlanStore.getWeeklyPlanById(planId)
  }

  if (routeWeek) {
    return weeklyPlanStore.getCanonicalWeeklyPlanByPeriod(routeWeek.startDate, routeWeek.endDate)
  }

  if (route.path.endsWith('/new')) {
    return weeklyPlanStore.getCanonicalWeeklyPlanByPeriod(
      draft.value.startDate,
      draft.value.endDate
    )
  }

  return undefined
}

async function seedFromExistingWeek(planId: string) {
  const existingPlan = weeklyPlanStore.getWeeklyPlanById(planId)
  const existingCommitments = commitmentStore.getCommitmentsByWeeklyPlanId(planId)

  if (existingPlan) {
    const focusedProjectIds = activeProjects.value
      .filter((project) => (project.focusWeekIds ?? []).includes(existingPlan.id))
      .map((project) => project.id)
    seedFromExisting(existingPlan, existingCommitments, focusedProjectIds)
    await seedWeeklyTrackerTargetsFromExistingPeriods(existingPlan.startDate)
  }
}

async function seedWeeklyTrackerTargetsFromExistingPeriods(weekStartDate: string): Promise<void> {
  const selectedIds = new Set(effectiveWeeklySelectedTrackerIds.value)
  if (selectedIds.size === 0) return

  const nextTargets = { ...draft.value.weeklyTrackerTargets }

  for (const trackerId of selectedIds) {
    const tracker = trackerStore.getTrackerById(trackerId)
    if (!tracker || !shouldShowWeeklyTargetInput(tracker)) continue

    const period = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      tracker.id,
      weekStartDate
    )
    if (period?.periodTarget && period.periodTarget > 0) {
      nextTargets[tracker.id] = normalizePositiveInt(period.periodTarget, 1)
    }
  }

  draft.value.weeklyTrackerTargets = nextTargets
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadData()
})

// Watch for week changes (if navigating between different weeks)
watch(
  routePlanId,
  () => {
    resolvedEditPlanId.value = null
    loadData()
  }
)
</script>
