import { describe, expect, it } from 'vitest'
import { firstSentence } from '../pathModel'

describe('firstSentence', () => {
  it('returns the first sentence of a multi-sentence intro', () => {
    expect(
      firstSentence(
        'Zacznij od pomiaru: jak traktujesz siebie w trudnych chwilach. Wrócisz do niego.'
      )
    ).toBe('Zacznij od pomiaru: jak traktujesz siebie w trudnych chwilach.')
  })

  it('keeps a one-sentence intro whole, trimmed', () => {
    expect(firstSentence('  Teraz ty jesteś współczuciem.  ')).toBe('Teraz ty jesteś współczuciem.')
  })

  it('does not split on an abbreviation-like dot inside a quoted phrase', () => {
    expect(firstSentence('Wybierz moment i rozłóż gorącą myśl „jestem…”. Szukaj dowodów.')).toBe(
      'Wybierz moment i rozłóż gorącą myśl „jestem…”.'
    )
  })

  it('handles the empty string', () => {
    expect(firstSentence('')).toBe('')
  })
})
