import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import { toggleMeasurementWeekAssignment } from '@/services/planningMutations'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { MonthRef, WeekRef } from '@/domain/period'

beforeEach(resetPlanningTestData)

describe('ongoing habits', () => {
  it.each(['weekly', 'monthly'] as const)(
    'keeps %s habits available and records only planned periods',
    async cadence => {
      const habit = await habitDexieRepository.create({
        title: 'Reading',
        isActive: true,
        isPermanent: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence,
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 3 },
        status: 'open',
      })
      await habitDexieRepository.update(habit.id, { title: 'Reading daily' })
      expect((await habitDexieRepository.getById(habit.id))?.isPermanent).toBe(true)
      const planner = useWeeklyPlannerState(ref('2027-W06' as WeekRef), ref('pl'), () => {})
      await planner.loadPlannerData()
      expect(planner.habitRows.value.some(row => row.id === habit.id)).toBe(true)
      expect(planner.engagedHabitRows.value.some(row => row.id === habit.id)).toBe(false)
      expect(
        await planningStateDexieRepository.listMeasurementMonthStatesForSubject('habit', habit.id)
      ).toEqual([])
      const place = (week: string, month: string) =>
        toggleMeasurementWeekAssignment({
          subjectType: 'habit',
          subjectId: habit.id,
          cadence,
          weekRef: week as WeekRef,
          monthRef: month as MonthRef,
        })
      await place('2027-W06', '2027-02')
      await place('2027-W15', '2027-04')
      const months = await planningStateDexieRepository.listMeasurementMonthStatesForSubject(
        'habit',
        habit.id
      )
      expect(
        months
          .filter(state => state.activityState === 'active')
          .map(state => state.monthRef)
          .sort()
      ).toEqual(['2027-02', '2027-04'])
      const weeks = await planningStateDexieRepository.listMeasurementWeekStatesForSubject(
        'habit',
        habit.id
      )
      expect(weeks.map(state => state.weekRef).sort()).toEqual(['2027-W06', '2027-W15'])
      await place('2027-W15', '2027-04')
      expect(
        (
          await planningStateDexieRepository.listMeasurementWeekStatesForSubject('habit', habit.id)
        ).map(state => state.weekRef)
      ).toEqual(['2027-W06'])
      await habitDexieRepository.update(habit.id, { isPermanent: false })
      expect((await habitDexieRepository.getById(habit.id))?.isPermanent).toBe(false)
      expect(
        (
          await planningStateDexieRepository.listMeasurementWeekStatesForSubject('habit', habit.id)
        ).map(state => state.weekRef)
      ).toEqual(['2027-W06'])
      await habitDexieRepository.update(habit.id, { status: 'retired' })
      await planner.loadPlannerData()
      expect(planner.habitRows.value.some(row => row.id === habit.id)).toBe(false)
    }
  )
})
