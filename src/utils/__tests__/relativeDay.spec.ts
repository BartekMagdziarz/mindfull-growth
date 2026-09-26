import { describe, expect, it } from 'vitest'
import { entryDateFromDay, formatRelativeDay } from '../relativeDay'

describe('relative day navigation', () => {
  const today = '2026-09-19'
  it.each([
    [today, 'dzisiaj'], ['2026-09-18','wczoraj'], ['2026-09-20','jutro'],
    ['2026-09-22','w przyszłym tygodniu'], ['2026-09-12','w zeszłym tygodniu'],
    ['2026-10-10','za 3 tygodnie'], ['2026-08-29','3 tygodnie temu'],
    ['2026-11-19','za 2 miesiące'], ['2024-09-19','2 lata temu'],
  ])('labels %s', (date, expected) => expect(formatRelativeDay(date,today,'pl')).toBe(expected))
  it('uses calendar days across the DST boundary', () => {
    expect(formatRelativeDay('2026-03-30','2026-03-29','en')).toBe('tomorrow')
  })
  it('rejects invalid route dates and accepts leap day', () => {
    expect(entryDateFromDay('2026-02-30')).toBeNull()
    expect(entryDateFromDay(['2026-09-19'])).toBeNull()
    expect(entryDateFromDay('2024-02-29')?.getDate()).toBe(29)
  })
})
