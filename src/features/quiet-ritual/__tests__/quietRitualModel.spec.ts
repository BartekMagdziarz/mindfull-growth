import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import {
  addTag,
  allAreaTags,
  areaTagKey,
  buildQuietEvidenceRows,
  matchTags,
  parseTags,
  plural,
  quietMonthWeeks,
  quietWeekDays,
  ratingStopFromOffset,
  serializeTags,
  steppedRating,
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

function entry(
  dayRef: string,
  value: number | null,
  subjectId = 'habit-1',
  subjectType: 'habit' | 'tracker' = 'habit'
): DailyMeasurementEntry {
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
    expect(days.filter(day => day.isFuture).map(day => day.dayNumber)).toEqual([
      '16',
      '17',
      '18',
      '19',
    ])
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
  it('distinguishes a partial checklist record from a met day', () => {
    const subject = habit({
      entryMode: 'multi-completion',
      multiItems: [
        { id: 'a', label: 'A', weight: 1 },
        { id: 'b', label: 'B', weight: 1 },
        { id: 'old', label: 'Archived', weight: 1, archived: true },
      ],
    })
    const [row] = buildQuietEvidenceRows(
      [{ key: 'habit:habit-1', subjectType: 'habit', subject }],
      [
        { ...entry('2026-07-13', null), checkedItemIds: ['a'] },
        { ...entry('2026-07-14', null), checkedItemIds: ['a', 'b'] },
      ],
      [assignment('2026-07-13'), assignment('2026-07-14')],
      WEEK,
      TODAY
    )
    expect(row.cells.slice(0, 2).map(cell => cell.met)).toEqual([false, true])
    expect(row.result).toBe('1 / 2 dni')
  })

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
      TODAY
    )

    expect(row.cells.map(cell => cell.value)).toEqual([1, null, 1, null, null, null, null])
    expect(row.cells.map(cell => cell.planned)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ])
    // placed on two days, done on two days (one of them unplanned) → days, not the count target
    expect(row.result).toBe('2 / 2 dni')
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
      [
        entry('2026-07-13', 3, 'tracker-1', 'tracker'),
        entry('2026-07-14', 4, 'tracker-1', 'tracker'),
      ],
      [],
      WEEK,
      TODAY
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
      TODAY
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

  it('keys tags per rating axis and still reads the legacy undivided list', () => {
    expect(areaTagKey('physical')).toBe('tags:physical')
    expect(areaTagKey('physical', 'load')).toBe('tags:physical:load')
    expect(
      allAreaTags(
        {
          'tags:physical:load': 'sen',
          'tags:physical:state': 'spokój\nsen',
          'tags:physical': 'stary',
        },
        'physical'
      )
    ).toEqual(['sen', 'spokój', 'stary'])
    expect(allAreaTags(undefined, 'physical')).toEqual([])
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

describe('quietMonthAreaSeries', () => {
  it('lays the bundle pairs onto the month weeks and leaves gaps', async () => {
    const { quietMonthAreaSeries, quietMonthWeeks } = await import('../quietRitualModel')
    const weeks = quietMonthWeeks('2026-08' as MonthRef)
    const gap = { load: null, state: null }
    const series = quietMonthAreaSeries(weeks, [
      {
        weekRef: weeks[1].weekRef,
        loadState: {
          body: { load: 4, state: 5 },
          emotions: gap,
          tasks: { load: 2, state: 2 },
          closeOnes: gap,
        },
      },
    ])
    expect(series.body).toHaveLength(weeks.length)
    expect(series.body[1]).toMatchObject({ load: 4, state: 5 })
    expect(series.body[0]).toMatchObject(gap)
    expect(series.tasks[1]).toMatchObject({ load: 2, state: 2 })
    expect(series.emotions.every(p => p.load === null)).toBe(true)
  })
})

describe('matchTags', () => {
  const pool = ['mało snu', 'delegacja', 'termin oferty', 'Dwa treningi', 'oferta dnia']

  it('returns the whole pool without the chosen tags when nothing is typed', () => {
    expect(matchTags(pool, [], '')).toEqual(pool)
    expect(matchTags(pool, ['Delegacja'], '  ')).not.toContain('delegacja')
    expect(matchTags(pool, [], '', 2)).toEqual(['mało snu', 'delegacja'])
  })

  it('puts prefix matches before tags that only contain the text, ignoring case', () => {
    expect(matchTags(pool, [], ' OF')).toEqual(['oferta dnia', 'termin oferty'])
    expect(matchTags(pool, [], 'tr')).toEqual(['Dwa treningi'])
    expect(matchTags(pool, ['oferta dnia'], 'of')).toEqual(['termin oferty'])
    expect(matchTags(pool, [], 'xyz')).toEqual([])
  })
})

describe('rating counter and live mark helpers', () => {
  it('steps one place: starts at 1, clears below 1, stops at 5', () => {
    expect(steppedRating(null, 1)).toBe(1)
    expect(steppedRating(null, -1)).toBeNull()
    expect(steppedRating(1, -1)).toBeNull()
    expect(steppedRating(3, 1)).toBe(4)
    expect(steppedRating(5, 1)).toBe(5)
  })

  it('snaps a pointer on the mark to the nearest of five places', () => {
    // mark 560 px wide and 48 px high: place centres 24 · 152 · 280 · 408 · 536
    expect([24, 152, 280, 408, 536].map(x => ratingStopFromOffset(x, 560, 48))).toEqual([
      1, 2, 3, 4, 5,
    ])
    expect(ratingStopFromOffset(87, 560, 48)).toBe(1)
    expect(ratingStopFromOffset(89, 560, 48)).toBe(2)
    expect(ratingStopFromOffset(-40, 560, 48)).toBe(1)
    expect(ratingStopFromOffset(900, 560, 48)).toBe(5)
    expect(ratingStopFromOffset(10, 40, 48)).toBe(1)
  })
})
