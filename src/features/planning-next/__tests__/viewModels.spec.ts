import { describe, expect, it } from 'vitest'
import { classifyPlanningState, expectedPeriodRefLength, formatPlanningNumber } from '../viewModels'

describe('planning next view-model states', () => {
  it.each([
    [true, null, false, 0, 'loading'],
    [false, 'boom', false, 0, 'error'],
    [false, null, true, 0, 'empty'],
    [false, null, true, 3, 'ready'],
  ] as const)('classifies loading/error/empty/ready', (loading, error, hasData, count, expected) => {
    expect(classifyPlanningState(loading, error, hasData, count)).toBe(expected)
  })

  it('documents canonical period reference shapes', () => {
    expect(expectedPeriodRefLength('day')).toBe(10)
    expect(expectedPeriodRefLength('week')).toBe(7)
    expect(expectedPeriodRefLength('month')).toBe(7)
    expect(expectedPeriodRefLength('year')).toBe(4)
  })

  it('formats card numbers as compact Polish prose', () => {
    expect(formatPlanningNumber(7)).toBe('7')
    expect(formatPlanningNumber(7.25)).toBe('7,3')
    expect(formatPlanningNumber(0.04)).toBe('0,0')
  })
})
