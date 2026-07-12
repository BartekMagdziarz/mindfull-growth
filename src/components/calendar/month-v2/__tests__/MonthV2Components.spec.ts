import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { fireEvent, render } from '@testing-library/vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  MonthV2Section,
  MonthV2Series,
  MonthV2WeekColumn,
  MonthV2WeekDatum,
} from '@/services/monthV2Overview'
import MonthSeriesChart from '../MonthSeriesChart.vue'
import MonthObjectSection from '../MonthObjectSection.vue'
import MonthWeekGrid from '../MonthWeekGrid.vue'
import MonthCompassChart from '../MonthCompassChart.vue'

const WEEK_REFS = ['2026-W26', '2026-W27', '2026-W28', '2026-W29', '2026-W30'] as WeekRef[]

function makeWeekDatum(overrides: Partial<MonthV2WeekDatum> = {}): MonthV2WeekDatum {
  return {
    weekRef: WEEK_REFS[0]!,
    phase: 'past',
    entryCount: 0,
    status: 'no-data',
    contributionOnly: false,
    hasWeekOverride: false,
    ...overrides,
  }
}

function fiveWeeks(build: (weekRef: WeekRef, i: number) => Partial<MonthV2WeekDatum>) {
  return WEEK_REFS.map((weekRef, i) => makeWeekDatum({ weekRef, ...build(weekRef, i) }))
}

function makeColumn(weekRef: WeekRef, overrides: Partial<MonthV2WeekColumn> = {}): MonthV2WeekColumn {
  return {
    weekRef,
    weekStart: '2026-07-06' as DayRef,
    weekEnd: '2026-07-12' as DayRef,
    inMonthDayRefs: [],
    isBoundary: false,
    phase: 'past',
    reflectionMatrix: null,
    ...overrides,
  }
}

function makeRow(series: MonthV2Series, overrides: Record<string, unknown> = {}) {
  return {
    key: 'habit:h-1',
    subjectId: 'h-1',
    subjectType: 'habit' as const,
    title: 'Medytacja',
    cadence: 'weekly' as const,
    entryMode: 'completion' as const,
    editable: true,
    subject: { id: 'h-1' } as never,
    series,
    ...overrides,
  }
}

function makeSection(overrides: Partial<MonthV2Section> = {}): MonthV2Section {
  const series: MonthV2Series = {
    kind: 'completion-progress',
    display: 'segments',
    weeks: fiveWeeks(() => ({})),
  }
  const rows = [makeRow(series)]
  return {
    key: 'habits',
    objectCount: rows.length,
    rowCount: rows.length,
    coveredRows: 0,
    groups: [{ key: 'habits', rows }],
    ...overrides,
  }
}

// ── MonthSeriesChart ─────────────────────────────────────────────────────────

describe('MonthSeriesChart', () => {
  it('renders monthly contributions as "+N" without any /target', () => {
    const series: MonthV2Series = {
      kind: 'monthly-contribution',
      display: 'count',
      weeks: fiveWeeks((_, i) => ({
        contributionOnly: true,
        actualValue: i === 0 ? 3 : undefined,
        entryCount: i === 0 ? 3 : 0,
        status: i === 0 ? 'in-progress' : 'no-data',
        targetValue: undefined,
      })),
    }
    const { container } = render(MonthSeriesChart, { props: { series } })
    expect(container.textContent).toContain('+3')
    expect(container.textContent).not.toMatch(/\/\d/)
    // Weeks without data render an em-dash, never a zero.
    expect(container.querySelectorAll('.month-series__empty')).toHaveLength(4)
  })

  it('renders 7 fixed day slots for specific-days schedules', () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      dayRef: `2026-07-0${i + 1}` as DayRef,
      inMonth: i > 0,
      scheduled: i < 2,
      completed: i === 0,
    }))
    const series: MonthV2Series = {
      kind: 'scheduled-days',
      weeks: [makeWeekDatum({ days, actualValue: 1, entryCount: 1, status: 'in-progress' })],
    }
    const { container } = render(MonthSeriesChart, { props: { series } })
    expect(container.querySelectorAll('.month-series__day')).toHaveLength(7)
    expect(container.querySelectorAll('.month-series__day--done')).toHaveLength(1)
    expect(container.querySelectorAll('.month-series__day--scheduled')).toHaveLength(1)
    expect(container.querySelectorAll('.month-series__day--outside')).toHaveLength(1)
  })

  it('renders multi-completion met/partial/empty day states with the MET-days value', () => {
    const multiDays = [
      { dayRef: '2026-07-06' as DayRef, inMonth: true, state: 'met' as const, points: 3, threshold: 3 },
      { dayRef: '2026-07-07' as DayRef, inMonth: true, state: 'partial' as const, points: 1, threshold: 3 },
      ...Array.from({ length: 5 }, (_, i) => ({
        dayRef: `2026-07-0${i + 8}` as DayRef,
        inMonth: true,
        state: 'empty' as const,
        points: 0,
        threshold: 3,
      })),
    ]
    const series: MonthV2Series = {
      kind: 'multi-completion',
      weeks: [
        makeWeekDatum({
          multiDays,
          actualValue: 1,
          entryCount: 2,
          status: 'missed',
          targetValue: 3,
        }),
      ],
    }
    const { container } = render(MonthSeriesChart, { props: { series } })
    expect(container.querySelectorAll('.month-series__day--done')).toHaveLength(1)
    expect(container.querySelectorAll('.month-series__day--partial')).toHaveLength(1)
    expect(container.textContent).toContain('1/3')
  })

  it('renders one segment per target unit for completion with a small target', () => {
    const series: MonthV2Series = {
      kind: 'completion-progress',
      display: 'segments',
      weeks: [
        makeWeekDatum({ actualValue: 2, entryCount: 2, status: 'missed', targetValue: 3 }),
      ],
    }
    const { container } = render(MonthSeriesChart, { props: { series } })
    expect(container.querySelectorAll('.month-series__segment')).toHaveLength(3)
    expect(container.querySelectorAll('.month-series__segment--filled')).toHaveLength(2)
    // Missed weeks stay visually neutral — no error/red styling classes.
    expect(container.innerHTML).not.toContain('error')
  })

  it('uses the axis SVG for bars in hybrid mode and cells in capsules mode', () => {
    const series: MonthV2Series = {
      kind: 'bars',
      weeks: fiveWeeks(() => ({ actualValue: 4, entryCount: 2, status: 'met', targetValue: 5 })),
      scale: { min: 0, max: 5 },
    }
    const hybrid = render(MonthSeriesChart, { props: { series, chartMode: 'hybrid' } })
    expect(hybrid.container.querySelector('.month-series__svg')).not.toBeNull()

    const capsules = render(MonthSeriesChart, { props: { series, chartMode: 'capsules' } })
    expect(capsules.container.querySelector('.month-series__svg')).toBeNull()
    expect(capsules.container.querySelectorAll('.month-series__bullet').length).toBeGreaterThan(0)
  })
})

// ── MonthObjectSection ───────────────────────────────────────────────────────

describe('MonthObjectSection', () => {
  it('exposes accordion semantics and neutral coverage', () => {
    const { getByRole, emitted } = render(MonthObjectSection, {
      props: { section: makeSection({ coveredRows: 1 }), expanded: false },
    })
    const toggle = getByRole('button', { expanded: false })
    expect(toggle.textContent).toContain('1/1')
    void fireEvent.click(toggle)
    expect(emitted().toggle).toHaveLength(1)
  })

  it('emits openObject with the row payload', async () => {
    const { getByText, emitted } = render(MonthObjectSection, {
      props: { section: makeSection(), expanded: true },
    })
    await fireEvent.click(getByText('Medytacja'))
    expect(emitted().openObject?.[0]).toEqual([
      { type: 'habit', id: 'h-1', homeWeekRef: undefined },
    ])
  })

  it('renders the unlinked-results group with a static header', () => {
    const section = makeSection({
      key: 'goals',
      groups: [
        {
          key: 'goal:unlinked',
          rows: [
            makeRow(
              { kind: 'completion-progress', display: 'bullet', weeks: fiveWeeks(() => ({})) },
              { key: 'keyResult:kr-1', subjectId: 'kr-1', subjectType: 'keyResult', title: 'Sierota' }
            ),
          ],
        },
      ],
    })
    const { container } = render(MonthObjectSection, { props: { section, expanded: true } })
    // Test locale is EN; PL mirrors the same key ("Pozostałe rezultaty").
    expect(container.textContent).toContain('Other results')
  })
})

// ── MonthWeekGrid ────────────────────────────────────────────────────────────

describe('MonthWeekGrid', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  function renderGrid() {
    const weeks = WEEK_REFS.map((weekRef, i) =>
      makeColumn(weekRef, {
        phase: i < 2 ? 'past' : i === 2 ? 'current' : 'future',
        reflectionMatrix:
          i === 0
            ? Array.from({ length: 4 }, (_, r) => ({
                areaKey: 'body' as const,
                icon: 'fitness_center',
                cells: Array.from({ length: 3 }, (_, c) => ({
                  section: 'demands' as const,
                  rating: r + c > 0 ? 3 : null,
                  color: r + c > 0 ? 'rgb(1 2 3)' : null,
                })),
              }))
            : null,
      })
    )
    const sections: MonthV2Section[] = [
      makeSection({ key: 'goals' }),
      makeSection({ key: 'habits' }),
      makeSection({ key: 'trackers' }),
      makeSection({ key: 'intentions' }),
    ]
    return render(MonthWeekGrid, { props: { weeks, sections } })
  }

  it('starts with every section collapsed and persists manual expansion', async () => {
    const { container } = renderGrid()
    const toggles = [...container.querySelectorAll('.month-section__toggle')]
    expect(toggles).toHaveLength(4)
    for (const toggle of toggles) {
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
    }

    await fireEvent.click(toggles[1]!)
    expect(toggles[1]!.getAttribute('aria-expanded')).toBe('true')
    const stored = JSON.parse(window.localStorage.getItem('calendar.month-v2.sections')!)
    expect(stored).toEqual({ goals: false, habits: true, trackers: false, intentions: false })
  })

  it('restores persisted section state and survives corrupt storage', async () => {
    window.localStorage.setItem(
      'calendar.month-v2.sections',
      JSON.stringify({ goals: true, bogus: 'x', habits: 'not-bool' })
    )
    const first = renderGrid()
    await nextTick() // onMounted restore applies on the next flush
    const toggles = [...first.container.querySelectorAll('.month-section__toggle')]
    expect(toggles[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(toggles[1]!.getAttribute('aria-expanded')).toBe('false')
    first.unmount()

    window.localStorage.setItem('calendar.month-v2.sections', '{{{corrupt')
    const second = renderGrid()
    for (const toggle of second.container.querySelectorAll('.month-section__toggle')) {
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
    }
  })

  it('emits openWeek from a week head and marks the current week', async () => {
    const { container, emitted } = renderGrid()
    const heads = [...container.querySelectorAll('.month-grid__week')]
    expect(heads).toHaveLength(5)
    expect(heads[2]!.getAttribute('aria-current')).toBe('date')
    await fireEvent.click(heads[0]!)
    expect(emitted().openWeek?.[0]).toEqual(['2026-W26'])
  })

  it('renders the full 4×3 matrix for reflected weeks and an em-dash otherwise', () => {
    const { container } = renderGrid()
    const heads = [...container.querySelectorAll('.month-grid__week')]
    expect(heads[0]!.querySelectorAll('.month-grid__matrix-cell')).toHaveLength(12)
    expect(heads[1]!.textContent).toContain('—')
  })
})

// ── MonthCompassChart ────────────────────────────────────────────────────────

describe('MonthCompassChart', () => {
  it('renders dots without a polygon for partial data and never emits NaN', () => {
    const compass = {
      axes: [
        { key: 'balanceRating' as const, value: 4, max: 5 as const },
        { key: 'purposeRating' as const, value: null, max: 5 as const },
        { key: 'growthRating' as const, value: 3, max: 5 as const },
        { key: 'coherenceRating' as const, value: 2, max: 5 as const },
        { key: 'agencyRating' as const, value: 5, max: 5 as const },
      ],
    }
    const { container } = render(MonthCompassChart, { props: { compass } })
    expect(container.innerHTML).not.toContain('NaN')
    expect(container.querySelectorAll('circle')).toHaveLength(4)
    // No filled polygon while any axis is unrated (rings still render).
    expect(container.querySelectorAll('polygon[stroke-width="2"]')).toHaveLength(0)
    const caption = container.querySelector('figcaption')
    expect(caption?.textContent).toContain('— / 5')
  })

  it('renders nothing when the compass is null', () => {
    const { container } = render(MonthCompassChart, { props: { compass: null } })
    expect(container.querySelector('svg')).toBeNull()
  })
})
