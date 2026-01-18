<template>
  <div class="emotion-cloud">
    <!-- Empty State -->
    <div
      v-if="emotionFrequency.length === 0"
      class="text-center py-8 text-on-surface-variant"
    >
      <CloudIcon class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-sm">{{ emptyMessage }}</p>
    </div>

    <!-- Emotion Bubbles -->
    <div
      v-else
      class="flex flex-wrap justify-center gap-3 py-4"
    >
      <div
        v-for="item in emotionFrequency"
        :key="item.emotionId"
        class="emotion-bubble group relative cursor-default"
        :class="getQuadrantClasses(item.emotionId)"
        :style="getBubbleStyle(item.count)"
        :title="`${getEmotionName(item.emotionId)}: ${item.count}x`"
      >
        <span class="emotion-name">{{ getEmotionName(item.emotionId) }}</span>
        <span
          class="emotion-count absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-surface text-[10px] font-semibold text-on-surface shadow-elevation-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {{ item.count }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudIcon } from '@heroicons/vue/24/outline'
import { useEmotionStore } from '@/stores/emotion.store'
import type { EmotionFrequency } from '@/domain/periodicEntry'

const props = defineProps<{
  emotionFrequency: EmotionFrequency[]
  emptyMessage?: string
}>()

const emotionStore = useEmotionStore()

// Calculate max count for scaling
const maxCount = computed(() => {
  if (props.emotionFrequency.length === 0) return 1
  return Math.max(...props.emotionFrequency.map((e) => e.count))
})

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getQuadrantClasses(emotionId: string): string {
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

function getBubbleStyle(count: number): Record<string, string> {
  // Scale font size based on frequency
  // Min: 0.875rem (14px), Max: 1.5rem (24px)
  const minFontSize = 0.875
  const maxFontSize = 1.5
  const scale = count / maxCount.value
  const fontSize = minFontSize + scale * (maxFontSize - minFontSize)

  // Scale padding based on font size
  const paddingX = 0.75 + scale * 0.5
  const paddingY = 0.375 + scale * 0.25

  return {
    fontSize: `${fontSize}rem`,
    padding: `${paddingY}rem ${paddingX}rem`,
  }
}
</script>

<style scoped>
.emotion-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.emotion-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.emotion-name {
  white-space: nowrap;
}
</style>
