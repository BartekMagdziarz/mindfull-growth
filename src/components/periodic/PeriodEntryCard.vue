<template>
  <button
    type="button"
    class="flex-shrink-0 w-36 h-44 rounded-2xl bg-surface border border-outline/30 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 flex flex-col p-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background overflow-hidden"
    @click="$emit('click')"
    :aria-label="`View ${periodInfo.label} entry`"
  >
    <!-- Period Label -->
    <div class="text-base font-semibold text-on-surface mb-1 truncate">
      {{ periodInfo.label }}
    </div>

    <!-- Date Range -->
    <div class="text-xs text-on-surface-variant mb-3">
      {{ periodInfo.dateRange }}
    </div>

    <!-- Mini Emotion Cloud Preview -->
    <div class="flex-1 flex flex-wrap gap-1 content-start overflow-hidden">
      <span
        v-for="(emotion, index) in previewEmotions"
        :key="emotion.emotionId"
        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-full"
        :class="getEmotionClasses(emotion.emotionId)"
        :style="{ opacity: 1 - index * 0.15 }"
      >
        {{ getEmotionName(emotion.emotionId) }}
      </span>
      <span
        v-if="hasMoreEmotions"
        class="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-on-surface-variant bg-section"
      >
        +{{ moreEmotionsCount }}
      </span>
    </div>

    <!-- Entry Count -->
    <div class="mt-2 text-[10px] text-on-surface-variant">
      {{ entryCount }}
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEmotionStore } from '@/stores/emotion.store'
import { getPeriodInfo } from '@/utils/periodUtils'
import type { PeriodicEntry } from '@/domain/periodicEntry'

const props = defineProps<{
  entry: PeriodicEntry
}>()

defineEmits<{
  click: []
}>()

const emotionStore = useEmotionStore()

const periodInfo = computed(() => {
  const startDate = new Date(props.entry.periodStartDate)
  return getPeriodInfo(props.entry.type, startDate)
})

// Show top 4 emotions in preview
const previewEmotions = computed(() => {
  return props.entry.aggregatedData.emotionFrequency.slice(0, 4)
})

const hasMoreEmotions = computed(() => {
  return props.entry.aggregatedData.emotionFrequency.length > 4
})

const moreEmotionsCount = computed(() => {
  return props.entry.aggregatedData.emotionFrequency.length - 4
})

const entryCount = computed(() => {
  const journalCount = props.entry.aggregatedData.journalEntryIds.length
  const emotionCount = props.entry.aggregatedData.emotionLogIds.length

  const parts: string[] = []
  if (journalCount > 0) {
    parts.push(`${journalCount} journal`)
  }
  if (emotionCount > 0) {
    parts.push(`${emotionCount} emotion`)
  }

  return parts.length > 0 ? parts.join(', ') : 'No entries'
})

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getEmotionClasses(emotionId: string): string {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return 'bg-section text-on-surface-variant'

  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-high-energy-high-pleasantness text-on-surface'
  } else if (isHighEnergy && !isHighPleasantness) {
    return 'bg-quadrant-high-energy-low-pleasantness text-on-surface'
  } else if (!isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-low-energy-high-pleasantness text-on-surface'
  } else {
    return 'bg-quadrant-low-energy-low-pleasantness text-on-surface'
  }
}
</script>
