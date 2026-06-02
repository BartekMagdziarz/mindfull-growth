import type { AssessmentComputation } from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import { computeLikertScale, meanOfValues, responseByItemId } from './shared'

/**
 * RRQ (Rumination-Reflection Questionnaire, Trapnell & Campbell 1999): two
 * trait self-attention scales — rumination and reflection — each a Likert mean
 * on a 1–5 scale, with several reverse-keyed items handled per-item by
 * `computeLikertScale`.
 */
export class RrqScorer implements AssessmentScorer {
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

export const rrqScorer = new RrqScorer()
