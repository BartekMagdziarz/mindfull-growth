<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_0.85fr]">
      <div class="neo-inset animate-pulse rounded-2xl px-4 py-4">
        <div class="h-4 w-24 rounded bg-outline/20" />
        <div class="mt-2 h-3 w-40 rounded bg-outline/10" />
      </div>
      <div class="space-y-4">
        <div v-for="n in 2" :key="n" class="neo-inset animate-pulse rounded-2xl px-4 py-4">
          <div class="h-4 w-24 rounded bg-outline/20" />
          <div class="mt-2 h-3 w-40 rounded bg-outline/10" />
        </div>
      </div>
    </div>

    <div v-else-if="bundle" class="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_0.85fr]">
      <!-- Left: Emotions -->
      <div class="neo-inset rounded-2xl px-4 py-3">
        <h3 class="text-sm font-semibold text-on-surface-variant">
          {{ t('planning.reflection.review.emotions') }}
        </h3>
        <div v-if="bundle.emotionSummary.totalLogs > 0" class="mt-2">
          <p class="text-sm text-on-surface">
            {{ tp(
              bundle.emotionSummary.totalLogs,
              'planning.reflection.review.emotionLog.one',
              'planning.reflection.review.emotionLog.few',
              'planning.reflection.review.emotionLog.many',
            ) }}
          </p>
          <div v-if="bundle.emotionSummary.topEmotions.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="emotion in bundle.emotionSummary.topEmotions"
              :key="emotion.emotionId"
              :style="getQuadrantChipStyle(emotion.quadrant)"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-on-surface text-xs font-medium"
            >
              {{ emotion.name }} ({{ emotion.count }})
            </span>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-on-surface-variant">
          {{ t('planning.reflection.review.noData') }}
        </p>
      </div>

      <!-- Right: Habits + Journals + Exercises stacked -->
      <div class="space-y-4">
        <!-- Habits -->
        <div class="neo-inset rounded-2xl px-4 py-3">
          <h3 class="text-sm font-semibold text-on-surface-variant">
            {{ t('planning.reflection.review.habits') }}
          </h3>
          <div v-if="bundle.habitSummary.totalActive > 0" class="mt-2">
            <p class="text-sm text-on-surface">
              {{ bundle.habitSummary.metCount }} / {{ bundle.habitSummary.totalActive }}
              {{ t('planning.reflection.review.habitsMet') }}
            </p>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-outline/10">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: habitPercent + '%' }"
              />
            </div>
          </div>
          <p v-else class="mt-2 text-sm text-on-surface-variant">
            {{ t('planning.reflection.review.noData') }}
          </p>
        </div>

        <!-- Journals -->
        <div class="neo-inset rounded-2xl px-4 py-3">
          <h3 class="text-sm font-semibold text-on-surface-variant">
            {{ t('planning.reflection.review.journals') }}
          </h3>
          <p class="mt-2 text-sm text-on-surface">
            {{ tp(
              bundle.journalSummary.totalEntries,
              'planning.reflection.review.journalEntry.one',
              'planning.reflection.review.journalEntry.few',
              'planning.reflection.review.journalEntry.many',
            ) }}
          </p>
          <ul v-if="bundle.journalSummary.entries.length > 0" class="mt-2 space-y-1">
            <li
              v-for="entry in bundle.journalSummary.entries.slice(0, 5)"
              :key="entry.id"
              class="text-sm text-on-surface-variant truncate"
            >
              {{ getDisplayTitle(entry) || t('planning.reflection.review.untitled') }}
            </li>
          </ul>
        </div>

        <!-- Exercises -->
        <div v-if="bundle.exerciseSummary.totalCompleted > 0" class="neo-inset rounded-2xl px-4 py-3">
          <h3 class="text-sm font-semibold text-on-surface-variant">
            {{ t('planning.reflection.review.exercises') }}
          </h3>
          <p class="mt-2 text-sm text-on-surface">
            {{ bundle.exerciseSummary.totalCompleted }}
            {{ t('planning.reflection.review.exercisesCompleted') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getQuadrantChipStyle } from '@/domain/emotion'
import type {
  WeeklyReflectionDataBundle,
  MonthlyReflectionDataBundle,
} from '@/services/reflectionDataQueries'
import { getDisplayTitle } from '@/domain/journal'
import { useT } from '@/composables/useT'

const { t, tp } = useT()

const props = defineProps<{
  bundle: WeeklyReflectionDataBundle | MonthlyReflectionDataBundle | null
  isLoading: boolean
}>()

const habitPercent = computed(() => {
  if (!props.bundle || props.bundle.habitSummary.totalActive === 0) return 0
  return Math.round(
    (props.bundle.habitSummary.metCount / props.bundle.habitSummary.totalActive) * 100
  )
})
</script>
