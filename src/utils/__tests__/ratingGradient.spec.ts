import { describe, it, expect } from 'vitest'
import { divergingRatingColor, ratingBarColor } from '../ratingGradient'

describe('divergingRatingColor', () => {
  it('maps 1..5 onto the rose → neutral → sky stops', () => {
    expect(divergingRatingColor(1)).toBe('rgb(var(--rating-neg-5))')
    expect(divergingRatingColor(2)).toBe('rgb(var(--rating-neg-3))')
    expect(divergingRatingColor(3)).toBe('rgb(var(--rating-neutral))')
    expect(divergingRatingColor(4)).toBe('rgb(var(--rating-pos-3))')
    expect(divergingRatingColor(5)).toBe('rgb(var(--rating-pos-5))')
  })

  it('mirrors the scale when inverted (Demands column: high = strain)', () => {
    expect(divergingRatingColor(5, { invert: true })).toBe('rgb(var(--rating-neg-5))')
    expect(divergingRatingColor(4, { invert: true })).toBe('rgb(var(--rating-neg-3))')
    expect(divergingRatingColor(3, { invert: true })).toBe('rgb(var(--rating-neutral))')
    expect(divergingRatingColor(1, { invert: true })).toBe('rgb(var(--rating-pos-5))')
  })

  it('returns null for unrated values', () => {
    expect(divergingRatingColor(null)).toBeNull()
    expect(divergingRatingColor(undefined)).toBeNull()
    expect(divergingRatingColor(null, { invert: true })).toBeNull()
  })

  it('clamps and rounds out-of-range input', () => {
    expect(divergingRatingColor(0)).toBe(divergingRatingColor(1))
    expect(divergingRatingColor(7)).toBe(divergingRatingColor(5))
    expect(divergingRatingColor(3.6)).toBe(divergingRatingColor(4))
  })
})

describe('ratingBarColor (regression)', () => {
  it('lerps the tracker ramp when no target is set', () => {
    expect(ratingBarColor({ value: 1, scaleMin: 1, scaleMax: 5 })).toBe('rgb(var(--sky-100))')
    expect(ratingBarColor({ value: 5, scaleMin: 1, scaleMax: 5 })).toBe('rgb(var(--rating-pos-5))')
  })

  it('splits rose below / sky at-or-above the target', () => {
    expect(
      ratingBarColor({ value: 2, scaleMin: 1, scaleMax: 5, targetValue: 4 })
    ).toBe('rgb(var(--rating-neg-4))')
    expect(
      ratingBarColor({ value: 4, scaleMin: 1, scaleMax: 5, targetValue: 4 })
    ).toBe('rgb(var(--rating-pos-1))')
  })
})
