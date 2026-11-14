import { describe, expect, it } from 'vitest'
import type { Rating } from '@/domain/loadState'
import {
  loadStateTone,
  loadToneRole,
  TRANSITION_REACH,
  type LoadToneRole,
} from '@/domain/loadStateTone'

const RATINGS: Rating[] = [1, 2, 3, 4, 5]
const PAIRS = RATINGS.flatMap(load => RATINGS.map(state => [load, state] as const))
const token = (role: LoadToneRole) => `var(--mg-color-load-${role})`

describe('loadToneRole', () => {
  it('maps all 25 pairs: rows are states 5 → 1, columns are loads 1 → 5', () => {
    const table: Record<Rating, LoadToneRole[]> = {
      5: ['good-2', 'good-2', 'good-3', 'good-4', 'good-5'],
      4: ['good-1', 'good-1', 'good-2', 'good-3', 'good-4'],
      3: ['good-1', 'good-1', 'good-1', 'good-2', 'good-3'],
      2: ['low-1', 'low-1', 'strain-1', 'strain-2', 'strain-3'],
      1: ['low-2', 'low-2', 'strain-2', 'strain-3', 'strain-4'],
    }
    for (const state of RATINGS) {
      expect(RATINGS.map(load => loadToneRole(load, state))).toEqual(table[state])
    }
  })

  it('keeps the strongest step of each ladder for the corner pair only', () => {
    const pairsOf = (role: LoadToneRole) =>
      PAIRS.filter(([load, state]) => loadToneRole(load, state) === role)
    expect(pairsOf('good-5')).toEqual([[5, 5]])
    expect(pairsOf('strain-4')).toEqual([[5, 1]])
  })

  it('follows the emotion-quadrant convention: violet for a light poor week, rose for a busy one', () => {
    for (const state of [1, 2] as Rating[]) {
      expect(loadToneRole(1, state).startsWith('low-')).toBe(true)
      expect(loadToneRole(2, state).startsWith('low-')).toBe(true)
      for (const load of [3, 4, 5] as Rating[]) {
        expect(loadToneRole(load, state).startsWith('strain-')).toBe(true)
      }
    }
    for (const [load, state] of PAIRS) {
      if (state >= 3) expect(loadToneRole(load, state).startsWith('good-')).toBe(true)
    }
  })
})

describe('loadStateTone', () => {
  it('returns null for a week that is not fully rated', () => {
    expect(loadStateTone(null, null)).toBeNull()
    expect(loadStateTone(4, null)).toBeNull()
    expect(loadStateTone(null, 2)).toBeNull()
  })

  it('paints every pair outside state 3 with one ladder token', () => {
    for (const [load, state] of PAIRS) {
      if (state === 3) continue
      const tone = loadStateTone(load, state)!
      expect(tone.fill).toBe(token(loadToneRole(load, state)))
      expect(tone.mark).toBe(tone.fill)
    }
  })

  it('never emits a colour literal — only tokens, color-mix and a gradient', () => {
    for (const [load, state] of PAIRS) {
      const tone = loadStateTone(load, state)!
      for (const value of Object.values(tone)) {
        expect(value).not.toMatch(/#[0-9a-f]{3,8}\b/i)
        expect(value).not.toMatch(/rgba?\(/)
        expect(value).toContain('var(--mg-color-')
      }
    }
  })

  it('draws state 3 as a transition from its own blue towards the colour one state lower', () => {
    for (const load of RATINGS) {
      const tone = loadStateTone(load, 3)!
      const from = token(loadToneRole(load, 3))
      const to = token(loadToneRole(load, 2))
      expect(
        tone.fill.startsWith(`linear-gradient(90deg, ${from}, color-mix(in oklab, ${to} `)
      ).toBe(true)
      expect(tone.fill.match(/color-mix\(/g)).toHaveLength(4)
      expect(tone.mark).toContain(`color-mix(in oklab, ${to} `)
      expect(tone.mark.endsWith(`, ${from})`)).toBe(true)
    }
  })

  it('lets the transition reach far only at loads 1 and 5 — an ordinary week stays blue', () => {
    expect(TRANSITION_REACH).toHaveLength(5)
    expect(Math.min(...TRANSITION_REACH)).toBe(TRANSITION_REACH[2])
    expect(TRANSITION_REACH[2]).toBeLessThan(0.2)
    expect(TRANSITION_REACH[0]).toBe(TRANSITION_REACH[4])
    // the end of the 3 · 3 bar carries 16 % of the rose below it, its dot 8 %
    expect(
      loadStateTone(3, 3)!.fill.endsWith(
        'var(--mg-color-load-strain-1) 16%, var(--mg-color-load-good-1)))'
      )
    ).toBe(true)
    expect(loadStateTone(3, 3)!.mark).toBe(
      'color-mix(in oklab, var(--mg-color-load-strain-1) 8%, var(--mg-color-load-good-1))'
    )
    expect(loadStateTone(5, 3)!.mark).toBe(
      'color-mix(in oklab, var(--mg-color-load-strain-3) 35%, var(--mg-color-load-good-3))'
    )
    expect(loadStateTone(1, 3)!.mark).toBe(
      'color-mix(in oklab, var(--mg-color-load-low-1) 35%, var(--mg-color-load-good-1))'
    )
  })

  it('tints the dot field with the dot colour on paper', () => {
    for (const [load, state] of PAIRS) {
      const tone = loadStateTone(load, state)!
      expect(tone.field).toBe(`color-mix(in oklab, ${tone.mark} 24%, var(--mg-color-paper))`)
    }
  })
})
