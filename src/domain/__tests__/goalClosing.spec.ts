import { describe, expect, it } from 'vitest'
import { evaluateClosingMonths, goalHasStartMirror, suggestGoalOutcome } from '@/domain/goalClosing'
import type {
  CreateGoalPayload,
  GoalClosingMonthState,
  GoalClosingReflection,
} from '@/domain/planning'
import { goalStatusForOutcome, normalizeGoalPayload } from '@/domain/planning'

const month = (state: GoalClosingMonthState) => ({ state })

describe('evaluateClosingMonths', () => {
  it('ignores unplanned months and reports no-data without any decided month', () => {
    expect(evaluateClosingMonths([month('unplanned'), month('no-data')])).toEqual({
      evaluation: 'no-data',
      monthsMet: 0,
      monthsPlanned: 1,
    })
  })

  it('is met when the met share reaches two thirds even if the last month missed', () => {
    expect(evaluateClosingMonths([month('met'), month('met'), month('missed')])).toMatchObject({
      evaluation: 'met',
      monthsMet: 2,
      monthsPlanned: 3,
    })
  })

  it('is met when the last decided month was met even with a low share', () => {
    expect(
      evaluateClosingMonths([
        month('missed'),
        month('missed'),
        month('missed'),
        month('met'),
        month('no-data'),
      ])
    ).toMatchObject({ evaluation: 'met', monthsMet: 1, monthsPlanned: 5 })
  })

  it('neither counts nor decides on an ongoing period', () => {
    expect(evaluateClosingMonths([month('met'), month('met'), month('ongoing')])).toEqual({
      evaluation: 'met',
      monthsMet: 2,
      monthsPlanned: 2,
    })
    expect(evaluateClosingMonths([month('missed'), month('ongoing')])).toMatchObject({
      evaluation: 'missed',
      monthsPlanned: 1,
    })
  })

  it('is missed when neither route holds', () => {
    expect(evaluateClosingMonths([month('met'), month('missed'), month('missed')])).toMatchObject({
      evaluation: 'missed',
    })
  })
})

describe('suggestGoalOutcome', () => {
  it('suggests nothing when no key result has data', () => {
    expect(suggestGoalOutcome([])).toBeNull()
    expect(suggestGoalOutcome([{ evaluation: 'no-data' }])).toBeNull()
  })

  it('maps all met → achieved, mixed → partial, none met → missed', () => {
    expect(suggestGoalOutcome([{ evaluation: 'met' }, { evaluation: 'no-data' }])).toBe('achieved')
    expect(suggestGoalOutcome([{ evaluation: 'met' }, { evaluation: 'missed' }])).toBe('partial')
    expect(suggestGoalOutcome([{ evaluation: 'missed' }])).toBe('missed')
  })
})

describe('goalHasStartMirror', () => {
  it('needs at least one creation field to mirror', () => {
    expect(goalHasStartMirror({})).toBe(false)
    expect(goalHasStartMirror({ successDefinition: 'x' })).toBe(true)
    expect(goalHasStartMirror({ confidenceRating: 4 })).toBe(true)
    expect(goalHasStartMirror({ obstacles: 'travel' })).toBe(true)
  })
})

describe('normalizeGoalPayload · closingReflection', () => {
  const base: CreateGoalPayload = {
    title: 'Training block',
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
  }
  const reflection: GoalClosingReflection = {
    closedAt: '2026-10-04',
    outcome: 'partial',
    successMet: 'partly',
    confidenceInHindsight: 6,
    learned: '  3× a week beats "every evening"  ',
    followUp: { kind: 'habit', createdHabitIds: ['h-1', 'h-1'] },
    keyResults: [
      {
        id: 'kr-1',
        title: '3 sessions a week',
        entryMode: 'completion',
        cadence: 'weekly',
        evaluation: 'met',
        monthsMet: 6,
        monthsPlanned: 7,
        months: [{ monthRef: '2026-03', state: 'met' }],
        lastReadout: '24/29 tyg.',
      },
    ],
    window: { startDate: '2026-03-12', targetDate: '2026-09-30', weeksPlanned: 29 },
  }

  it('rejects a reflection on an open goal', () => {
    expect(() => normalizeGoalPayload({ ...base, closingReflection: reflection })).toThrow(
      /closed goals/
    )
  })

  it('keeps a trimmed, deduplicated reflection on a completed goal', () => {
    const normalized = normalizeGoalPayload({
      ...base,
      status: 'completed',
      closingReflection: reflection,
    })
    expect(normalized.closingReflection).toMatchObject({
      closedAt: '2026-10-04',
      outcome: 'partial',
      learned: '3× a week beats "every evening"',
      followUp: { kind: 'habit', createdHabitIds: ['h-1'] },
      window: { weeksPlanned: 29 },
    })
    expect(normalized.closingReflection?.keyResults[0]).toMatchObject({
      evaluation: 'met',
      monthsMet: 6,
    })
    // frozen before weeks were tracked: no week fields appear
    expect(normalized.closingReflection?.keyResults[0]).not.toHaveProperty('weeks')
  })

  it('keeps the week-by-week states of a weekly key result', () => {
    const weekly = {
      ...reflection,
      keyResults: [
        {
          ...reflection.keyResults[0],
          monthsMet: 0,
          monthsPlanned: 0,
          months: [],
          weeksMet: 1,
          weeksPlanned: 1,
          weeks: [
            { weekRef: '2026-W38', state: 'met' as const },
            { weekRef: '2026-W39', state: 'ongoing' as const },
          ],
        },
      ],
    }
    const normalized = normalizeGoalPayload({
      ...base,
      status: 'completed',
      closingReflection: weekly,
    })
    expect(normalized.closingReflection?.keyResults[0]).toMatchObject({
      weeksMet: 1,
      weeksPlanned: 1,
      weeks: [
        { weekRef: '2026-W38', state: 'met' },
        { weekRef: '2026-W39', state: 'ongoing' },
      ],
    })
  })

  it('refuses a status that contradicts the outcome', () => {
    expect(() =>
      normalizeGoalPayload({ ...base, status: 'dropped', closingReflection: reflection })
    ).toThrow(/does not match closing outcome/)
    expect(() =>
      normalizeGoalPayload({
        ...base,
        status: 'completed',
        closingReflection: { ...reflection, outcome: 'abandoned' },
      })
    ).toThrow(/does not match closing outcome/)
    expect(goalStatusForOutcome('abandoned')).toBe('dropped')
    expect(goalStatusForOutcome('missed')).toBe('completed')
  })

  it('drops the reflection and the deferral when the goal is reopened', () => {
    const closed = {
      ...base,
      status: 'completed' as const,
      closingReflection: reflection,
      closingDeferredUntil: '2026-10-11',
    }
    const existing = { ...normalizeGoalPayload(closed), id: 'g', createdAt: 'x', updatedAt: 'x' }
    const reopened = normalizeGoalPayload({ status: 'open' }, existing)
    expect(reopened.closingReflection).toBeUndefined()
    expect(reopened.closingDeferredUntil).toBeUndefined()
  })

  it('keeps and clears the deferral on open goals', () => {
    const deferred = normalizeGoalPayload({ ...base, closingDeferredUntil: '2026-10-11' })
    expect(deferred.closingDeferredUntil).toBe('2026-10-11')
    const existing = { ...deferred, id: 'g', createdAt: 'x', updatedAt: 'x' }
    expect(normalizeGoalPayload({ title: 'Renamed' }, existing).closingDeferredUntil).toBe(
      '2026-10-11'
    )
    expect(
      normalizeGoalPayload({ closingDeferredUntil: '' }, existing).closingDeferredUntil
    ).toBeUndefined()
    expect(() => normalizeGoalPayload({ ...base, closingDeferredUntil: 'soon' })).toThrow(
      /ISO date/
    )
  })

  it('validates the hindsight confidence on the wizard scale', () => {
    expect(() =>
      normalizeGoalPayload({
        ...base,
        status: 'completed',
        closingReflection: { ...reflection, confidenceInHindsight: 11 },
      })
    ).toThrow(/between 1 and 10/)
  })
})
