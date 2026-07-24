import type {
  FixtureMeta,
  VerifyBridgeRequest,
  VerifyBridgeResponse,
} from './richVerificationScenario'

export const UX_LAB_ORIGIN = 'http://127.0.0.1:5201'

export interface VerifyBridgeDependencies {
  getMeta: () => FixtureMeta
  reset: () => Promise<void>
}

export function isAllowedUxLabOrigin(origin: string): boolean {
  return origin === UX_LAB_ORIGIN
}

export function parseVerifyBridgeRequest(value: unknown): VerifyBridgeRequest | null {
  if (!value || typeof value !== 'object') return null
  const request = value as Partial<VerifyBridgeRequest>
  if (typeof request.requestId !== 'string' || request.requestId.length === 0) return null
  if (
    request.type !== 'mindful-growth:verify:status-request' &&
    request.type !== 'mindful-growth:verify:reset-request'
  ) return null
  return request as VerifyBridgeRequest
}

export async function answerVerifyBridgeRequest(
  request: VerifyBridgeRequest,
  dependencies: VerifyBridgeDependencies,
): Promise<VerifyBridgeResponse> {
  if (request.type === 'mindful-growth:verify:status-request') {
    return {
      type: 'mindful-growth:verify:status',
      requestId: request.requestId,
      ready: true,
      meta: dependencies.getMeta(),
    }
  }

  try {
    await dependencies.reset()
    return {
      type: 'mindful-growth:verify:reset-result',
      requestId: request.requestId,
      ok: true,
      meta: dependencies.getMeta(),
    }
  } catch (error) {
    return {
      type: 'mindful-growth:verify:reset-result',
      requestId: request.requestId,
      ok: false,
      meta: dependencies.getMeta(),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
