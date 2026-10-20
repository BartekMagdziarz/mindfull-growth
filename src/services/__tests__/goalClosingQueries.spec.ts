import { describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/planning'
import type { DayRef } from '@/domain/period'
import { selectGoalsAwaitingClosing } from '@/services/goalClosingQueries'

const TODAY = '2026-10-04' as DayRef
const WEEK_END = '2026-10-04' as DayRef

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    createdAt: 'x',
    updatedAt: 'x',
    title: 'g',
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    ...overrides,
  }
}

describe('selectGoalsAwaitingClosing', () => {
  it('lists open goals with a deadline in the period, and older overdue ones too', () => {
    const inPeriod = goal({ id: 'a', targetDate: '2026-09-30' })
    const longOverdue = goal({ id: 'b', targetDate: '2026-07-15' })
    const ahead = goal({ id: 'c', targetDate: '2026-10-05' })
    const noDate = goal({ id: 'd' })
    const result = selectGoalsAwaitingClosing(
      [inPeriod, longOverdue, ahead, noDate],
      WEEK_END,
      TODAY
    )
    expect(result.map(g => g.id)).toEqual(['b', 'a'])
  })

  it('skips closed, archived and deferred goals, but brings back an expired deferral', () => {
    const closed = goal({ id: 'closed', targetDate: '2026-09-30', status: 'completed' })
    const dropped = goal({ id: 'dropped', targetDate: '2026-09-30', status: 'dropped' })
    const archived = goal({ id: 'archived', targetDate: '2026-09-30', isActive: false })
    const deferred = goal({
      id: 'deferred',
      targetDate: '2026-09-30',
      closingDeferredUntil: '2026-10-11',
    })
    const expired = goal({
      id: 'expired',
      targetDate: '2026-09-30',
      closingDeferredUntil: '2026-10-04',
    })
    const result = selectGoalsAwaitingClosing(
      [closed, dropped, archived, deferred, expired],
      WEEK_END,
      TODAY
    )
    expect(result.map(g => g.id)).toEqual(['expired'])
  })
})
