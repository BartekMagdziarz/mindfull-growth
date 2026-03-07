<template>
  <div class="space-y-4">
    <AppCard padding="lg" class="space-y-3">
      <h3 class="text-lg font-semibold text-on-surface">
        {{ t('assessments.common.results.title') }}
      </h3>

      <p v-if="completedAt" class="text-xs text-on-surface-variant">
        {{ t('assessments.common.results.completedAt', { date: formatDate(completedAt) }) }}
      </p>

      <p v-if="retakeEligibleAt && !canRetake" class="text-xs text-on-surface-variant">
        {{ t('assessments.common.results.retakeEligibleOn', { date: formatDate(retakeEligibleAt) }) }}
      </p>

      <p v-if="canRetake" class="text-xs text-success">
        {{ t('assessments.common.results.retakeAvailable') }}
      </p>

      <button
        v-if="supportsCentering"
        type="button"
        class="neo-pill px-3 py-1.5 text-xs font-medium"
        @click="$emit('toggle-centering', !centeredEnabled)"
      >
        {{ centeredEnabled
          ? t('assessments.common.results.centeredToggleOff')
          : t('assessments.common.results.centeredToggleOn') }}
      </button>
    </AppCard>

    <template v-if="computation && computation.computedScales.length > 0">
      <AppCard
        v-for="score in computation.computedScales"
        :key="score.scaleId"
        padding="lg"
        class="space-y-2"
      >
        <div class="flex items-start justify-between gap-3">
          <h4 class="text-base font-semibold text-on-surface">{{ t(score.labelKey) }}</h4>
          <span class="neo-pill px-2 py-1 text-xs font-semibold" :class="bandClass(score.band)">
            {{ score.band ?? '-' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <p class="text-on-surface-variant">{{ t('assessments.common.results.normalized') }}</p>
          <p class="font-semibold text-on-surface text-right">{{ formatScore(score.normalizedMean) }}</p>

          <p class="text-on-surface-variant">{{ t('assessments.common.results.raw') }}</p>
          <p class="font-semibold text-on-surface text-right">{{ formatScore(score.rawMean) }}</p>

          <p v-if="score.deltaFromPrevious !== undefined" class="text-on-surface-variant col-span-2">
            {{ t('assessments.common.results.deltaFromPrevious', { delta: formatDelta(score.deltaFromPrevious) }) }}
          </p>

          <template v-if="hasVlqDetails(score)">
            <p class="text-on-surface-variant">{{ t('assessments.vlq.fields.importance') }}</p>
            <p class="font-semibold text-on-surface text-right">{{ formatScore(asNumber(score.details?.importance)) }}</p>
            <p class="text-on-surface-variant">{{ t('assessments.vlq.fields.consistency') }}</p>
            <p class="font-semibold text-on-surface text-right">{{ formatScore(asNumber(score.details?.consistency)) }}</p>
            <p class="text-on-surface-variant">{{ t('assessments.vlq.fields.gap') }}</p>
            <p class="font-semibold text-on-surface text-right">{{ formatScore(asNumber(score.details?.gap)) }}</p>
            <p class="text-on-surface-variant">{{ t('assessments.vlq.fields.weighted') }}</p>
            <p class="font-semibold text-on-surface text-right">{{ formatScore(asNumber(score.details?.weighted)) }}</p>
          </template>
        </div>

        <p v-if="interpretationText(score.band)" class="text-xs text-on-surface-variant">
          {{ interpretationText(score.band) }}
        </p>
      </AppCard>

      <AppCard
        v-if="computation.overallSummary.topValues && computation.overallSummary.topValues.length > 0"
        padding="lg"
        class="space-y-2"
      >
        <h4 class="text-sm font-semibold text-on-surface">{{ t('assessments.common.results.topValues') }}</h4>
        <div
          v-for="entry in computation.overallSummary.topValues"
          :key="`top-${entry.scaleId}`"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-on-surface">{{ t(scaleLabel(entry.scaleId)) }}</span>
          <span class="font-semibold text-on-surface">{{ formatScore(entry.value) }}</span>
        </div>
      </AppCard>

      <AppCard
        v-if="computation.overallSummary.biggestGaps && computation.overallSummary.biggestGaps.length > 0"
        padding="lg"
        class="space-y-2"
      >
        <h4 class="text-sm font-semibold text-on-surface">{{ t('assessments.common.results.biggestGaps') }}</h4>
        <div
          v-for="entry in computation.overallSummary.biggestGaps"
          :key="`gap-${entry.scaleId}`"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-on-surface">{{ t(scaleLabel(entry.scaleId)) }}</span>
          <span class="font-semibold text-on-surface">{{ formatScore(entry.gap) }}</span>
        </div>
      </AppCard>
    </template>

    <AppCard v-else padding="lg">
      <p class="text-sm text-on-surface-variant">{{ t('assessments.common.results.noScales') }}</p>
    </AppCard>

    <div class="flex items-center justify-between gap-2">
      <AppButton variant="text" @click="$emit('back')">
        {{ t('common.buttons.back') }}
      </AppButton>
      <AppButton variant="filled" :disabled="!canRetake" @click="$emit('retake')">
        {{ t('assessments.common.flow.retake') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import type { AssessmentComputation, AssessmentDefinition, ScaleBand, ScaleScore } from '@/domain/assessments'
import { useT } from '@/composables/useT'

const props = defineProps<{
  definition: AssessmentDefinition
  computation: AssessmentComputation | null
  completedAt?: string
  retakeEligibleAt?: string
  canRetake: boolean
  supportsCentering: boolean
  centeredEnabled: boolean
}>()

defineEmits<{
  back: []
  retake: []
  'toggle-centering': [enabled: boolean]
}>()

const { t } = useT()

const scaleLabelById = computed(() => {
  return new Map(props.definition.scales.map((scale) => [scale.id, scale.labelKey]))
})

const interpretationPrefix = computed(() => {
  const token = '.meta.title'
  if (!props.definition.titleKey.includes(token)) {
    return null
  }
  return props.definition.titleKey.slice(0, props.definition.titleKey.indexOf(token))
})

function interpretationText(band: ScaleBand | undefined): string {
  if (!band || !interpretationPrefix.value) return ''

  const key = `${interpretationPrefix.value}.interpretation.${band}`
  const value = t(key)
  return value === key ? '' : value
}

function scaleLabel(scaleId: string): string {
  return scaleLabelById.value.get(scaleId) ?? scaleId
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

function bandClass(band: ScaleBand | undefined): string {
  if (band === 'high') return 'neo-pill--success'
  if (band === 'low') return 'neo-pill--warning'
  return ''
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function hasVlqDetails(score: ScaleScore): boolean {
  return (
    props.definition.id === 'vlq' &&
    score.details !== undefined &&
    score.details.importance !== undefined &&
    score.details.consistency !== undefined
  )
}
</script>
