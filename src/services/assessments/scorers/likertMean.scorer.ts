import type { AssessmentComputation } from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import { computeLikertScale, meanOfValues, responseByItemId } from './shared'

/**
 * Generic Likert-mean scorer: every definition scale is the mean of its
 * items (reverse keys applied, 80% imputation per the missing-data policy).
 * Used by SCS-SF (Raes et al. 2011), whose recommended score is the mean of
 * all 12 items on 1–5.
 */
export class LikertMeanScorer implements AssessmentScorer {
  score(input: ScoringInput): AssessmentComputation {
    const { definition, responses, previousAttempt } = input
    const responsesMap = responseByItemId(responses)

    let completedWithMissingData = false
    let missingItemCount = 0

    const scaleScores = definition.scales.map((scale) => {
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
      return result.score
    })

    const scoredWithDeltas = attachDeltas(scaleScores, previousAttempt)

    return {
      computedScales: scoredWithDeltas,
      overallSummary: {
        completedScaleCount: scoredWithDeltas.filter((scale) => scale.normalizedMean !== null).length,
        totalScaleCount: scoredWithDeltas.length,
        meanOfMeans: meanOfValues(scoredWithDeltas.map((scale) => scale.normalizedMean)),
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

export const scsSfScorer = new LikertMeanScorer()
