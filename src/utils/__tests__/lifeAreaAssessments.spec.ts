import { describe, expect, it } from 'vitest'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import {
  filterLifeAreaAssessmentsByDateRange,
  getLatestLifeAreaAssessmentForLifeArea,
  getLifeAreaAssessmentDelta,
  getLifeAreaAssessmentHistoryEntries,
  getPreviousLifeAreaAssessmentForLifeArea,
} from '@/utils/lifeAreaAssessments'

const january: LifeAreaAssessment = {
  id: 'assessment-1',
  createdAt: '2026-01-10T08:00:00.000Z',
  updatedAt: '2026-01-10T08:00:00.000Z',
  scope: 'full',
  lifeAreaIds: ['la-1', 'la-2'],
  items: [
    { lifeAreaId: 'la-1', lifeAreaNameSnapshot: 'Health', score: 5 },
    { lifeAreaId: 'la-2', lifeAreaNameSnapshot: 'Career', score: 7 },
  ],
}

const february: LifeAreaAssessment = {
  id: 'assessment-2',
  createdAt: '2026-02-10T08:00:00.000Z',
  updatedAt: '2026-02-10T08:00:00.000Z',
  scope: 'full',
  lifeAreaIds: ['la-1', 'la-3'],
  items: [
    { lifeAreaId: 'la-1', lifeAreaNameSnapshot: 'Health & Fitness', score: 8 },
    { lifeAreaId: 'la-3', lifeAreaNameSnapshot: 'Relationships', score: 4 },
  ],
}

describe('lifeAreaAssessments helpers', () => {
  it('keeps comparison stable by lifeAreaId even when names change or areas differ', () => {
    const assessments = [january, february]

    const history = getLifeAreaAssessmentHistoryEntries(assessments, 'la-1')
    const latest = getLatestLifeAreaAssessmentForLifeArea(assessments, 'la-1')
    const previous = getPreviousLifeAreaAssessmentForLifeArea(
      assessments,
      'la-1',
      february.createdAt,
    )
    const delta = getLifeAreaAssessmentDelta(february, january, 'la-1')
    const noOverlapDelta = getLifeAreaAssessmentDelta(february, january, 'la-3')

    expect(history.map((entry) => entry.assessment.id)).toEqual(['assessment-2', 'assessment-1'])
    expect(latest?.id).toBe('assessment-2')
    expect(previous?.id).toBe('assessment-1')
    expect(delta).toBe(3)
    expect(noOverlapDelta).toBeNull()
  })

  it('filters assessments by ISO date range', () => {
    const results = filterLifeAreaAssessmentsByDateRange(
      [january, february],
      '2026-02-01',
      '2026-02-28',
    )

    expect(results.map((assessment) => assessment.id)).toEqual(['assessment-2'])
  })
})
