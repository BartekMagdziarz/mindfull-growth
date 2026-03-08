<template>
  <AppCard class="neo-raised w-full">
    <div class="space-y-5">
      <section class="space-y-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            {{ t('today.support.eyebrow') }}
          </p>
          <h3 class="mt-2 text-xl font-semibold text-on-surface">
            {{ intentionTitle }}
          </h3>
        </div>

        <p class="text-sm leading-relaxed text-on-surface-variant">
          {{ support.dailyIntention.description }}
        </p>

        <AppButton variant="filled" size="sm" @click="emit('journalAction')">
          {{ t('today.support.openJournal') }}
        </AppButton>
      </section>

      <div v-if="support.primaryReminder" class="border-t border-neu-border/15 pt-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ reminderTitle }}
        </p>
        <p class="mt-2 text-sm text-on-surface">
          {{ reminderDescription }}
        </p>
        <AppButton variant="tonal" size="sm" class="mt-3" @click="emit('reminderAction')">
          {{ reminderActionLabel }}
        </AppButton>
      </div>

      <div class="border-t border-neu-border/15 pt-5">
        <div class="grid gap-3">
          <button
            type="button"
            class="rounded-2xl border border-neu-border/15 bg-section/35 px-4 py-4 text-left transition-colors hover:bg-section/55"
            @click="emit('journalAction')"
          >
            <p class="text-sm font-semibold text-on-surface">
              {{ support.capture.hasJournalToday ? t('today.capture.continueJournal') : t('today.capture.startJournal') }}
            </p>
            <p class="mt-1 text-xs text-on-surface-variant">
              {{
                support.capture.hasJournalToday
                  ? t('today.capture.journalCount', { count: support.capture.journalCount })
                  : t('today.capture.startJournalDescription')
              }}
            </p>
          </button>

          <button
            type="button"
            class="rounded-2xl border border-neu-border/15 bg-section/35 px-4 py-4 text-left transition-colors hover:bg-section/55"
            @click="emit('emotionAction')"
          >
            <p class="text-sm font-semibold text-on-surface">{{ t('today.capture.emotionTitle') }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">
              {{ t('today.capture.emotionProgress', { logged: support.capture.emotionCount, target: support.capture.emotionTarget }) }}
            </p>
          </button>
        </div>
      </div>

      <div
        v-if="hasWeekSummary || dueReflections.length > 0"
        class="border-t border-neu-border/15 pt-5"
      >
        <div v-if="hasWeekSummary" class="grid grid-cols-3 gap-3 rounded-2xl border border-neu-border/15 bg-section/35 px-4 py-4">
          <div class="text-center">
            <p class="text-lg font-semibold text-on-surface">{{ weekSummary.journalCount }}</p>
            <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">{{ t('today.support.journals') }}</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-semibold text-on-surface">{{ weekSummary.emotionLogCount }}</p>
            <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">{{ t('today.support.emotions') }}</p>
          </div>
          <div class="text-center">
            <p class="text-lg font-semibold text-on-surface">{{ weekSummary.streak }}</p>
            <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">{{ t('today.support.streak') }}</p>
          </div>
        </div>

        <div v-if="dueReflections.length > 0" class="mt-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ t('today.reflections.dueTitle') }}
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="badge in dueReflections"
              :key="badge.key"
              class="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning"
            >
              {{ t(`today.reflections.${badge.key}`) }}
            </span>
          </div>
          <AppButton variant="tonal" size="sm" class="mt-3" @click="emit('openPlanning')">
            {{ t('today.reflections.openPlanning') }}
          </AppButton>
        </div>
      </div>

      <div v-if="support.ifs.hasParts" class="border-t border-neu-border/15 pt-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ t('today.support.ifsTitle') }}
        </p>
        <p class="mt-2 text-sm text-on-surface">
          {{
            support.ifs.doneToday
              ? t('today.support.ifsDone', { count: support.ifs.weeklyCheckInCount })
              : t('today.support.ifsPending', { count: support.ifs.weeklyCheckInCount })
          }}
        </p>
        <AppButton variant="tonal" size="sm" class="mt-3" @click="emit('openIfs')">
          {{ support.ifs.doneToday ? t('today.support.openIfsAgain') : t('today.support.openIfs') }}
        </AppButton>
      </div>

      <div v-if="support.recommendations.length > 0" class="border-t border-neu-border/15 pt-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ t('today.nudges.title') }}
        </p>

        <div class="mt-3 space-y-3">
          <article
            v-for="recommendation in support.recommendations"
            :key="recommendation.id"
            class="rounded-2xl border border-neu-border/15 bg-section/35 px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-on-surface">{{ recommendation.title }}</h4>
                <p class="mt-1 text-xs text-on-surface-variant">{{ recommendation.whyNow }}</p>
              </div>
              <span class="inline-flex rounded-full border border-neu-border/20 bg-background/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                {{ recommendation.modality }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <AppButton
                variant="tonal"
                size="sm"
                @click="emit('openRecommendation', recommendation.route, recommendation.id)"
              >
                {{ t('today.nudges.open') }}
              </AppButton>
              <button
                type="button"
                class="neo-pill neo-focus px-2 py-1 text-[11px]"
                @click="emit('recommendationFeedback', recommendation.id, 'more')"
              >
                {{ t('today.nudges.feedback.more') }}
              </button>
              <button
                type="button"
                class="neo-pill neo-focus px-2 py-1 text-[11px]"
                @click="emit('recommendationFeedback', recommendation.id, 'not-now')"
              >
                {{ t('today.nudges.feedback.notNow') }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { TodayRecommendationFeedbackType, TodaySupportState } from '@/types/today'
import type { WeekSummary } from '@/utils/todayUtils'

const { t } = useT()

const props = defineProps<{
  support: TodaySupportState
  weekSummary: WeekSummary
  hasWeekSummary: boolean
}>()

const emit = defineEmits<{
  journalAction: []
  emotionAction: []
  openPlanning: []
  openIfs: []
  reminderAction: []
  openRecommendation: [route: string, recommendationId: string]
  recommendationFeedback: [recommendationId: string, feedbackType: TodayRecommendationFeedbackType]
}>()

const intentionTitle = computed(() => {
  if (props.support.dailyIntention.tone === 'evening') return t('today.intention.eveningTitle')
  if (props.support.dailyIntention.tone === 'midday') return t('today.intention.middayTitle')
  return t('today.intention.morningTitle')
})

const dueReflections = computed(() => props.support.reflectionBadges.filter((badge) => badge.isDue))

const reminderTitle = computed(() => {
  if (!props.support.primaryReminder) return ''
  if (props.support.primaryReminder.kind === 'adaptive') return t('today.support.adaptiveReminder')
  if (props.support.primaryReminder.kind === 'reflection') return t('today.support.reflectionReminder')
  return props.support.primaryReminder.title || t('today.support.recommendationReminder')
})

const reminderDescription = computed(() => {
  if (!props.support.primaryReminder) return ''
  if (props.support.primaryReminder.kind !== 'reflection' || !props.support.primaryReminder.reflectionKeys) {
    return props.support.primaryReminder.description
  }

  return props.support.primaryReminder.reflectionKeys
    .map((key) => t(`today.reflections.${key}`))
    .join(' · ')
})

const reminderActionLabel = computed(() => {
  if (!props.support.primaryReminder) return ''
  if (props.support.primaryReminder.kind === 'adaptive') return t('today.support.openPlanning')
  if (props.support.primaryReminder.kind === 'reflection') return t('today.reflections.openPlanning')
  return t('today.nudges.open')
})
</script>
