<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="handleBack"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('planning.reflection.weekly.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ weekRangeLabel }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <AppCard v-if="isLoading" padding="lg">
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
          <span>Loading reflection data...</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error" padding="lg">
      <div class="text-center py-8">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">
          Try Again
        </AppButton>
      </div>
    </AppCard>

    <!-- Empty State: No Plan Exists -->
    <AppCard v-else-if="!weeklyPlan" padding="lg">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <CalendarDaysIcon class="w-8 h-8 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-on-surface mb-2">
          No Weekly Plan Yet
        </h3>
        <p class="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
          You need to create a weekly plan for {{ weekRangeLabel }} before you can reflect on it.
        </p>
        <div class="flex flex-col gap-3 items-center">
          <AppButton variant="filled" @click="goToWeeklyPlanning">
            <PlusIcon class="w-4 h-4 mr-2" />
            Create Weekly Plan
          </AppButton>
          <AppButton variant="text" @click="handleBack">
            Back to Planning Hub
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Reflection Content -->
    <template v-else>
      <!-- Section 1: Review Commitments -->
      <AppCard padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <ClipboardDocumentCheckIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.reviewCommitments.title') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-6">
          Update the status of each commitment and add any reflection notes.
        </p>

        <!-- No Commitments -->
        <div v-if="commitments.length === 0" class="text-center py-6">
          <p class="text-on-surface-variant">
            {{ t('planning.reflection.weekly.reviewCommitments.noCommitments') }}
          </p>
        </div>

        <!-- Commitment List -->
        <div v-else class="space-y-4">
          <!-- Soft reminder for planned commitments -->
          <div
            v-if="plannedCommitmentsCount > 0"
            class="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3"
          >
            <ExclamationTriangleIcon class="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <p class="text-sm text-on-surface">
              {{ plannedCommitmentsCount }} commitment{{ plannedCommitmentsCount > 1 ? 's' : '' }} 
              still {{ plannedCommitmentsCount > 1 ? 'have' : 'has' }} "Planned" status. 
              Consider updating {{ plannedCommitmentsCount > 1 ? 'their' : 'its' }} status before completing your reflection.
            </p>
          </div>

          <div
            v-for="commitment in commitments"
            :key="commitment.id"
            class="border border-neu-border/20 rounded-xl overflow-hidden"
          >
            <!-- Commitment Header -->
            <div class="p-4 bg-section/30">
              <div class="flex items-start gap-3">
                <!-- Life Area Color -->
                <div
                  class="w-1 h-12 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: getLifeAreaColor(commitment) }"
                />
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-on-surface">{{ commitment.name }}</h4>
                  </div>
                  
                  <!-- Life Area + Project Badge -->
                  <div class="flex items-center gap-2 flex-wrap mt-1">
                    <span class="text-xs text-on-surface-variant">
                      {{ getLifeAreaLabel(commitment) }}
                    </span>
                    <span v-if="getProjectName(commitment.projectId)" class="text-xs text-on-surface-variant">
                      · {{ getProjectName(commitment.projectId) }}
                    </span>
                  </div>
                </div>

                <!-- Status Selector -->
                <div class="flex-shrink-0">
                  <select
                    :value="getCommitmentEdit(commitment.id).status"
                    class="neo-input px-3 py-1.5 text-sm"
                    @change="updateCommitmentStatus(commitment.id, ($event.target as HTMLSelectElement).value as CommitmentStatus)"
                  >
                    <option value="planned">{{ t('planning.reflection.weekly.reviewCommitments.statusPlanned') }}</option>
                    <option value="done">{{ t('planning.reflection.weekly.reviewCommitments.statusDone') }}</option>
                    <option value="skipped">{{ t('planning.reflection.weekly.reviewCommitments.statusSkipped') }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Reflection Note -->
            <div class="p-4 border-t border-neu-border/10">
              <label class="block text-sm text-on-surface-variant mb-2">
                Reflection note (optional)
              </label>
              <textarea
                :value="getCommitmentEdit(commitment.id).reflectionNote"
                rows="2"
                placeholder="How did it go? Any learnings?"
                class="neo-input w-full p-3 text-sm resize-none"
                @input="updateCommitmentReflectionNote(commitment.id, ($event.target as HTMLTextAreaElement).value)"
              />
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Section 2: Battery Check-In -->
      <AppCard padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <BoltIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.batteryCheckIn.title') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-4">
          {{ t('planning.reflection.weekly.batteryCheckIn.subtitle') }}
        </p>
        <div class="neo-embedded rounded-xl p-3 text-xs text-on-surface-variant mb-5 space-y-1">
          <p>{{ t('planning.reflection.weekly.batteryCheckIn.definitionDemand') }}</p>
          <p>{{ t('planning.reflection.weekly.batteryCheckIn.definitionState') }}</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="battery in batteryCards"
            :key="battery.key"
            class="neo-surface rounded-2xl p-4"
            :data-testid="`battery-card-${battery.key}`"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="neo-icon-circle flex h-10 w-10 items-center justify-center rounded-xl">
                <component :is="battery.icon" class="w-5 h-5 text-on-surface-variant" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-on-surface">{{ battery.title }}</h3>
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-xl border border-neu-border/20 bg-neu-base/45 p-3">
                <p class="text-xs font-medium text-on-surface text-center mb-2">
                  {{ t('planning.reflection.weekly.batteryCheckIn.demandLabel') }}
                </p>
                <div class="flex min-h-[118px] items-center justify-center gap-3">
                  <button
                    type="button"
                    class="neo-icon-button neo-focus h-9 w-9 p-0 text-base font-semibold disabled:opacity-40"
                    :data-testid="`battery-${battery.key}-demand-minus`"
                    :disabled="isAtMinLevel(battery.key, 'demand')"
                    @click="adjustBatteryRating(battery.key, 'demand', -1)"
                  >
                    -
                  </button>
                  <div class="flex flex-col items-center">
                    <div class="neo-surface flex h-20 w-20 items-center justify-center rounded-2xl">
                      <component
                        :is="getDemandIcon(battery)"
                        class="h-11 w-11 text-on-surface-variant"
                      />
                    </div>
                    <p class="mt-2 text-xs font-medium text-on-surface-variant">
                      {{ getBatteryLevelText(battery.key, 'demand') }}/5
                    </p>
                  </div>
                  <button
                    type="button"
                    class="neo-icon-button neo-focus h-9 w-9 p-0 text-base font-semibold disabled:opacity-40"
                    :data-testid="`battery-${battery.key}-demand-plus`"
                    :disabled="isAtMaxLevel(battery.key, 'demand')"
                    @click="adjustBatteryRating(battery.key, 'demand', 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="rounded-xl border border-neu-border/20 bg-neu-base/45 p-3">
                <p class="text-xs font-medium text-on-surface text-center mb-2">
                  {{ t('planning.reflection.weekly.batteryCheckIn.stateLabel') }}
                </p>
                <div class="flex min-h-[118px] items-center justify-center gap-3">
                  <button
                    type="button"
                    class="neo-icon-button neo-focus h-9 w-9 p-0 text-base font-semibold disabled:opacity-40"
                    :data-testid="`battery-${battery.key}-state-minus`"
                    :disabled="isAtMinLevel(battery.key, 'state')"
                    @click="adjustBatteryRating(battery.key, 'state', -1)"
                  >
                    -
                  </button>
                  <div class="flex flex-col items-center">
                    <div class="neo-surface flex h-20 w-20 items-center justify-center rounded-2xl">
                      <component
                        :is="getStateBatteryIcon(battery.key)"
                        class="h-14 w-14 text-on-surface"
                      />
                    </div>
                    <p class="mt-2 text-xs font-medium text-on-surface-variant">
                      {{ getBatteryLevelText(battery.key, 'state') }}/5
                    </p>
                  </div>
                  <button
                    type="button"
                    class="neo-icon-button neo-focus h-9 w-9 p-0 text-base font-semibold disabled:opacity-40"
                    :data-testid="`battery-${battery.key}-state-plus`"
                    :disabled="isAtMaxLevel(battery.key, 'state')"
                    @click="adjustBatteryRating(battery.key, 'state', 1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-on-surface-variant mb-1.5">
                  {{ t('planning.reflection.weekly.batteryCheckIn.quickNoteLabel') }}
                </label>
                <textarea
                  :value="batteryNotes[battery.key]"
                  rows="2"
                  maxlength="180"
                  :data-testid="`battery-note-${battery.key}`"
                  :placeholder="t('planning.reflection.weekly.batteryCheckIn.quickNotePlaceholder')"
                  class="neo-input w-full resize-none p-2.5 text-sm"
                  @input="setBatteryNote(battery.key, ($event.target as HTMLTextAreaElement).value)"
                />
              </div>
            </div>
          </div>
        </div>

        <p v-if="missingBatteryRatingsCount > 0" class="mt-4 text-sm text-warning">
          {{ t('planning.reflection.weekly.batteryCheckIn.missingRatings', { count: missingBatteryRatingsCount }) }}
        </p>
      </AppCard>

      <!-- Section 3: This Week Activity Timeline -->
      <AppCard padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.timeline.title') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-4">
          {{ t('planning.reflection.weekly.timeline.subtitle') }}
        </p>

        <div v-if="timelineDaysWithActivity.length > 0" class="space-y-3">
          <div
            v-for="day in timelineDaysWithActivity"
            :key="day.isoDate"
            class="rounded-xl border border-neu-border/25 bg-neu-base p-3"
          >
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-on-surface">{{ day.weekdayLabel }}</p>
              <p class="text-xs text-on-surface-variant">{{ day.dateLabel }}</p>
            </div>

            <div class="space-y-2">
              <div
                v-for="entry in day.journalEntries"
                :key="`journal-${entry.id}`"
                class="rounded-lg border border-neu-border/20 bg-section/20 p-3"
              >
                <p class="text-[11px] text-on-surface-variant mb-1">
                  {{ t('planning.reflection.weekly.timeline.journalLabel') }} · {{ formatTimelineTime(entry.createdAt) }}
                </p>
                <p class="text-sm font-medium text-on-surface">
                  {{ entry.title?.trim() || t('planning.reflection.weekly.timeline.journalUntitled') }}
                </p>
                <p class="text-xs text-on-surface-variant mt-1">
                  {{ truncateText(entry.body, 120) }}
                </p>
                <a
                  :href="`/journal/${entry.id}/edit`"
                  class="inline-flex mt-2 text-xs text-primary hover:text-primary/80"
                >
                  {{ t('planning.reflection.weekly.timeline.openJournal') }}
                </a>
              </div>

              <div
                v-for="log in day.emotionLogs"
                :key="`emotion-${log.id}`"
                class="rounded-lg border border-neu-border/20 bg-section/20 p-3"
              >
                <p class="text-[11px] text-on-surface-variant mb-1">
                  {{ t('planning.reflection.weekly.timeline.emotionLabel') }} · {{ formatTimelineTime(log.createdAt) }}
                </p>
                <p class="text-sm font-medium text-on-surface">
                  {{ getEmotionSummary(log.emotionIds) }}
                </p>
                <p v-if="log.note?.trim()" class="text-xs text-on-surface-variant mt-1">
                  {{ truncateText(log.note, 120) }}
                </p>
                <a
                  :href="`/emotions/${log.id}/edit`"
                  class="inline-flex mt-2 text-xs text-primary hover:text-primary/80"
                >
                  {{ t('planning.reflection.weekly.timeline.openEmotionLog') }}
                </a>
              </div>
            </div>
          </div>
        </div>

        <p v-else class="text-sm text-on-surface-variant">
          {{ t('planning.reflection.weekly.timeline.empty') }}
        </p>
      </AppCard>

      <!-- Section 4: Reflection Prompts -->
      <AppCard padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <LightBulbIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.reflectPrompts.title') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-6">
          Take a moment to capture what you learned this week.
        </p>

        <div class="space-y-6">
          <!-- What Helped -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.whatHelped') }}
            </label>
            <textarea
              v-model="whatHelped"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.whatHelpedPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>

          <!-- What Got in the Way -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.whatGotInTheWay') }}
            </label>
            <textarea
              v-model="whatGotInTheWay"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.whatGotInTheWayPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>

          <!-- What I Learned -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.whatDidYouLearn') }}
            </label>
            <textarea
              v-model="whatILearned"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.whatDidYouLearnPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>

          <!-- Battery Drainers -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.batteryDrainers') }}
            </label>
            <textarea
              v-model="batteryDrainers"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.batteryDrainersPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>

          <!-- Battery Rechargers -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.batteryRechargers') }}
            </label>
            <textarea
              v-model="batteryRechargers"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.batteryRechargersPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>

          <!-- Battery Boundary -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              {{ t('planning.reflection.weekly.reflectPrompts.batteryBoundaryNextWeek') }}
            </label>
            <textarea
              v-model="batteryBoundaryNextWeek"
              rows="3"
              :placeholder="t('planning.reflection.weekly.reflectPrompts.batteryBoundaryNextWeekPlaceholder')"
              class="neo-input w-full p-4 resize-none"
            />
          </div>
        </div>
      </AppCard>

      <!-- Section 5: Forward Handoff -->
      <AppCard padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <ArrowTrendingUpIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.reflectPrompts.nextWeekSeed') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-4">
          What thoughts or intentions do you want to carry into next week?
        </p>
        <textarea
          v-model="nextWeekSeed"
          rows="3"
          :placeholder="t('planning.reflection.weekly.reflectPrompts.nextWeekSeedPlaceholder')"
          class="neo-input w-full p-4 resize-none"
        />
      </AppCard>

      <!-- Section 6: IFS Weekly Review (conditional) -->
      <AppCard v-if="showIFSSection" padding="lg" class="mb-6">
        <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
          <GlobeAltIcon class="w-5 h-5 text-primary" />
          {{ t('planning.reflection.weekly.ifs.title') }}
        </h2>
        <p class="text-on-surface-variant text-sm mb-6">
          A summary of your IFS practice from this week.
        </p>

        <div class="space-y-6">
          <!-- Parts Activity -->
          <div v-if="activePartsThisWeek.length > 0">
            <h4 class="text-sm font-medium text-on-surface mb-2">{{ t('planning.reflection.weekly.ifs.mostActiveParts') }}</h4>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="ap in activePartsThisWeek"
                :key="ap.partId"
                class="neo-pill flex items-center gap-1.5 px-2.5 py-1 text-xs"
              >
                <PartRoleBadge v-if="ap.partRole" :role="ap.partRole" />
                <span class="font-medium text-on-surface">{{ ap.partName }}</span>
                <span class="text-on-surface-variant">{{ ap.avgIntensity.toFixed(1) }}/10</span>
              </div>
            </div>
          </div>

          <!-- Self-Leadership Summary -->
          <div v-if="hasSelfLeadershipData">
            <h4 class="text-sm font-medium text-on-surface mb-2">{{ t('planning.reflection.weekly.ifs.selfLeadership') }}</h4>
            <div class="flex gap-4 text-xs text-on-surface-variant">
              <span v-if="selfLeadershipBreakdown['mostly-self']">
                From Self: {{ selfLeadershipBreakdown['mostly-self'] }} day{{ selfLeadershipBreakdown['mostly-self'] === 1 ? '' : 's' }}
              </span>
              <span v-if="selfLeadershipBreakdown['mostly-part']">
                From parts: {{ selfLeadershipBreakdown['mostly-part'] }} day{{ selfLeadershipBreakdown['mostly-part'] === 1 ? '' : 's' }}
              </span>
              <span v-if="selfLeadershipBreakdown.mixed">
                Mixed: {{ selfLeadershipBreakdown.mixed }} day{{ selfLeadershipBreakdown.mixed === 1 ? '' : 's' }}
              </span>
            </div>
          </div>

          <!-- Self-Energy Trend -->
          <div v-if="weeklySelfEnergyAverage">
            <h4 class="text-sm font-medium text-on-surface mb-2">{{ t('planning.reflection.weekly.ifs.selfEnergy') }}</h4>
            <div class="flex justify-center">
              <SelfEnergyWheel
                :ratings="weeklySelfEnergyAverage"
                :interactive="false"
                size="sm"
              />
            </div>
          </div>

          <!-- LLM Weekly Summary -->
          <div v-if="weeklyIFSCheckIns.length >= 3">
            <h4 class="text-sm font-medium text-on-surface mb-2">{{ t('planning.reflection.weekly.ifs.aiSummary') }}</h4>
            <div v-if="ifsLLMSummary" class="neo-surface p-4 rounded-lg text-sm text-on-surface whitespace-pre-wrap">
              {{ ifsLLMSummary }}
            </div>
            <AppButton
              v-else
              variant="tonal"
              :disabled="isGeneratingIFSSummary"
              @click="generateIFSWeeklySummary"
            >
              <SparklesIcon class="w-4 h-4 mr-2" />
              {{ isGeneratingIFSSummary ? t('planning.reflection.weekly.ifs.aiSummaryLoading') : t('planning.reflection.weekly.ifs.aiSummary') }}
            </AppButton>
          </div>

          <!-- IFS Reflection Note -->
          <div>
            <label class="block text-sm font-medium text-on-surface mb-2">
              Reflection on your inner system this week:
            </label>
            <textarea
              v-model="ifsReflectionNote"
              rows="3"
              placeholder="e.g., Noticed the Manager showing up around deadlines, practiced staying in Self more..."
              class="neo-input w-full p-4 resize-none"
            />
          </div>
        </div>
      </AppCard>

      <!-- Save Error Display -->
      <AppCard v-if="saveError" padding="md" class="mb-6 border-error/50">
        <div class="flex items-start gap-3 text-error">
          <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium">{{ t('planning.reflection.weekly.save.error') }}</p>
            <p class="text-sm mt-1">{{ saveError }}</p>
          </div>
        </div>
      </AppCard>

      <!-- Reflection Already Complete Banner -->
      <AppCard v-if="weeklyReflection?.completedAt" padding="md" class="mb-6 bg-success/5 border-success/30">
        <div class="flex items-center gap-3 text-success">
          <CheckCircleIcon class="w-5 h-5 flex-shrink-0" />
          <p class="font-medium">This reflection has already been completed. Saving will update your existing reflection.</p>
        </div>
      </AppCard>
    </template>

    <!-- Footer Actions -->
    <div
      v-if="!isLoading && !error && weeklyPlan"
      class="fixed bottom-0 left-0 right-0 neo-footer p-4"
    >
      <div class="max-w-3xl mx-auto flex justify-between items-center">
        <AppButton variant="text" @click="handleBack">
          Cancel
        </AppButton>

        <AppButton
          variant="filled"
          :disabled="isSaving || !canCompleteReflection"
          @click="completeReflection"
        >
          {{ isSaving ? 'Saving...' : (weeklyReflection?.completedAt ? t('planning.reflection.weekly.save.update') : t('planning.reflection.weekly.save.complete')) }}
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
          <CheckIcon v-else class="w-4 h-4 ml-2" />
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * WeeklyReflectionView - Weekly reflection flow
 *
 * This view guides users through reflecting on their week:
 * - Review and update commitment statuses
 * - Add reflection notes to commitments
 * - Capture what helped, what got in the way, and what was learned
 * - Set a forward handoff thought for next week
 * - Complete the weekly reflection
 *
 * All changes are kept in local state until the user confirms.
 */
import { ref, computed, onMounted, reactive, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ClockIcon,
  HeartIcon,
  CpuChipIcon,
  FaceSmileIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  PlusIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import {
  IconSofa,
  IconUser,
  IconWalk,
  IconRun,
  IconActivityHeartbeat,
  IconMessageCircleUser,
  IconUsers,
  IconUsersGroup,
  IconSpeakerphone,
  IconYoga,
  IconMoodSmile,
  IconMoodNeutral,
  IconMoodNervous,
  IconMoodAngry,
  IconFocus2,
  IconBrain,
  IconArrowsShuffle2,
  IconAlertTriangle,
  IconStorm,
  IconBatteryVerticalOff,
  IconBatteryVertical1Filled,
  IconBatteryVertical2Filled,
  IconBatteryVertical3Filled,
  IconBatteryVertical4Filled,
  IconBatteryVerticalFilled,
} from '@tabler/icons-vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import SelfEnergyWheel from '@/components/exercises/ifs/SelfEnergyWheel.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { generateWeeklySummary } from '@/services/ifsLLMAssists'
import { buildWeeklyDaySummaries, type WeeklyDaySummary } from '@/services/periodTimeline'
import { useWeeklyReflectionDraft } from '@/composables/useWeeklyReflectionDraft'
import { useT } from '@/composables/useT'
import {
  formatPeriodDateRange,
  getYearFromDate,
  parseLocalISODate,
} from '@/utils/periodUtils'
import type { SelfEnergyQuality } from '@/domain/exercises'
import type { Commitment, CommitmentStatus, WeeklyPlan } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import type { WeeklyReflection } from '@/domain/reflection'

// ============================================================================
// Types
// ============================================================================

interface LocalCommitmentEdit {
  status: CommitmentStatus
  reflectionNote: string
  originalStatus: CommitmentStatus
  originalReflectionNote: string
}

type WeeklyBatteryKey = 'body' | 'mind' | 'emotion' | 'social'
type WeeklyBatteryMetric = 'demand' | 'state'

interface WeeklyBatteryRatings {
  demand: number | null
  state: number | null
}

interface BatteryDemandStep {
  icon: Component
}

interface BatteryCard {
  key: WeeklyBatteryKey
  icon: Component
  title: string
  demandSteps: BatteryDemandStep[]
}

// ============================================================================
// Route & Router
// ============================================================================

const route = useRoute()
const router = useRouter()

// ============================================================================
// Route Params
// ============================================================================

const routePlanId = computed(() => route.params.planId as string | undefined)

// ============================================================================
// Stores
// ============================================================================

const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const commitmentStore = useCommitmentStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const ifsDailyCheckInStore = useIFSDailyCheckInStore()
const ifsSelfEnergyStore = useIFSSelfEnergyStore()
const ifsPartStore = useIFSPartStore()
const { t, locale } = useT()

// ============================================================================
// Draft Persistence
// ============================================================================

const reflectionDraft = useWeeklyReflectionDraft(routePlanId.value ?? '')

// ============================================================================
// Loading & Error State
// ============================================================================

const isLoading = ref(true)
const error = ref<string | null>(null)

// ============================================================================
// Saving State
// ============================================================================

const isSaving = ref(false)
const saveError = ref<string | null>(null)

// ============================================================================
// Data
// ============================================================================

const weeklyPlan = computed<WeeklyPlan | undefined>(() => {
  if (!routePlanId.value) return undefined
  return weeklyPlanStore.getWeeklyPlanById(routePlanId.value)
})

const weeklyReflection = computed<WeeklyReflection | undefined>(() => {
  if (!routePlanId.value) return undefined
  return weeklyReflectionStore.getReflectionByPlanId(routePlanId.value)
})

const commitments = computed<Commitment[]>(() => {
  if (!routePlanId.value) return []
  return commitmentStore.getCommitmentsByWeeklyPlanId(routePlanId.value)
})

const weekRangeLabel = computed(() => {
  if (!weeklyPlan.value) return 'this week'
  return formatPeriodDateRange(weeklyPlan.value.startDate, weeklyPlan.value.endDate)
})

const focusYear = computed(() => {
  if (!weeklyPlan.value) return new Date().getFullYear()
  return getYearFromDate(weeklyPlan.value.startDate)
})

const plannedCommitmentsCount = computed(() => {
  return commitments.value.filter((c) => {
    const edit = commitmentEdits.get(c.id)
    return edit ? edit.status === 'planned' : c.status === 'planned'
  }).length
})

// ============================================================================
// Local State (Commitment Edits)
// ============================================================================

const commitmentEdits = reactive<Map<string, LocalCommitmentEdit>>(new Map())

function initializeCommitmentEdits() {
  commitmentEdits.clear()
  for (const commitment of commitments.value) {
    commitmentEdits.set(commitment.id, {
      status: commitment.status,
      reflectionNote: commitment.reflectionNote || '',
      originalStatus: commitment.status,
      originalReflectionNote: commitment.reflectionNote || '',
    })
  }
}

function getCommitmentEdit(commitmentId: string): LocalCommitmentEdit {
  return commitmentEdits.get(commitmentId) || {
    status: 'planned',
    reflectionNote: '',
    originalStatus: 'planned',
    originalReflectionNote: '',
  }
}

function updateCommitmentStatus(commitmentId: string, status: CommitmentStatus) {
  const edit = commitmentEdits.get(commitmentId)
  if (edit) {
    edit.status = status
  }
}

function updateCommitmentReflectionNote(commitmentId: string, note: string) {
  const edit = commitmentEdits.get(commitmentId)
  if (edit) {
    edit.reflectionNote = note
  }
}

// ============================================================================
// Local State (Reflection Fields)
// ============================================================================

const whatHelped = ref<string>('')
const whatGotInTheWay = ref<string>('')
const whatILearned = ref<string>('')
const nextWeekSeed = ref<string>('')
const batteryDrainers = ref<string>('')
const batteryRechargers = ref<string>('')
const batteryBoundaryNextWeek = ref<string>('')
const ifsReflectionNote = ref<string>('')

const MIN_BATTERY_LEVEL = 1
const MAX_BATTERY_LEVEL = 5

const batteryRatings = reactive<Record<WeeklyBatteryKey, WeeklyBatteryRatings>>({
  body: { demand: null, state: null },
  mind: { demand: null, state: null },
  emotion: { demand: null, state: null },
  social: { demand: null, state: null },
})

const batteryNotes = reactive<Record<WeeklyBatteryKey, string>>({
  body: '',
  mind: '',
  emotion: '',
  social: '',
})

const batteryCards = computed<BatteryCard[]>(() => [
  {
    key: 'body',
    icon: HeartIcon,
    title: t('planning.reflection.weekly.batteryCheckIn.batteries.body.title'),
    demandSteps: [
      { icon: IconSofa },
      { icon: IconUser },
      { icon: IconWalk },
      { icon: IconRun },
      { icon: IconActivityHeartbeat },
    ],
  },
  {
    key: 'mind',
    icon: CpuChipIcon,
    title: t('planning.reflection.weekly.batteryCheckIn.batteries.mind.title'),
    demandSteps: [
      { icon: IconFocus2 },
      { icon: IconBrain },
      { icon: IconArrowsShuffle2 },
      { icon: IconAlertTriangle },
      { icon: IconStorm },
    ],
  },
  {
    key: 'emotion',
    icon: FaceSmileIcon,
    title: t('planning.reflection.weekly.batteryCheckIn.batteries.emotion.title'),
    demandSteps: [
      { icon: IconYoga },
      { icon: IconMoodSmile },
      { icon: IconMoodNeutral },
      { icon: IconMoodNervous },
      { icon: IconMoodAngry },
    ],
  },
  {
    key: 'social',
    icon: UserGroupIcon,
    title: t('planning.reflection.weekly.batteryCheckIn.batteries.social.title'),
    demandSteps: [
      { icon: IconUser },
      { icon: IconMessageCircleUser },
      { icon: IconUsers },
      { icon: IconUsersGroup },
      { icon: IconSpeakerphone },
    ],
  },
])

const batteryStateIcons: Component[] = [
  IconBatteryVertical1Filled,
  IconBatteryVertical2Filled,
  IconBatteryVertical3Filled,
  IconBatteryVertical4Filled,
  IconBatteryVerticalFilled,
]

const missingBatteryRatingsCount = computed(() => {
  let missing = 0
  for (const battery of batteryCards.value) {
    if (batteryRatings[battery.key].demand == null) missing += 1
    if (batteryRatings[battery.key].state == null) missing += 1
  }
  return missing
})

const canCompleteReflection = computed(() => missingBatteryRatingsCount.value === 0)

const weeklyActivityTimeline = computed<WeeklyDaySummary[]>(() => {
  if (!weeklyPlan.value) return []
  return buildWeeklyDaySummaries({
    journalEntries: journalStore.entries,
    emotionLogs: emotionLogStore.logs,
    range: {
      start: parseLocalISODate(weeklyPlan.value.startDate),
      end: parseLocalISODate(weeklyPlan.value.endDate),
    },
  })
})

const timelineDaysWithActivity = computed(() => {
  return weeklyActivityTimeline.value.filter((day) => day.journalCount > 0 || day.emotionCount > 0)
})

function adjustBatteryRating(
  battery: WeeklyBatteryKey,
  metric: WeeklyBatteryMetric,
  delta: -1 | 1
): void {
  const current = batteryRatings[battery][metric]
  if (current == null) {
    batteryRatings[battery][metric] = MIN_BATTERY_LEVEL
    return
  }

  const next = Math.min(MAX_BATTERY_LEVEL, Math.max(MIN_BATTERY_LEVEL, current + delta))
  batteryRatings[battery][metric] = next
}

function getBatteryLevelText(battery: WeeklyBatteryKey, metric: WeeklyBatteryMetric): string {
  const value = batteryRatings[battery][metric]
  return value == null ? '--' : String(value)
}

function isAtMinLevel(battery: WeeklyBatteryKey, metric: WeeklyBatteryMetric): boolean {
  const value = batteryRatings[battery][metric]
  return value != null && value <= MIN_BATTERY_LEVEL
}

function isAtMaxLevel(battery: WeeklyBatteryKey, metric: WeeklyBatteryMetric): boolean {
  const value = batteryRatings[battery][metric]
  return value != null && value >= MAX_BATTERY_LEVEL
}

function getDemandIcon(battery: BatteryCard): Component {
  const value = batteryRatings[battery.key].demand
  return battery.demandSteps[(value ?? MIN_BATTERY_LEVEL) - 1].icon
}

function getStateBatteryIcon(battery: WeeklyBatteryKey): Component {
  const level = batteryRatings[battery].state
  if (level == null) return IconBatteryVerticalOff
  return batteryStateIcons[level - 1]
}

function setBatteryNote(battery: WeeklyBatteryKey, note: string): void {
  batteryNotes[battery] = note
}

function setBatteryRatingsFromSnapshot(
  snapshot?: WeeklyReflection['batterySnapshot']
): void {
  for (const battery of batteryCards.value) {
    batteryRatings[battery.key].demand = snapshot?.[battery.key]?.demand ?? null
    batteryRatings[battery.key].state = snapshot?.[battery.key]?.state ?? null
    batteryNotes[battery.key] = snapshot?.[battery.key]?.note ?? ''
  }
}

function buildBatterySnapshot() {
  if (!canCompleteReflection.value) return undefined

  const buildEntry = (key: WeeklyBatteryKey) => {
    const note = batteryNotes[key].trim()
    return {
      demand: batteryRatings[key].demand as number,
      state: batteryRatings[key].state as number,
      ...(note ? { note } : {}),
    }
  }

  return {
    body: buildEntry('body'),
    mind: buildEntry('mind'),
    emotion: buildEntry('emotion'),
    social: buildEntry('social'),
  }
}

function formatTimelineTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString(locale.value === 'pl' ? 'pl-PL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}...`
}

function getEmotionSummary(emotionIds: string[]): string {
  const names = emotionIds
    .map((emotionId) => emotionStore.getEmotionById(emotionId)?.name)
    .filter((name): name is string => !!name)

  if (names.length > 0) {
    return names.join(', ')
  }
  return t('planning.reflection.weekly.timeline.emotionUnknown')
}

function initializeReflectionFields() {
  if (weeklyReflection.value) {
    whatHelped.value = weeklyReflection.value.whatHelped || ''
    whatGotInTheWay.value = weeklyReflection.value.whatGotInTheWay || ''
    whatILearned.value = weeklyReflection.value.whatILearned || ''
    nextWeekSeed.value = weeklyReflection.value.nextWeekSeed || ''
    batteryDrainers.value = weeklyReflection.value.batteryDrainers || ''
    batteryRechargers.value = weeklyReflection.value.batteryRechargers || ''
    batteryBoundaryNextWeek.value = weeklyReflection.value.batteryBoundaryNextWeek || ''
    ifsReflectionNote.value = weeklyReflection.value.ifsReflectionNote || ''
    setBatteryRatingsFromSnapshot(weeklyReflection.value.batterySnapshot)
  } else {
    whatHelped.value = ''
    whatGotInTheWay.value = ''
    whatILearned.value = ''
    nextWeekSeed.value = ''
    batteryDrainers.value = ''
    batteryRechargers.value = ''
    batteryBoundaryNextWeek.value = ''
    ifsReflectionNote.value = ''
    setBatteryRatingsFromSnapshot()
  }
}

/**
 * Hydrate local state from a previously-saved draft (resume in-progress work).
 * Commitment edits are merged with loaded commitments to get original values.
 */
function hydrateFromDraft() {
  const d = reflectionDraft.draft.value

  // Hydrate commitment edits
  for (const commitment of commitments.value) {
    const saved = d.commitmentEdits[commitment.id]
    if (saved) {
      commitmentEdits.set(commitment.id, {
        status: saved.status,
        reflectionNote: saved.reflectionNote,
        originalStatus: commitment.status,
        originalReflectionNote: commitment.reflectionNote || '',
      })
    } else {
      // Commitment not in draft — initialize from loaded data
      commitmentEdits.set(commitment.id, {
        status: commitment.status,
        reflectionNote: commitment.reflectionNote || '',
        originalStatus: commitment.status,
        originalReflectionNote: commitment.reflectionNote || '',
      })
    }
  }

  // Hydrate battery ratings
  const batteryKeys = ['body', 'mind', 'emotion', 'social'] as const
  for (const key of batteryKeys) {
    if (d.batteryRatings[key]) {
      batteryRatings[key].demand = d.batteryRatings[key].demand
      batteryRatings[key].state = d.batteryRatings[key].state
    }
    batteryNotes[key] = d.batteryNotes[key] || ''
  }

  // Hydrate text fields
  whatHelped.value = d.whatHelped
  whatGotInTheWay.value = d.whatGotInTheWay
  whatILearned.value = d.whatILearned
  nextWeekSeed.value = d.nextWeekSeed
  batteryDrainers.value = d.batteryDrainers
  batteryRechargers.value = d.batteryRechargers
  batteryBoundaryNextWeek.value = d.batteryBoundaryNextWeek
  ifsReflectionNote.value = d.ifsReflectionNote
}

/**
 * Sync all editable local state → draft for auto-persistence.
 */
function syncLocalStateToDraft() {
  const edits: Record<string, { status: CommitmentStatus; reflectionNote: string }> = {}
  for (const [id, edit] of commitmentEdits) {
    edits[id] = { status: edit.status, reflectionNote: edit.reflectionNote }
  }

  reflectionDraft.draft.value = {
    commitmentEdits: edits,
    batteryRatings: JSON.parse(JSON.stringify(batteryRatings)),
    batteryNotes: JSON.parse(JSON.stringify(batteryNotes)),
    whatHelped: whatHelped.value,
    whatGotInTheWay: whatGotInTheWay.value,
    whatILearned: whatILearned.value,
    nextWeekSeed: nextWeekSeed.value,
    batteryDrainers: batteryDrainers.value,
    batteryRechargers: batteryRechargers.value,
    batteryBoundaryNextWeek: batteryBoundaryNextWeek.value,
    ifsReflectionNote: ifsReflectionNote.value,
  }
}

// Sync local state → draft whenever anything changes
let _draftSyncEnabled = false
watch(
  [
    () => commitmentEdits,
    batteryRatings,
    batteryNotes,
    whatHelped,
    whatGotInTheWay,
    whatILearned,
    nextWeekSeed,
    batteryDrainers,
    batteryRechargers,
    batteryBoundaryNextWeek,
    ifsReflectionNote,
  ],
  () => {
    if (_draftSyncEnabled) {
      syncLocalStateToDraft()
    }
  },
  { deep: true },
)

// ============================================================================
// IFS Weekly Data
// ============================================================================

const weeklyIFSCheckIns = computed(() => {
  if (!weeklyPlan.value) return []
  const start = weeklyPlan.value.startDate
  const end = weeklyPlan.value.endDate
  return ifsDailyCheckInStore.checkIns.filter((c) => {
    const date = c.createdAt.slice(0, 10)
    return date >= start && date <= end
  })
})

const showIFSSection = computed(() => weeklyIFSCheckIns.value.length >= 1)

const activePartsThisWeek = computed(() => {
  const partIntensities = new Map<string, number[]>()
  for (const checkIn of weeklyIFSCheckIns.value) {
    if (checkIn.practiceType !== 'weather-report' || !checkIn.activeParts) continue
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
      partRole: ifsPartStore.getPartById(partId)?.role,
      avgIntensity: intensities.reduce((a, b) => a + b, 0) / intensities.length,
      count: intensities.length,
    }))
    .sort((a, b) => b.avgIntensity - a.avgIntensity)
    .slice(0, 5)
})

const selfLeadershipBreakdown = computed(() => {
  const counts = { 'mostly-self': 0, 'mostly-part': 0, mixed: 0 }
  for (const checkIn of weeklyIFSCheckIns.value) {
    if (checkIn.practiceType === 'evening-reflection' && checkIn.selfLeadershipRating) {
      counts[checkIn.selfLeadershipRating]++
    }
  }
  return counts
})

const hasSelfLeadershipData = computed(() => {
  const c = selfLeadershipBreakdown.value
  return c['mostly-self'] + c['mostly-part'] + c.mixed > 0
})

const ALL_QUALITIES: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

const weeklySelfEnergyAverage = computed(() => {
  if (!weeklyPlan.value) return null
  const start = weeklyPlan.value.startDate
  const end = weeklyPlan.value.endDate
  const weekCheckIns = ifsSelfEnergyStore.checkIns.filter((c) => {
    const date = c.createdAt.slice(0, 10)
    return date >= start && date <= end
  })
  if (weekCheckIns.length === 0) return null
  const totals = {} as Record<SelfEnergyQuality, number>
  const counts = {} as Record<SelfEnergyQuality, number>
  for (const q of ALL_QUALITIES) {
    totals[q] = 0
    counts[q] = 0
  }
  for (const checkIn of weekCheckIns) {
    for (const q of ALL_QUALITIES) {
      const val = checkIn.ratings[q]
      if (val != null) {
        totals[q] += val
        counts[q]++
      }
    }
  }
  const result = {} as Record<SelfEnergyQuality, number>
  for (const q of ALL_QUALITIES) {
    result[q] = counts[q] > 0 ? totals[q] / counts[q] : 0
  }
  return result
})

const ifsLLMSummary = ref<string | null>(null)
const isGeneratingIFSSummary = ref(false)

async function generateIFSWeeklySummary() {
  isGeneratingIFSSummary.value = true
  try {
    const summary = await generateWeeklySummary({
      checkIns: weeklyIFSCheckIns.value,
      parts: ifsPartStore.parts,
      locale: locale.value,
    })
    ifsLLMSummary.value = summary
  } catch (err) {
    console.error('Failed to generate IFS weekly summary:', err)
    ifsLLMSummary.value = t('planning.reflection.weekly.ifs.aiSummaryError')
  } finally {
    isGeneratingIFSSummary.value = false
  }
}

// ============================================================================
// Life Area & Project Helpers
// ============================================================================

function getPrimaryLifeArea(commitment: Commitment): LifeArea | undefined {
  return getLifeAreasForCommitment(commitment)[0]
}

function getLifeAreaColor(commitment: Commitment): string {
  return getPrimaryLifeArea(commitment)?.color || 'rgb(var(--color-primary))'
}

function getLifeAreaLabel(commitment: Commitment): string {
  const lifeAreas = getLifeAreasForCommitment(commitment)
  if (lifeAreas.length === 0) return 'Unlinked'
  return lifeAreas.map((la) => la.name).join(', ')
}

function getLifeAreasForCommitment(commitment: Commitment): LifeArea[] {
  const ids: string[] = []
  const seen = new Set<string>()

  const addId = (id?: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  const addMany = (list?: string[]) => {
    list?.forEach((id) => addId(id))
  }

  addMany(commitment.lifeAreaIds)

  commitment.priorityIds?.forEach((priorityId) => {
    const priority = priorityStore.getPriorityById(priorityId)
    addMany(priority?.lifeAreaIds)
  })

  if (commitment.projectId) {
    const project = projectStore.getProjectById(commitment.projectId)
    addMany(project?.lifeAreaIds)
    project?.priorityIds?.forEach((priorityId) => {
      const priority = priorityStore.getPriorityById(priorityId)
      addMany(priority?.lifeAreaIds)
    })
  }

  return ids
    .map((id) => lifeAreaStore.getLifeAreaById(id))
    .filter(Boolean) as LifeArea[]
}

function getProjectName(projectId?: string): string | undefined {
  if (!projectId) return undefined
  const project = projectStore.getProjectById(projectId)
  return project?.name
}

// ============================================================================
// Save Logic
// ============================================================================

async function completeReflection() {
  if (!weeklyPlan.value) return
  if (!canCompleteReflection.value) {
    saveError.value = t('planning.reflection.weekly.batteryCheckIn.validationError')
    return
  }

  isSaving.value = true
  saveError.value = null

  try {
    // 1. Update commitments with changes
    for (const [commitmentId, edit] of commitmentEdits) {
      const hasStatusChange = edit.status !== edit.originalStatus
      const hasNoteChange = edit.reflectionNote !== edit.originalReflectionNote

      if (hasStatusChange && hasNoteChange) {
        // Update both at once
        await commitmentStore.updateCommitment(commitmentId, {
          status: edit.status,
          reflectionNote: edit.reflectionNote.trim() || undefined,
        })
      } else if (hasStatusChange) {
        await commitmentStore.updateCommitmentStatus(commitmentId, edit.status)
      } else if (hasNoteChange) {
        await commitmentStore.updateCommitment(commitmentId, {
          reflectionNote: edit.reflectionNote.trim() || undefined,
        })
      }
    }

    // 2. Complete or update weekly reflection
    const reflectionData = {
      weeklyPlanId: weeklyPlan.value.id,
      batterySnapshot: buildBatterySnapshot(),
      whatHelped: whatHelped.value.trim() || undefined,
      whatGotInTheWay: whatGotInTheWay.value.trim() || undefined,
      whatILearned: whatILearned.value.trim() || undefined,
      nextWeekSeed: nextWeekSeed.value.trim() || undefined,
      batteryDrainers: batteryDrainers.value.trim() || undefined,
      batteryRechargers: batteryRechargers.value.trim() || undefined,
      batteryBoundaryNextWeek: batteryBoundaryNextWeek.value.trim() || undefined,
      ifsReflectionNote: ifsReflectionNote.value.trim() || undefined,
    }

    if (weeklyReflection.value) {
      if (weeklyReflection.value.completedAt) {
        await weeklyReflectionStore.updateReflection(weeklyReflection.value.id, reflectionData)
      } else {
        await weeklyReflectionStore.completeReflection(weeklyReflection.value.id, reflectionData)
      }
    } else {
      await weeklyReflectionStore.createReflection({
        ...reflectionData,
        completedAt: new Date().toISOString(),
      })
    }

    // 3. Clear draft and navigate back to planning hub
    reflectionDraft.clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error saving reflection:', err)
  } finally {
    isSaving.value = false
  }
}

// ============================================================================
// Navigation
// ============================================================================

function handleBack() {
  router.push('/planning')
}

function goToWeeklyPlanning() {
  router.push('/planning/week/new')
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  isLoading.value = true
  error.value = null

  try {
    if (!routePlanId.value) {
      throw new Error('Missing weekly plan id')
    }

    await weeklyPlanStore.loadWeeklyPlans()

    await Promise.all([
      reflectionDraft.ready,
      commitmentStore.loadCommitments({ weeklyPlanId: routePlanId.value }),
      projectStore.loadProjects(),
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(focusYear.value),
      weeklyReflectionStore.loadReflectionByPlanId(routePlanId.value),
      journalStore.loadEntries(),
      emotionLogStore.loadLogs(),
      emotionStore.loadEmotions(),
      // IFS stores
      ifsDailyCheckInStore.loadCheckIns(),
      ifsSelfEnergyStore.loadCheckIns(),
      ifsPartStore.loadParts(),
    ])

    // Initialize local state: resume from draft if available, else from loaded data
    if (reflectionDraft.hasDraft()) {
      initializeCommitmentEdits()
      hydrateFromDraft()
    } else {
      initializeCommitmentEdits()
      initializeReflectionFields()
    }

    // Enable draft sync after initialization
    _draftSyncEnabled = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load reflection data'
    console.error('Error loading reflection data:', err)
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadData()
})
</script>
