import { describe, expect, it } from 'vitest'
import {
  CALENDAR_MONTH_EXPERIMENT_DEFAULTS,
  CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS,
  resolveCalendarMonthExperiment,
} from '../calendarExperimentQuery'

describe('resolveCalendarMonthExperiment', () => {
  it('returns all defaults for an empty query', () => {
    expect(resolveCalendarMonthExperiment({})).toEqual(CALENDAR_MONTH_EXPERIMENT_DEFAULTS)
    expect(CALENDAR_MONTH_EXPERIMENT_DEFAULTS).toEqual({
      layout: 'legacy',
      chartMode: 'hybrid',
      density: 'comfortable',
    })
  })

  it('maps a fully valid query through (chart query key → chartMode)', () => {
    expect(
      resolveCalendarMonthExperiment({ layout: 'v2', chart: 'axis', density: 'compact' })
    ).toEqual({ layout: 'v2', chartMode: 'axis', density: 'compact' })

    expect(
      resolveCalendarMonthExperiment({ layout: 'v2', chart: 'capsules', density: 'comfortable' })
    ).toEqual({ layout: 'v2', chartMode: 'capsules', density: 'comfortable' })
  })

  it('falls back independently per field on invalid values', () => {
    expect(
      resolveCalendarMonthExperiment({
        layout: ['unknown', 'v2'], // array → first value → invalid → legacy
        chart: null,
        density: 'dense',
      })
    ).toEqual({ layout: 'legacy', chartMode: 'hybrid', density: 'comfortable' })

    expect(
      resolveCalendarMonthExperiment({ layout: 'v2', chart: 'pie', density: 'compact' })
    ).toEqual({ layout: 'v2', chartMode: 'hybrid', density: 'compact' })
  })

  it('takes the first value of an array query param', () => {
    expect(resolveCalendarMonthExperiment({ layout: ['v2', 'legacy'] }).layout).toBe('v2')
  })

  it('ignores unrelated query keys (action/origin stay untouched)', () => {
    const query = { action: 'plan', origin: 'stream', layout: 'v2' }
    const resolved = resolveCalendarMonthExperiment(query)
    expect(resolved.layout).toBe('v2')
    // Resolver reads a whitelist only — the original query object is not mutated.
    expect(query).toEqual({ action: 'plan', origin: 'stream', layout: 'v2' })
    expect(CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS).toEqual(['layout', 'chart', 'density'])
  })
})
