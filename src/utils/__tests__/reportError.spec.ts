import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportError as mockedReportError } from '@/utils/reportError'

const { reportError } =
  await vi.importActual<typeof import('@/utils/reportError')>('@/utils/reportError')

describe('reportError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints the error under a [scope] prefix', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('disk full')

    reportError('thoughtRecords.update', failure)

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith('[thoughtRecords.update]', failure)
  })

  it('accepts non-Error values without touching them', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    reportError('scope', 'plain string')

    expect(consoleError).toHaveBeenCalledWith('[scope]', 'plain string')
  })

  it('is replaced by a silent mock in the test environment', () => {
    expect(vi.isMockFunction(mockedReportError)).toBe(true)
  })

  it('pairs with an Error that keeps the original as cause', () => {
    const original = new Error('IndexedDB failure')

    const wrapped = new Error('Failed to persist thought record', { cause: original })

    expect(wrapped.message).toBe('Failed to persist thought record')
    expect(wrapped.cause).toBe(original)
  })
})
