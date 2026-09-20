import { beforeEach, describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { buildRhythmScenario, rhythmRange } from '../rhythmScenarioLoader'

const CLOCK = '2026-07-15' as DayRef
const MONTH = '2026-07' as MonthRef
const WEEK = '2026-W28' as WeekRef

async function createHabit(title = 'Rozciąganie') {
  const habit = await habitDexieRepository.create({
    title,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
  })
  return habit.id
}

describe('rhythmRange', () => {
  it('pads the viewed period so boundary weeks are covered', () => {
    const range = rhythmRange('month', MONTH)

    expect(range.start).toBe('2026-06-23')
    expect(range.end).toBe('2026-08-08')
    expect(range.monthRefs).toContain('2026-06')
    expect(range.monthRefs).toContain('2026-08')
  })

  it('covers every week of the year on the year scale', () => {
    const range = rhythmRange('year', '2026')

    // Twelve months of the year plus the padding around January and December.
    expect(range.monthRefs).toHaveLength(14)
    expect(range.weekRefs.length).toBeGreaterThanOrEqual(52)
  })
})

describe('buildRhythmScenario', () => {
  beforeEach(async () => {
    await resetPlanningTestData()
  })

  it('reads an active month state without placements as covering the whole month', async () => {
    const habitId = await createHabit()
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'active',
      scheduleScope: 'unassigned',
      targetOverride: { kind: 'count', operator: 'min', value: 5 },
    })

    const scenario = await buildRhythmScenario('month', MONTH, CLOCK)

    expect(scenario.assignments).toEqual([
      expect.objectContaining({ objectKey: `habit:${habitId}`, scope: { kind: 'month', ref: MONTH } }),
    ])
    expect(scenario.overrides).toEqual([
      expect.objectContaining({ objectKey: `habit:${habitId}`, scope: { kind: 'month', ref: MONTH } }),
    ])
  })

  it('keeps a paused month state out of the placements', async () => {
    const habitId = await createHabit()
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'paused',
      scheduleScope: 'unassigned',
    })

    const scenario = await buildRhythmScenario('month', MONTH, CLOCK)

    expect(scenario.assignments).toEqual([])
  })

  it('maps week placements, day assignments and entries onto object keys', async () => {
    const habitId = await createHabit()
    // Invariant: an active weekly week state needs its active month state.
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: MONTH,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef: WEEK,
      subjectType: 'habit',
      subjectId: habitId,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
    await planningStateDexieRepository.upsertMeasurementDayAssignment({
      dayRef: '2026-07-14' as DayRef,
      subjectType: 'habit',
      subjectId: habitId,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: habitId,
      dayRef: '2026-07-14' as DayRef,
      value: null,
    })

    const scenario = await buildRhythmScenario('month', MONTH, CLOCK)

    // 'specific-days' on either scope is an explicit placement of days, not of
    // the period itself — only the day assignment lights a cell.
    expect(scenario.assignments.map(assignment => assignment.scope)).toEqual([
      { kind: 'day', ref: '2026-07-14' },
    ])
    expect(scenario.entries).toEqual([
      expect.objectContaining({ objectKey: `habit:${habitId}`, dayRef: '2026-07-14', value: undefined }),
    ])
  })

  it('carries the plans and the weekly reflection axes in area order', async () => {
    await periodPlanDexieRepository.createMonthPlan({ monthRef: MONTH, topPriorityIds: ['p1', 'p2'] })
    await periodPlanDexieRepository.createWeekPlan({
      weekRef: WEEK,
      topPriorities: [{ subjectType: 'habit', subjectId: 'h1' }],
    })
    await structuredReflectionDexieRepository.upsertWeekly({
      weekRef: WEEK,
      physicalIntensityRating: 1,
      emotionalIntensityRating: 2,
      taskLoadRating: 3,
      closeOnesNeedsRating: 4,
      physicalCareRating: 5,
      emotionalProcessingRating: 4,
      productivityRating: 3,
      closeOnesSupportRating: 2,
      energyRating: 1,
      moodRating: 2,
      calmRating: 3,
      connectionRating: 4,
      promptResponses: { wentWell: 'Spokojny tydzień' },
      freeformReflection: '',
      aiSummary: '',
    })

    const scenario = await buildRhythmScenario('month', MONTH, CLOCK)

    expect(scenario.monthPlans).toEqual([{ monthRef: MONTH, topPriorityKeys: ['p1', 'p2'] }])
    expect(scenario.weekPlans).toEqual([{ weekRef: WEEK, topObjectKeys: ['habit:h1'] }])
    const reflection = scenario.weeklyReflections[0]
    // Body · Emotions · Tasks · Close ones for each axis: load = demands fields, state = state fields; actions are history.
    expect(reflection.load).toEqual([1, 2, 3, 4])
    expect(reflection.state).toEqual([1, 2, 3, 4])
    expect(reflection).not.toHaveProperty('effort')
    expect(reflection.anchors.good).toBe('Spokojny tydzień')
  })
})
