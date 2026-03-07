<template>
  <AppCard class="neo-raised w-full">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-semibold text-on-surface">{{ t('today.nudges.title') }}</h3>
        <p class="text-xs text-on-surface-variant">{{ t('today.nudges.subtitle') }}</p>
      </div>
    </div>

    <div v-if="recommendations.length === 0" class="neo-surface rounded-xl p-3 text-sm text-on-surface-variant">
      {{ t('today.nudges.empty') }}
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="recommendation in recommendations"
        :key="recommendation.id"
        class="neo-surface rounded-xl p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-on-surface">{{ recommendation.title }}</h4>
            <p class="mt-1 text-xs text-on-surface-variant">{{ recommendation.description }}</p>
          </div>
          <span class="inline-flex rounded-full bg-section px-2 py-1 text-[10px] text-on-surface-variant uppercase tracking-wide">
            {{ recommendation.modality }}
          </span>
        </div>

        <p class="mt-2 text-xs text-primary">{{ recommendation.whyNow }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <AppButton
            variant="filled"
            size="sm"
            @click="emit('open', recommendation.route, recommendation.id)"
          >
            {{ t('today.nudges.open') }}
          </AppButton>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="neo-pill neo-focus px-2 py-1 text-[11px]"
              @click="emit('feedback', recommendation.id, 'more')"
            >
              {{ t('today.nudges.feedback.more') }}
            </button>
            <button
              type="button"
              class="neo-pill neo-focus px-2 py-1 text-[11px]"
              @click="emit('feedback', recommendation.id, 'less')"
            >
              {{ t('today.nudges.feedback.less') }}
            </button>
            <button
              type="button"
              class="neo-pill neo-focus px-2 py-1 text-[11px]"
              @click="emit('feedback', recommendation.id, 'not-now')"
            >
              {{ t('today.nudges.feedback.notNow') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { TodayRecommendation, TodayRecommendationFeedbackType } from '@/types/today'

const { t } = useT()

defineProps<{
  recommendations: TodayRecommendation[]
}>()

const emit = defineEmits<{
  open: [route: string, recommendationId: string]
  feedback: [recommendationId: string, feedbackType: TodayRecommendationFeedbackType]
}>()
</script>
