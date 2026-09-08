import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import {
  addTag,
  buildQuietEvidenceRows,
  parseTags,
  plural,
  quietMonthWeeks,
  quietWeekDays,
  serializeTags,
} from '../quietRitualModel'

// The app's weeks are not ISO weeks: 2026-W28 runs Mon 13 – Sun 19 July.
const WEEK = '2026-W28' as WeekRef
const TODAY = '2026-07-15' as DayRef

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Rozciąganie',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 5 },
    status: 'open',
    ...overrides,
  }
}

function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Jakość snu',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'rating',
    cadence: 'weekly',
    ratingScale: 5,
    status: 'open',
    ...overrides,
  }
}

function entry(dayRef: string, value: number | null, subjectId = 'habit-1', subjectType: 'habit' | 'tracker' = 'habit'): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

function assignment(dayRef: string, subjectId = 'habit-1'): MeasurementDayAssignment {
  return {
    id: `assignment-${dayRef}`,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    subjectType: 'habit',
    subjectId,
    dayRef: dayRef as DayRef,
  }
}

describe('quietWeekDays', () => {
  it('labels the seven days and marks today and the days still ahead', () => {
    const days = quietWeekDays(WEEK, TODAY)

    expect(days).toHaveLength(7)
    expect(days[0].shortLabel).toBe('pon')
    expect(days.find(day => day.isToday)?.dayRef).toBe(TODAY)
    expect(days.filter(day => day.isFuture).map(day => day.dayNumber)).toEqual(['16', '17', '18', '19'])
  })
})

describe('quietMonthWeeks', () => {
  it('uses the real weeks of the month and marks the ones reaching outside it', () => {
    const weeks = quietMonthWeeks('2026-07' as MonthRef)

    expect(weeks.map(week => week.label)).toEqual(['T26', 'T27', 'T28', 'T29', 'T30'])
    expect(weeks[0].partial).toBe(true)
    expect(weeks[1].partial).toBe(false)
  })
})

describe('buildQuietEvidenceRows', () => {
  it('keeps a day without an entry as "no record" instead of a zero', () => {
    const [row] = buildQuietEvidenceRows(
      [
        {
          key: 'habit:habit-1',
          subjectType: 'habit',
          subject: habit(),
          actualValue: 2,
          target: { kind: 'count', operator: 'min', value: 5 },
        },
      ],
      [entry('2026-07-13', null), entry('2026-07-15', null)],
      [assignment('2026-07-13'), assignment('2026-07-14')],
      WEEK,
      TODAY,
    )

    expect(row.cells.map(cell => cell.value)).toEqual([1, null, 1, null, null, null, null])
    expect(row.cells.map(cell => cell.planned)).toEqual([true, true, false, false, false, false, false])
    expect(row.result).toBe('2 / 5')
  })

  it('reads an average target as an average and scales rating cells to the rating scale', () => {
    const [row] = buildQuietEvidenceRows(
      [
        {
          key: 'tracker:tracker-1',
          subjectType: 'tracker',
          subject: tracker(),
          actualValue: 3.5,
          target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
        },
      ],
      [entry('2026-07-13', 3, 'tracker-1', 'tracker'), entry('2026-07-14', 4, 'tracker-1', 'tracker')],
      [],
      WEEK,
      TODAY,
    )

    expect(row.result).toBe('śr. 3,5 / 4')
    expect(row.cellMax).toBe(5)
  })

  it('says so plainly when nothing was recorded', () => {
    const [row] = buildQuietEvidenceRows(
      [{ key: 'habit:habit-1', subjectType: 'habit', subject: habit(), actualValue: undefined }],
      [],
      [],
      WEEK,
      TODAY,
    )

    expect(row.result).toBe('Brak zapisów')
  })
})

describe('area tags', () => {
  it('round-trips through one prompt response and refuses duplicates case-insensitively', () => {
    const tags = addTag(addTag(addTag([], 'sen'), '  za  mało  ruchu '), 'SEN')

    expect(tags).toEqual(['sen', 'za mało ruchu'])
    expect(parseTags(serializeTags(tags))).toEqual(tags)
    expect(parseTags(undefined)).toEqual([])
  })
})

describe('plural', () => {
  it('follows the Polish 1 / 2–4 / 5+ pattern including the teens exception', () => {
    expect([1, 2, 5, 12, 22].map(count => plural(count, 'wpis', 'wpisy', 'wpisów'))).toEqual([
      'wpis',
      'wpisy',
      'wpisów',
      'wpisów',
      'wpisy',
    ])
  })
})
