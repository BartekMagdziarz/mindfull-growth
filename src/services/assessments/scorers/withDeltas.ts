import type { AssessmentAttempt, ScaleScore } from '@/domain/assessments'

export type DeltaCompareMode = 'raw' | 'normalized'

export function attachDeltas(
  current: ScaleScore[],
  previousAttempt?: AssessmentAttempt,
  compareMode: DeltaCompareMode = 'normalized',
): ScaleScore[] {
  if (!previousAttempt?.computedScales?.length) return current

  const previousMap = new Map<string, number | null>(
    previousAttempt.computedScales.map((scale) => [
      scale.scaleId,
      compareMode === 'raw' ? scale.rawMean : (scale.normalizedMean ?? scale.rawMean),
    ]),
  )

  return current.map((scale) => {
    const prev = previousMap.get(scale.scaleId)
    const currentValue =
      compareMode === 'raw' ? scale.rawMean : (scale.normalizedMean ?? scale.rawMean)
    if (prev === undefined || prev === null || currentValue === null) {
      return scale
    }
    return {
      ...scale,
      deltaFromPrevious: Math.round((currentValue - prev) * 1000) / 1000,
    }
  })
}
