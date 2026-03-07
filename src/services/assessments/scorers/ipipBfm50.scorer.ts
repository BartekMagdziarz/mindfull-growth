import type { AssessmentComputation } from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import {
  computeLikertScale,
  meanOfValues,
  responseByItemId,
} from './shared'

export class IpipBfm50Scorer implements AssessmentScorer {
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
    const meanOfMeans = meanOfValues(scoredWithDeltas.map((scale) => scale.normalizedMean))

    return {
      computedScales: scoredWithDeltas,
      overallSummary: {
        completedScaleCount: scoredWithDeltas.filter((scale) => scale.normalizedMean !== null).length,
        totalScaleCount: scoredWithDeltas.length,
        meanOfMeans,
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

export const ipipBfm50Scorer = new IpipBfm50Scorer()
