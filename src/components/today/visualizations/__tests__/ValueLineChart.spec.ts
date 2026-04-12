import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/vue'
import { h } from 'vue'
import ValueLineChart from '../ValueLineChart.vue'
import type { TodayDaySlot } from '@/services/todayChartData'
import type { DayRef } from '@/domain/period'

let capturedProps: Record<string, unknown> | null = null
const SparklineStub = {
  name: 'SparklineValueLine',
  props: ['points', 'cadence', 'compact'],
  setup(props: Record<string, unknown>) {
    capturedProps = props
    return () => h('svg', { 'data-testid': 'sparkline-stub' })
  },
}

function makeSlot(
  dayRef: string,
  value: number | undefined,
  overrides: Partial<TodayDaySlot> = {},
): TodayDaySlot {
  return {
    dayRef: dayRef as DayRef,
    label: dayRef.slice(8, 10),
    value,
    isToday: false,
    isFuture: false,
    isScheduled: false,
    hasEntry: value !== undefined,
    ...overrides,
  }
}

function renderWithStub(slots: TodayDaySlot[], targetValue?: number) {
  capturedProps = null
  return render(ValueLineChart, {
    props: { slots, targetValue },
    global: {
      stubs: { SparklineValueLine: SparklineStub },
    },
  })
}

describe('ValueLineChart', () => {
  it('passes 7 continuous slots as chart points with no-target status', () => {
    const slots = [
      makeSlot('2026-03-09', 5),
      makeSlot('2026-03-10', 6),
      makeSlot('2026-03-11', 4),
      makeSlot('2026-03-12', 7),
      makeSlot('2026-03-13', 8),
      makeSlot('2026-03-14', 3),
      makeSlot('2026-03-15', 5),
    ]
    renderWithStub(slots)

    const points = capturedProps!.points as Array<{ periodRef: string; actualValue: number | undefined; status: string }>
    expect(points).toHaveLength(7)
    expect(points.every(p => p.status === 'no-target')).toBe(true)
    expect(points[0].periodRef).toBe('2026-03-09')
    expect(points[0].actualValue).toBe(5)
    expect(capturedProps!.cadence).toBe('daily')
    expect(capturedProps!.compact).toBe(true)
  })

  it('maps slots without entries to no-data status', () => {
    const slots = [
      makeSlot('2026-03-09', 5),
      makeSlot('2026-03-10', undefined, { hasEntry: false }),
      makeSlot('2026-03-11', 4),
    ]
    renderWithStub(slots)

    const points = capturedProps!.points as Array<{ status: string; actualValue: number | undefined }>
    expect(points[0].status).toBe('no-target')
    expect(points[1].status).toBe('no-data')
    expect(points[1].actualValue).toBeUndefined()
    expect(points[2].status).toBe('no-target')
  })

  it('passes targetValue to every chart point when provided', () => {
    const slots = [
      makeSlot('2026-03-09', 5),
      makeSlot('2026-03-10', 8),
    ]
    renderWithStub(slots, 7)

    const points = capturedProps!.points as Array<{ targetValue: number | undefined }>
    expect(points.every(p => p.targetValue === 7)).toBe(true)
  })

  it('leaves targetValue undefined on points when no target is provided', () => {
    const slots = [makeSlot('2026-03-09', 5)]
    renderWithStub(slots)

    const points = capturedProps!.points as Array<{ targetValue: number | undefined }>
    expect(points[0].targetValue).toBeUndefined()
  })
})
