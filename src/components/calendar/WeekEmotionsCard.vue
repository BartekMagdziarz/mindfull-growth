<template>
  <SummaryCard :title="t('planning.reflection.review.emotions')">
    <p
      v-if="weekLogs.length === 0"
      class="text-center text-xs text-on-surface-variant/70"
    >
      —
    </p>
    <div v-else class="grid grid-cols-2 items-start gap-3">
      <!-- 2x2 quadrant grid -->
      <div
        class="grid aspect-square grid-cols-2 grid-rows-2 gap-1 rounded-2xl bg-neu-base p-1.5 shadow-neu-pressed-sm"
      >
        <div
          v-for="q in quadrantTiles"
          :key="q.key"
          class="flex items-center justify-center"
        >
          <div
            class="flex items-center justify-center rounded-xl text-sm font-bold shadow-neu-raised-sm"
            :style="{
              width: quadrantTileSize(q.key) + '%',
              height: quadrantTileSize(q.key) + '%',
              minWidth: '20px',
              minHeight: '20px',
              background: q.color,
              color: 'white',
            }"
          >
            {{ quadrantCounts[q.key] }}
          </div>
        </div>
      </div>

      <!-- Top emotions as pills -->
      <div class="flex flex-col gap-1.5">
        <span
          v-for="emotion in topEmotions"
          :key="emotion.emotionId"
          class="inline-flex items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          :style="{ backgroundColor: quadrantColor(emotion.quadrant) }"
          :title="`${emotion.name} ×${emotion.count}`"
        >
          <span class="min-w-0 flex-1 truncate">{{ emotion.name }}</span>
          <span class="shrink-0 opacity-90">×{{ emotion.count }}</span>
        </span>
      </div>
    </div>
  </SummaryCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SummaryCard from './WeeklyReviewSummaryCard.vue'
import { useT } from '@/composables/useT'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { getQuadrant } from '@/domain/emotion'
import type { Quadrant } from '@/domain/emotion'
import type { WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'

const props = defineProps<{
  weekRef: WeekRef
}>()

const { t } = useT()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()

const QUADRANT_ORDER: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-low-pleasantness',
  'low-energy-high-pleasantness',
]

const quadrantTiles: { key: Quadrant; color: string }[] = [
  { key: 'high-energy-low-pleasantness', color: 'var(--color-quadrant-high-energy-low-pleasantness-selected)' },
  { key: 'high-energy-high-pleasantness', color: 'var(--color-quadrant-high-energy-high-pleasantness-selected)' },
  { key: 'low-energy-low-pleasantness', color: 'var(--color-quadrant-low-energy-low-pleasantness-selected)' },
  { key: 'low-energy-high-pleasantness', color: 'var(--color-quadrant-low-energy-high-pleasantness-selected)' },
]

const weekBounds = computed(() => {
  const bounds = getPeriodBounds(props.weekRef)
  return {
    startISO: `${bounds.start}T00:00:00.000Z`,
    endISO: `${bounds.end}T23:59:59.999Z`,
  }
})

const weekLogs = computed(() =>
  emotionLogStore.sortedLogs.filter(
    (log) => log.createdAt >= weekBounds.value.startISO && log.createdAt <= weekBounds.value.endISO,
  ),
)

const quadrantCounts = computed<Record<Quadrant, number>>(() => {
  const counts: Record<Quadrant, number> = {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }
  for (const log of weekLogs.value) {
    for (const emotionId of log.emotionIds) {
      const emotion = emotionStore.getEmotionById(emotionId)
      if (emotion) counts[getQuadrant(emotion)]++
    }
  }
  return counts
})

const topEmotions = computed(() => {
  const counts = new Map<string, number>()
  for (const log of weekLogs.value) {
    for (const emotionId of log.emotionIds) {
      counts.set(emotionId, (counts.get(emotionId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([emotionId, count]) => {
      const emotion = emotionStore.getEmotionById(emotionId)
      if (!emotion) return []
      return [
        {
          emotionId,
          name: emotion.name,
          count,
          quadrant: getQuadrant(emotion),
        },
      ]
    })
})

function quadrantColor(q: Quadrant): string {
  return `var(--color-quadrant-${q}-selected)`
}

function quadrantTileSize(q: Quadrant): number {
  const counts = quadrantCounts.value
  const total = QUADRANT_ORDER.reduce((a, k) => a + counts[k], 0)
  if (total === 0) return 40
  const v = counts[q]
  return Math.max(40, Math.sqrt(v / total) * 100)
}
</script>
