import { describe, expect, it, vi } from 'vitest'
import type { DayRef } from '@/domain/period'
import { buildRichVerificationScenario } from '@/dev/richVerificationScenario'
import {
  UX_LAB_ORIGIN,
  answerVerifyBridgeRequest,
  isAllowedUxLabOrigin,
  parseVerifyBridgeRequest,
} from '@/dev/verificationBridge'

describe('verification bridge contract', () => {
  const meta = buildRichVerificationScenario('2026-07-19' as DayRef).meta

  it('akceptuje wyłącznie dokładny origin Labu', () => {
    expect(isAllowedUxLabOrigin(UX_LAB_ORIGIN)).toBe(true)
    expect(isAllowedUxLabOrigin('http://localhost:5201')).toBe(false)
    expect(isAllowedUxLabOrigin('http://127.0.0.1:5199')).toBe(false)
  })

  it('odrzuca nieznane i niekompletne komunikaty', () => {
    expect(parseVerifyBridgeRequest(null)).toBeNull()
    expect(parseVerifyBridgeRequest({ type: 'anything', requestId: 'x' })).toBeNull()
    expect(parseVerifyBridgeRequest({ type: 'mindful-growth:verify:status-request' })).toBeNull()
  })

  it('zwraca metadane fixture’a podczas handshake’u bez resetowania', async () => {
    const reset = vi.fn(async () => undefined)
    const response = await answerVerifyBridgeRequest(
      { type: 'mindful-growth:verify:status-request', requestId: 'status-1' },
      { getMeta: () => meta, reset },
    )

    expect(response).toEqual({
      type: 'mindful-growth:verify:status',
      requestId: 'status-1',
      ready: true,
      meta,
    })
    expect(reset).not.toHaveBeenCalled()
  })

  it('wykonuje bezpieczny reset i zachowuje requestId', async () => {
    const reset = vi.fn(async () => undefined)
    const response = await answerVerifyBridgeRequest(
      { type: 'mindful-growth:verify:reset-request', requestId: 'reset-1' },
      { getMeta: () => meta, reset },
    )

    expect(reset).toHaveBeenCalledOnce()
    expect(response).toMatchObject({
      type: 'mindful-growth:verify:reset-result',
      requestId: 'reset-1',
      ok: true,
      meta,
    })
  })
})
