<template>
  <section v-if="points.length" class="outcome" :aria-label="t('programs.ui.outcomeTitle')">
    <div class="mg-v2-section-head">
      <h2>{{ t('programs.ui.outcomeTitle') }}</h2>
      <small>{{ scaleLabel }}</small>
    </div>
    <div class="mg-v2-surface mg-v2-surface--raised-sm outcome__card">
      <div class="outcome__grid">
        <div v-for="point in points" :key="point.key" class="mg-v2-surface mg-v2-surface--flat outcome__cell">
          <span class="outcome__label">{{ point.label }}</span>
          <span class="outcome__value">{{ point.value }}</span>
          <p class="mg-v2-meta">
            <span v-if="point.band" class="mg-v2-meta__status">{{ point.band }}</span>
            <span>{{ point.date }}</span>
          </p>
        </div>
      </div>
      <p class="outcome__note">{{ t('programs.ui.outcomeNote', { scale: scaleLabel }) }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useT } from '@/composables/useT'
import type { AssessmentAttempt, AssessmentId } from '@/domain/assessments'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { useAssessmentStore } from '@/stores/assessment.store'

/**
 * Before/after view of a path's outcome instrument: the first and the
 * latest completed attempt inside this enrollment (only the first while
 * the path is under way). Plain "was / is" — no clinical interpretation.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const { t, locale } = useT()
const assessmentStore = useAssessmentStore()

const assessmentId = computed(() => props.program.outcomeSlug as AssessmentId)
const definition = computed(() => getAssessmentDefinition(assessmentId.value))
const primaryScaleId = computed(
  () => definition.value.sumScoring?.primaryScaleId ?? definition.value.scales[0]?.id ?? 'total',
)
const scaleLabel = computed(() => {
  const scale = definition.value.scales.find((s) => s.id === primaryScaleId.value)
  return scale ? t(scale.labelKey) : ''
})
const namespace = computed(() => definition.value.titleKey.replace(/\.meta\.title$/, ''))

onMounted(() => void assessmentStore.loadAttempts(assessmentId.value))
watch(assessmentId, (id) => void assessmentStore.loadAttempts(id))

const attempts = computed(() =>
  assessmentStore
    .getAttemptsByAssessment(assessmentId.value)
    .filter((a) => a.status === 'completed' && a.completedAt && a.completedAt >= props.enrollment.startedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? '')),
)

function describe(attempt: AssessmentAttempt): { value: string; band: string } {
  const scale = attempt.computedScales?.find((s) => s.scaleId === primaryScaleId.value)
  if (!scale) return { value: '–', band: '' }
  if (definition.value.sumScoring) {
    const total = scale.details?.total
    const max = scale.details?.maxTotal
    const bandId = scale.details?.bandId
    return {
      value: typeof total === 'number' && typeof max === 'number' ? t('assessments.common.results.totalValue', { total, max }) : '–',
      band: typeof bandId === 'string' ? t(`${namespace.value}.bands.${bandId}`) : '',
    }
  }
  return {
    value: scale.rawMean === null ? '–' : scale.rawMean.toFixed(2),
    band: scale.band ? t(`assessments.common.results.bandLabels.${scale.band}`) : '',
  }
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' }) : ''
}

const points = computed(() => {
  const list = attempts.value
  if (list.length === 0) return []
  const first = list[0]!
  const last = list[list.length - 1]!
  const result = [{ key: 'before', label: t('programs.ui.outcomeBefore'), date: formatDate(first.completedAt), ...describe(first) }]
  if (last.id !== first.id) {
    result.push({ key: 'after', label: t('programs.ui.outcomeAfter'), date: formatDate(last.completedAt), ...describe(last) })
  }
  return result
})
</script>

<style scoped>
.outcome {
  display: grid;
  gap: var(--mg-space-3);
  margin-bottom: var(--mg-space-6);
}

.outcome__card {
  display: grid;
  gap: var(--mg-space-3);
  padding: var(--mg-space-4);
}

.outcome__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: var(--mg-space-3);
}

.outcome__cell {
  display: grid;
  gap: var(--mg-space-1);
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-md);
}

.outcome__label {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.outcome__value {
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-lg);
  font-weight: 800;
}

.outcome__note {
  margin: 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
}
</style>
