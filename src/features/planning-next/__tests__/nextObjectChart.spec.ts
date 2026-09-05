import { describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import type { Habit } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import { buildDayChartPoints } from '../nextObjectChart'

const habit: Habit = {
  id: 'habit-1',
  title: 'Poranne rozciąganie',
  isActive: true,
  priorityIds: [],
  lifeAreaIds: [],
  cadence: 'weekly',
  entryMode: 'completion',
  target: { kind: 'count', operator: 'min', value: 3 },
  status: 'open',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
}

const item = { subject: habit, subjectType: 'habit' } as unknown as TodayMeasurementItem
const entry = (dayRef: DayRef): DailyMeasurementEntry => ({
  id: `entry-${dayRef}`,
  subjectType: 'habit',
  subjectId: habit.id,
  dayRef,
  value: null,
  createdAt: '',
  updatedAt: '',
})
const assignment = (dayRef: DayRef): MeasurementDayAssignment => ({
  id: `assignment-${dayRef}`,
  subjectType: 'habit',
  subjectId: habit.id,
  dayRef,
  createdAt: '',
  updatedAt: '',
})

describe('buildDayChartPoints', () => {
  it('maps the Monday–Sunday week of the day onto chart points with live flags', () => {
    const dayRef = '2026-03-12' as DayRef // Thursday
    const points = buildDayChartPoints(item, dayRef, [entry('2026-03-10' as DayRef)], [assignment('2026-03-13' as DayRef)])

    expect(points.map(point => point.key)).toEqual([
      '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15',
    ])
    expect(points[1].value).toBe(1)
    expect(points[3].current).toBe(true)
    expect(points.filter(point => point.future).map(point => point.key)).toEqual(['2026-03-13', '2026-03-14', '2026-03-15'])
    expect(points[4].assigned).toBe(true)
    expect(points[0].assigned).toBe(false)
    expect(points.every(point => point.label.length > 0)).toBe(true)
  })

  it('reflects a new entry for the day immediately (no cached state)', () => {
    const dayRef = '2026-03-12' as DayRef
    const before = buildDayChartPoints(item, dayRef, [], [])
    const after = buildDayChartPoints(item, dayRef, [entry(dayRef)], [])

    expect(before[3].value).toBeUndefined()
    expect(after[3].value).toBe(1)
  })
})
