import { describe, expect, it } from 'vitest'
import type { AssessmentAttempt, AssessmentId, AssessmentResponse } from '@/domain/assessments'
import { getAssessmentRegistryEntry } from '@/services/assessments/registry'
import { sumBandFor } from '../sum.scorer'

function responsesFor(id: AssessmentId, values: Record<string, number>): AssessmentResponse[] {
  const { definition } = getAssessmentRegistryEntry(id)
  return Object.entries(values).map(([itemId, responseValue]) => {
    const item = definition.items.find((candidate) => candidate.id === itemId)!
    return {
      id: `r-${itemId}`,
      attemptId: 'a1',
      assessmentId: id,
      itemId,
      responseValue,
      reverseFlagAtTime: item.reverse,
      scoringKeyVersion: definition.scoringKeyVersion,
      answeredAt: '2026-09-23T10:00:00.000Z',
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
    }
  })
}

function allItems(id: AssessmentId, value: number): Record<string, number> {
  const { definition } = getAssessmentRegistryEntry(id)
  return Object.fromEntries(definition.items.map((item) => [item.id, value]))
}

function score(id: AssessmentId, values: Record<string, number>, previousAttempt?: AssessmentAttempt) {
  const { definition, scorer } = getAssessmentRegistryEntry(id)
  return scorer.score({ definition, responses: responsesFor(id, values), previousAttempt })
}

describe('GAD-7 sum scoring', () => {
  it('sums 0–3 answers to a 0–21 total with the published bands', () => {
    const result = score('gad-7', allItems('gad-7', 1))
    const total = result.computedScales[0]!
    expect(total.details).toMatchObject({ total: 7, minTotal: 0, maxTotal: 21, bandId: 'mild' })
    expect(total.normalizedMean).toBe(7)
    expect(result.overallSummary.details).toMatchObject({ primaryTotal: 7, primaryBandId: 'mild' })
  })

  it('maps the 5 / 10 / 15 cut-offs', () => {
    const config = getAssessmentRegistryEntry('gad-7').definition.sumScoring!
    expect(sumBandFor(config, 4)).toBe('minimal')
    expect(sumBandFor(config, 5)).toBe('mild')
    expect(sumBandFor(config, 10)).toBe('moderate')
    expect(sumBandFor(config, 15)).toBe('severe')
    expect(sumBandFor(config, 21)).toBe('severe')
    expect(config.notice?.minTotal).toBe(10)
  })

  it('imputes one missing item from the mean (6 of 7 answered)', () => {
    const values = allItems('gad-7', 2)
    delete values.gad7_07
    const total = score('gad-7', values).computedScales[0]!
    expect(total.details?.total).toBe(14)
    expect(total.answeredCount).toBe(6)
  })

  it('refuses to score below the minimum answered', () => {
    const total = score('gad-7', { gad7_01: 3, gad7_02: 3 }).computedScales[0]!
    expect(total.details?.total).toBeNull()
    expect(total.details?.bandId).toBeUndefined()
  })

  it('reports the change in total against the previous attempt', () => {
    const first = score('gad-7', allItems('gad-7', 2))
    const previous = { computedScales: first.computedScales } as AssessmentAttempt
    const second = score('gad-7', allItems('gad-7', 1), previous)
    expect(second.computedScales[0]!.deltaFromPrevious).toBe(-7)
  })
})

describe('anger barometer and IUS-12', () => {
  it('anger barometer runs 5–25 with orientative bands from 12 and 18', () => {
    expect(score('anger-barometer', allItems('anger-barometer', 1)).computedScales[0]!.details).toMatchObject({
      total: 5,
      bandId: 'low',
    })
    expect(score('anger-barometer', allItems('anger-barometer', 3)).computedScales[0]!.details).toMatchObject({
      total: 15,
      bandId: 'elevated',
    })
    expect(score('anger-barometer', allItems('anger-barometer', 4)).computedScales[0]!.details).toMatchObject({
      total: 20,
      bandId: 'high',
    })
  })

  it('IUS-12 totals 12–60 with prospective (7) and inhibitory (5) subscales and no bands', () => {
    const scales = score('ius-12', allItems('ius-12', 3)).computedScales
    const byId = Object.fromEntries(scales.map((scale) => [scale.scaleId, scale.details]))
    expect(byId.total).toMatchObject({ total: 36, minTotal: 12, maxTotal: 60 })
    expect(byId.prospective).toMatchObject({ total: 21, maxTotal: 35 })
    expect(byId.inhibitory).toMatchObject({ total: 15, maxTotal: 25 })
    expect(byId.total?.bandId).toBeUndefined()
  })
})

describe('SCS-SF mean scoring', () => {
  it('reverses the six negative items (OI, I, SJ) before averaging', () => {
    const { definition } = getAssessmentRegistryEntry('scs-sf')
    const reversed = definition.items.filter((item) => item.reverse).map((item) => item.id)
    expect(reversed.sort()).toEqual(['scs_01', 'scs_04', 'scs_08', 'scs_09', 'scs_11', 'scs_12'])

    // Kind answers on positive items (5) and "almost never" on negative ones (1) → maximal self-compassion.
    const values = Object.fromEntries(
      definition.items.map((item) => [item.id, item.reverse ? 1 : 5]),
    )
    const total = score('scs-sf', values).computedScales[0]!
    expect(total.rawMean).toBe(5)
    expect(total.band).toBe('high')
  })

  it('uses Neff bands: < 2.5 low, ≤ 3.5 moderate', () => {
    const total = score('scs-sf', allItems('scs-sf', 3)).computedScales[0]!
    // Neutral 3 everywhere stays 3 after reversing.
    expect(total.rawMean).toBe(3)
    expect(total.band).toBe('medium')
  })
})
