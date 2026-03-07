<template>
  <div class="space-y-4">
    <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.wheelOfLife.timeline.title') }}</h3>

    <div v-if="snapshots.length === 0" class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.timeline.emptyState') }}
    </div>

    <!-- Timeline chips -->
    <div v-else class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      <button
        v-for="snapshot in snapshots"
        :key="snapshot.id"
        type="button"
        class="flex-shrink-0 px-3 py-2 rounded-xl border text-sm transition-colors"
        :class="
          selectedId === snapshot.id
            ? 'border-primary bg-primary-soft text-on-surface font-medium'
            : 'border-neu-border/30 bg-transparent text-on-surface-variant hover:bg-section/50'
        "
        @click="handleSelect(snapshot.id)"
      >
        {{ formatDate(snapshot.createdAt) }}
      </button>
    </div>

    <!-- Selected snapshot view -->
    <div v-if="selectedSnapshot" class="space-y-3">
      <WheelOfLifeRadialChart
        :areas="selectedSnapshot.areas"
        :comparison-areas="comparisonSnapshot?.areas"
        :animated="true"
      />

      <!-- Compare toggle -->
      <div v-if="snapshots.length > 1" class="flex items-center gap-2">
        <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.wheelOfLife.timeline.compareWith') }}</label>
        <select
          class="neo-input text-xs p-1.5"
          :value="comparisonId || ''"
          @change="comparisonId = ($event.target as HTMLSelectElement).value || null"
        >
          <option value="">{{ t('exerciseWizards.wheelOfLife.timeline.none') }}</option>
          <option
            v-for="s in snapshots.filter((s) => s.id !== selectedId)"
            :key="s.id"
            :value="s.id"
          >
            {{ formatDate(s.createdAt) }}
          </option>
        </select>
      </div>

      <!-- Notes -->
      <p v-if="selectedSnapshot.notes" class="text-sm text-on-surface-variant italic">
        {{ selectedSnapshot.notes }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WheelOfLifeSnapshot } from '@/domain/exercises'
import WheelOfLifeRadialChart from './WheelOfLifeRadialChart.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  snapshots: WheelOfLifeSnapshot[]
}>()

const selectedId = ref<string | null>(props.snapshots[0]?.id ?? null)
const comparisonId = ref<string | null>(null)

const selectedSnapshot = computed(() =>
  props.snapshots.find((s) => s.id === selectedId.value) ?? null,
)

const comparisonSnapshot = computed(() =>
  comparisonId.value ? props.snapshots.find((s) => s.id === comparisonId.value) ?? null : null,
)

function handleSelect(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>
