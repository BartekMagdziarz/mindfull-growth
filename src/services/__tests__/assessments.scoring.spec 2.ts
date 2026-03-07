import { describe, expect, it } from 'vitest'
import type { AssessmentDefinition, AssessmentResponse } from '@/domain/assessments'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { scoreAssessment } from '@/services/assessments/scoringEngine'

function responseFor(
  definition: AssessmentDefinition,
  itemId: string,
  responseValue: number,
): AssessmentResponse {
  const item = definition.items.find((entry) => entry.id === itemId)
  if (!item) {
    throw new Error(`Unknown item ${itemId}`)
  }

  return {
    id: `${itemId}-response`,
    attemptId: 'attempt-1',
    assessmentId: definition.id,
    itemId,
    responseValue,
    reverseFlagAtTime: item.reverse,
    scoringKeyVersion: definition.scoringKeyVersion,
    answeredAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function responsesFromMap(
  definition: AssessmentDefinition,
  values: Record<string, number>,
): AssessmentResponse[] {
  return Object.entries(values).map(([itemId, value]) => responseFor(definition, itemId, value))
}

describe('assessments scoring', () => {
  it('applies reverse scoring correctly for IPIP-BFM-50', () => {
    const definition = getAssessmentDefinition('ipip-bfm-50')
    const extraversionItems = definition.scales.find((scale) => scale.id === 'extraversion')?.itemIds

    expect(extraversionItems).toBeDefined()

    const responses = responsesFromMap(
      definition,
      Object.fromEntries((extraversionItems ?? []).map((itemId) => [itemId, 1])),
    )

    const result = scoreAssessment({
      assessmentId: definition.id,
      responses,
    })

    const extraversion = result.computedScales.find((scale) => scale.scaleId === 'extraversion')
    expect(extraversion?.normalizedMean).toBe(3)
  })

  it('applies reverse scoring correctly for IPIP-NEO-120 and HEXACO-60', () => {
    const neo = getAssessmentDefinition('ipip-neo-120')
    const hexaco = getAssessmentDefinition('hexaco-60')

    const neoItems = neo.scales.find((scale) => scale.id === 'neuroticism')?.itemIds ?? []
    const hexacoItems = hexaco.scales.find((scale) => scale.id === 'honestyHumility')?.itemIds ?? []

    const neoResult = scoreAssessment({
      assessmentId: neo.id,
      responses: responsesFromMap(neo, Object.fromEntries(neoItems.map((itemId) => [itemId, 1]))),
    })

    const hexacoResult = scoreAssessment({
      assessmentId: hexaco.id,
      responses: responsesFromMap(
        hexaco,
        Object.fromEntries(hexacoItems.map((itemId) => [itemId, 1])),
      ),
    })

    expect(neoResult.computedScales.find((scale) => scale.scaleId === 'neuroticism')?.normalizedMean).toBe(3)
    expect(
      hexacoResult.computedScales.find((scale) => scale.scaleId === 'honestyHumility')?.normalizedMean,
    ).toBe(3)
  })

  it('keeps one-to-one item mapping for scale-scored instruments', () => {
    const definitions = [
      getAssessmentDefinition('ipip-bfm-50'),
      getAssessmentDefinition('ipip-neo-120'),
      getAssessmentDefinition('hexaco-60'),
      getAssessmentDefinition('pvq-40'),
    ]

    for (const definition of definitions) {
      const mappedItemIds = definition.scales.flatMap((scale) => scale.itemIds)

      expect(mappedItemIds.length).toBe(definition.items.length)
      expect(new Set(mappedItemIds).size).toBe(definition.items.length)
    }
  })

  it('handles missing-data boundaries at ~79%, 80%, and 100% for IPIP-NEO-120', () => {
    const definition = getAssessmentDefinition('ipip-neo-120')
    const neuroticismItems = definition.scales.find((scale) => scale.id === 'neuroticism')?.itemIds ?? []

    const values79 = Object.fromEntries(neuroticismItems.slice(0, 18).map((itemId) => [itemId, 3]))
    const values80 = Object.fromEntries(neuroticismItems.slice(0, 19).map((itemId) => [itemId, 3]))
    const values100 = Object.fromEntries(neuroticismItems.map((itemId) => [itemId, 3]))

    const result79 = scoreAssessment({
      assessmentId: definition.id,
      responses: responsesFromMap(definition, values79),
    })
    const result80 = scoreAssessment({
      assessmentId: definition.id,
      responses: responsesFromMap(definition, values80),
    })
    const result100 = scoreAssessment({
      assessmentId: definition.id,
      responses: responsesFromMap(definition, values100),
    })

    const getScore = (result: ReturnType<typeof scoreAssessment>) =>
      result.computedScales.find((scale) => scale.scaleId === 'neuroticism')

    expect(getScore(result79)?.normalizedMean).toBeNull()
    expect(getScore(result80)?.normalizedMean).toBe(3)
    expect(getScore(result100)?.normalizedMean).toBe(3)
  })

  it('keeps PVQ raw means stable while centered means change with MRAT mode', () => {
    const definition = getAssessmentDefinition('pvq-40')

    const responses = definition.items.map((item, index) =>
      responseFor(definition, item.id, (index % 6) + 1),
    )

    const centered = scoreAssessment({
      assessmentId: definition.id,
      responses,
      centeredScoringEnabled: true,
    })
    const raw = scoreAssessment({
      assessmentId: definition.id,
      responses,
      centeredScoringEnabled: false,
    })

    const centeredScale = centered.computedScales[0]
    const rawScale = raw.computedScales[0]

    expect(centeredScale.rawMean).toBe(rawScale.rawMean)
    expect(centeredScale.normalizedMean).not.toBe(rawScale.normalizedMean)
    expect(centered.scoringComputationMetadata.centeredScoringEnabled).toBe(true)
    expect(raw.scoringComputationMetadata.centeredScoringEnabled).toBe(false)
  })

  it('computes VLQ gaps, weighted consistency, and aggregate thresholds', () => {
    const definition = getAssessmentDefinition('vlq')

    const completeDomains = definition.scales.slice(0, 8)
    const incompleteDomains = definition.scales.slice(8)

    const values: Record<string, number> = {}
    for (const scale of completeDomains) {
      for (const itemId of scale.itemIds) {
        if (itemId.endsWith('_importance')) values[itemId] = 8
        if (itemId.endsWith('_consistency')) values[itemId] = 5
      }
    }

    // Leave one answer missing in each of the last two domains.
    for (const scale of incompleteDomains) {
      const importance = scale.itemIds.find((itemId) => itemId.endsWith('_importance'))
      if (importance) {
        values[importance] = 7
      }
    }

    const result = scoreAssessment({
      assessmentId: definition.id,
      responses: responsesFromMap(definition, values),
    })

    const family = result.computedScales.find((scale) => scale.scaleId === 'family')
    expect(family?.details?.gap).toBe(3)
    expect(family?.details?.weighted).toBe(40)

    expect(result.overallSummary.completedScaleCount).toBe(8)
    expect(result.overallSummary.meanOfMeans).not.toBeNull()
    expect((result.overallSummary.topValues ?? []).length).toBeGreaterThan(0)
    expect((result.overallSummary.biggestGaps ?? []).length).toBeGreaterThan(0)
  })
})
