import { describe, expect, it } from 'vitest'
import type { DayRef } from '@/domain/period'
import {
  emptyReturnReflection,
  formatReturnReflection,
  hasReturnReflection,
  isReturnReflectionTitle,
  parseReturnReflection,
  returnReflectionTitle,
} from '@/domain/returnReflection'

describe('return reflection', () => {
  it('round-trips three answers through the journal body', () => {
    const reflection = {
      whatHappened: 'Choroba, potem wyjazd.',
      aliveAndDropped: 'Bieganie zostało, rutyna odpadła.',
      wantNow: 'Mniej rzeczy naraz.',
    }
    const body = formatReturnReflection(reflection)
    expect(body).toBe(
      'Co się działo: Choroba, potem wyjazd.\n\nŻywe i odpadłe: Bieganie zostało, rutyna odpadła.\n\nChcę teraz: Mniej rzeczy naraz.'
    )
    expect(parseReturnReflection(body)).toEqual(reflection)
  })

  it('skips empty answers and reads them back as empty', () => {
    const body = formatReturnReflection({ ...emptyReturnReflection(), wantNow: 'Sen.' })
    expect(body).toBe('Chcę teraz: Sen.')
    expect(parseReturnReflection(body)).toEqual({
      whatHappened: '',
      aliveAndDropped: '',
      wantNow: 'Sen.',
    })
    expect(formatReturnReflection(emptyReturnReflection())).toBe('')
    expect(hasReturnReflection(emptyReturnReflection())).toBe(false)
    expect(hasReturnReflection({ ...emptyReturnReflection(), whatHappened: ' x ' })).toBe(true)
  })

  it("tolerates the user's own edits: unlabelled text becomes „co się działo”", () => {
    expect(parseReturnReflection('Po prostu przerwa.\n\nDrugi akapit.')).toEqual({
      whatHappened: 'Po prostu przerwa.\nDrugi akapit.',
      aliveAndDropped: '',
      wantNow: '',
    })
    expect(
      parseReturnReflection('chcę teraz: spokoju\n\nUwaga: to nie etykieta\n\nCo się działo: grypa')
    ).toEqual({
      whatHappened: 'grypa\nUwaga: to nie etykieta',
      aliveAndDropped: '',
      wantNow: 'spokoju',
    })
  })

  it('titles carry the date range and are recognisable', () => {
    const title = returnReflectionTitle('2026-09-30' as DayRef, '2026-10-25' as DayRef)
    expect(title).toBe('Powrót po przerwie · 30 wrz – 25 paź')
    expect(isReturnReflectionTitle(title)).toBe(true)
    expect(isReturnReflectionTitle('Powrót po przerwie')).toBe(true)
    expect(isReturnReflectionTitle('Zwykły wpis')).toBe(false)
    expect(isReturnReflectionTitle(undefined)).toBe(false)
  })
})
