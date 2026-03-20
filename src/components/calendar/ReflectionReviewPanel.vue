<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="n in 3" :key="n" class="neo-inset animate-pulse rounded-2xl px-4 py-4">
        <div class="h-4 w-24 rounded bg-outline/20" />
        <div class="mt-2 h-3 w-40 rounded bg-outline/10" />
      </div>
    </div>

    <template v-else-if="bundle">
      <!-- Emotions -->
      <div class="neo-inset rounded-2xl px-4 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {{ t('planning.reflection.review.emotions') }}
        </h3>
        <div v-if="bundle.emotionSummary.totalLogs > 0" class="mt-2">
          <p class="text-sm text-on-surface">
            {{ bundle.emotionSummary.totalLogs }} {{ t('planning.reflection.review.emotionLogs') }}
          </p>
          <div v-if="bundle.emotionSummary.topEmotions.length > 0" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="emotion in bundle.emotionSummary.topEmotions"
              :key="emotion.emotionId"
              class="neo-pill text-xs"
            >
              {{ emotion.name }} ({{ emotion.count }})
            </span>
          </div>
          <!-- Quadrant distribution bar -->
          <div class="mt-3 flex h-2 overflow-hidden rounded-full">
            <div
              v-for="(qKey, idx) in quadrantOrder"
              :key="qKey"
              class="transition-all"
              :class="quadrantColors[idx]"
              :style="{ width: quadrantPercent(qKey) + '%' }"
            />
          </div>
          <div class="mt-1 flex justify-between text-[10px] text-on-surface-variant">
            <span>{{ t('planning.reflection.review.pleasant') }}</span>
            <span>{{ t('planning.reflection.review.unpleasant') }}</span>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-on-surface-variant">
          {{ t('planning.reflection.review.noData') }}
        </p>
      </div>

      <!-- Journals -->
      <div class="neo-inset rounded-2xl px-4 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {{ t('planning.reflection.review.journals') }}
        </h3>
        <p class="mt-2 text-sm text-on-surface">
          {{ bundle.journalSummary.totalEntries }}
          {{ t('planning.reflection.review.journalEntries') }}
        </p>
        <ul v-if="bundle.journalSummary.entries.length > 0" class="mt-2 space-y-1">
          <li
            v-for="entry in bundle.journalSummary.entries.slice(0, 5)"
            :key="entry.id"
            class="text-sm text-on-surface-variant truncate"
          >
            {{ entry.title || t('planning.reflection.review.untitled') }}
          </li>
        </ul>
      </div>

      <!-- Habits -->
      <div class="neo-inset rounded-2xl px-4 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {{ t('planning.reflection.review.habits') }}
        </h3>
        <div v-if="bundle.habitSummary.totalActive > 0" class="mt-2">
          <p class="text-sm text-on-surface">
            {{ bundle.habitSummary.metCount }} / {{ bundle.habitSummary.totalActive }}
            {{ t('planning.reflection.review.habitsMet') }}
          </p>
          <!-- Simple progress bar -->
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

      <!-- Exercises -->
      <div v-if="bundle.exerciseSummary.totalCompleted > 0" class="neo-inset rounded-2xl px-4 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {{ t('planning.reflection.review.exercises') }}
        </h3>
        <p class="mt-2 text-sm text-on-surface">
          {{ bundle.exerciseSummary.totalCompleted }}
          {{ t('planning.reflection.review.exercisesCompleted') }}
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Quadrant } from '@/domain/emotion'
import type {
  WeeklyReflectionDataBundle,
  MonthlyReflectionDataBundle,
} from '@/services/reflectionDataQueries'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  bundle: WeeklyReflectionDataBundle | MonthlyReflectionDataBundle | null
  isLoading: boolean
}>()

const quadrantOrder: Quadrant[] = [
  'high-energy-high-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
  'high-energy-low-pleasantness',
]

const quadrantColors = [
  'bg-[var(--color-quadrant-high-energy-high-pleasantness,#4ade80)]',
  'bg-[var(--color-quadrant-low-energy-high-pleasantness,#60a5fa)]',
  'bg-[var(--color-quadrant-low-energy-low-pleasantness,#a78bfa)]',
  'bg-[var(--color-quadrant-high-energy-low-pleasantness,#f87171)]',
]

function quadrantPercent(quadrant: Quadrant): number {
  if (!props.bundle) return 0
  const dist = props.bundle.emotionSummary.quadrantDistribution
  const total = Object.values(dist).reduce((sum, v) => sum + v, 0)
  if (total === 0) return 25
  return Math.round((dist[quadrant] / total) * 100)
}

const habitPercent = computed(() => {
  if (!props.bundle || props.bundle.habitSummary.totalActive === 0) return 0
  return Math.round(
    (props.bundle.habitSummary.metCount / props.bundle.habitSummary.totalActive) * 100
  )
})
</script>
