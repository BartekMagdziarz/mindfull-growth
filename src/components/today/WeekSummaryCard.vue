<template>
  <AppCard padding="lg" class="w-full max-w-md">
    <h3 class="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
      <ChartBarIcon class="w-5 h-5 text-primary" />
      This week
    </h3>

    <!-- Stats Grid -->
    <div class="grid grid-cols-3 gap-4 mb-4">
      <!-- Journal Count -->
      <div class="text-center">
        <div class="text-2xl font-bold text-primary">
          {{ summary.journalCount }}
        </div>
        <div class="text-xs text-on-surface-variant">
          {{ summary.journalCount === 1 ? 'journal' : 'journals' }}
        </div>
      </div>

      <!-- Emotion Log Count -->
      <div class="text-center">
        <div class="text-2xl font-bold text-primary">
          {{ summary.emotionLogCount }}
        </div>
        <div class="text-xs text-on-surface-variant">
          {{ summary.emotionLogCount === 1 ? 'emotion' : 'emotions' }}
        </div>
      </div>

      <!-- Streak -->
      <div class="text-center">
        <div class="text-2xl font-bold text-primary flex items-center justify-center gap-1">
          {{ summary.streak }}
          <FireIcon
            v-if="summary.streak >= 3"
            class="w-5 h-5 text-orange-500"
          />
        </div>
        <div class="text-xs text-on-surface-variant">
          day streak
        </div>
      </div>
    </div>

    <!-- Top Emotions -->
    <div v-if="topEmotions.length > 0">
      <div class="text-sm text-on-surface-variant mb-2">Top emotions</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="emotion in topEmotions"
          :key="emotion.id"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-elevation-1"
          :class="getEmotionClasses(emotion)"
        >
          {{ emotion.name }}
        </span>
      </div>
    </div>

    <!-- Empty state for emotions -->
    <p
      v-else
      class="text-sm text-on-surface-variant"
    >
      Log emotions to see your weekly patterns
    </p>

    <!-- Motivational message -->
    <p
      v-if="motivationalMessage"
      class="text-sm text-on-surface-variant mt-4 pt-4 border-t border-outline/20"
    >
      {{ motivationalMessage }}
    </p>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { ChartBarIcon, FireIcon } from '@heroicons/vue/24/outline'
import { useEmotionStore } from '@/stores/emotion.store'
import type { WeekSummary } from '@/utils/todayUtils'
import type { Emotion } from '@/domain/emotion'

const props = defineProps<{
  summary: WeekSummary
}>()

const emotionStore = useEmotionStore()

const topEmotions = computed(() => {
  return props.summary.topEmotionIds
    .map((id) => emotionStore.getEmotionById(id))
    .filter((e): e is Emotion => e !== undefined)
})

function getEmotionClasses(emotion: Emotion): string {
  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-high-energy-high-pleasantness text-on-surface border border-chip-border'
  } else if (isHighEnergy && !isHighPleasantness) {
    return 'bg-quadrant-high-energy-low-pleasantness text-on-surface border border-chip-border'
  } else if (!isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-low-energy-high-pleasantness text-on-surface border border-chip-border'
  } else {
    return 'bg-quadrant-low-energy-low-pleasantness text-on-surface border border-chip-border'
  }
}

const motivationalMessage = computed(() => {
  const { journalCount, emotionLogCount, streak } = props.summary

  if (streak >= 7) {
    return "Amazing! You've been consistent for a whole week!"
  }
  if (streak >= 3) {
    return "Great streak! Keep the momentum going."
  }
  if (journalCount === 0 && emotionLogCount === 0) {
    return "Start your week strong - every entry counts."
  }
  if (journalCount > 0 || emotionLogCount > 0) {
    return "You're building a healthy reflection habit."
  }
  return null
})
</script>
