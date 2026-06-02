import { describe, it, expect } from 'vitest'
import { deriveBand } from '../shared'

describe('deriveBand', () => {
  it('returns undefined for a null value on any scale', () => {
    expect(deriveBand(null, '1-5')).toBeUndefined()
    expect(deriveBand(null, '1-7')).toBeUndefined()
  })

  it('bands the 1-5 scale at 2.5 / 3.5', () => {
    expect(deriveBand(2.4, '1-5')).toBe('low')
    expect(deriveBand(2.5, '1-5')).toBe('medium')
    expect(deriveBand(3.5, '1-5')).toBe('medium')
    expect(deriveBand(3.6, '1-5')).toBe('high')
  })

  it('bands the 1-6 scale at 3 / 4', () => {
    expect(deriveBand(2.9, '1-6')).toBe('low')
    expect(deriveBand(3, '1-6')).toBe('medium')
    expect(deriveBand(4, '1-6')).toBe('medium')
    expect(deriveBand(4.1, '1-6')).toBe('high')
  })

  it('bands the 1-7 scale at symmetric thirds (3 / 5)', () => {
    expect(deriveBand(1, '1-7')).toBe('low')
    expect(deriveBand(2.9, '1-7')).toBe('low')
    expect(deriveBand(3, '1-7')).toBe('medium')
    expect(deriveBand(4, '1-7')).toBe('medium')
    expect(deriveBand(5, '1-7')).toBe('medium')
    expect(deriveBand(5.1, '1-7')).toBe('high')
    expect(deriveBand(7, '1-7')).toBe('high')
  })

  it('bands the 0-10 scale at 4 / 7', () => {
    expect(deriveBand(3.9, '0-10')).toBe('low')
    expect(deriveBand(4, '0-10')).toBe('medium')
    expect(deriveBand(7, '0-10')).toBe('medium')
    expect(deriveBand(7.1, '0-10')).toBe('high')
  })
})
