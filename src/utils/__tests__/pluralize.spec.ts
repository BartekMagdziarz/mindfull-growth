import { describe, it, expect } from 'vitest'
import { pluralizePl, pluralizeEn } from '@/utils/pluralize'

describe('pluralizeEn', () => {
  it('returns singular for 1', () => {
    expect(pluralizeEn(1, 'entry', 'entries')).toBe('entry')
  })

  it('returns plural for 0', () => {
    expect(pluralizeEn(0, 'entry', 'entries')).toBe('entries')
  })

  it('returns plural for 2', () => {
    expect(pluralizeEn(2, 'entry', 'entries')).toBe('entries')
  })

  it('returns plural for large numbers', () => {
    expect(pluralizeEn(100, 'entry', 'entries')).toBe('entries')
  })

  it('returns singular for -1', () => {
    expect(pluralizeEn(-1, 'entry', 'entries')).toBe('entry')
  })
})

describe('pluralizePl', () => {
  it('returns singular for 1', () => {
    expect(pluralizePl(1, 'wpis', 'wpisy', 'wpisów')).toBe('wpis')
  })

  it('returns paucal (few) for 2', () => {
    expect(pluralizePl(2, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
  })

  it('returns paucal (few) for 3', () => {
    expect(pluralizePl(3, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
  })

  it('returns paucal (few) for 4', () => {
    expect(pluralizePl(4, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
  })

  it('returns plural (many) for 5', () => {
    expect(pluralizePl(5, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns plural (many) for 0', () => {
    expect(pluralizePl(0, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns plural (many) for 10', () => {
    expect(pluralizePl(10, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns plural (many) for teens (12-14)', () => {
    expect(pluralizePl(12, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
    expect(pluralizePl(13, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
    expect(pluralizePl(14, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns plural (many) for 11', () => {
    expect(pluralizePl(11, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns paucal (few) for 22-24', () => {
    expect(pluralizePl(22, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
    expect(pluralizePl(23, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
    expect(pluralizePl(24, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
  })

  it('returns plural (many) for 25', () => {
    expect(pluralizePl(25, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns plural (many) for 100', () => {
    expect(pluralizePl(100, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })

  it('returns paucal (few) for 102-104', () => {
    expect(pluralizePl(102, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
    expect(pluralizePl(103, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
    expect(pluralizePl(104, 'wpis', 'wpisy', 'wpisów')).toBe('wpisy')
  })

  it('returns plural (many) for 112-114 (teen rule)', () => {
    expect(pluralizePl(112, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
    expect(pluralizePl(113, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
    expect(pluralizePl(114, 'wpis', 'wpisy', 'wpisów')).toBe('wpisów')
  })
})
