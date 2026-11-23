import { describe, expect, it } from 'vitest'
import { AREA_KEYS, AREAS, decisions, draftFor, HISTORY, isRated, mapCells, matchTags, pastWeeks, STEPS_MERGED, STEPS_SEPARATE, steppedRating, stopFromOffset, tagSuggestions, toggled, VARIANTS, withTag } from '~lab/lab/areaRatingStep'

describe('areaRatingStep', () => {
  it('gives every area both axes with a question and scale ends', () => {
    expect(AREAS.map(area => area.key)).toEqual(['body', 'emotions', 'tasks', 'closeOnes'])
    for (const area of AREAS) {
      for (const axis of ['load', 'state'] as const) {
        expect(area[axis].hint).toMatch(/\?$/)
        expect(area[axis].low).not.toBe(area[axis].high)
      }
    }
    expect(STEPS_SEPARATE).toHaveLength(8)
    expect(STEPS_MERGED).toHaveLength(5)
  })

  it('starts from an empty, half-rated or fully rated draft', () => {
    expect(AREA_KEYS.every(key => !isRated(draftFor('empty')[key]))).toBe(true)
    expect(AREA_KEYS.every(key => isRated(draftFor('rated')[key]))).toBe(true)
    const partial = draftFor('partial')
    expect(partial.body).toMatchObject({ load: 3, state: null })
    expect(AREA_KEYS.some(key => isRated(partial[key]))).toBe(false)
  })

  it('clears a rating on a second click and clamps it to the scale', () => {
    expect(toggled(null, 4)).toBe(4)
    expect(toggled(4, 4)).toBeNull()
    expect(toggled(2, 9)).toBe(5)
  })

  it('history keeps gaps only in the recent mode', () => {
    for (const key of AREA_KEYS) {
      expect(HISTORY[key]).toHaveLength(8)
      const rated = pastWeeks(key, 'rated', 4)
      expect(rated).toHaveLength(4)
      expect(rated.every(week => week.load != null && week.state != null)).toBe(true)
      expect(rated.at(-1)?.label).toBe('2.11')
      const recent = pastWeeks(key, 'recent', 6)
      expect(recent).toHaveLength(6)
      expect(recent.some(week => week.load == null)).toBe(true)
    }
  })

  it('places every rated week exactly once on the 5 × 5 map', () => {
    const past = pastWeeks('body', 'rated', 6)
    const cells = mapCells(past)
    expect(cells).toHaveLength(25)
    expect(cells[0]).toMatchObject({ load: 1, state: 5 })
    expect(cells[24]).toMatchObject({ load: 5, state: 1 })
    expect(cells.flatMap(cell => cell.past)).toHaveLength(past.length)
  })

  it('suggests tags of the same axis first and never one already chosen', () => {
    const draft = draftFor('rated')
    const load = tagSuggestions(draft, 'body', 'load')
    expect(load[0]).toBe('rozmowa z szefem')
    expect(load).not.toContain('mało snu')
    expect(new Set(load).size).toBe(load.length)
    expect(tagSuggestions(draft, 'body', 'state')).not.toContain('rozmowa z szefem')
  })

  it('matches existing tags while typing: prefix first, then inside, never a chosen one', () => {
    const pool = ['mało snu', 'delegacja', 'termin oferty', 'Dwa treningi', 'oferta dnia']
    expect(matchTags(pool, [], '')).toEqual(pool)
    expect(matchTags(pool, ['Delegacja'], '')).not.toContain('delegacja')
    expect(matchTags(pool, [], ' OF')).toEqual(['oferta dnia', 'termin oferty'])
    expect(matchTags(pool, [], 'tr')).toEqual(['Dwa treningi'])
    expect(matchTags(pool, [], 'E', 2)).toHaveLength(2)
    expect(matchTags(pool, [], 'xyz')).toEqual([])
  })

  it('adds a trimmed tag once', () => {
    expect(withTag(['sen'], '  nowy   tag ')).toEqual(['sen', 'nowy tag'])
    const tags = ['Sen']
    expect(withTag(tags, 'sen')).toBe(tags)
    expect(withTag(tags, '   ')).toBe(tags)
  })

  it('orders the rounds newest first: result tile with counters, sliders by the mark, handles on the mark, hero mark, first four', () => {
    expect(VARIANTS.map(item => item.id)).toEqual(['k', 'h', 'i', 'j', 'g', 'e', 'f', 'a', 'b', 'c', 'd'])
    expect(VARIANTS.map(item => item.round)).toEqual([5, 4, 4, 4, 3, 2, 2, 1, 1, 1, 1])
    expect(VARIANTS.every(item => item.sets && item.history && item.risk)).toBe(true)
    expect(decisions.length).toBeGreaterThanOrEqual(5)
  })

  it('snaps a pointer on the mark to the nearest of five stops', () => {
    // tor 560 px, znak 48 px: środki miejsc 24 · 152 · 280 · 408 · 536
    expect([24, 152, 280, 408, 536].map(x => stopFromOffset(x, 560, 48))).toEqual([1, 2, 3, 4, 5])
    expect(stopFromOffset(87, 560, 48)).toBe(1)
    expect(stopFromOffset(89, 560, 48)).toBe(2)
    expect(stopFromOffset(-40, 560, 48)).toBe(1)
    expect(stopFromOffset(900, 560, 48)).toBe(5)
    expect(stopFromOffset(10, 40, 48)).toBe(1)
  })

  it('steps a slider by one place: starts at 1, clears below 1, stops at 5', () => {
    expect(steppedRating(null, 1)).toBe(1)
    expect(steppedRating(null, -1)).toBeNull()
    expect(steppedRating(1, -1)).toBeNull()
    expect(steppedRating(3, 1)).toBe(4)
    expect(steppedRating(5, 1)).toBe(5)
  })
})
