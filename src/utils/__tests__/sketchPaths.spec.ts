import { describe, expect, it } from 'vitest'
import { hashSeed, seeded, smoothOpenPath } from '../sketchPaths'

describe('sketchPaths', () => {
  it('smoothOpenPath starts with M and has one cubic per gap', () => {
    const d = smoothOpenPath([
      [0, 0],
      [10, 5],
      [20, 0],
      [30, 5],
    ])
    expect(d.startsWith('M0.00,0.00')).toBe(true)
    expect(d.match(/ C/g)).toHaveLength(3)
    expect(d.endsWith('30.00,5.00')).toBe(true)
  })

  it('smoothOpenPath is empty for fewer than two points', () => {
    expect(smoothOpenPath([])).toBe('')
    expect(smoothOpenPath([[1, 1]])).toBe('')
  })

  it('seeded is deterministic and in [0, 1)', () => {
    const a = seeded(42)
    const b = seeded(42)
    const xs = Array.from({ length: 5 }, () => a())
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs)
    expect(xs.every(v => v >= 0 && v < 1)).toBe(true)
  })

  it('hashSeed is stable and differs between labels', () => {
    expect(hashSeed('Ciało')).toBe(hashSeed('Ciało'))
    expect(hashSeed('Ciało')).not.toBe(hashSeed('Emocje'))
  })
})
