import { describe, it, expect } from 'vitest'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import {
  getVisiblePoints,
  computeMaxValue,
  targetStepPath,
  targetValueY,
  shouldShowLabel,
  periodLabel,
  useGradientIds,
  PADDING_TOP,
  CHART_HEIGHT,
} from '../sparklineUtils'

function point(
  periodRef: string,
  actual?: number,
  target?: number,
  status: ObjectsLibraryChartPoint['status'] = 'met'
): ObjectsLibraryChartPoint {
  return { periodRef, actualValue: actual, targetValue: target, status }
}

describe('sparklineUtils', () => {
  describe('getVisiblePoints', () => {
    it('returns all points when under the limit', () => {
      const pts = [point('2026-01'), point('2026-02')]
      expect(getVisiblePoints(pts, 'monthly')).toHaveLength(2)
    })

    it('slices to last 6 for monthly', () => {
      const pts = Array.from({ length: 10 }, (_, i) =>
        point(`2026-${String(i + 1).padStart(2, '0')}`)
      )
      const result = getVisiblePoints(pts, 'monthly')
      expect(result).toHaveLength(6)
      expect(result[0].periodRef).toBe('2026-05')
    })

    it('slices to last 12 for weekly', () => {
      const pts = Array.from({ length: 20 }, (_, i) =>
        point(`2026-W${String(i + 1).padStart(2, '0')}`)
      )
      const result = getVisiblePoints(pts, 'weekly')
      expect(result).toHaveLength(12)
      expect(result[0].periodRef).toBe('2026-W09')
    })
  })

  describe('computeMaxValue', () => {
    it('returns the max across actual and target values', () => {
      const pts = [point('a', 5, 10), point('b', 20, 3)]
      expect(computeMaxValue(pts)).toBe(20)
    })

    it('floors at 1 for empty/zero data', () => {
      expect(computeMaxValue([point('a', 0, 0)])).toBe(1)
      expect(computeMaxValue([])).toBe(1)
    })
  })

  describe('targetValueY', () => {
    it('returns correct Y for a target value', () => {
      // target is at full height → y should be near PADDING_TOP
      expect(targetValueY(10, 10)).toBe(PADDING_TOP)
    })

    it('clamps a zero target to a 2-unit floor above the baseline', () => {
      expect(targetValueY(0, 10)).toBe(PADDING_TOP + CHART_HEIGHT - 2)
    })
  })

  describe('targetStepPath', () => {
    it('degenerates to one straight line when the target is constant', () => {
      const y = targetValueY(10, 10)
      const path = targetStepPath(
        [
          { x1: 0, x2: 100, targetValue: 10 },
          { x1: 100, x2: 200, targetValue: 10 },
        ],
        10
      )
      expect(path).toBe(`M0,${y}H100V${y}H200`)
    })

    it('steps down for a period whose target was lowered', () => {
      const yHigh = targetValueY(3, 3)
      const yLow = targetValueY(1, 3)
      const path = targetStepPath(
        [
          { x1: 0, x2: 100, targetValue: 3 },
          { x1: 100, x2: 200, targetValue: 1 },
          { x1: 200, x2: 300, targetValue: 3 },
        ],
        3
      )
      expect(path).toBe(`M0,${yHigh}H100V${yLow}H200V${yHigh}H300`)
    })

    it('breaks the line over periods without a target', () => {
      const y = targetValueY(5, 5)
      const path = targetStepPath(
        [
          { x1: 0, x2: 100, targetValue: 5 },
          { x1: 100, x2: 200, targetValue: undefined },
          { x1: 200, x2: 300, targetValue: 5 },
        ],
        5
      )
      expect(path).toBe(`M0,${y}H100M200,${y}H300`)
    })
  })

  describe('shouldShowLabel', () => {
    it('always shows labels for monthly cadence', () => {
      expect(shouldShowLabel(3, 6, 'monthly')).toBe(true)
    })

    it('shows first and last for weekly', () => {
      expect(shouldShowLabel(0, 12, 'weekly')).toBe(true)
      expect(shouldShowLabel(11, 12, 'weekly')).toBe(true)
    })

    it('shows every 4th for weekly', () => {
      expect(shouldShowLabel(4, 12, 'weekly')).toBe(true)
      expect(shouldShowLabel(3, 12, 'weekly')).toBe(false)
    })
  })

  describe('periodLabel', () => {
    it('formats weekly as W## shorthand', () => {
      expect(periodLabel('2026-W10', 'weekly', 'en')).toBe('W10')
    })

    it('formats monthly as short month name', () => {
      const label = periodLabel('2026-03', 'monthly', 'en')
      expect(label).toBe('Mar')
    })
  })

  describe('useGradientIds', () => {
    it('returns unique IDs with the given prefix', () => {
      const ids1 = useGradientIds('bar')
      const ids2 = useGradientIds('bar')
      expect(ids1.met).toMatch(/^bar-met-/)
      expect(ids1.met).not.toBe(ids2.met)
    })

    it('includes all four gradient keys', () => {
      const ids = useGradientIds('test')
      expect(ids).toHaveProperty('met')
      expect(ids).toHaveProperty('missed')
      expect(ids).toHaveProperty('neutral')
      expect(ids).toHaveProperty('area')
    })
  })
})
