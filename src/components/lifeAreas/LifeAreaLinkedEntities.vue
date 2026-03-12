<template>
  <div class="space-y-4">
    <div v-if="latestEntry" class="space-y-4">
      <div class="rounded-xl border border-neu-border/20 bg-section/40 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-on-surface">
              {{ t('lifeAreas.linkedEntities.latestAssessment') }}
            </h4>
            <p class="text-xs text-on-surface-variant mt-1">
              {{ formatDate(latestEntry.assessment.createdAt) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-on-surface">
              {{ latestEntry.item.score }}/10
            </span>
            <span
              v-if="latestDelta !== null"
              class="rounded-full px-2 py-1 text-xs font-medium"
              :class="deltaClass"
            >
              {{ deltaLabel }}
            </span>
          </div>
        </div>

        <p
          v-if="latestEntry.item.note"
          class="mt-3 text-sm text-on-surface-variant"
        >
          {{ latestEntry.item.note }}
        </p>

        <div
          v-if="latestEntry.item.visionSnapshot"
          class="mt-3 rounded-lg border border-neu-border/20 bg-surface/80 px-3 py-2"
        >
          <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {{ t('lifeAreas.linkedEntities.visionSnapshot') }}
          </div>
          <p class="mt-1 text-sm text-on-surface-variant">
            {{ latestEntry.item.visionSnapshot }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-on-surface">
          {{ t('lifeAreas.linkedEntities.historyTitle') }}
        </h4>
        <ul class="space-y-2">
          <li
            v-for="entry in historyEntries"
            :key="entry.assessment.id"
            class="flex items-start justify-between gap-3 rounded-xl border border-neu-border/20 bg-section/30 px-3 py-2"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium text-on-surface">
                {{ formatDate(entry.assessment.createdAt) }}
              </div>
              <div
                v-if="entry.item.note || entry.item.visionSnapshot"
                class="mt-1 text-xs text-on-surface-variant line-clamp-2"
              >
                {{ entry.item.note || entry.item.visionSnapshot }}
              </div>
            </div>
            <span class="text-xs font-medium text-on-surface-variant">
              {{ entry.item.score }}/10
            </span>
          </li>
        </ul>
      </div>
    </div>

    <p
      v-else
      class="text-sm text-on-surface-variant text-center py-4"
    >
      {{ t('lifeAreas.linkedEntities.emptyState') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { LifeArea } from '@/domain/lifeArea'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import {
  getLifeAreaAssessmentDelta,
  getLifeAreaAssessmentHistoryEntries,
} from '@/utils/lifeAreaAssessments'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  lifeArea: LifeArea
}>()

const assessmentStore = useLifeAreaAssessmentStore()

onMounted(async () => {
  await assessmentStore.loadAssessments()
})

const historyEntries = computed(() =>
  getLifeAreaAssessmentHistoryEntries(assessmentStore.assessments, props.lifeArea.id),
)

const latestEntry = computed(() => historyEntries.value[0] ?? null)
const previousEntry = computed(() => historyEntries.value[1] ?? null)

const latestDelta = computed(() => {
  if (!latestEntry.value) return null
  return getLifeAreaAssessmentDelta(
    latestEntry.value.assessment,
    previousEntry.value?.assessment,
    props.lifeArea.id,
  )
})

const deltaClass = computed(() => {
  if (latestDelta.value === null) return 'bg-section text-on-surface-variant'
  if (latestDelta.value > 0) return 'bg-green-100 text-green-700'
  if (latestDelta.value < 0) return 'bg-red-100 text-red-700'
  return 'bg-section text-on-surface-variant'
})

const deltaLabel = computed(() => {
  if (latestDelta.value === null) return t('lifeAreas.linkedEntities.noPreviousDelta')
  if (latestDelta.value > 0) {
    return t('lifeAreas.linkedEntities.deltaUp', { delta: latestDelta.value })
  }
  if (latestDelta.value < 0) {
    return t('lifeAreas.linkedEntities.deltaDown', { delta: latestDelta.value })
  }
  return t('lifeAreas.linkedEntities.deltaNone')
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
</script>
