import { describe, expect, it } from 'vitest'
import type { MeasurementTarget } from '@/domain/planning'
import {
  buildTargetForEntryMode,
  normalizeOptionalText,
  parseSignalLines,
  toggleId,
  updateTargetField,
} from '../libraryTargets'

const count: MeasurementTarget = { kind: 'count', operator: 'min', value: 3 }
const value: MeasurementTarget = { kind: 'value', aggregation: 'sum', operator: 'gte', value: 10 }
const rating: MeasurementTarget = {
  kind: 'rating',
  aggregation: 'average',
  operator: 'gte',
  value: 4,
}

describe('libraryTargets', () => {
  it('keeps a compatible target on entry-mode change and resets an incompatible one', () => {
    expect(buildTargetForEntryMode('counter', count)).toBe(count)
    expect(buildTargetForEntryMode('multi-completion', count)).toBe(count)
    expect(buildTargetForEntryMode('value', count)).toEqual({
      kind: 'value',
      aggregation: 'sum',
      operator: 'gte',
      value: 1,
    })
    expect(buildTargetForEntryMode('rating', value)).toEqual({
      kind: 'rating',
      aggregation: 'average',
      operator: 'gte',
      value: 1,
    })
    expect(buildTargetForEntryMode('completion', rating)).toEqual({
      kind: 'count',
      operator: 'min',
      value: 1,
    })
  })

  it('updates only the fields a target kind carries', () => {
    expect(updateTargetField('counter', count, 'operator', 'max')).toEqual({
      ...count,
      operator: 'max',
    })
    expect(updateTargetField('counter', count, 'aggregation', 'average')).toBe(count)
    expect(updateTargetField('value', value, 'aggregation', 'last')).toEqual({
      ...value,
      aggregation: 'last',
    })
    expect(updateTargetField('rating', rating, 'value', 5)).toEqual({ ...rating, value: 5 })
    expect(updateTargetField('rating', rating, 'entryDays', { operator: 'min', value: 3 })).toEqual(
      {
        ...rating,
        entryDays: { operator: 'min', value: 3 },
      }
    )
  })

  it('normalises optional text, signal lines and id toggles', () => {
    expect(normalizeOptionalText('  ')).toBeUndefined()
    expect(normalizeOptionalText(' Sens ')).toBe('Sens')
    expect(parseSignalLines(' a \n\nb\na ')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
  })
})
