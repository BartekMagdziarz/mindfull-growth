<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <div
      v-if="isLoading"
      class="text-on-surface-variant text-center py-12"
    >
      {{ t('common.loading') }}
    </div>

    <div v-else-if="loadError" class="max-w-md mx-auto">
      <AppCard>
        <div class="text-center py-6">
          <p class="text-error mb-4">{{ loadError }}</p>
          <AppButton variant="tonal" @click="loadData">{{ t('common.buttons.tryAgain') }}</AppButton>
        </div>
      </AppCard>
    </div>

    <template v-else>
      <TodayPriorityCompassSection
        :items="priorityCompassItems"
        :year-theme="currentYearPlan?.yearTheme"
        :week-focus-sentence="currentWeekPlan?.focusSentence"
        @open-planning="navigateToPlanningHub"
      />

      <div
        data-testid="today-layout"
        class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] items-start"
      >
        <div class="space-y-6">
          <TodayExecutionList
            :commitments="currentWeekCommitments"
            :projects="stores.projectStore.projects"
            :priorities="activePriorities"
            :has-weekly-plan="Boolean(currentWeekPlan)"
            @status-change="handleCommitmentStatusChange"
            @open-planning="navigateToWeeklyPlanning"
          />

          <TodayProgressSection
            :lanes="progressLanes"
            @logged="handleTrackerLogged"
          />
        </div>

        <TodaySupportRail
          :support="supportState"
          :week-summary="weekSummary"
          :has-week-summary="hasMeaningfulWeekSummary"
          @journal-action="handleJournalAction"
          @emotion-action="navigateToEmotionLog"
          @open-planning="navigateToPlanningHub"
          @open-ifs="navigateToIFSCheckIn"
          @reminder-action="handleReminderAction"
          @open-recommendation="handleRecommendationOpen"
          @recommendation-feedback="handleRecommendationFeedback"
        />
      </div>
    </template>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import { useTodayGrounding } from '@/composables/useTodayGrounding'
import TodayPriorityCompassSection from '@/components/today/TodayPriorityCompassSection.vue'
import TodayExecutionList from '@/components/today/TodayExecutionList.vue'
import TodayProgressSection from '@/components/today/TodayProgressSection.vue'
import TodaySupportRail from '@/components/today/TodaySupportRail.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { trackTodayEvent } from '@/services/todayTelemetry.service'
import type { TodayRecommendationFeedbackType } from '@/types/today'
import type { CommitmentStatus } from '@/domain/planning'

const router = useRouter()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const {
  isLoading,
  loadError,
  loadData,
  weekSummary,
  hasMeaningfulWeekSummary,
  priorityCompassItems,
  progressLanes,
  supportState,
  currentYearPlan,
  currentWeekPlan,
  currentWeekCommitments,
  activePriorities,
  morningPromptSeed,
  eveningPromptSeed,
  journalEntryContext,
  stores,
} = useTodayGrounding()

function navigateToPlanningHub() {
  void trackTodayEvent('planning_hub_opened')
  router.push('/planning')
}

function navigateToWeeklyPlanning() {
  void trackTodayEvent('weekly_planning_opened')
  router.push(
    currentWeekPlan.value
      ? `/planning/week/${currentWeekPlan.value.id}`
      : '/planning/week/new'
  )
}

function navigateToEmotionLog() {
  void trackTodayEvent('emotion_log_opened')
  router.push('/emotions/edit')
}

function navigateToIFSCheckIn() {
  void trackTodayEvent('ifs_check_in_opened')
  router.push('/exercises/daily-checkin')
}

function navigateToJournalWithContext(entryContext: 'morning' | 'evening') {
  const promptSeed = entryContext === 'morning' ? morningPromptSeed.value : eveningPromptSeed.value
  void trackTodayEvent('guided_journal_opened', { entryContext })
  router.push({
    path: '/journal/edit',
    query: {
      entryContext,
      promptSeed,
    },
  })
}

function handleJournalAction() {
  navigateToJournalWithContext(journalEntryContext.value)
}

async function handleCommitmentStatusChange(commitmentId: string, status: CommitmentStatus) {
  try {
    await stores.commitmentStore.updateCommitmentStatus(commitmentId, status)
    await trackTodayEvent('commitment_status_updated_from_today', {
      commitmentId,
      status,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('today.executionList.failedUpdate')
    snackbarRef.value?.show(message)
  }
}

async function handleRecommendationOpen(route: string, recommendationId: string) {
  await trackTodayEvent('recommendation_opened', { recommendationId, route })
  await router.push(route)
}

async function handleReminderAction() {
  const reminder = supportState.value.primaryReminder
  if (!reminder) return

  if (reminder.kind === 'recommendation' && reminder.recommendationId) {
    await handleRecommendationOpen(reminder.route, reminder.recommendationId)
    return
  }

  await router.push(reminder.route)
}

async function handleRecommendationFeedback(
  recommendationId: string,
  feedbackType: TodayRecommendationFeedbackType,
) {
  try {
    await stores.userPreferencesStore.recordTodayExerciseFeedback(recommendationId, feedbackType)
    await trackTodayEvent('recommendation_feedback', {
      recommendationId,
      feedbackType,
    })
    snackbarRef.value?.show(t('today.nudges.feedbackSaved'))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('today.nudges.feedbackFailed')
    snackbarRef.value?.show(message)
  }
}

function handleTrackerLogged(trackerId: string) {
  void trackTodayEvent('tracker_logged', { trackerId })
}

onMounted(() => {
  loadData()
})
</script>
