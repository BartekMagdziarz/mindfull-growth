import type {
  AssessmentComputation,
  AssessmentDefinition,
  ScaleScore,
  SumScoringConfig,
} from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import { computeLikertScale, responseByItemId, round } from './shared'

/** Band for a primary total: the last band whose `min` is ≤ the total. */
export function sumBandFor(config: SumScoringConfig, total: number | null): string | undefined {
  if (total === null) return undefined
  let band: string | undefined
  for (const candidate of config.bands) {
    if (total >= candidate.min) band = candidate.id
  }
  return band
}

function itemRange(definition: AssessmentDefinition, itemIds: string[]) {
  const items = definition.items.filter((item) => itemIds.includes(item.id))
  return {
    min: items.reduce((sum, item) => sum + item.responseMin, 0),
    max: items.reduce((sum, item) => sum + item.responseMax, 0),
  }
}

/**
 * Symptom-style sum scoring (GAD-7, IUS-12, anger barometer).
 *
 * Each scale's total = item mean × item count, so the 80% imputation of the
 * missing-data policy carries over from the Likert helper. `normalizedMean`
 * holds the TOTAL (deltas then compare totals); `rawMean` keeps the item
 * mean. `details` carries `total`, `minTotal`, `maxTotal` and, on the
 * primary scale, `bandId`.
 */
export class SumScorer implements AssessmentScorer {
  score(input: ScoringInput): AssessmentComputation {
    const { definition, responses, previousAttempt } = input
    const config = definition.sumScoring
    if (!config) throw new Error(`${definition.id} has no sumScoring config`)
    const responsesMap = responseByItemId(responses)

    let completedWithMissingData = false
    let missingItemCount = 0

    const scaleScores: ScaleScore[] = definition.scales.map((scale) => {
      const result = computeLikertScale(
        definition,
        scale.id,
        scale.labelKey,
        scale.itemIds,
        scale.minAnswered,
        responsesMap,
      )
      completedWithMissingData ||= result.completedWithMissingData
      missingItemCount += result.missingCount

      const mean = result.score.rawMean
      const total = mean === null ? null : Math.round(mean * scale.itemIds.length)
      const range = itemRange(definition, scale.itemIds)
      const bandId = scale.id === config.primaryScaleId ? sumBandFor(config, total) : undefined

      return {
        scaleId: scale.id,
        labelKey: scale.labelKey,
        answeredCount: result.score.answeredCount,
        itemCount: result.score.itemCount,
        rawMean: mean === null ? null : round(mean),
        normalizedMean: total,
        details: {
          total,
          minTotal: range.min,
          maxTotal: range.max,
          ...(bandId ? { bandId } : {}),
        },
      }
    })

    const scoredWithDeltas = attachDeltas(scaleScores, previousAttempt)
    const primary = scoredWithDeltas.find((scale) => scale.scaleId === config.primaryScaleId)

    return {
      computedScales: scoredWithDeltas,
      overallSummary: {
        completedScaleCount: scoredWithDeltas.filter((scale) => scale.normalizedMean !== null).length,
        totalScaleCount: scoredWithDeltas.length,
        meanOfMeans: null,
        details: {
          primaryTotal: primary?.normalizedMean ?? null,
          primaryBandId: (primary?.details?.bandId as string | undefined) ?? null,
        },
      },
      scoringComputationMetadata: {
        centeredScoringEnabled: false,
        completedWithMissingData,
        missingItemCount,
        scoringTimestamp: new Date().toISOString(),
      },
    }
  }
}

export const sumScorer = new SumScorer()
