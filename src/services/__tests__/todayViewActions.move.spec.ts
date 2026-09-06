import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { toggleMeasurementDayAssignment } from '@/services/planningMutations'
import { getTodayViewBundleForDay, type TodayMeasurementItem } from '@/services/todayViewQueries'
import { moveTodayMeasurementAssignment } from '@/services/todayViewActions'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getPeriodRefsForDate } from '@/utils/periods'

const THURSDAY = '2026-03-12' as DayRef
const NEXT_MONDAY = '2026-03-16' as DayRef

describe('moveTodayMeasurementAssignment', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('moves a scheduled item into another week, creating that week state and cleaning up the source', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Rozciąganie', isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly',
      entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 3 }, status: 'open',
    })
    await toggleMeasurementDayAssignment({ subjectType: 'habit', subjectId: habit.id, cadence: 'weekly', dayRef: THURSDAY })
    invalidatePlanningQueryCache()
    const bundle = await getTodayViewBundleForDay(THURSDAY)
    const item = bundle.sections.scheduled.find(entry => entry.kind === 'measurement' && entry.subject.id === habit.id) as TodayMeasurementItem
    expect(item?.isScheduledToday).toBe(true)

    await moveTodayMeasurementAssignment(item, THURSDAY, NEXT_MONDAY)

    expect(await planningStateDexieRepository.getMeasurementDayAssignment(NEXT_MONDAY, 'habit', habit.id)).toBeDefined()
    expect(await planningStateDexieRepository.getMeasurementDayAssignment(THURSDAY, 'habit', habit.id)).toBeUndefined()
    const sourceWeek = getPeriodRefsForDate(new Date(`${THURSDAY}T12:00:00`)).week
    const targetWeek = getPeriodRefsForDate(new Date(`${NEXT_MONDAY}T12:00:00`)).week
    const weekStates = (await planningStateDexieRepository.listMeasurementWeekStates()).filter(state => state.subjectId === habit.id)
    expect(weekStates.map(state => state.weekRef).sort()).toEqual([targetWeek])
    expect(weekStates.find(state => state.weekRef === sourceWeek)).toBeUndefined()

    // Moving back restores the original placement (undo path).
    await moveTodayMeasurementAssignment(item, NEXT_MONDAY, THURSDAY)
    expect(await planningStateDexieRepository.getMeasurementDayAssignment(THURSDAY, 'habit', habit.id)).toBeDefined()
    expect(await planningStateDexieRepository.getMeasurementDayAssignment(NEXT_MONDAY, 'habit', habit.id)).toBeUndefined()
  })
})
