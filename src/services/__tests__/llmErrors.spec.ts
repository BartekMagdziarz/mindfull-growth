import { describe, expect, it } from 'vitest'
import {
  LlmError,
  LlmNotConfiguredError,
  isLlmAbort,
  isLlmError,
  llmErrorCode,
  llmErrorPresentation,
} from '@/services/llmErrors'

describe('llmErrors', () => {
  it('LlmNotConfiguredError carries the code and keeps the English message for logs', () => {
    const error = new LlmNotConfiguredError()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(LlmError)
    expect(error.code).toBe('not-configured')
    expect(error.message).toBe(
      'AI provider is not configured. Please add AI provider settings in Profile settings.'
    )
    expect(isLlmError(error)).toBe(true)
    expect(llmErrorCode(error)).toBe('not-configured')
  })

  it('keeps the cause', () => {
    const cause = new TypeError('fetch failed')
    const error = new LlmError('network', 'Network error.', { cause })
    expect(error.cause).toBe(cause)
    expect(llmErrorCode(error)).toBe('network')
  })

  it('tells aborts apart from failures', () => {
    expect(isLlmAbort(new LlmError('cancelled', 'AI request cancelled.'))).toBe(true)
    expect(isLlmAbort(new LlmError('timed-out', 'AI request timed out.'))).toBe(true)
    expect(isLlmAbort(new LlmError('network', 'Network error.'))).toBe(false)
    expect(isLlmAbort(new Error('x'))).toBe(false)
  })

  describe('llmErrorPresentation', () => {
    it('maps a missing provider to the notConfigured key with a profile link', () => {
      expect(llmErrorPresentation(new LlmNotConfiguredError())).toEqual({
        key: 'notConfigured',
        detail: undefined,
        profileLink: true,
      })
    })

    it('maps every code to its key; only API errors keep the provider text as a detail', () => {
      expect(
        llmErrorPresentation(new LlmError('invalid-api-key', 'Invalid API key.'))
      ).toMatchObject({ key: 'invalidApiKey', profileLink: true, detail: undefined })
      expect(llmErrorPresentation(new LlmError('rate-limit', 'Rate limit.'))).toMatchObject({
        key: 'rateLimit',
        profileLink: false,
      })
      expect(llmErrorPresentation(new LlmError('network', 'Network.'))).toMatchObject({
        key: 'network',
      })
      expect(llmErrorPresentation(new LlmError('refusal', 'Declined.'))).toMatchObject({
        key: 'refusal',
      })
      expect(llmErrorPresentation(new LlmError('cancelled', 'Cancelled.'))).toMatchObject({
        key: 'cancelled',
      })
      expect(llmErrorPresentation(new LlmError('timed-out', 'Timed out.'))).toMatchObject({
        key: 'timedOut',
      })
      expect(llmErrorPresentation(new LlmError('empty-response', 'Empty.'))).toMatchObject({
        key: 'emptyResponse',
        detail: undefined,
      })
      expect(llmErrorPresentation(new LlmError('api', 'model "x" not found'))).toEqual({
        key: 'api',
        detail: 'model "x" not found',
        profileLink: false,
      })
    })

    it('turns a plain Error or a string into the generic sentence with the text as a detail', () => {
      expect(llmErrorPresentation(new Error('Something odd'))).toEqual({
        key: 'failed',
        detail: 'Something odd',
        profileLink: false,
      })
      expect(llmErrorPresentation('Nie udało się')).toEqual({
        key: 'failed',
        detail: 'Nie udało się',
        profileLink: false,
      })
      expect(llmErrorPresentation(null)).toEqual({ key: 'failed', profileLink: false })
      expect(llmErrorPresentation(new Error(''))).toEqual({
        key: 'failed',
        detail: undefined,
        profileLink: false,
      })
    })
  })
})
