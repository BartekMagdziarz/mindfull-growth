import { describe, it, expect } from 'vitest'
import { getDisplayTitle } from '../journal'

describe('getDisplayTitle', () => {
  it('returns user-provided title when present', () => {
    expect(getDisplayTitle({ title: 'My Title', body: 'Some body text' })).toBe('My Title')
  })

  it('trims the user-provided title', () => {
    expect(getDisplayTitle({ title: '  My Title  ', body: 'Body' })).toBe('My Title')
  })

  it('derives title from body when title is undefined', () => {
    expect(getDisplayTitle({ body: 'Short body' })).toBe('Short body')
  })

  it('derives title from body when title is empty', () => {
    expect(getDisplayTitle({ title: '', body: 'Short body' })).toBe('Short body')
  })

  it('derives title from body when title is whitespace', () => {
    expect(getDisplayTitle({ title: '   ', body: 'Short body' })).toBe('Short body')
  })

  it('truncates to 8 words with ellipsis for long body', () => {
    const body = 'One two three four five six seven eight nine ten eleven'
    expect(getDisplayTitle({ body })).toBe('One two three four five six seven eight…')
  })

  it('returns full body when 8 words or fewer and under 60 chars', () => {
    const body = 'One two three four five six seven eight'
    expect(getDisplayTitle({ body })).toBe(body)
  })

  it('truncates long text even under 8 words', () => {
    const body = 'A'.repeat(65)
    // 1 word, 65 chars — over 60 char limit
    expect(getDisplayTitle({ body })).toContain('…')
  })

  it('returns empty string when body is empty', () => {
    expect(getDisplayTitle({ body: '' })).toBe('')
  })

  it('returns empty string when body is undefined', () => {
    expect(getDisplayTitle({})).toBe('')
  })

  it('returns empty string when both are empty', () => {
    expect(getDisplayTitle({ title: '', body: '' })).toBe('')
  })
})
