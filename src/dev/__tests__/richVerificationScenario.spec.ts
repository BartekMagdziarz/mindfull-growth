import { describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import {
  RICH_CLOSED_MONTHS,
  RICH_CLOSED_WEEKS,
  RICH_SCENARIO_ID,
  RICH_SCENARIO_VERSION,
  buildRichVerificationScenario,
  fixtureMarkerValue,
} from '@/dev/richVerificationScenario'

describe('RichVerificationScenario', () => {
  const anchor = '2026-07-19' as DayRef

  it('jest deterministyczny dla tej samej daty zakotwiczenia', () => {
    expect(buildRichVerificationScenario(anchor)).toEqual(buildRichVerificationScenario(anchor))
  })

  it('zawiera wymagany horyzont bieżących i zamkniętych okresów', () => {
    const scenario = buildRichVerificationScenario(anchor)

    expect(scenario.meta).toMatchObject({
      profileId: RICH_SCENARIO_ID,
      version: RICH_SCENARIO_VERSION,
      anchorDayRef: anchor,
      closedMonths: RICH_CLOSED_MONTHS,
      closedWeeks: RICH_CLOSED_WEEKS,
    })
    expect(scenario.months).toHaveLength(RICH_CLOSED_MONTHS + 1)
    expect(scenario.weeks).toHaveLength(RICH_CLOSED_WEEKS + 1)
    expect(scenario.months.at(-1)?.monthRef).toBe(scenario.refs.currentMonth)
    expect(scenario.weeks.at(-1)?.weekRef).toBe(scenario.refs.currentWeek)
  })

  it('utrzymuje poprawne relacje semantyczne obiektów z priorytetami', () => {
    const scenario = buildRichVerificationScenario(anchor)
    const priorityKeys = new Set(scenario.priorities.map(priority => priority.key))

    for (const object of scenario.objects) {
      for (const priorityKey of object.priorityKeys) {
        expect(priorityKeys.has(priorityKey), `${object.key} -> ${priorityKey}`).toBe(true)
      }
    }

    expect(scenario.objects.some(object => object.priorityKeys.length > 1)).toBe(true)
    expect(scenario.objects.some(object => object.priorityKeys.length === 0)).toBe(true)
    expect(scenario.objects.some(object => object.status === 'retired')).toBe(true)
    expect(scenario.objects.some(object => object.status === 'orphan')).toBe(true)
  })

  it('pokrywa stany met, missed, no-data i no-target', () => {
    const statuses = new Set(scenarioStatuses(buildRichVerificationScenario(anchor)))
    expect(statuses).toEqual(new Set(['met', 'missed', 'no-data', 'no-target']))
  })

  it('ma trasy i presety dla wszystkich siedmiu workbenchów', () => {
    const scenario = buildRichVerificationScenario(anchor)

    expect(Object.keys(scenario.presets)).toEqual([
      'today',
      'calendar-year',
      'calendar-month',
      'calendar-week',
      'ritual-week',
      'ritual-month',
      'ritual-year',
    ])
    expect(scenario.presets.today[0].baselinePath).toContain('/today/')
    expect(scenario.presets['calendar-year'][0].baselinePath).toBe('/calendar/year/2026')
    expect(scenario.presets['calendar-month'].map(preset => preset.baselinePath)).toEqual([
      '/calendar/stream/2026-07',
      '/calendar/stream/2026-06',
    ])
    expect(scenario.presets['calendar-week'].map(preset => preset.baselinePath)).toEqual([
      '/calendar/stream/2026-W28',
      '/calendar/stream/2026-W27',
    ])
    expect(scenario.presets['ritual-week'].map(preset => preset.id)).toEqual(['plan', 'reflect'])
    expect(scenario.presets['ritual-month'].map(preset => preset.id)).toEqual(['plan', 'reflect'])
    expect(scenario.presets['ritual-year'].map(preset => preset.id)).toEqual(['plan'])
    expect(scenario.presets['ritual-week'][0].baselinePath).toBe('/calendar/week/2026-W28?action=plan')
    expect(scenario.presets['ritual-month'][0].baselinePath).toBe('/calendar/month/2026-07?action=plan')
    expect(scenario.presets['ritual-year'][0].baselinePath).toBe('/calendar/year/2026?action=plan')
  })

  it('zmienia marker seeda po zmianie dnia', () => {
    const today = buildRichVerificationScenario(anchor).meta
    const tomorrow = buildRichVerificationScenario('2026-07-20' as DayRef).meta

    expect(fixtureMarkerValue(today)).toBe('rich-v1:3:2026-07-19')
    expect(fixtureMarkerValue(tomorrow)).not.toBe(fixtureMarkerValue(today))
  })
})

function scenarioStatuses(scenario: ReturnType<typeof buildRichVerificationScenario>) {
  return scenario.objects.flatMap(object => object.chart.map(point => point.status))
}
