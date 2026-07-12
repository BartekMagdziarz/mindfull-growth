import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, Tracker, WeeklyIntention } from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import type { MonthPlanningBundle } from '@/services/planningStateQueries'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import type { MonthV2OverviewData, MonthV2Series } from '@/services/monthV2Overview'
import {
  buildMonthV2Activity,
  buildMonthV2OverviewViewModel,
} from '@/services/monthV2Overview'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MONTH = '2026-07' as MonthRef // Jul 2026: weeks 2026-W26 … 2026-W30 (Jun 29 – Aug 2)
const TODAY = '2026-07-15' as DayRef // Wednesday of 2026-W28 → W26/W27 past, W28 current

function makeEntry(
  subjectId: string,
  dayRef: string,
  value: number | null = null,
  overrides: Partial<DailyMeasurementEntry> = {}
): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType: 'habit',
    subjectId,
    dayRef: dayRef as DayRef,
    value,
    ...overrides,
  }
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Medytacja',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
  }
}

function makeKeyResult(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Kilometry',
    goalId: 'goal-1',
    isActive: true,
    entryMode: 'value',
    cadence: 'weekly',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
    status: 'open',
    ...overrides,
  }
}

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Nastrój',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'rating',
    cadence: 'weekly',
    status: 'open',
    ...overrides,
  }
}

function makeIntention(overrides: Partial<WeeklyIntention> = {}): WeeklyIntention {
  return {
    id: 'intention-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Wieczorny spacer',
    isActive: true,
    weekRef: '2026-W27' as WeekRef,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 2 },
    status: 'open',
    priorityIds: [],
    ...overrides,
  }
}

function makeItem(
  subject: KeyResult | Habit | Tracker,
  subjectType: MonthObjectItem['subjectType'],
  entries: DailyMeasurementEntry[],
  overrides: Partial<MonthObjectItem> = {}
): MonthObjectItem {
  return {
    key: `${subjectType}:${subject.id}`,
    subjectType,
    subject,
    planning: { scheduledDayRefs: [] },
    measurement: buildMeasurementSummary(subject, entries, MONTH, TODAY),
    sortOrder: 0,
    ...overrides,
  }
}

function makeData(overrides: Partial<MonthV2OverviewData> = {}): MonthV2OverviewData {
  const rawEntries = overrides.planning?.rawEntries ?? []
  const planning = {
    monthRef: MONTH,
    goalItems: [],
    measurementItems: [],
    cadencedItems: [],
    trackerItems: [],
    initiativeItems: [],
    rawEntries,
  } as unknown as MonthPlanningBundle
  return {
    monthRef: MONTH,
    todayRef: TODAY,
    planning,
    objectItems: [],
    monthlyReflection: null,
    weeklyReflections: [],
    weeklyIntentions: [],
    activity: { days: [], totals: { emotionSessions: 0, journalEntries: 0, exercises: 0 } },
    ...overrides,
  }
}

function dataWithItems(
  objectItems: MonthObjectItem[],
  rawEntries: DailyMeasurementEntry[],
  overrides: Partial<MonthV2OverviewData> = {}
): MonthV2OverviewData {
  const base = makeData(overrides)
  return { ...base, objectItems, planning: { ...base.planning, rawEntries } }
}

function sectionOf(vm: ReturnType<typeof buildMonthV2OverviewViewModel>, key: string) {
  const section = vm.sections.find((s) => s.key === key)
  if (!section) throw new Error(`missing section ${key}`)
  return section
}

function firstRow(vm: ReturnType<typeof buildMonthV2OverviewViewModel>, key: string) {
  const section = sectionOf(vm, key)
  const row = section.groups[0]?.rows[0]
  if (!row) throw new Error(`no rows in section ${key}`)
  return row
}

function weekOf(series: MonthV2Series, weekRef: string) {
  const week = series.weeks.find((w) => w.weekRef === weekRef)
  if (!week) throw new Error(`missing week ${weekRef}`)
  return week
}

// ── Week columns ─────────────────────────────────────────────────────────────

describe('month V2 week columns', () => {
  it('keeps the natural week count and canonical week refs (July 2026 = 5 weeks)', () => {
    const vm = buildMonthV2OverviewViewModel(makeData())
    expect(vm.weeks.map((w) => w.weekRef)).toEqual([
      '2026-W26',
      '2026-W27',
      '2026-W28',
      '2026-W29',
      '2026-W30',
    ])
  })

  it('handles the year boundary with canonical (non-ISO) week numbering', () => {
    const vm = buildMonthV2OverviewViewModel(
      makeData({ monthRef: '2026-01' as MonthRef, todayRef: '2026-01-15' as DayRef })
    )
    // Jan 1–4 2026 belong to the last week of 2025 (weeks are numbered from the
    // year's first Monday) — a strict-ISO implementation would say 2026-W01.
    expect(vm.weeks[0]?.weekRef).toBe('2025-W52')
    expect(vm.weeks[0]?.isBoundary).toBe(true)
    expect(vm.weeks[0]?.inMonthDayRefs).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'])
  })

  it('derives the phase from the visible in-month span', () => {
    const vm = buildMonthV2OverviewViewModel(makeData())
    expect(vm.weeks.map((w) => w.phase)).toEqual(['past', 'past', 'current', 'future', 'future'])
  })

  it('marks boundary weeks and restricts inMonthDayRefs to the viewed month', () => {
    const vm = buildMonthV2OverviewViewModel(makeData())
    const first = vm.weeks[0]!
    expect(first.isBoundary).toBe(true) // Jun 29–30 spill in from June
    expect(first.inMonthDayRefs[0]).toBe('2026-07-01')
    const middle = vm.weeks[2]!
    expect(middle.isBoundary).toBe(false)
    expect(middle.inMonthDayRefs).toHaveLength(7)
  })

  it('attaches the full 4×3 reflection matrix only for weeks with a reflection', () => {
    const reflection = {
      id: 'wr-1',
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      weekRef: '2026-W27' as WeekRef,
      physicalIntensityRating: 4,
      emotionalIntensityRating: 3,
      taskLoadRating: 5,
      closeOnesNeedsRating: null,
      physicalCareRating: 2,
      emotionalProcessingRating: 3,
      productivityRating: 4,
      closeOnesSupportRating: 3,
      moodRating: 4,
      energyRating: 3,
      calmRating: 2,
      connectionRating: 5,
      promptResponses: {},
      freeformReflection: '',
      aiSummary: '',
    } as WeeklyReflection

    const vm = buildMonthV2OverviewViewModel(makeData({ weeklyReflections: [reflection] }))
    const withMatrix = vm.weeks.find((w) => w.weekRef === '2026-W27')!
    expect(withMatrix.reflectionMatrix).toHaveLength(4)
    expect(withMatrix.reflectionMatrix![0]!.cells).toHaveLength(3)
    // Unrated cell → null rating, neutral (null) color.
    const closeOnesRow = withMatrix.reflectionMatrix!.find((r) => r.areaKey === 'closeOnes')!
    expect(closeOnesRow.cells[0]!.rating).toBeNull()
    expect(closeOnesRow.cells[0]!.color).toBeNull()
    expect(vm.weeks.find((w) => w.weekRef === '2026-W26')!.reflectionMatrix).toBeNull()
  })
})

// ── Cadence semantics ────────────────────────────────────────────────────────

describe('month V2 cadence semantics', () => {
  it('weekly cadence aggregates the FULL week including out-of-month days', () => {
    const habit = makeHabit()
    const entries = [
      makeEntry(habit.id, '2026-06-29'), // Monday of W27, outside July
      makeEntry(habit.id, '2026-07-01'),
      makeEntry(habit.id, '2026-07-02'),
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const week = weekOf(firstRow(vm, 'habits').series, '2026-W26')
    expect(week.actualValue).toBe(3)
    expect(week.status).toBe('met')
    expect(week.contributionOnly).toBe(false)
  })

  it('monthly cadence contributes only in-month days and is never judged per week', () => {
    const habit = makeHabit({
      cadence: 'monthly',
      target: { kind: 'count', operator: 'min', value: 10 },
    })
    const entries = [
      makeEntry(habit.id, '2026-06-29'), // outside July → excluded
      makeEntry(habit.id, '2026-07-01'),
      makeEntry(habit.id, '2026-07-02'),
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const series = firstRow(vm, 'habits').series
    expect(series.kind).toBe('monthly-contribution')
    const week = weekOf(series, '2026-W26')
    expect(week.actualValue).toBe(2)
    expect(week.contributionOnly).toBe(true)
    expect(week.targetValue).toBeUndefined()
    expect(week.status).toBe('in-progress')
  })

  it('the month result stays separate from weekly contributions', () => {
    const habit = makeHabit({
      cadence: 'monthly',
      target: { kind: 'count', operator: 'min', value: 2 },
    })
    const entries = [makeEntry(habit.id, '2026-07-01'), makeEntry(habit.id, '2026-07-08')]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const row = firstRow(vm, 'habits')
    expect(row.monthSummary?.actualValue).toBe(2)
    expect(row.monthSummary?.evaluationStatus).toBe('met')
    expect(row.series.weeks.every((w) => w.targetValue === undefined)).toBe(true)
  })
})

// ── Neutrality ───────────────────────────────────────────────────────────────

describe('month V2 neutral current/future weeks', () => {
  it('never marks the current or future weeks as missed', () => {
    const habit = makeHabit() // min 3/week
    const entries = [
      makeEntry(habit.id, '2026-07-06'), // W28 (past): 1 < 3 → missed
      makeEntry(habit.id, '2026-07-13'), // W29 (current): 1 < 3 → in-progress, not missed
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const series = firstRow(vm, 'habits').series
    expect(weekOf(series, '2026-W27').status).toBe('missed')
    expect(weekOf(series, '2026-W28').status).toBe('in-progress')
    expect(weekOf(series, '2026-W29').status).toBe('no-data')
    expect(weekOf(series, '2026-W30').status).toBe('no-data')
  })

  it('keeps past weeks of a targetless tracker neutral', () => {
    const tracker = makeTracker()
    const entries = [makeEntry(tracker.id, '2026-07-07', 4, { subjectType: 'tracker' })]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(tracker, 'tracker', entries)], entries)
    )
    const series = firstRow(vm, 'trackers').series
    expect(weekOf(series, '2026-W27').status).toBe('in-progress')
    expect(weekOf(series, '2026-W26').status).toBe('no-data')
  })

  it('leaves missing data as undefined, never zero', () => {
    const habit = makeHabit()
    const vm = buildMonthV2OverviewViewModel(dataWithItems([makeItem(habit, 'habit', [])], []))
    for (const week of firstRow(vm, 'habits').series.weeks) {
      expect(week.actualValue).toBeUndefined()
    }
  })
})

// ── Series selection per entry mode ──────────────────────────────────────────

describe('month V2 series selection', () => {
  it('completion with target ≤7 → segments; >7 → bullet', () => {
    const small = makeHabit({ id: 'h-small' })
    const big = makeHabit({
      id: 'h-big',
      target: { kind: 'count', operator: 'min', value: 10 },
    })
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(small, 'habit', []), makeItem(big, 'habit', [])], [])
    )
    const rows = sectionOf(vm, 'habits').groups[0]!.rows
    expect(rows[0]!.series).toMatchObject({ kind: 'completion-progress', display: 'segments' })
    expect(rows[1]!.series).toMatchObject({ kind: 'completion-progress', display: 'bullet' })
  })

  it('completion with specific days → 7 fixed Mon–Sun slots with in-month flags', () => {
    const habit = makeHabit()
    const entries = [makeEntry(habit.id, '2026-07-01')]
    const item = makeItem(habit, 'habit', entries, {
      planning: {
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-07-01' as DayRef, '2026-07-03' as DayRef],
      },
    })
    const vm = buildMonthV2OverviewViewModel(dataWithItems([item], entries))
    const series = firstRow(vm, 'habits').series
    expect(series.kind).toBe('scheduled-days')
    const week = weekOf(series, '2026-W26')
    expect(week.days).toHaveLength(7)
    expect(week.days!.filter((d) => d.scheduled)).toHaveLength(2)
    expect(week.days!.filter((d) => d.completed)).toHaveLength(1)
    // Jun 29–30 are outside July.
    expect(week.days!.filter((d) => !d.inMonth)).toHaveLength(2)
  })

  it('counter → bars with a zero-based shared scale', () => {
    const habit = makeHabit({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 12 },
    })
    const entries = [makeEntry(habit.id, '2026-07-06', 5), makeEntry(habit.id, '2026-07-07', 3)]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const series = firstRow(vm, 'habits').series
    expect(series.kind).toBe('bars')
    if (series.kind === 'bars') {
      expect(series.scale.min).toBe(0)
      expect(series.scale.max).toBe(12) // target dominates the scale
    }
    expect(weekOf(series, '2026-W27').actualValue).toBe(8)
  })

  it('rating → fixed object scale', () => {
    const habit = makeHabit({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
      ratingScaleMin: 2,
      ratingScale: 7,
    })
    const vm = buildMonthV2OverviewViewModel(dataWithItems([makeItem(habit, 'habit', [])], []))
    const series = firstRow(vm, 'habits').series
    expect(series.kind).toBe('rating')
    if (series.kind === 'rating') {
      expect(series.scale).toEqual({ min: 2, max: 7 })
    }
  })

  it('value sum → bars; average and last → line with the aggregation preserved', () => {
    const sum = makeKeyResult({ id: 'kr-sum' })
    const avg = makeKeyResult({
      id: 'kr-avg',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 5 },
    })
    const last = makeKeyResult({
      id: 'kr-last',
      target: { kind: 'value', aggregation: 'last', operator: 'lte', value: 80 },
    })
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems(
        [
          makeItem(sum, 'keyResult', [], { parentGoalId: 'goal-1', parentGoalTitle: 'Cel' }),
          makeItem(avg, 'keyResult', [], { parentGoalId: 'goal-1', parentGoalTitle: 'Cel' }),
          makeItem(last, 'keyResult', [], { parentGoalId: 'goal-1', parentGoalTitle: 'Cel' }),
        ],
        []
      )
    )
    const rows = sectionOf(vm, 'goals').groups[0]!.rows
    expect(rows[0]!.series.kind).toBe('bars')
    expect(rows[1]!.series).toMatchObject({ kind: 'line', aggregation: 'average' })
    expect(rows[2]!.series).toMatchObject({ kind: 'line', aggregation: 'last' })
  })

  it('value last picks the chronologically last entry per week', () => {
    const kr = makeKeyResult({
      target: { kind: 'value', aggregation: 'last', operator: 'gte', value: 70 },
    })
    const entries = [
      makeEntry(kr.id, '2026-07-07', 72, { subjectType: 'keyResult' }),
      makeEntry(kr.id, '2026-07-06', 68, { subjectType: 'keyResult' }),
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems(
        [makeItem(kr, 'keyResult', entries, { parentGoalId: 'goal-1', parentGoalTitle: 'Cel' })],
        entries
      )
    )
    expect(weekOf(firstRow(vm, 'goals').series, '2026-W27').actualValue).toBe(72)
  })
})

// ── Multi-completion ─────────────────────────────────────────────────────────

describe('month V2 multi-completion', () => {
  const multiHabit = makeHabit({
    id: 'h-multi',
    entryMode: 'multi-completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    multiItems: [
      { id: 'a', label: 'A', weight: 2 },
      { id: 'b', label: 'B', weight: 1 },
      { id: 'c', label: 'C', weight: 1 },
    ],
    multiDailyThreshold: 3,
  })

  const entries = [
    // W28: met (a+b = 3 pts), partial (b = 1 pt), met (a+c = 3 pts)
    makeEntry('h-multi', '2026-07-06', null, { checkedItemIds: ['a', 'b'] }),
    makeEntry('h-multi', '2026-07-07', null, { checkedItemIds: ['b'] }),
    makeEntry('h-multi', '2026-07-08', null, { checkedItemIds: ['a', 'c'] }),
  ]

  it('is its own series: MET days as the value, partial days in entryCount', () => {
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(multiHabit, 'habit', entries)], entries)
    )
    const series = firstRow(vm, 'habits').series
    expect(series.kind).toBe('multi-completion')
    const week = weekOf(series, '2026-W27')
    expect(week.actualValue).toBe(2) // met days only
    expect(week.entryCount).toBe(3) // partial day included
    expect(week.status).toBe('missed') // 2 < target 3 in a past week
  })

  it('exposes met/partial/empty day slots with points and threshold', () => {
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(multiHabit, 'habit', entries)], entries)
    )
    const week = weekOf(firstRow(vm, 'habits').series, '2026-W27')
    expect(week.multiDays).toHaveLength(7)
    const states = week.multiDays!.map((d) => d.state)
    expect(states).toEqual(['met', 'partial', 'met', 'empty', 'empty', 'empty', 'empty'])
    expect(week.multiDays![0]).toMatchObject({ points: 3, threshold: 3 })
    expect(week.multiDays![1]).toMatchObject({ points: 1, threshold: 3 })
  })

  it('defaults the threshold to the sum of active weights', () => {
    const noThreshold = makeHabit({
      id: 'h-multi-2',
      entryMode: 'multi-completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      multiItems: [
        { id: 'a', label: 'A', weight: 2 },
        { id: 'b', label: 'B', weight: 1 },
      ],
      multiDailyThreshold: undefined,
    })
    const partial = [makeEntry('h-multi-2', '2026-07-06', null, { checkedItemIds: ['a'] })]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(noThreshold, 'habit', partial)], partial)
    )
    const week = weekOf(firstRow(vm, 'habits').series, '2026-W27')
    expect(week.multiDays![0]).toMatchObject({ state: 'partial', points: 2, threshold: 3 })
    expect(week.actualValue).toBe(0) // an entry exists, but zero days reached the threshold
    expect(week.entryCount).toBe(1)
  })

  it('monthly cadence multi counts MET days from in-month days only, neutrally', () => {
    const monthlyMulti = makeHabit({
      id: 'h-multi-3',
      cadence: 'monthly',
      entryMode: 'multi-completion',
      target: { kind: 'count', operator: 'min', value: 10 },
      multiItems: [{ id: 'a', label: 'A', weight: 1 }],
    })
    const monthlyEntries = [
      makeEntry('h-multi-3', '2026-06-29', null, { checkedItemIds: ['a'] }), // outside July
      makeEntry('h-multi-3', '2026-07-01', null, { checkedItemIds: ['a'] }),
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(monthlyMulti, 'habit', monthlyEntries)], monthlyEntries)
    )
    const series = firstRow(vm, 'habits').series
    expect(series).toMatchObject({ kind: 'monthly-contribution', display: 'multi' })
    const week = weekOf(series, '2026-W26')
    expect(week.actualValue).toBe(1)
    expect(week.status).toBe('in-progress')
    expect(week.multiDays).toHaveLength(7)
  })
})

// ── entryDays + week target overrides ────────────────────────────────────────

describe('month V2 entryDays and week overrides', () => {
  it('surfaces the entryDays conjunction (primary met, presence missed → missed)', () => {
    const habit = makeHabit({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 5, entryDays: { operator: 'min', value: 3 } },
    })
    const entries = [
      makeEntry(habit.id, '2026-07-06', 6), // sum 6 ≥ 5 → primary met
      makeEntry(habit.id, '2026-07-07', 0), // logged zero does NOT qualify for counters
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(habit, 'habit', entries)], entries)
    )
    const week = weekOf(firstRow(vm, 'habits').series, '2026-W27')
    expect(week.actualValue).toBe(6)
    expect(week.qualifiedEntryDays).toBe(1)
    expect(week.status).toBe('missed')
  })

  it('applies week target overrides on top of the (already month-cascaded) subject', () => {
    const habit = makeHabit() // base target min 3
    const entries = [
      makeEntry(habit.id, '2026-07-01'),
      makeEntry(habit.id, '2026-07-02'),
      makeEntry(habit.id, '2026-07-03'),
      makeEntry(habit.id, '2026-07-06'),
      makeEntry(habit.id, '2026-07-07'),
      makeEntry(habit.id, '2026-07-08'),
    ]
    const item = makeItem(habit, 'habit', entries, {
      weekTargetOverrides: {
        ['2026-W27' as WeekRef]: { kind: 'count', operator: 'min', value: 5 },
      },
    })
    const vm = buildMonthV2OverviewViewModel(dataWithItems([item], entries))
    const series = firstRow(vm, 'habits').series
    const w27 = weekOf(series, '2026-W26')
    const w28 = weekOf(series, '2026-W27')
    expect(w27).toMatchObject({ targetValue: 3, hasWeekOverride: false, status: 'met' })
    // 3 entries meet the base target but MISS the overridden 5.
    expect(w28).toMatchObject({ targetValue: 5, hasWeekOverride: true, status: 'missed' })
  })
})

// ── Sections ─────────────────────────────────────────────────────────────────

describe('month V2 sections', () => {
  it('groups KRs under their goals and collects orphans under goal:unlinked', () => {
    const kr1 = makeKeyResult({ id: 'kr-a' })
    const kr2 = makeKeyResult({ id: 'kr-b', goalId: 'goal-2' })
    const orphan = makeKeyResult({ id: 'kr-orphan' })
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems(
        [
          makeItem(kr1, 'keyResult', [], {
            parentGoalId: 'goal-1',
            parentGoalTitle: 'Zdrowie',
            parentGoalIcon: 'flag',
            sortOrder: 0,
          }),
          makeItem(kr2, 'keyResult', [], {
            parentGoalId: 'goal-2',
            parentGoalTitle: 'Praca',
            sortOrder: 1000,
          }),
          makeItem(orphan, 'keyResult', [], { sortOrder: 2000 }),
        ],
        []
      )
    )
    const goals = sectionOf(vm, 'goals')
    expect(goals.objectCount).toBe(2) // linked goals
    expect(goals.rowCount).toBe(3)
    expect(goals.groups.map((g) => g.key)).toEqual(['goal:goal-1', 'goal:goal-2', 'goal:unlinked'])
    expect(goals.groups[0]).toMatchObject({ title: 'Zdrowie', goalId: 'goal-1' })
    expect(goals.groups[2]!.title).toBeUndefined()
    // Row icon falls back to the parent goal's icon (KRs have no own icon).
    expect(goals.groups[0]!.rows[0]!.icon).toBe('flag')
  })

  it('computes neutral coverage as rows with at least one entry', () => {
    const h1 = makeHabit({ id: 'h-1' })
    const h2 = makeHabit({ id: 'h-2' })
    const entries = [makeEntry('h-1', '2026-07-06')]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([makeItem(h1, 'habit', entries), makeItem(h2, 'habit', [])], entries)
    )
    const habits = sectionOf(vm, 'habits')
    expect(habits.rowCount).toBe(2)
    expect(habits.coveredRows).toBe(1)
  })

  it('flags non-open objects as not editable', () => {
    const retired = makeHabit({ id: 'h-retired', status: 'retired' })
    const vm = buildMonthV2OverviewViewModel(dataWithItems([makeItem(retired, 'habit', [])], []))
    expect(firstRow(vm, 'habits').editable).toBe(false)
  })

  it('builds the intentions section with data only in the home week', () => {
    const intention = makeIntention() // 2026-W27, min 2
    const entries = [
      makeEntry(intention.id, '2026-07-06', null, { subjectType: 'weeklyIntention' }),
      makeEntry(intention.id, '2026-07-07', null, { subjectType: 'weeklyIntention' }),
    ]
    const vm = buildMonthV2OverviewViewModel(
      dataWithItems([], entries, { weeklyIntentions: [intention] })
    )
    const section = sectionOf(vm, 'intentions')
    expect(section.rowCount).toBe(1)
    expect(section.coveredRows).toBe(1)
    const row = section.groups[0]!.rows[0]!
    expect(row.homeWeekRef).toBe('2026-W27')
    expect(row.editable).toBe(false)
    const home = weekOf(row.series, '2026-W27')
    expect(home).toMatchObject({ actualValue: 2, status: 'met' })
    expect(home.inactive).toBeUndefined()
    const other = weekOf(row.series, '2026-W28')
    expect(other.inactive).toBe(true)
    expect(other.actualValue).toBeUndefined()
    expect(row.monthSummary?.evaluationStatus).toBe('met')
  })

  it('always returns the four sections in order', () => {
    const vm = buildMonthV2OverviewViewModel(makeData())
    expect(vm.sections.map((s) => s.key)).toEqual(['goals', 'habits', 'trackers', 'intentions'])
  })
})

// ── Rail: compass + activity ─────────────────────────────────────────────────

describe('month V2 rail', () => {
  const reflection = {
    id: 'mr-1',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
    monthRef: MONTH,
    balanceRating: 4,
    purposeRating: 5,
    growthRating: 3,
    coherenceRating: null,
    agencyRating: 2,
    promptResponses: {},
    freeformReflection: '',
    aiSummary: '',
  } as MonthlyReflection

  it('builds the compass from the 5 structured dimensions, keeping nulls', () => {
    const vm = buildMonthV2OverviewViewModel(makeData({ monthlyReflection: reflection }))
    expect(vm.rail.compass?.axes.map((a) => a.value)).toEqual([4, 5, 3, null, 2])
    expect(vm.rail.compass?.axes.map((a) => a.key)).toEqual([
      'balanceRating',
      'purposeRating',
      'growthRating',
      'coherenceRating',
      'agencyRating',
    ])
  })

  it('hides the compass without a reflection or when every axis is null', () => {
    expect(buildMonthV2OverviewViewModel(makeData()).rail.compass).toBeNull()
    const empty = {
      ...reflection,
      balanceRating: null,
      purposeRating: null,
      growthRating: null,
      coherenceRating: null,
      agencyRating: null,
    } as MonthlyReflection
    expect(
      buildMonthV2OverviewViewModel(makeData({ monthlyReflection: empty })).rail.compass
    ).toBeNull()
  })
})

describe('buildMonthV2Activity', () => {
  it('maps journal/emotion/exercise markers per day and totals them', () => {
    const activity = buildMonthV2Activity(MONTH, TODAY, {
      journalCreatedAts: ['2026-07-03T10:00:00.000Z', '2026-07-03T21:00:00.000Z'],
      emotionLogs: [
        {
          createdAt: '2026-07-03T12:00:00.000Z',
          quadrants: ['high-energy-high-pleasantness', 'low-energy-low-pleasantness'],
        },
        { createdAt: '2026-07-05T09:00:00.000Z', quadrants: [] },
      ],
      exerciseDayRefs: ['2026-07-03' as DayRef, '2026-07-03' as DayRef, '2026-06-30' as DayRef],
    })

    expect(activity.days).toHaveLength(31)
    const day3 = activity.days.find((d) => d.dayRef === '2026-07-03')!
    expect(day3.journalWritten).toBe(true)
    expect(day3.emotionCount).toBe(1)
    expect(day3.quadrantCounts['high-energy-high-pleasantness']).toBe(1)
    expect(day3.quadrantCounts['low-energy-low-pleasantness']).toBe(1)
    expect(day3.exerciseCount).toBe(2)
    expect(day3.weekdayIndex).toBe(4) // 2026-07-03 is a Friday

    // June 30 completion is outside the month → not counted anywhere.
    expect(activity.totals).toEqual({ emotionSessions: 2, journalEntries: 1, exercises: 2 })
  })

  it('zeroes markers on future days', () => {
    const activity = buildMonthV2Activity(MONTH, TODAY, {
      journalCreatedAts: ['2026-07-20T10:00:00.000Z'],
      emotionLogs: [{ createdAt: '2026-07-20T10:00:00.000Z', quadrants: [] }],
      exerciseDayRefs: ['2026-07-20' as DayRef],
    })
    const day20 = activity.days.find((d) => d.dayRef === '2026-07-20')!
    expect(day20.isFuture).toBe(true)
    expect(day20.journalWritten).toBe(false)
    expect(day20.emotionCount).toBe(0)
    expect(day20.exerciseCount).toBe(0)
    expect(activity.days.find((d) => d.dayRef === TODAY)!.isToday).toBe(true)
  })
})
