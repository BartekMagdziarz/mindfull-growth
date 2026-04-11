import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import { h } from 'vue'
import ValueSparklineSummary from '../ValueSparklineSummary.vue'
import type { TodayValueSparklineData } from '@/services/todayChartData'
import type { TodayDaySlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

// Stub out the complex sparkline — we only care about the data we pass in.
let capturedProps: Record<string, unknown> | null = null
const SparklineStub = {
  name: 'SparklineValueLine',
  props: ['points', 'cadence', 'compact'],
  setup(props: Record<string, unknown>) {
    capturedProps = props
    return () => h('svg', { 'data-testid': 'sparkline-stub' })
  },
}

function makeSlot(dayRef: string, value: number | undefined, hasEntry = true): TodayDaySlot {
  return {
    dayRef: dayRef as DayRef,
    label: dayRef.slice(8, 10),
    value,
    isToday: false,
    isFuture: false,
    isScheduled: false,
    hasEntry,
  }
}

function makeData(overrides: Partial<TodayValueSparklineData> = {}): TodayValueSparklineData {
  return {
    points: [
      makeSlot('2026-03-01', 6),
      makeSlot('2026-03-08', 7),
      makeSlot('2026-03-15', 8),
    ],
    hasData: true,
    aggregate: 7,
    aggregationLabel: 'avg',
    targetValue: undefined,
    entryCount: 3,
    status: undefined,
    ...overrides,
  }
}

function renderWithStub(data: TodayValueSparklineData) {
  capturedProps = null
  return render(ValueSparklineSummary, {
    props: { data },
    global: {
      stubs: {
        SparklineValueLine: SparklineStub,
      },
    },
  })
}

describe('ValueSparklineSummary', () => {
  it('renders the sparkline stub with mapped chart points', () => {
    renderWithStub(makeData())

    expect(capturedProps).not.toBeNull()
    expect((capturedProps!.points as unknown[]).length).toBe(3)
    expect(capturedProps!.cadence).toBe('daily')
    expect(capturedProps!.compact).toBe(true)
  })

  it('renders the avg-prefixed aggregate label', () => {
    const { getByText } = renderWithStub(makeData({ aggregate: 7.3, aggregationLabel: 'avg' }))

    expect(getByText('avg 7.3')).toBeTruthy()
  })

  it('renders the last-prefixed aggregate label', () => {
    const { getByText } = renderWithStub(makeData({ aggregate: 9, aggregationLabel: 'last' }))

    expect(getByText('last 9')).toBeTruthy()
  })

  it('renders the sum aggregate without a prefix', () => {
    const { getByText } = renderWithStub(makeData({ aggregate: 120, aggregationLabel: 'sum' }))

    expect(getByText('120')).toBeTruthy()
  })

  it('renders a dash when there is no data', () => {
    const { getByText } = renderWithStub(
      makeData({ points: [], hasData: false, aggregate: 0, entryCount: 0 }),
    )

    expect(getByText('—')).toBeTruthy()
  })

  it('renders the entry count sublabel', () => {
    const { getByText } = renderWithStub(makeData({ entryCount: 5 }))

    // "{n} entries" key — the English locale renders "5 entries".
    expect(getByText(/5\s+entries/)).toBeTruthy()
  })

  it('passes the target value through to the sparkline points', () => {
    renderWithStub(makeData({ targetValue: 7 }))

    const points = capturedProps!.points as Array<{ targetValue: number | undefined }>
    expect(points.every((p) => p.targetValue === 7)).toBe(true)
  })
})
