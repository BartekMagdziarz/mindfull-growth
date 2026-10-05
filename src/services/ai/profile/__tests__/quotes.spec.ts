import { describe, expect, it } from 'vitest'
import { withUserQuotes } from '../quotes'
import type { Schema } from '../../companion/schema'
const schema: Schema = {
  type: 'object',
  properties: {
    proposals: {
      type: 'array',
      items: { type: 'object', properties: { quote: { type: 'string' } } },
    },
  },
}
describe('profile evidence choices', () => {
  it('offers literal user sentences with negation and excludes assistant suggestions', () => {
    const result = withUserQuotes(schema, [
      { role: 'user', text: 'Nie chcę codziennych celów. Lubię rysować.' },
      { role: 'assistant', text: 'Będziesz ćwiczyć codziennie.' },
    ])
    const choices = result.properties!.proposals.items!.properties!.quote.enum
    expect(choices).toContain('Nie chcę codziennych celów.')
    expect(choices).not.toContain('Będziesz ćwiczyć codziennie.')
    expect(schema.properties!.proposals.items!.properties!.quote.enum).toBeUndefined()
  })
  it('forbids proposals without user evidence', () => {
    expect(
      withUserQuotes(schema, [{ role: 'assistant', text: 'Sugestia' }]).properties!.proposals
        .maxItems
    ).toBe(0)
  })
})
