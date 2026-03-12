import { beforeEach, describe, expect, it } from 'vitest'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'

describe('lifeAreaAssessmentDexieRepository', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.lifeAreaAssessments.clear()
  })

  it('creates and queries assessments across life area and date filters', async () => {
    const db = await connectTestDatabase()
    const firstCreatedAt = '2026-01-10T08:00:00.000Z'
    const secondCreatedAt = '2026-02-15T08:00:00.000Z'

    const first = await lifeAreaAssessmentDexieRepository.create({
      scope: 'full',
      notes: ' January review ',
      lifeAreaIds: ['la-1', 'la-2'],
      items: [
        {
          lifeAreaId: 'la-1',
          lifeAreaNameSnapshot: 'Health',
          score: 6,
          note: '  Building momentum ',
        },
        {
          lifeAreaId: 'la-2',
          lifeAreaNameSnapshot: 'Career',
          score: 7,
        },
      ],
    })

    const second = await lifeAreaAssessmentDexieRepository.create({
      scope: 'full',
      notes: 'February review',
      lifeAreaIds: ['la-1', 'la-3'],
      items: [
        {
          lifeAreaId: 'la-1',
          lifeAreaNameSnapshot: 'Health',
          score: 8,
          visionSnapshot: 'Run three times a week',
        },
        {
          lifeAreaId: 'la-3',
          lifeAreaNameSnapshot: 'Relationships',
          score: 5,
        },
      ],
    })

    await db.lifeAreaAssessments.update(first.id, {
      createdAt: firstCreatedAt,
      updatedAt: firstCreatedAt,
    })
    await db.lifeAreaAssessments.update(second.id, {
      createdAt: secondCreatedAt,
      updatedAt: secondCreatedAt,
    })

    const latest = await lifeAreaAssessmentDexieRepository.getLatest()
    const latestForLifeArea = await lifeAreaAssessmentDexieRepository.getLatestForLifeArea('la-1')
    const previousForLifeArea = await lifeAreaAssessmentDexieRepository.getPreviousForLifeArea(
      'la-1',
      secondCreatedAt,
    )
    const byLifeArea = await lifeAreaAssessmentDexieRepository.getByLifeArea('la-1')
    const byDateRange = await lifeAreaAssessmentDexieRepository.getByDateRange(
      '2026-02-01',
      '2026-02-28',
    )
    const persistedFirst = await lifeAreaAssessmentDexieRepository.getById(first.id)

    expect(latest?.id).toBe(second.id)
    expect(latestForLifeArea?.id).toBe(second.id)
    expect(previousForLifeArea?.id).toBe(first.id)
    expect(byLifeArea.map((assessment) => assessment.id)).toEqual([second.id, first.id])
    expect(byDateRange.map((assessment) => assessment.id)).toEqual([second.id])
    expect(persistedFirst?.notes).toBe('January review')
    expect(persistedFirst?.items[0].note).toBe('Building momentum')
  })
})
