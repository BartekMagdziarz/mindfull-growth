import type { Schema } from '../companion/schema'
/** Closed evidence choices: the model may select user words, never reconstruct a quote. */
export function withUserQuotes(
  schema: Schema,
  messages: Array<{ role: string; text: string }>
): Schema {
  const quotes: string[] = []
  for (const message of [...messages].reverse()) {
    if (message.role !== 'user') continue
    const text = message.text.trim()
    if (text && text.length <= 500) quotes.push(text)
    for (const sentence of text.match(/[^.!?]+[.!?]?/gu) ?? []) {
      const quote = sentence.trim()
      if (quote && quote.length <= 500) quotes.push(quote)
    }
    if (text.length > 500 && !quotes.some(q => text.includes(q))) {
      // A bounded literal excerpt for long unpunctuated input; full text stays in the prompt.
      const prefix = text.slice(0, 500),
        boundary = prefix.lastIndexOf(' ')
      quotes.push(prefix.slice(0, boundary > 100 ? boundary : 500))
    }
  }
  const result = structuredClone(schema)
  const evidence = [...new Set(quotes)].slice(0, 40)
  if (evidence.length)
    result.properties!.proposals.items!.properties!.quote = { type: 'string', enum: evidence }
  else result.properties!.proposals.maxItems = 0
  return result
}
