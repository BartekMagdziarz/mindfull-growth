import { describe, expect, it } from 'vitest'
import { classifyPair, toRating, type Rating } from '../loadState'

const R = [1, 2, 3, 4, 5] as Rating[]

describe('loadState · classifyPair', () => {
  it('maps the four corners to the four quadrants', () => {
    expect(classifyPair(5, 5).quadrant).toBe('recovery')
    expect(classifyPair(5, 1).quadrant).toBe('strain')
    expect(classifyPair(1, 5).quadrant).toBe('ease')
    expect(classifyPair(1, 1).quadrant).toBe('low')
  })

  it('treats state = 3 as neutral regardless of load', () => {
    for (const load of R) expect(classifyPair(load, 3).quadrant).toBe('neutral')
  })

  it('blends the two neighbours for load = 3 with a decided state', () => {
    expect(classifyPair(3, 4)).toEqual({ quadrant: 'ease', blend: ['ease', 'recovery'] })
    expect(classifyPair(3, 2)).toEqual({ quadrant: 'low', blend: ['low', 'strain'] })
    expect(classifyPair(3, 4, 'strict')).toEqual({ quadrant: 'neutral' })
  })

  it('is neutral when either axis is missing', () => {
    expect(classifyPair(null, 5).quadrant).toBe('neutral')
    expect(classifyPair(4, null).quadrant).toBe('neutral')
  })

  it('covers all 25 pairs without throwing and never returns an unknown quadrant', () => {
    const known = new Set(['recovery', 'strain', 'ease', 'low', 'neutral'])
    for (const load of R)
      for (const state of R) expect(known.has(classifyPair(load, state).quadrant)).toBe(true)
  })
})

describe('loadState · helpers', () => {
  it('toRating clamps to 1–5 integers or null', () => {
    expect(toRating(undefined)).toBeNull()
    expect(toRating(null)).toBeNull()
    expect(toRating(0)).toBeNull()
    expect(toRating(6)).toBeNull()
    expect(toRating(3.4)).toBe(3)
    expect(toRating(5)).toBe(5)
  })
})
