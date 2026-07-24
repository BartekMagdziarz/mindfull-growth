import { describe, expect, it } from 'vitest'
import {
  CALENDAR_MONTH_FOCUS_KEYS,
  CALENDAR_MONTH_EXPERIMENT_DEFAULTS,
  CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS,
  parseMonthFocusKey,
  resolveCalendarMonthExperiment,
  serializeMonthFocusKey,
} from '../calendarExperimentQuery'

describe('resolveCalendarMonthExperiment', () => {
  it('returns all defaults for an empty query', () => {
    expect(resolveCalendarMonthExperiment({})).toEqual(CALENDAR_MONTH_EXPERIMENT_DEFAULTS)
    expect(CALENDAR_MONTH_EXPERIMENT_DEFAULTS).toEqual({
      layout: 'legacy',
      chartMode: 'hybrid',
      density: 'comfortable',
      focus: null,
    })
  })

  it('maps a fully valid query through (chart query key → chartMode)', () => {
    expect(
      resolveCalendarMonthExperiment({
        layout: 'v2',
        chart: 'axis',
        density: 'compact',
        focus: 'habits',
      })
    ).toEqual({ layout: 'v2', chartMode: 'axis', density: 'compact', focus: 'habits' })

    expect(
      resolveCalendarMonthExperiment({ layout: 'v2', chart: 'capsules', density: 'comfortable' })
    ).toEqual({ layout: 'v2', chartMode: 'capsules', density: 'comfortable', focus: null })
  })

  it('falls back independently per field on invalid values', () => {
    expect(
      resolveCalendarMonthExperiment({
        layout: ['unknown', 'v2'], // array → first value → invalid → legacy
        chart: null,
        density: 'dense',
        focus: 'priorities',
      })
    ).toEqual({ layout: 'legacy', chartMode: 'hybrid', density: 'comfortable', focus: null })

    expect(
      resolveCalendarMonthExperiment({ layout: 'v2', chart: 'pie', density: 'compact' })
    ).toEqual({ layout: 'v2', chartMode: 'hybrid', density: 'compact', focus: null })
  })

  it('takes the first value of an array query param', () => {
    expect(resolveCalendarMonthExperiment({ layout: ['v2', 'legacy'] }).layout).toBe('v2')
    expect(resolveCalendarMonthExperiment({ focus: ['journal', 'goals'] }).focus).toBe('journal')
  })

  it('parses and serializes every supported focus value', () => {
    expect(CALENDAR_MONTH_FOCUS_KEYS).toEqual([
      'goals',
      'habits',
      'trackers',
      'intentions',
      'emotions',
      'journal',
    ])

    for (const focus of CALENDAR_MONTH_FOCUS_KEYS) {
      expect(parseMonthFocusKey(focus)).toBe(focus)
      expect(serializeMonthFocusKey(focus)).toBe(focus)
    }
    expect(parseMonthFocusKey(undefined)).toBeNull()
    expect(parseMonthFocusKey('unknown')).toBeNull()
    expect(serializeMonthFocusKey(null)).toBeUndefined()
  })

  it('ignores unrelated query keys (action/origin stay untouched)', () => {
    const query = { action: 'plan', origin: 'stream', layout: 'v2' }
    const resolved = resolveCalendarMonthExperiment(query)
    expect(resolved.layout).toBe('v2')
    // Resolver reads a whitelist only — the original query object is not mutated.
    expect(query).toEqual({ action: 'plan', origin: 'stream', layout: 'v2' })
    expect(CALENDAR_MONTH_EXPERIMENT_QUERY_KEYS).toEqual(['layout', 'chart', 'density', 'focus'])
  })
})
