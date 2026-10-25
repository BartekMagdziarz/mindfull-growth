import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatChatSessionDate, formatEntryDate, formatMessageTimestamp } from '../dateFormat'

// Sunday 2026-10-25, 12:00 local time: today / yesterday / older are all in October.
const NOW = new Date(2026, 9, 25, 12, 0, 0)
const iso = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo - 1, d, h, mi, 0).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('formatEntryDate', () => {
  it('Polish: today and yesterday with a 24-hour clock, no leading zero', () => {
    expect(formatEntryDate(iso(2026, 10, 25, 9, 30), 'pl')).toBe('Dzisiaj, 9:30')
    expect(formatEntryDate(iso(2026, 10, 24, 13, 0), 'pl')).toBe('Wczoraj, 13:00')
  })

  it('Polish: older entries are day-first with the short month and a 24-hour clock', () => {
    expect(formatEntryDate(iso(2026, 10, 15, 19, 30), 'pl')).toBe('15 paź 2026, 19:30')
  })

  it('English: today, yesterday and older entries keep the 12-hour clock', () => {
    expect(formatEntryDate(iso(2026, 10, 25, 9, 30), 'en')).toBe('Today, 9:30 AM')
    expect(formatEntryDate(iso(2026, 10, 24, 13, 0), 'en')).toBe('Yesterday, 1:00 PM')
    expect(formatEntryDate(iso(2026, 10, 15, 19, 30), 'en')).toBe('Oct 15, 2026, 7:30 PM')
  })

  it('falls back to the app locale (Polish) without a locale or with an unknown one', () => {
    expect(formatEntryDate(iso(2026, 10, 15, 19, 30))).toBe('15 paź 2026, 19:30')
    expect(formatEntryDate(iso(2026, 10, 15, 19, 30), 'de')).toBe('15 paź 2026, 19:30')
  })

  it('never prints AM/PM in Polish', () => {
    for (const hour of [0, 5, 11, 12, 13, 23]) {
      expect(formatEntryDate(iso(2026, 10, 15, hour, 5), 'pl')).not.toMatch(/AM|PM/)
    }
  })

  it('reports an invalid date in the locale', () => {
    expect(formatEntryDate('not-a-date', 'pl')).toBe('Nieznana data')
    expect(formatEntryDate('not-a-date', 'en')).toBe('Unknown date')
  })
})

describe('formatMessageTimestamp', () => {
  it('relative wording in the locale within a day', () => {
    expect(formatMessageTimestamp(new Date(NOW.getTime() - 20_000).toISOString(), 'pl')).toBe(
      'Właśnie teraz'
    )
    expect(formatMessageTimestamp(iso(2026, 10, 25, 11, 30), 'pl')).toBe('30 minut temu')
    expect(formatMessageTimestamp(iso(2026, 10, 25, 9, 0), 'en')).toBe('3 hours ago')
  })

  it('older messages: full date and time in the locale', () => {
    expect(formatMessageTimestamp(iso(2026, 10, 15, 19, 30), 'pl')).toBe('15 paź 2026, 19:30')
    expect(formatMessageTimestamp(iso(2026, 10, 15, 19, 30), 'en')).toBe('Oct 15, 2026, 7:30 PM')
  })

  it('reports an invalid timestamp in the locale', () => {
    expect(formatMessageTimestamp('nope', 'pl')).toBe('Nieznana godzina')
    expect(formatMessageTimestamp('nope', 'en')).toBe('Unknown time')
  })
})

describe('formatChatSessionDate', () => {
  it('counts days within a week in the locale', () => {
    expect(formatChatSessionDate(iso(2026, 10, 23, 12, 0), 'pl')).toBe('2 dni temu')
    expect(formatChatSessionDate(iso(2026, 10, 24, 12, 0), 'en')).toBe('1 day ago')
  })

  it('older sessions: the numeric date of the locale, not of the browser', () => {
    expect(formatChatSessionDate(iso(2026, 10, 1, 12, 0), 'pl')).toBe('1.10.2026')
    expect(formatChatSessionDate(iso(2026, 10, 1, 12, 0), 'en')).toBe('10/1/2026')
  })
})
