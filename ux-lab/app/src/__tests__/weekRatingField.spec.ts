import { describe, expect, it } from 'vitest'
import { AREAS, DIRECTIONS, isRated, mapCells, TILE_HOVERS, WEEKS, withoutReflection } from '~lab/lab/weekRatingField'

describe('weekRatingField', () => {
  it('rates every area and keeps four earlier weeks in every sample', () => {
    for (const week of Object.values(WEEKS)) {
      expect(isRated(week)).toBe(true)
      expect(week.history).toHaveLength(4)
      expect(week.days).toHaveLength(7)
      expect(week.tiles).toHaveLength(4)
    }
  })

  it('places every rated area exactly once on the 5 × 5 map', () => {
    const cells = mapCells(WEEKS.mixed)
    expect(cells).toHaveLength(25)
    expect(cells[0]).toMatchObject({ load: 1, state: 5 })
    expect(cells[24]).toMatchObject({ load: 5, state: 1 })
    expect(cells.flatMap(cell => cell.areas.map(area => area.key)).sort()).toEqual(AREAS.map(area => area.key).sort())
  })

  it('a week without reflection has no ratings, no anchors and only the past days of emotions', () => {
    const week = withoutReflection(WEEKS.hard)
    expect(isRated(week)).toBe(false)
    expect(week.anchors).toEqual([])
    expect(week.days.slice(4).every(day => day.emotions.length === 0)).toBe(true)
    expect(week.history).toEqual(WEEKS.hard.history)
    expect(mapCells(week).every(cell => cell.areas.length === 0)).toBe(true)
  })

  it('lists six directions with unique ids', () => {
    expect(new Set(DIRECTIONS.map(item => item.id)).size).toBe(6)
  })

  it('offers three hover versions of the area tile (round 2)', () => {
    expect(TILE_HOVERS.map(item => item.id)).toEqual(['dots', 'legend', 'split'])
    expect(new Set(TILE_HOVERS.map(item => item.letter)).size).toBe(3)
  })
})
