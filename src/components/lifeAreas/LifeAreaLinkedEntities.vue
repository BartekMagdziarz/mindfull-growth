<template>
  <div class="space-y-4">
    <!-- Wheel of Life Scores -->
    <div v-if="wheelScores.length > 0">
      <h4 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.linkedEntities.wheelScores') }}</h4>
      <div class="flex items-end gap-1 h-16">
        <div
          v-for="(score, index) in wheelScores"
          :key="index"
          class="flex-1 rounded-t bg-primary/60 transition-all"
          :style="{ height: `${(score.rating / 10) * 100}%` }"
          :title="t('lifeAreas.linkedEntities.scoreTooltip', { date: score.date, rating: score.rating })"
        />
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-xs text-on-surface-variant">{{ wheelScores[0]?.date }}</span>
        <span class="text-xs text-on-surface-variant">{{ wheelScores[wheelScores.length - 1]?.date }}</span>
      </div>
    </div>

    <p
      v-if="wheelScores.length === 0"
      class="text-sm text-on-surface-variant text-center py-4"
    >
      {{ t('lifeAreas.linkedEntities.emptyState') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { LifeArea } from '@/domain/lifeArea'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  lifeArea: LifeArea
}>()

const wheelStore = useWheelOfLifeStore()
onMounted(async () => {
  await wheelStore.loadSnapshots()
})

const wheelScores = computed(() => {
  return wheelStore.sortedSnapshots
    .map((snapshot) => {
      const area = snapshot.areas.find(
        (a) => a.name.toLowerCase() === props.lifeArea.name.toLowerCase(),
      )
      if (!area) return null
      return {
        date: new Date(snapshot.createdAt).toLocaleDateString(),
        rating: area.rating,
      }
    })
    .filter(Boolean) as Array<{ date: string; rating: number }>
})

</script>
