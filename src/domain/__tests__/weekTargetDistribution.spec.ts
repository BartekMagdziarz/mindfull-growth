import { describe, expect, it } from 'vitest'
import { distributeTargetEvenly } from '@/domain/weekTargetDistribution'

describe('distributeTargetEvenly', () => {
  it('splits divisible integer totals evenly', () => {
    expect(distributeTargetEvenly(12, 4, true)).toEqual([3, 3, 3, 3])
  })

  it('gives the remainder to earlier weeks', () => {
    expect(distributeTargetEvenly(10, 4, true)).toEqual([3, 3, 2, 2])
    expect(distributeTargetEvenly(7, 3, true)).toEqual([3, 2, 2])
    expect(distributeTargetEvenly(1, 4, true)).toEqual([1, 0, 0, 0])
  })

  it('handles a single week and zero totals', () => {
    expect(distributeTargetEvenly(5, 1, true)).toEqual([5])
    expect(distributeTargetEvenly(0, 3, true)).toEqual([0, 0, 0])
  })

  it('splits non-integer totals into exact 2-decimal shares', () => {
    const parts = distributeTargetEvenly(40, 3, false)
    expect(parts).toHaveLength(3)
    expect(parts[1]).toBe(13.33)
    expect(parts[2]).toBe(13.33)
    expect(Math.round(parts.reduce((sum, part) => sum + part, 0) * 100) / 100).toBe(40)
  })

  it('returns an empty array for invalid input', () => {
    expect(distributeTargetEvenly(-1, 4, true)).toEqual([])
    expect(distributeTargetEvenly(10, 0, true)).toEqual([])
    expect(distributeTargetEvenly(Number.NaN, 4, true)).toEqual([])
  })
})
