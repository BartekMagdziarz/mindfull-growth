import { beforeEach, describe, expect, it } from 'vitest'
import type { Initiative, InitiativePlanState } from '@/domain/legacy/initiative'
import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { PriorityLink } from '@/domain/planning'
import type { PeriodObjectReflection, TodayHiddenState } from '@/domain/planningState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { priorityLinkDexieRepository } from '@/repositories/priorityLinkDexieRepository'
import { getCalendarYearSummary } from '@/services/calendarViewQueries'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import { retireActiveLink } from '@/services/priorityLinkService'
import { getTodayViewBundleForDay } from '@/services/todayViewQueries'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { parsePeriodRef } from '@/utils/periods'

const AT = '2026-05-04T08:00:00.000Z'
const dayRef = parsePeriodRef('2026-03-12') as DayRef
const weekRef = parsePeriodRef('2026-W10') as WeekRef
const monthRef = parsePeriodRef('2026-03') as MonthRef
const yearRef = parsePeriodRef('2026') as YearRef

/**
 * A database written while initiatives were a live entity (before 2026-10-20)
 * still holds their rows plus links, hidden rows and reflections that name
 * them. The tables stay; this spec guards that such a database opens, plans
 * and retires links without errors, and that none of the legacy rows leak into
 * Today.
 */
describe('legacy initiative records in a user database', () => {
  beforeEach(async () => {
    const db = await resetPlanningTestData()
    await db.priorityLinks.clear()
  })

  it('plans around stored initiative rows and retires their priority links', async () => {
    const db = await resetPlanningTestData()
    const priority = await priorityDexieRepository.create({
      title: 'Spokojny rytm',
      years: [yearRef],
      status: 'active',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })
    const habit = await habitDexieRepository.create({
      title: 'Poranny spacer',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 4 },
      status: 'open',
    })
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef,
      subjectType: 'habit',
      subjectId: habit.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })

    const initiative: Initiative = {
      id: 'initiative-1',
      createdAt: AT,
      updatedAt: AT,
      title: 'Zadzwonić do projektanta',
      isActive: true,
      priorityIds: [priority.id],
      lifeAreaIds: [],
      status: 'open',
    }
    const planState: InitiativePlanState = {
      id: 'initiative-plan-1',
      createdAt: AT,
      updatedAt: AT,
      initiativeId: initiative.id,
      monthRef,
      weekRef,
      dayRef,
    }
    const link: PriorityLink = {
      id: 'link-initiative-1',
      createdAt: AT,
      updatedAt: AT,
      priorityId: priority.id,
      status: 'active',
      subjectRef: { subjectType: 'initiative', subjectId: initiative.id },
      contribution: '',
      expectedSignal: '',
      validFrom: AT,
      needsEnrichment: true,
    }
    const hidden: TodayHiddenState = {
      id: 'hidden-initiative-1',
      createdAt: AT,
      updatedAt: AT,
      dayRef,
      subjectType: 'initiative',
      subjectId: initiative.id,
    }
    const reflection: PeriodObjectReflection = {
      id: 'reflection-initiative-1',
      createdAt: AT,
      updatedAt: AT,
      periodType: 'week',
      periodRef: weekRef,
      subjectType: 'initiative',
      subjectId: initiative.id,
      note: 'Zostaw mnie',
    }
    await db.initiatives.add(initiative)
    await db.initiativePlanStates.add(planState)
    await db.priorityLinks.add(link)
    await db.todayHiddenStates.add(hidden)
    await db.periodObjectReflections.add(reflection)

    const today = await getTodayViewBundleForDay(dayRef)
    expect(today.sections.month.map(item => item.subject.title)).toEqual(['Poranny spacer'])
    expect(today.sections.scheduled).toEqual([])
    expect(today.hiddenItems).toEqual([])

    const week = await getWeekPlanningBundle(weekRef)
    expect(week.relevant.measurementItems.map(item => item.subject.id)).toEqual([habit.id])
    const month = await getMonthPlanningBundle(monthRef)
    expect(month.measurementItems.map(item => item.subject.id)).toEqual([habit.id])
    const year = await getCalendarYearSummary(yearRef)
    expect(year.months.find(item => item.monthRef === monthRef)?.activeCadencedCount).toBe(1)

    // The stored reflection stays readable even though nothing can write one any more.
    const weekReflection = await getWeekReflectionBundle(weekRef)
    expect(weekReflection.objectReflections.map(item => item.subjectType)).toEqual(['initiative'])

    const retired = await retireActiveLink(link.id)
    expect(retired.status).toBe('retired')
    expect(retired.subjectRef).toEqual({ subjectType: 'initiative', subjectId: initiative.id })
    expect((await db.initiatives.get(initiative.id))?.priorityIds).toEqual([priority.id])

    await priorityDexieRepository.delete(priority.id)
    expect(await priorityLinkDexieRepository.listByPriority(priority.id)).toEqual([])
    expect(await db.initiatives.count()).toBe(1)
  })
})
