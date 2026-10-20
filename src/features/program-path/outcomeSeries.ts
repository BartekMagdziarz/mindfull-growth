import type {
  AssessmentAttempt,
  AssessmentDefinition,
  AssessmentId,
  ScaleScore,
} from '@/domain/assessments'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * The path's measurements as series: one per outcome instrument, one
 * POINT per step that takes it (labelled by the step's phase — start ·
 * połowa · koniec · powrót), one TRACK per scale. A point is filled from
 * the attempt recorded on that step (`completedSteps[].recordId`, else the
 * attempt completed the same local day), so retakes outside the path never
 * show up; points not reached yet stay empty, which makes the measurement
 * rhythm visible ahead of time. Plain "was / is" — no clinical reading.
 */

export interface OutcomePoint {
  key: string
  stepIndex: number
  label: string
  date: string
  attempt: AssessmentAttempt | undefined
}

export interface OutcomeTrack {
  scaleId: string
  label: string
  /** The scale's range (sum-scored: 0…maxTotal; mean-scored: the response scale). */
  min: number
  max: number
  /** One value per point; null where the step was not measured yet. */
  values: Array<number | null>
  /** Display text per point ("12 / 36", "2,80", "–"). */
  texts: string[]
}

export interface OutcomeSeries {
  id: AssessmentId
  title: string
  points: OutcomePoint[]
  tracks: OutcomeTrack[]
}

export interface OutcomeSeriesInput {
  program: ProgramDefinition
  enrollment: ProgramEnrollment
  attemptsFor: (id: AssessmentId) => AssessmentAttempt[]
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
}

function formatDate(iso: string | undefined, locale: string): string {
  return iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''
}

/** The attempt a completed step recorded: by id, else the one completed the same local day. */
function attemptForStep(
  enrollment: ProgramEnrollment,
  attempts: AssessmentAttempt[],
  stepIndex: number
): AssessmentAttempt | undefined {
  const completed = enrollment.completedSteps.find(step => step.stepIndex === stepIndex)
  if (!completed) return undefined
  const byId = completed.recordId
    ? attempts.find(attempt => attempt.id === completed.recordId)
    : undefined
  if (byId) return byId
  const day = getPeriodRefsForDate(completed.completedAt).day
  return attempts.find(
    attempt =>
      attempt.status === 'completed' &&
      attempt.completedAt &&
      getPeriodRefsForDate(attempt.completedAt).day === day
  )
}

/**
 * A path may name a scale in plain words: `<i18nKey>.scaleLabels.<instrumentId>.<scaleId>`
 * when the path measures several instruments sharing a scale id (GAD-7 and
 * IUS-12 both have `total`), else `<i18nKey>.scaleLabels.<scaleId>`; else the
 * instrument's own label.
 */
function scaleLabel(
  input: OutcomeSeriesInput,
  instrumentId: string,
  scaleId: string,
  labelKey: string
): string {
  for (const key of [
    `${input.program.i18nKey}.scaleLabels.${instrumentId}.${scaleId}`,
    `${input.program.i18nKey}.scaleLabels.${scaleId}`,
  ]) {
    const value = input.t(key)
    if (value !== key && typeof value === 'string') return value
  }
  return input.t(labelKey)
}

/** Phase title of a step, or the legacy before/after labels for paths without phases. */
function pointLabel(input: OutcomeSeriesInput, stepIndex: number, ordinal: number): string {
  const phases = input.program.phases ?? []
  const phase = [...phases].reverse().find(candidate => candidate.fromStepIndex <= stepIndex)
  if (phase) return input.t(`${input.program.i18nKey}.phases.${phase.key}.title`)
  return ordinal === 0 ? input.t('programs.ui.outcomeBefore') : input.t('programs.ui.outcomeAfter')
}

function describe(
  input: OutcomeSeriesInput,
  definition: AssessmentDefinition,
  scale: ScaleScore | undefined
): { value: number | null; text: string } {
  if (!scale) return { value: null, text: '–' }
  if (definition.sumScoring) {
    const total = scale.details?.total
    const max = scale.details?.maxTotal
    return typeof total === 'number' && typeof max === 'number'
      ? { value: total, text: input.t('assessments.common.results.totalValue', { total, max }) }
      : { value: null, text: '–' }
  }
  return scale.rawMean === null
    ? { value: null, text: '–' }
    : { value: scale.rawMean, text: scale.rawMean.toFixed(2).replace('.', ',') }
}

export function buildOutcomeSeries(input: OutcomeSeriesInput): OutcomeSeries[] {
  const { program, enrollment } = input
  const ids = (program.outcomeSlugs ??
    (program.outcomeSlug ? [program.outcomeSlug] : [])) as AssessmentId[]
  return ids.flatMap(id => {
    let definition: AssessmentDefinition
    try {
      definition = getAssessmentDefinition(id)
    } catch {
      return []
    }
    const stepIndices = program.steps
      .map((step, index) => (step.exerciseSlug === id ? index : -1))
      .filter(index => index >= 0)
    if (stepIndices.length === 0) return []
    const attempts = input.attemptsFor(id)
    const points: OutcomePoint[] = stepIndices.map((stepIndex, ordinal) => {
      const attempt = attemptForStep(enrollment, attempts, stepIndex)
      return {
        key: `${id}-${stepIndex}`,
        stepIndex,
        label: pointLabel(input, stepIndex, ordinal),
        date: formatDate(attempt?.completedAt, input.locale),
        attempt,
      }
    })
    // Sum-scored instruments have one meaningful scale; mean-scored ones show every scale.
    const scales = definition.sumScoring
      ? definition.scales.filter(scale => scale.id === definition.sumScoring!.primaryScaleId)
      : definition.scales
    const tracks: OutcomeTrack[] = scales.map(scale => {
      const cells = points.map(point => {
        const score = point.attempt?.computedScales?.find(
          candidate => candidate.scaleId === scale.id
        )
        return describe(input, definition, score)
      })
      const maxTotal = points
        .map(
          point =>
            point.attempt?.computedScales?.find(c => c.scaleId === scale.id)?.details?.maxTotal
        )
        .find((value): value is number => typeof value === 'number')
      return {
        scaleId: scale.id,
        label: scaleLabel(input, definition.id, scale.id, scale.labelKey),
        min: definition.sumScoring ? 0 : definition.responseScale.min,
        max: definition.sumScoring
          ? (maxTotal ?? definition.responseScale.max * scale.itemIds.length)
          : definition.responseScale.max,
        values: cells.map(cell => cell.value),
        texts: cells.map(cell => cell.text),
      }
    })
    return [{ id, title: input.t(definition.titleKey), points, tracks }]
  })
}
