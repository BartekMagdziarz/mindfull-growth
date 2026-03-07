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
      <CompassStrip
        :year-label="yearLabel"
        :year-theme="currentYearPlan?.yearTheme"
        :month-label="monthLabel"
        :month-intention="currentMonthPlan?.monthIntention"
        :week-label="weekLabel"
        :week-focus-sentence="currentWeekPlan?.focusSentence"
        :priority-names="topActivePriorities.map((item) => item.name)"
        :expanded-by-default="mode === 'morning'"
      />

      <div class="mt-4">
        <ModeSwitcher
          :model-value="stores.userPreferencesStore.todayModeOverride"
          :effective-mode="mode"
          @update:model-value="handleModeOverrideChange"
        />
      </div>

      <div class="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div class="xl:col-span-2 space-y-6">
          <DailyIntentionCard
            :mode="mode"
            :has-journal-today="hasTodayJournal"
            :commitment-done="commitmentProgress.done"
            :commitment-total="commitmentProgress.total"
            :emotion-logged="todayEmotionCount"
            :emotion-target="stores.userPreferencesStore.dailyEmotionTarget"
            @primary-action="handlePrimaryAction"
            @secondary-action="handleSecondaryAction"
          />

          <ExecutionBoard
            :week-plan="currentWeekPlan"
            :commitments="currentWeekCommitments"
            :projects="stores.projectStore.projects"
            :life-areas="stores.lifeAreaStore.lifeAreas"
            :priorities="topActivePriorities"
            :density="stores.userPreferencesStore.todayModuleDensity"
            @open-planning="navigateToWeeklyPlanning"
            @tracker-logged="handleTrackerLogged"
          />
        </div>

        <div class="space-y-6">
          <EmotionProgressCard
            :logged="todayEmotionCount"
            :target="stores.userPreferencesStore.dailyEmotionTarget"
            @action="navigateToEmotionLog"
          />

          <WeekSummaryCard
            :summary="weekSummary"
          />

          <IFSCheckInCard />

          <AppCard>
            <h3 class="text-base font-semibold text-on-surface mb-3">{{ t('today.reflections.title') }}</h3>
            <ul class="space-y-2 text-sm">
              <li class="flex items-center justify-between gap-2">
                <span class="text-on-surface">{{ t('today.reflections.weekly') }}</span>
                <span :class="weeklyReflectionDue ? 'text-warning' : 'text-success'">
                  {{ weeklyReflectionDue ? t('today.reflections.due') : t('today.reflections.upToDate') }}
                </span>
              </li>
              <li class="flex items-center justify-between gap-2">
                <span class="text-on-surface">{{ t('today.reflections.monthly') }}</span>
                <span :class="monthlyReflectionDue ? 'text-warning' : 'text-success'">
                  {{ monthlyReflectionDue ? t('today.reflections.due') : t('today.reflections.upToDate') }}
                </span>
              </li>
              <li class="flex items-center justify-between gap-2">
                <span class="text-on-surface">{{ t('today.reflections.yearly') }}</span>
                <span :class="yearlyReflectionDue ? 'text-warning' : 'text-success'">
                  {{ yearlyReflectionDue ? t('today.reflections.due') : t('today.reflections.upToDate') }}
                </span>
              </li>
            </ul>

            <AppButton variant="tonal" size="sm" class="mt-4" @click="navigateToPlanningHub">
              {{ t('today.reflections.openPlanning') }}
            </AppButton>
          </AppCard>

          <ContextualNudgesCard
            :recommendations="recommendations"
            @open="handleRecommendationOpen"
            @feedback="handleRecommendationFeedback"
          />
        </div>
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
import CompassStrip from '@/components/today/CompassStrip.vue'
import ModeSwitcher from '@/components/today/ModeSwitcher.vue'
import DailyIntentionCard from '@/components/today/DailyIntentionCard.vue'
import ExecutionBoard from '@/components/today/ExecutionBoard.vue'
import ContextualNudgesCard from '@/components/today/ContextualNudgesCard.vue'
import EmotionProgressCard from '@/components/today/EmotionProgressCard.vue'
import WeekSummaryCard from '@/components/today/WeekSummaryCard.vue'
import IFSCheckInCard from '@/components/today/IFSCheckInCard.vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { trackTodayEvent } from '@/services/todayTelemetry.service'
import type { TodayModeOverride, TodayRecommendationFeedbackType } from '@/types/today'

const router = useRouter()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const {
  isLoading,
  loadError,
  loadData,
  mode,
  todayEmotionCount,
  hasTodayJournal,
  weekSummary,
  currentYearPlan,
  currentMonthPlan,
  currentWeekPlan,
  currentWeekCommitments,
  commitmentProgress,
  topActivePriorities,
  monthLabel,
  weekLabel,
  yearLabel,
  recommendations,
  weeklyReflectionDue,
  monthlyReflectionDue,
  yearlyReflectionDue,
  morningPromptSeed,
  eveningPromptSeed,
  setTodayModeOverride,
  stores,
} = useTodayGrounding()

function navigateToPlanningHub() {
  void trackTodayEvent('planning_hub_opened')
  router.push('/planning')
}

function navigateToWeeklyPlanning() {
  void trackTodayEvent('weekly_planning_opened')
  router.push('/planning/week/new')
}

function navigateToEmotionLog() {
  void trackTodayEvent('emotion_log_opened')
  router.push('/emotions/edit')
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

function handlePrimaryAction() {
  if (mode.value === 'midday') {
    navigateToEmotionLog()
    return
  }

  navigateToJournalWithContext(mode.value === 'evening' ? 'evening' : 'morning')
}

function handleSecondaryAction() {
  if (mode.value === 'midday') {
    void trackTodayEvent('midday_recommit_opened')
  }

  navigateToPlanningHub()
}

async function handleModeOverrideChange(value: TodayModeOverride) {
  try {
    await setTodayModeOverride(value)
    await trackTodayEvent('mode_changed', {
      selectedMode: value,
      effectiveMode: mode.value,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('today.mode.failedUpdate')
    snackbarRef.value?.show(message)
  }
}

async function handleRecommendationOpen(route: string, recommendationId: string) {
  await trackTodayEvent('recommendation_opened', { recommendationId, route })
  await router.push(route)
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
