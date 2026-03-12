<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-on-surface">{{ t('exerciseWizards.wheelOfLife.timeline.title') }}</h3>
      <AppButton
        v-if="selectedAssessment"
        variant="outlined"
        @click="$emit('edit', selectedAssessment.id)"
      >
        {{ t('exerciseWizards.wheelOfLife.timeline.editSelected') }}
      </AppButton>
    </div>

    <div v-if="assessments.length === 0" class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.timeline.emptyState') }}
    </div>

    <div v-else class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      <button
        v-for="assessment in assessments"
        :key="assessment.id"
        type="button"
        class="flex-shrink-0 px-3 py-2 rounded-xl border text-sm transition-colors"
        :class="
          selectedId === assessment.id
            ? 'border-primary bg-primary-soft text-on-surface font-medium'
            : 'border-neu-border/30 bg-transparent text-on-surface-variant hover:bg-section/50'
        "
        @click="handleSelect(assessment.id)"
      >
        {{ formatDate(assessment.createdAt) }}
      </button>
    </div>

    <div v-if="selectedAssessment" class="space-y-3">
      <WheelOfLifeRadialChart
        :areas="selectedAreas"
        :comparison-areas="comparisonAreas"
        :animated="true"
      />

      <div v-if="assessments.length > 1" class="flex items-center gap-2">
        <label class="text-xs text-on-surface-variant">{{ t('exerciseWizards.wheelOfLife.timeline.compareWith') }}</label>
        <select
          class="neo-input text-xs p-1.5"
          :value="comparisonId || ''"
          @change="comparisonId = ($event.target as HTMLSelectElement).value || null"
        >
          <option value="">{{ t('exerciseWizards.wheelOfLife.timeline.none') }}</option>
          <option
            v-for="assessment in assessments.filter((entry) => entry.id !== selectedId)"
            :key="assessment.id"
            :value="assessment.id"
          >
            {{ formatDate(assessment.createdAt) }}
          </option>
        </select>
      </div>

      <p v-if="selectedAssessment.notes" class="text-sm text-on-surface-variant italic">
        {{ selectedAssessment.notes }}
      </p>

      <ul class="space-y-2">
        <li
          v-for="item in selectedAssessment.items"
          :key="item.lifeAreaId"
          class="flex items-start justify-between gap-3 rounded-xl border border-neu-border/20 bg-section/40 px-3 py-2"
        >
          <div class="min-w-0">
            <div class="text-sm font-medium text-on-surface">{{ item.lifeAreaNameSnapshot }}</div>
            <div
              v-if="item.note || item.visionSnapshot"
              class="text-xs text-on-surface-variant line-clamp-2 mt-1"
            >
              {{ item.note || item.visionSnapshot }}
            </div>
          </div>
          <span class="text-xs font-medium text-on-surface-variant">{{ item.score }}/10</span>
        </li>
      </ul>

      <p v-if="selectedAssessment.scope === 'partial'" class="text-xs text-on-surface-variant">
        {{ t('exerciseWizards.wheelOfLife.timeline.partialHint') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import AppButton from '@/components/AppButton.vue'
import WheelOfLifeRadialChart from './WheelOfLifeRadialChart.vue'
import { useT } from '@/composables/useT'
import type { WheelChartArea } from './wheelOfLifeTypes'

const { t } = useT()

const props = defineProps<{
  assessments: LifeAreaAssessment[]
}>()

defineEmits<{
  edit: [assessmentId: string]
}>()

const selectedId = ref<string | null>(props.assessments[0]?.id ?? null)
const comparisonId = ref<string | null>(null)

watch(
  () => props.assessments,
  (nextAssessments) => {
    if (nextAssessments.length === 0) {
      selectedId.value = null
      comparisonId.value = null
      return
    }

    if (!selectedId.value || !nextAssessments.some((assessment) => assessment.id === selectedId.value)) {
      selectedId.value = nextAssessments[0].id
    }

    if (comparisonId.value && !nextAssessments.some((assessment) => assessment.id === comparisonId.value)) {
      comparisonId.value = null
    }
  },
  { immediate: true },
)

const selectedAssessment = computed(() =>
  props.assessments.find((assessment) => assessment.id === selectedId.value) ?? null,
)

const comparisonAssessment = computed(() =>
  comparisonId.value
    ? props.assessments.find((assessment) => assessment.id === comparisonId.value) ?? null
    : null,
)

const selectedAreas = computed<WheelChartArea[]>(() =>
  selectedAssessment.value
    ? selectedAssessment.value.items.map((item) => ({
        id: item.lifeAreaId,
        name: item.lifeAreaNameSnapshot,
        rating: item.score,
      }))
    : [],
)

const comparisonAreas = computed<WheelChartArea[] | undefined>(() =>
  comparisonAssessment.value
    ? comparisonAssessment.value.items.map((item) => ({
        id: item.lifeAreaId,
        name: item.lifeAreaNameSnapshot,
        rating: item.score,
      }))
    : undefined,
)

function handleSelect(id: string) {
  selectedId.value = id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>
