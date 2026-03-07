import type {
  AssessmentDefinition,
  AssessmentItemDefinition,
  AssessmentResponse,
  ScaleBand,
  ScaleScore,
} from '@/domain/assessments'

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function responseByItemId(
  responses: AssessmentResponse[],
): Map<string, AssessmentResponse> {
  return new Map(responses.map((response) => [response.itemId, response]))
}

export function reverseScore(raw: number, min: number, max: number): number {
  return min + max - raw
}

export function applyReverse(
  item: AssessmentItemDefinition,
  raw: number,
  reverseFlagAtTime?: boolean,
): number {
  const shouldReverse = reverseFlagAtTime ?? item.reverse
  return shouldReverse ? reverseScore(raw, item.responseMin, item.responseMax) : raw
}

export function deriveBand(value: number | null, interpretationScale: '1-5' | '1-6' | '0-10'):
  | ScaleBand
  | undefined {
  if (value === null) return undefined

  if (interpretationScale === '1-5') {
    if (value < 2.5) return 'low'
    if (value <= 3.5) return 'medium'
    return 'high'
  }

  if (interpretationScale === '1-6') {
    if (value < 3) return 'low'
    if (value <= 4) return 'medium'
    return 'high'
  }

  if (value < 4) return 'low'
  if (value <= 7) return 'medium'
  return 'high'
}

export interface ScaleComputation {
  score: ScaleScore
  completedWithMissingData: boolean
  missingCount: number
}

export function computeLikertScale(
  definition: AssessmentDefinition,
  scaleId: string,
  labelKey: string,
  itemIds: string[],
  minAnswered: number,
  responsesMap: Map<string, AssessmentResponse>,
): ScaleComputation {
  const itemsById = new Map(definition.items.map((item) => [item.id, item]))
  const values: number[] = []
  const missingItemIds: string[] = []

  for (const itemId of itemIds) {
    const response = responsesMap.get(itemId)
    if (!response) {
      missingItemIds.push(itemId)
      continue
    }
    const item = itemsById.get(itemId)
    if (!item) {
      missingItemIds.push(itemId)
      continue
    }
    values.push(applyReverse(item, response.responseValue, response.reverseFlagAtTime))
  }

  const answeredCount = values.length
  const itemCount = itemIds.length
  const missingCount = itemCount - answeredCount

  if (answeredCount < minAnswered || answeredCount === 0) {
    return {
      score: {
        scaleId,
        labelKey,
        answeredCount,
        itemCount,
        rawMean: null,
        normalizedMean: null,
      },
      completedWithMissingData: false,
      missingCount,
    }
  }

  const answeredMean = values.reduce((sum, value) => sum + value, 0) / answeredCount
  const imputedValues =
    missingCount > 0 && definition.missingDataPolicy.imputeWithScaleMean
      ? [...values, ...Array.from({ length: missingCount }, () => answeredMean)]
      : [...values]

  const rawMean = imputedValues.reduce((sum, value) => sum + value, 0) / imputedValues.length

  return {
    score: {
      scaleId,
      labelKey,
      answeredCount,
      itemCount,
      rawMean: round(rawMean),
      normalizedMean: round(rawMean),
      band: deriveBand(rawMean, definition.interpretationScale),
    },
    completedWithMissingData: missingCount > 0,
    missingCount,
  }
}

export function meanOfValues(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => value !== null)
  if (filtered.length === 0) return null
  return round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length)
}
