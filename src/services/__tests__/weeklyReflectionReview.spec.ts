import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, WeekRef } from '@/domain/period'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { getWeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { createWeeklyIntention } from '@/services/weeklyIntentionService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getPeriodBounds, parsePeriodRef } from '@/utils/periods'

const WEEK = parsePeriodRef('2026-W10') as WeekRef
const WEEK_END = getPeriodBounds(WEEK).end as DayRef

function makeIntention() {
  return createWeeklyIntention({
    weekRef: WEEK,
    title: 'Wake at 6am',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 5 },
  })
}

describe('weekly reflection review', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('includes the week intention in the reflection bundle weekObjectItems', async () => {
    const intention = await makeIntention()
    const bundle = await getWeeklyReflectionDataBundle(WEEK, WEEK_END)
    const item = bundle.weekObjectItems.find(
      (i) => i.subjectType === 'weeklyIntention' && i.subject.id === intention.id,
    )
    expect(item).toBeTruthy()
    expect(item?.key).toBe(`weeklyIntention:${intention.id}`)
  })

  it('persists and reads back a per-object comment on a weekly intention', async () => {
    const intention = await makeIntention()
    await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'week',
      periodRef: WEEK,
      subjectType: 'weeklyIntention',
      subjectId: intention.id,
      note: 'Mostly hit it',
    })

    const saved = await reflectionDexieRepository.getPeriodObjectReflection(
      'week',
      WEEK,
      'weeklyIntention',
      intention.id,
    )
    expect(saved?.note).toBe('Mostly hit it')

    await reflectionDexieRepository.deletePeriodObjectReflection(
      'week',
      WEEK,
      'weeklyIntention',
      intention.id,
    )
    expect(
      await reflectionDexieRepository.getPeriodObjectReflection(
        'week',
        WEEK,
        'weeklyIntention',
        intention.id,
      ),
    ).toBeUndefined()
  })

  it('rejects a comment on a nonexistent weekly intention', async () => {
    await expect(
      reflectionDexieRepository.upsertPeriodObjectReflection({
        periodType: 'week',
        periodRef: WEEK,
        subjectType: 'weeklyIntention',
        subjectId: 'missing-id',
        note: 'x',
      }),
    ).rejects.toThrow()
  })
})
