import { describe, expect, it } from 'vitest'
import { normalizeWeeklyIntentionPayload } from '@/domain/planning'
import { normalizeWeekPlanPayload } from '@/domain/planningState'
import type { WeekRef } from '@/domain/period'

const WEEK = '2026-W10' as WeekRef

describe('normalizeWeeklyIntentionPayload', () => {
  it('keeps weekRef and forces weekly cadence', () => {
    const result = normalizeWeeklyIntentionPayload({
      weekRef: WEEK,
      title: 'Wake at 6am',
      isActive: true,
      entryMode: 'counter',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 5 },
      status: 'open',
    })
    expect(result.weekRef).toBe(WEEK)
    expect(result.cadence).toBe('weekly')
    expect(result.title).toBe('Wake at 6am')
  })

  it('throws on an invalid weekRef (month ref)', () => {
    expect(() =>
      normalizeWeeklyIntentionPayload({
        weekRef: '2026-03' as WeekRef,
        title: 'x',
        isActive: true,
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
        status: 'open',
      }),
    ).toThrow()
  })

  it('accepts and normalizes priorityIds (links an intention to priorities)', () => {
    const result = normalizeWeeklyIntentionPayload({
      weekRef: WEEK,
      title: 'x',
      isActive: true,
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
      priorityIds: ['p1', 'p2'],
    })
    expect(result.priorityIds).toEqual(['p1', 'p2'])
  })

  it('defaults priorityIds to an empty array when omitted', () => {
    const result = normalizeWeeklyIntentionPayload({
      weekRef: WEEK,
      title: 'x',
      isActive: true,
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 1 },
      status: 'open',
    })
    expect(result.priorityIds).toEqual([])
  })

  it('still rejects other habit-only keys (own object type, not a habit)', () => {
    expect(() =>
      normalizeWeeklyIntentionPayload({
        weekRef: WEEK,
        title: 'x',
        isActive: true,
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
        status: 'open',
        // @ts-expect-error goalId is not part of a WeeklyIntention
        goalId: 'g1',
      }),
    ).toThrow()
  })
})

describe('normalizeWeekPlanPayload', () => {
  it('keeps topPriorities', () => {
    const result = normalizeWeekPlanPayload({
      weekRef: WEEK,
      topPriorities: [{ subjectType: 'weeklyIntention', subjectId: 'i1' }],
    })
    expect(result.topPriorities).toEqual([{ subjectType: 'weeklyIntention', subjectId: 'i1' }])
  })

  it('rejects an unknown subjectType in topPriorities', () => {
    expect(() =>
      normalizeWeekPlanPayload({
        weekRef: WEEK,
        // @ts-expect-error bogus is not a MeasurementSubjectType
        topPriorities: [{ subjectType: 'bogus', subjectId: 'i1' }],
      }),
    ).toThrow()
  })
})
