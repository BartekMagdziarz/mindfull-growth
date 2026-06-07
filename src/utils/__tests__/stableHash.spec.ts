import { describe, it, expect } from 'vitest'
import { cyrb53 } from '../stableHash'

describe('cyrb53', () => {
  it('is deterministic across calls', () => {
    expect(cyrb53('hello world')).toBe(cyrb53('hello world'))
    expect(cyrb53('2026-W15|a:1|b:2')).toBe(cyrb53('2026-W15|a:1|b:2'))
  })

  it('differs for distinct inputs (incl. transpositions)', () => {
    expect(cyrb53('a')).not.toBe(cyrb53('b'))
    expect(cyrb53('abc')).not.toBe(cyrb53('acb'))
    expect(cyrb53('2026-W15|a:1|b:2')).not.toBe(cyrb53('2026-W15|a:1|b:3'))
  })

  it('returns a non-empty base36 string', () => {
    expect(cyrb53('x')).toMatch(/^[0-9a-z]+$/)
    expect(typeof cyrb53('')).toBe('string')
  })

  it('respects the seed', () => {
    expect(cyrb53('same', 0)).not.toBe(cyrb53('same', 1))
  })
})
