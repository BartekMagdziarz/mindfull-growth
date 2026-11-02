import { describe, expect, it } from 'vitest'
import { providerErrorText } from '../aiProviderErrorCopy'

describe('providerErrorText', () => {
  it('names the cause of provider failures', () => {
    expect(providerErrorText('anthropic-billing')).toContain('środków')
    expect(providerErrorText('anthropic-http-401')).toContain('klucz API')
    expect(providerErrorText('openai-http-403')).toContain('klucz API')
    expect(providerErrorText('anthropic-http-429')).toContain('limit zapytań')
    expect(providerErrorText('anthropic-http-529')).toContain('przeciążony')
    expect(providerErrorText('anthropic-http-400')).toContain('błąd 400')
    expect(providerErrorText('network-error')).toContain('połączenia')
    expect(providerErrorText('incomplete-response')).toContain('urwała się')
  })

  it('leaves app-level codes to the panel', () => {
    expect(providerErrorText('cost-limit')).toBeNull()
    expect(providerErrorText('runtime-error')).toBeNull()
    expect(providerErrorText('')).toBeNull()
  })
})
