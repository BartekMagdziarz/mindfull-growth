import type { AssessmentComputation, ScaleScore } from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import {
  computeLikertScale,
  meanOfValues,
  responseByItemId,
  round,
} from './shared'

export class Pvq40Scorer implements AssessmentScorer {
  score(input: ScoringInput): AssessmentComputation {
    const { definition, responses, previousAttempt } = input
    const responsesMap = responseByItemId(responses)

    const centeredEnabled =
      input.centeredScoringEnabled ?? definition.defaultCenteringEnabled ?? false

    const answeredValues = Array.from(responsesMap.values()).map((response) => response.responseValue)
    const mrat = answeredValues.length > 0
      ? answeredValues.reduce((sum, value) => sum + value, 0) / answeredValues.length
      : undefined

    let completedWithMissingData = false
    let missingItemCount = 0

    const rawScaleScores = definition.scales.map((scale) => {
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

    const transformed: ScaleScore[] = rawScaleScores.map((score) => {
      const normalizedMean =
        centeredEnabled && score.rawMean !== null && mrat !== undefined
          ? round(score.rawMean - mrat)
          : score.rawMean

      return {
        ...score,
        normalizedMean,
        details: {
          centeredEnabled,
          mrat: mrat !== undefined ? round(mrat) : null,
        },
      }
    })

    const scoredWithDeltas = attachDeltas(
      transformed,
      previousAttempt,
      centeredEnabled ? 'normalized' : 'raw',
    )

    const ranked = [...scoredWithDeltas]
      .filter((scale) => scale.normalizedMean !== null)
      .sort((a, b) => (b.normalizedMean ?? -Infinity) - (a.normalizedMean ?? -Infinity))

    return {
      computedScales: scoredWithDeltas,
      overallSummary: {
        completedScaleCount: scoredWithDeltas.filter((scale) => scale.normalizedMean !== null).length,
        totalScaleCount: scoredWithDeltas.length,
        meanOfMeans: meanOfValues(scoredWithDeltas.map((scale) => scale.rawMean)),
        topValues: ranked.slice(0, 3).map((scale) => ({
          scaleId: scale.scaleId,
          value: scale.normalizedMean ?? 0,
        })),
        details: {
          centeredEnabled,
        },
      },
      scoringComputationMetadata: {
        centeredScoringEnabled: centeredEnabled,
        mrat: mrat !== undefined ? round(mrat) : undefined,
        completedWithMissingData,
        missingItemCount,
        scoringTimestamp: new Date().toISOString(),
      },
    }
  }
}

export const pvq40Scorer = new Pvq40Scorer()
