import { describe, expect, it } from 'vitest'
import type { WeeklyPlan } from '@/domain/planning'
import type { WeeklyReflection } from '@/domain/reflection'
import { buildWeeklyBatteryTrend } from '@/services/weeklyBatteryTrend.service'

function buildPlan(id: string, startDate: string, endDate: string): WeeklyPlan {
  return {
    id,
    createdAt: `${startDate}T00:00:00.000Z`,
    updatedAt: `${startDate}T00:00:00.000Z`,
    startDate,
    endDate,
  }
}

function buildReflection(planId: string, values: {
  body?: { demand: number; state: number }
  mind?: { demand: number; state: number }
  emotion?: { demand: number; state: number }
  social?: { demand: number; state: number }
}): WeeklyReflection {
  return {
    id: `r-${planId}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    weeklyPlanId: planId,
    batterySnapshot: {
      body: values.body ?? { demand: 1, state: 1 },
      mind: values.mind ?? { demand: 1, state: 1 },
      emotion: values.emotion ?? { demand: 1, state: 1 },
      social: values.social ?? { demand: 1, state: 1 },
    },
  }
}

describe('buildWeeklyBatteryTrend', () => {
  it('returns chronological lookback points capped at 6 prior plans', () => {
    const weeklyPlans = [
      buildPlan('w1', '2026-01-05', '2026-01-11'),
      buildPlan('w2', '2026-01-12', '2026-01-18'),
      buildPlan('w3', '2026-01-19', '2026-01-25'),
      buildPlan('w4', '2026-01-26', '2026-02-01'),
      buildPlan('w5', '2026-02-02', '2026-02-08'),
      buildPlan('w6', '2026-02-09', '2026-02-15'),
      buildPlan('w7', '2026-02-16', '2026-02-22'),
      buildPlan('w8', '2026-02-23', '2026-03-01'),
    ]

    const weeklyReflections = [
      buildReflection('w2', { body: { demand: 2, state: 3 } }),
      buildReflection('w4', { body: { demand: 3, state: 4 } }),
      buildReflection('w7', { body: { demand: 4, state: 5 } }),
    ]

    const series = buildWeeklyBatteryTrend({
      weeklyPlans,
      weeklyReflections,
      referenceStartDate: '2026-02-23',
    })

    const bodySeries = series.find((s) => s.battery === 'body')
    expect(bodySeries).toBeTruthy()
    expect(bodySeries?.points).toHaveLength(6)
    expect(bodySeries?.points.map((p) => p.weeklyPlanId)).toEqual([
      'w2',
      'w3',
      'w4',
      'w5',
      'w6',
      'w7',
    ])
  })

  it('keeps null demand/state gaps when reflection is missing', () => {
    const weeklyPlans = [
      buildPlan('w1', '2026-01-05', '2026-01-11'),
      buildPlan('w2', '2026-01-12', '2026-01-18'),
      buildPlan('w3', '2026-01-19', '2026-01-25'),
    ]
    const weeklyReflections = [buildReflection('w2', { mind: { demand: 4, state: 2 } })]

    const series = buildWeeklyBatteryTrend({
      weeklyPlans,
      weeklyReflections,
      referenceStartDate: '2026-01-26',
      lookbackWeeks: 3,
    })
    const mindSeries = series.find((s) => s.battery === 'mind')

    expect(mindSeries?.points.map((p) => ({ id: p.weeklyPlanId, demand: p.demand, state: p.state }))).toEqual([
      { id: 'w1', demand: null, state: null },
      { id: 'w2', demand: 4, state: 2 },
      { id: 'w3', demand: null, state: null },
    ])
  })

  it('extracts demand/state from each battery independently', () => {
    const weeklyPlans = [buildPlan('w1', '2026-01-05', '2026-01-11')]
    const weeklyReflections = [
      buildReflection('w1', {
        body: { demand: 1, state: 2 },
        mind: { demand: 2, state: 3 },
        emotion: { demand: 3, state: 4 },
        social: { demand: 4, state: 5 },
      }),
    ]

    const series = buildWeeklyBatteryTrend({
      weeklyPlans,
      weeklyReflections,
      referenceStartDate: '2026-01-12',
      lookbackWeeks: 1,
    })

    expect(series.find((s) => s.battery === 'body')?.points[0]).toMatchObject({ demand: 1, state: 2 })
    expect(series.find((s) => s.battery === 'mind')?.points[0]).toMatchObject({ demand: 2, state: 3 })
    expect(series.find((s) => s.battery === 'emotion')?.points[0]).toMatchObject({ demand: 3, state: 4 })
    expect(series.find((s) => s.battery === 'social')?.points[0]).toMatchObject({ demand: 4, state: 5 })
  })
})

