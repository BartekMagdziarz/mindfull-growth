import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
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
      i => i.subjectType === 'weeklyIntention' && i.subject.id === intention.id
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
      intention.id
    )
    expect(saved?.note).toBe('Mostly hit it')

    await reflectionDexieRepository.deletePeriodObjectReflection(
      'week',
      WEEK,
      'weeklyIntention',
      intention.id
    )
    expect(
      await reflectionDexieRepository.getPeriodObjectReflection(
        'week',
        WEEK,
        'weeklyIntention',
        intention.id
      )
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
      })
    ).rejects.toThrow()
  })

  describe('monthly object in a week that crosses a month boundary (B-3)', () => {
    // 2026-W26 = 29 Jun – 5 Jul: the habit is active in June and in July.
    const BOUNDARY_WEEK = parsePeriodRef('2026-W26') as WeekRef
    const BOUNDARY_WEEK_END = getPeriodBounds(BOUNDARY_WEEK).end as DayRef
    const JUNE = parsePeriodRef('2026-06') as MonthRef
    const JULY = parsePeriodRef('2026-07') as MonthRef

    async function makeMonthlyHabit() {
      const habit = await habitDexieRepository.create({
        title: 'Spotkanie z przyjaciółmi',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'monthly',
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 2 },
        status: 'open',
      })
      for (const monthRef of [JUNE, JULY]) {
        await planningStateDexieRepository.upsertMeasurementMonthState({
          monthRef,
          subjectType: 'habit',
          subjectId: habit.id,
          activityState: 'active',
          scheduleScope: 'whole-month',
        })
      }
      for (const day of ['2026-06-29', '2026-06-30', '2026-07-02']) {
        await planningStateDexieRepository.upsertDailyMeasurementEntry({
          subjectType: 'habit',
          subjectId: habit.id,
          dayRef: parsePeriodRef(day) as DayRef,
          value: null,
        })
      }
      return habit
    }

    it('shows the habit once, with the week count and no month target', async () => {
      const habit = await makeMonthlyHabit()
      const bundle = await getWeeklyReflectionDataBundle(BOUNDARY_WEEK, BOUNDARY_WEEK_END)

      const keys = bundle.weekObjectItems.map(item => item.key)
      expect(new Set(keys).size).toBe(keys.length)
      const rows = bundle.weekObjectItems.filter(item => item.key === `habit:${habit.id}`)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.measurement).toMatchObject({
        periodRef: BOUNDARY_WEEK,
        actualValue: 3,
        entryCount: 3,
      })
      expect(rows[0]?.measurement.target).toBeUndefined()
      expect(rows[0]?.measurement.evaluationStatus).toBeUndefined()
      expect(rows[0]?.weekMeasurement).toBeUndefined()

      expect(bundle.habitReflectionItems.filter(item => item.subject.id === habit.id)).toHaveLength(
        1
      )
      expect(bundle.habitSummary.totalActive).toBe(1)
      expect(bundle.weeklySummary.monthlyHabits).toHaveLength(1)
    })

    it('judges the merged row by its week sub-target when the week has one', async () => {
      const habit = await makeMonthlyHabit()
      await planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef: BOUNDARY_WEEK,
        subjectType: 'habit',
        subjectId: habit.id,
        sourceMonthRef: JUNE,
        activityState: 'active',
        scheduleScope: 'whole-week',
        targetOverride: { kind: 'count', operator: 'min', value: 3 },
      })
      const bundle = await getWeeklyReflectionDataBundle(BOUNDARY_WEEK, BOUNDARY_WEEK_END)

      const rows = bundle.weekObjectItems.filter(item => item.key === `habit:${habit.id}`)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.weekMeasurement).toMatchObject({ evaluationStatus: 'met', actualValue: 3 })
      expect(rows[0]?.measurement).toMatchObject({
        periodRef: BOUNDARY_WEEK,
        evaluationStatus: 'met',
        target: { value: 3 },
      })
    })

    it('leaves a single-month week alone: the month summary stays the result', async () => {
      const habit = await makeMonthlyHabit()
      const innerWeek = parsePeriodRef('2026-W28') as WeekRef // 13–19 Jul, July only
      const bundle = await getWeeklyReflectionDataBundle(
        innerWeek,
        getPeriodBounds(innerWeek).end as DayRef
      )

      const rows = bundle.weekObjectItems.filter(item => item.key === `habit:${habit.id}`)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.measurement).toMatchObject({ periodRef: JULY, target: { value: 2 } })
    })
  })
})
