import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { toggleMeasurementDayAssignment, toggleMeasurementWeekAssignment } from '@/services/planningMutations'
import { getTodayViewBundleForDay, type TodayMeasurementItem } from '@/services/todayViewQueries'
import { addMeasurementToDay, moveTodayMeasurementAssignment, removeMeasurementFromDay, rescheduleContextItem, undoRescheduleContextItem } from '@/services/todayViewActions'
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

  it('rescheduleContextItem: same-week target only hides; next-week target also creates the assignment; undo reverts both', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Czytanie', isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly',
      entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 3 }, status: 'open',
    })
    const week = getPeriodRefsForDate(new Date(`${THURSDAY}T12:00:00`)).week
    await toggleMeasurementWeekAssignment({ subjectType: 'habit', subjectId: habit.id, cadence: 'weekly', weekRef: week, monthRef: getPeriodRefsForDate(new Date(`${THURSDAY}T12:00:00`)).month })
    invalidatePlanningQueryCache()
    let bundle = await getTodayViewBundleForDay(THURSDAY)
    const weekItem = bundle.sections.week.find(entry => entry.kind === 'measurement' && entry.subject.id === habit.id) as TodayMeasurementItem
    expect(weekItem?.canHide).toBe(true)

    // Friday is still this week: the whole-week scope already covers it.
    const sameWeek = await rescheduleContextItem(weekItem, THURSDAY, '2026-03-13' as DayRef)
    expect(sameWeek.createdAssignment).toBe(false)
    expect(await planningStateDexieRepository.getMeasurementDayAssignment('2026-03-13' as DayRef, 'habit', habit.id)).toBeUndefined()
    invalidatePlanningQueryCache()
    bundle = await getTodayViewBundleForDay(THURSDAY)
    expect(bundle.hiddenItems.some(entry => entry.key === weekItem.key)).toBe(true)
    await undoRescheduleContextItem(weekItem, THURSDAY, '2026-03-13' as DayRef, false)

    // Next Monday is outside the scope: an explicit day assignment is created there.
    const nextWeek = await rescheduleContextItem(weekItem, THURSDAY, NEXT_MONDAY)
    expect(nextWeek.createdAssignment).toBe(true)
    expect(await planningStateDexieRepository.getMeasurementDayAssignment(NEXT_MONDAY, 'habit', habit.id)).toBeDefined()
    await undoRescheduleContextItem(weekItem, THURSDAY, NEXT_MONDAY, true)
    expect(await planningStateDexieRepository.getMeasurementDayAssignment(NEXT_MONDAY, 'habit', habit.id)).toBeUndefined()
    invalidatePlanningQueryCache()
    bundle = await getTodayViewBundleForDay(THURSDAY)
    expect(bundle.hiddenItems).toHaveLength(0)
  })

  it('addMeasurementToDay places an unplanned candidate on the day and the bundle offers it beforehand', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Spacer', isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly',
      entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 3 }, status: 'open',
    })
    await habitDexieRepository.create({
      title: 'Wycofany', isActive: true, priorityIds: [], lifeAreaIds: [], cadence: 'weekly',
      entryMode: 'completion', target: { kind: 'count', operator: 'min', value: 3 }, status: 'retired',
    })
    invalidatePlanningQueryCache()
    let bundle = await getTodayViewBundleForDay(THURSDAY)
    expect(bundle.addCandidates.map(candidate => candidate.subject.title)).toEqual(['Spacer'])

    await addMeasurementToDay(bundle.addCandidates[0], THURSDAY)
    invalidatePlanningQueryCache()
    bundle = await getTodayViewBundleForDay(THURSDAY)
    expect(bundle.sections.scheduled.some(entry => entry.kind === 'measurement' && entry.subject.id === habit.id)).toBe(true)
    expect(bundle.addCandidates).toHaveLength(0)

    await removeMeasurementFromDay({ key: `habit:${habit.id}`, subjectType: 'habit', subject: habit, cadence: 'weekly' }, THURSDAY)
    invalidatePlanningQueryCache()
    bundle = await getTodayViewBundleForDay(THURSDAY)
    expect(bundle.addCandidates.map(candidate => candidate.subject.title)).toEqual(['Spacer'])
  })
})
