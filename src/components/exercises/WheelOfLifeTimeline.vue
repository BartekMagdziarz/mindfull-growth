<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.wheelOfLife.timeline.title') }}</h3>
    </div>

    <div v-if="assessments.length === 0" class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.timeline.emptyState') }}
    </div>

    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <article
        v-for="assessment in assessmentCards"
        :key="assessment.id"
        class="rounded-2xl border border-neu-border/20 bg-section/35 p-3"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-xs font-semibold text-on-surface">
              {{ formatDate(assessment.createdAt) }}
            </div>
            <p v-if="assessment.scope === 'partial'" class="mt-0.5 text-[11px] leading-tight text-on-surface-variant">
              {{ t('exerciseWizards.wheelOfLife.timeline.partialHint') }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft"
              @click="$emit('edit', assessment.id)"
            >
              {{ t('exerciseWizards.wheelOfLife.timeline.editSelected') }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-[11px] font-medium text-error transition-colors hover:bg-error/10"
              @click="$emit('delete', assessment.id)"
            >
              {{ t('common.buttons.delete') }}
            </button>
          </div>
        </div>

        <div class="mx-auto w-32 max-w-full">
          <WheelOfLifeRadialChart
            :areas="assessment.areas"
            :size="124"
            :padding="10"
            :compact="true"
          />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import WheelOfLifeRadialChart from './WheelOfLifeRadialChart.vue'
import { useT } from '@/composables/useT'
import type { WheelChartArea } from './wheelOfLifeTypes'

const { t } = useT()

const props = defineProps<{
  assessments: LifeAreaAssessment[]
}>()

defineEmits<{
  edit: [assessmentId: string]
  delete: [assessmentId: string]
}>()

const assessmentCards = computed(() =>
  props.assessments.map((assessment) => ({
    ...assessment,
    areas: assessment.items.map<WheelChartArea>((item) => ({
        id: item.lifeAreaId,
        name: item.lifeAreaNameSnapshot,
        rating: item.score,
      })),
  })),
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(t('exerciseWizards.wheelOfLife.timeline.dateLocale'), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>
