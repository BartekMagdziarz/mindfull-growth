import type { AssessmentComputation, ScaleScore } from '@/domain/assessments'
import type { AssessmentScorer, ScoringInput } from '@/services/assessments/types'
import { attachDeltas } from './withDeltas'
import { deriveBand, meanOfValues, responseByItemId, round } from './shared'

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export class VlqScorer implements AssessmentScorer {
  score(input: ScoringInput): AssessmentComputation {
    const { definition, responses, previousAttempt } = input
    const responsesMap = responseByItemId(responses)
    const itemsById = new Map(definition.items.map((item) => [item.id, item]))

    let missingItemCount = 0

    const scaleScores: ScaleScore[] = definition.scales.map((scale) => {
      let importance: number | null = null
      let consistency: number | null = null
      let answeredCount = 0

      for (const itemId of scale.itemIds) {
        const item = itemsById.get(itemId)
        const response = responsesMap.get(itemId)

        if (!item || !response) {
          missingItemCount += 1
          continue
        }

        answeredCount += 1

        if (item.metric === 'importance') {
          importance = response.responseValue
        } else if (item.metric === 'consistency') {
          consistency = response.responseValue
        }
      }

      if (importance === null || consistency === null) {
        return {
          scaleId: scale.id,
          labelKey: scale.labelKey,
          answeredCount,
          itemCount: scale.itemIds.length,
          rawMean: null,
          normalizedMean: null,
          details: {
            importance,
            consistency,
            gap: null,
            weighted: null,
          },
        }
      }

      const gap = round(importance - consistency)
      const weighted = round(importance * consistency)

      return {
        scaleId: scale.id,
        labelKey: scale.labelKey,
        answeredCount,
        itemCount: scale.itemIds.length,
        rawMean: round(consistency),
        normalizedMean: round(consistency),
        band: deriveBand(consistency, definition.interpretationScale),
        details: {
          importance: round(importance),
          consistency: round(consistency),
          gap,
          weighted,
        },
      }
    })

    const scoredWithDeltas = attachDeltas(scaleScores, previousAttempt)

    const completedScales = scoredWithDeltas.filter((scale) => scale.normalizedMean !== null)
    const completedScaleCount = completedScales.length
    const totalScaleCount = scoredWithDeltas.length
    const hasOverallSummary = completedScaleCount >= 8

    const topValues = hasOverallSummary
      ? [...completedScales]
          .map((scale) => ({
            scaleId: scale.scaleId,
            value: asNumber(scale.details?.importance) ?? -Infinity,
          }))
          .filter((entry) => Number.isFinite(entry.value))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3)
      : undefined

    const biggestGaps = hasOverallSummary
      ? [...completedScales]
          .map((scale) => ({
            scaleId: scale.scaleId,
            gap: asNumber(scale.details?.gap) ?? -Infinity,
          }))
          .filter((entry) => Number.isFinite(entry.gap) && entry.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
      : undefined

    return {
      computedScales: scoredWithDeltas,
      overallSummary: {
        completedScaleCount,
        totalScaleCount,
        meanOfMeans: hasOverallSummary
          ? meanOfValues(scoredWithDeltas.map((scale) => scale.normalizedMean))
          : null,
        topValues,
        biggestGaps,
      },
      scoringComputationMetadata: {
        centeredScoringEnabled: false,
        completedWithMissingData: missingItemCount > 0,
        missingItemCount,
        scoringTimestamp: new Date().toISOString(),
      },
    }
  }
}

export const vlqScorer = new VlqScorer()
