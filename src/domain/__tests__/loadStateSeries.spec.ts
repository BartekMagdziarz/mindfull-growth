import { describe, expect, it } from 'vitest'
import type { WeekRef } from '../period'
import { buildAreaSeries, reflectionToPair, reflectionToPairs, trailingWeekRefs, weekPointLabel } from '../loadStateSeries'

const W = (s: string) => s as WeekRef

describe('loadStateSeries', () => {
  it('maps load from the matrix demands field and state from the state field', () => {
    const r = { physicalIntensityRating: 4, physicalCareRating: 1, energyRating: 5 }
    expect(reflectionToPair(r, 'body')).toEqual({ load: 4, state: 5 })
    // actions column is history: never read
    expect(reflectionToPair({ physicalCareRating: 5 }, 'body')).toEqual({ load: null, state: null })
  })

  it('returns gaps for missing reflections and all four areas', () => {
    const pairs = reflectionToPairs(null)
    expect(Object.keys(pairs).sort()).toEqual(['body', 'closeOnes', 'emotions', 'tasks'])
    expect(pairs.tasks).toEqual({ load: null, state: null })
  })

  it('builds trailing week refs oldest first, inclusive of the last', () => {
    const refs = trailingWeekRefs(W('2026-W37'), 3)
    expect(refs).toHaveLength(3)
    expect(refs[2]).toBe('2026-W37')
    expect(refs[0] < refs[1] && refs[1] < refs[2]).toBe(true)
  })

  it('labels a week by its Monday as d.MM', () => {
    expect(weekPointLabel(W('2026-W37'))).toMatch(/^\d{1,2}\.\d{2}$/)
  })

  it('builds a series with gaps where no reflection exists', () => {
    const refs = trailingWeekRefs(W('2026-W37'), 3)
    const series = buildAreaSeries(
      [{ weekRef: refs[0], taskLoadRating: 2, calmRating: 4 }, { weekRef: refs[2], taskLoadRating: 5, calmRating: 1 }],
      refs,
    )
    expect(series.tasks.map(p => [p.load, p.state])).toEqual([
      [2, 4],
      [null, null],
      [5, 1],
    ])
    expect(series.body.every(p => p.load === null && p.state === null)).toBe(true)
    expect(series.tasks[0].label).toBe(weekPointLabel(refs[0]))
  })
})
