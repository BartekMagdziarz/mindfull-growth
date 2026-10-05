<template>
  <section v-if="series.length" class="outcome" :aria-label="t('programs.ui.outcomeTitle')">
    <div class="mg-v2-section-head">
      <h2>{{ t('programs.ui.outcomeTitle') }}</h2>
    </div>
    <div
      v-for="instrument in series"
      :key="instrument.id"
      class="mg-v2-surface mg-v2-surface--raised-sm outcome__card"
      :aria-label="instrument.title"
    >
      <h3 class="outcome__instrument">{{ instrument.title }}</h3>
      <div class="outcome__table" role="table">
        <div class="outcome__row outcome__row--head" role="row">
          <span class="outcome__scale" role="columnheader" />
          <span
            v-for="point in instrument.points"
            :key="point.key"
            class="outcome__label"
            :class="{ 'is-pending': !point.attempt }"
            role="columnheader"
          >
            {{ point.label }}
            <small v-if="point.date" class="outcome__date">{{ point.date }}</small>
          </span>
        </div>
        <div v-for="row in instrument.rows" :key="row.scaleId" class="outcome__row" role="row">
          <span class="outcome__scale" role="rowheader">{{ row.label }}</span>
          <span
            v-for="cell in row.cells"
            :key="cell.key"
            class="mg-v2-surface mg-v2-surface--flat outcome__cell"
            :class="{ 'is-pending': cell.pending }"
            role="cell"
          >
            <span class="outcome__value">{{ cell.value }}</span>
            <span v-if="cell.band" class="mg-v2-meta__status">{{ cell.band }}</span>
          </span>
        </div>
      </div>
    </div>
    <p class="outcome__note">{{ t('programs.ui.outcomeNote', { scale: noteScale }) }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useT } from '@/composables/useT'
import type { AssessmentAttempt, AssessmentDefinition, AssessmentId, ScaleScore } from '@/domain/assessments'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { useAssessmentStore } from '@/stores/assessment.store'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * The path's measurements as series: one table per outcome instrument,
 * one column per STEP that takes it (labelled by the step's phase — start ·
 * połowa · koniec · powrót), one row per scale. A column is filled from the
 * attempt recorded on that step (`completedSteps[].recordId`), so retakes
 * outside the path never show up here; columns not reached yet stay as
 * empty slots, which makes the measurement rhythm visible ahead of time.
 * Plain "was / is" — no clinical interpretation.
 */
const props = defineProps<{
  program: ProgramDefinition
  enrollment: ProgramEnrollment
}>()

const { t, locale } = useT()
const assessmentStore = useAssessmentStore()

const instrumentIds = computed<AssessmentId[]>(() => {
  const ids = props.program.outcomeSlugs ?? (props.program.outcomeSlug ? [props.program.outcomeSlug] : [])
  return ids as AssessmentId[]
})

onMounted(() => instrumentIds.value.forEach((id) => void assessmentStore.loadAttempts(id)))
watch(instrumentIds, (ids) => ids.forEach((id) => void assessmentStore.loadAttempts(id)))

interface OutcomePoint {
  key: string
  stepIndex: number
  label: string
  date: string
  attempt: AssessmentAttempt | undefined
}

interface OutcomeCell {
  key: string
  value: string
  band: string
  pending: boolean
}

interface OutcomeRow {
  scaleId: string
  label: string
  cells: OutcomeCell[]
}

interface OutcomeSeries {
  id: AssessmentId
  title: string
  points: OutcomePoint[]
  rows: OutcomeRow[]
}

/** A path may name a scale in plain words (`<i18nKey>.scaleLabels.<scaleId>`); else the instrument's label. */
function scaleLabel(scaleId: string, labelKey: string): string {
  const key = `${props.program.i18nKey}.scaleLabels.${scaleId}`
  const value = t(key)
  return value === key ? t(labelKey) : value
}

/** Phase title of a step, or the legacy before/after labels for paths without phases. */
function pointLabel(stepIndex: number, ordinal: number): string {
  const phases = props.program.phases ?? []
  const phase = [...phases].reverse().find((candidate) => candidate.fromStepIndex <= stepIndex)
  if (phase) return t(`${props.program.i18nKey}.phases.${phase.key}.title`)
  return ordinal === 0 ? t('programs.ui.outcomeBefore') : t('programs.ui.outcomeAfter')
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' }) : ''
}

/** The attempt a completed step recorded: by id, else the one completed the same local day. */
function attemptForStep(attempts: AssessmentAttempt[], stepIndex: number): AssessmentAttempt | undefined {
  const completed = props.enrollment.completedSteps.find((step) => step.stepIndex === stepIndex)
  if (!completed) return undefined
  const byId = completed.recordId ? attempts.find((attempt) => attempt.id === completed.recordId) : undefined
  if (byId) return byId
  const day = getPeriodRefsForDate(completed.completedAt).day
  return attempts.find(
    (attempt) =>
      attempt.status === 'completed' && attempt.completedAt && getPeriodRefsForDate(attempt.completedAt).day === day,
  )
}

function describeScale(definition: AssessmentDefinition, scale: ScaleScore | undefined): { value: string; band: string } {
  if (!scale) return { value: '–', band: '' }
  if (definition.sumScoring) {
    const total = scale.details?.total
    const max = scale.details?.maxTotal
    const bandId = scale.details?.bandId
    const namespace = definition.titleKey.replace(/\.meta\.title$/, '')
    return {
      value:
        typeof total === 'number' && typeof max === 'number'
          ? t('assessments.common.results.totalValue', { total, max })
          : '–',
      band: typeof bandId === 'string' ? t(`${namespace}.bands.${bandId}`) : '',
    }
  }
  return {
    value: scale.rawMean === null ? '–' : scale.rawMean.toFixed(2),
    band: scale.band ? t(`assessments.common.results.bandLabels.${scale.band}`) : '',
  }
}

const series = computed<OutcomeSeries[]>(() =>
  instrumentIds.value.flatMap((id) => {
    let definition: AssessmentDefinition
    try {
      definition = getAssessmentDefinition(id)
    } catch {
      return []
    }
    const stepIndices = props.program.steps
      .map((step, index) => (step.exerciseSlug === id ? index : -1))
      .filter((index) => index >= 0)
    if (stepIndices.length === 0) return []
    const attempts = assessmentStore.getAttemptsByAssessment(id)
    const points: OutcomePoint[] = stepIndices.map((stepIndex, ordinal) => {
      const attempt = attemptForStep(attempts, stepIndex)
      return {
        key: `${id}-${stepIndex}`,
        stepIndex,
        label: pointLabel(stepIndex, ordinal),
        date: formatDate(attempt?.completedAt),
        attempt,
      }
    })
    // Sum-scored instruments have one meaningful scale; mean-scored ones show every scale.
    const scales = definition.sumScoring
      ? definition.scales.filter((scale) => scale.id === definition.sumScoring!.primaryScaleId)
      : definition.scales
    const rows: OutcomeRow[] = scales.map((scale) => ({
      scaleId: scale.id,
      label: scaleLabel(scale.id, scale.labelKey),
      cells: points.map((point) => {
        const score = point.attempt?.computedScales?.find((candidate) => candidate.scaleId === scale.id)
        const described = describeScale(definition, score)
        return { key: `${point.key}-${scale.id}`, pending: !point.attempt, ...described }
      }),
    }))
    return [{ id, title: t(definition.titleKey), points, rows }]
  }),
)

/** The note names the first instrument's scale, as before (one instrument = unchanged copy). */
const noteScale = computed(() => series.value[0]?.rows[0]?.label ?? '')
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

.outcome__instrument {
  margin: 0;
  font-size: var(--mg-font-size-sm);
  font-weight: 700;
}

.outcome__table {
  display: grid;
  gap: var(--mg-space-2);
  overflow-x: auto;
}

.outcome__row {
  display: grid;
  grid-template-columns: minmax(7rem, 1.2fr) repeat(auto-fit, minmax(5.5rem, 1fr));
  gap: var(--mg-space-2);
  align-items: stretch;
}

.outcome__scale {
  align-self: center;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.outcome__label {
  display: grid;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

.outcome__label.is-pending {
  opacity: 0.6;
}

.outcome__date {
  font-weight: 500;
}

.outcome__cell {
  display: grid;
  gap: 2px;
  padding: var(--mg-space-2) var(--mg-space-3);
  border-radius: var(--mg-radius-md);
}

.outcome__cell.is-pending {
  opacity: 0.55;
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
