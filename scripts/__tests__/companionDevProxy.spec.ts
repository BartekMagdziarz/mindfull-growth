import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'
import { companionDevProxy } from '../companionDevProxy'

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>
const request = {
  model: 'gpt-6-luna',
  max_output_tokens: 1000,
  store: false,
  stream: false,
  service_tier: 'default',
  tools: [],
}
async function call(
  options: {
    handler?: Middleware
    path?: string
    mode?: string
    host?: string
    origin?: string
    remote?: string
    status?: boolean
    body?: unknown
    chunks?: Buffer[]
  } = {}
) {
  let handler!: Middleware
  const server = {
    config: { mode: options.mode ?? 'development' },
    middlewares: {
      use: (fn: Middleware) => {
        handler = fn
      },
    },
  }
  const configure = companionDevProxy().configureServer as (s: ViteDevServer) => void
  if (options.handler) handler = options.handler
  else configure(server as unknown as ViteDevServer)
  const req = Object.assign(
    Readable.from(options.chunks ?? [JSON.stringify(options.body ?? request)]),
    {
      url: options.path ?? (options.status ? '/__companion/status' : '/__companion/responses'),
      method: options.status ? 'GET' : 'POST',
      headers: {
        host: options.host ?? 'localhost:5173',
        origin: options.origin ?? 'http://localhost:5173',
        'content-type': 'application/json',
      },
      socket: { remoteAddress: options.remote ?? '127.0.0.1' },
    }
  )
  let output = ''
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    destroyed: false,
    setHeader: vi.fn(),
    end: (body: string | Buffer) => {
      output = body.toString()
    },
  })
  await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse, vi.fn())
  return { status: res.statusCode, output }
}
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-secret-only')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}')))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('local companion proxy', () => {
  it('preserves UTF-8 characters split across request chunks', async () => {
    const body = { ...request, input: 'Żółć 🧘' }
    const encoded = Buffer.from(JSON.stringify(body))
    const chunks = Array.from(encoded, byte => Buffer.from([byte]))
    expect((await call({ chunks })).status).toBe(200)
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).input).toBe(body.input)
  })
  it('keeps the key in the server and reports availability without revealing it', async () => {
    expect(await call({ status: true })).toEqual({ status: 200, output: '{"available":true}' })
    expect(await call()).toEqual({ status: 200, output: '{"ok":true}' })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-secret-only' }),
      })
    )
  })
  it('never enables the real key in the verification app', async () => {
    expect(await call({ status: true, mode: 'verification' })).toEqual({
      status: 200,
      output: '{"available":false}',
    })
    expect((await call({ mode: 'verification' })).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects foreign origins, DNS rebinding hosts and remote clients before spending', async () => {
    for (const options of [
      { origin: 'https://example.com' },
      { host: 'example.com:5173' },
      { remote: '192.168.1.20' },
    ]) {
      expect((await call(options)).status).toBe(403)
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects other models, storage, hosted tools and oversized output requests', async () => {
    for (const patch of [
      { model: 'other' },
      { store: true },
      { tools: [{ type: 'web_search' }] },
      { max_output_tokens: 100000 },
    ]) {
      expect((await call({ body: { ...request, ...patch } })).status).toBe(400)
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not relay provider error details', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('private provider detail', { status: 429 }))
    expect(await call()).toEqual({ status: 429, output: '{"error":"openai-error"}' })
  })
})

it('allows the bounded monthly output budget and rejects larger requests', async () => {
  expect((await call({ body: { ...request, max_output_tokens: 8192 } })).status).toBe(200)
  expect((await call({ body: { ...request, max_output_tokens: 8193 } })).status).toBe(400)
})

function demoHandler() {
  let handler!: Middleware
  const configure = companionDevProxy().configureServer as (s: ViteDevServer) => void
  configure({
    config: { mode: 'ai-demo' },
    middlewares: {
      use: (fn: Middleware) => {
        handler = fn
      },
    },
  } as unknown as ViteDevServer)
  return handler
}
it('demo requires explicit enabling and exact isolated origin', async () => {
  const handler = demoHandler()
  const options = { handler, host: '127.0.0.1:5203', origin: 'http://127.0.0.1:5203' }
  expect((await call(options)).status).toBe(403)
  expect(
    (
      await call({
        ...options,
        host: '127.0.0.1:5173',
        origin: 'http://127.0.0.1:5173',
        path: '/__companion/demo/enable',
      })
    ).status
  ).toBe(403)
  expect(fetch).not.toHaveBeenCalled()
  await call({ ...options, path: '/__companion/demo/enable' })
  expect((await call(options)).status).toBe(200)
  await call({ ...options, path: '/__companion/demo/disable' })
  expect((await call(options)).status).toBe(403)
})
it('demo budget spans requests, disabling and reenabling; unknown charges stay reserved', async () => {
  const handler = demoHandler()
  const options = { handler, host: '127.0.0.1:5203', origin: 'http://127.0.0.1:5203' }
  await call({ ...options, path: '/__companion/demo/enable' })
  // Keep the reservation when upstream usage is unavailable. Large input reaches
  // the cap quickly without mocking its enforcement or making network requests.
  const body = { ...request, input: 'x'.repeat(140000), max_output_tokens: 8192 }
  await Promise.all(Array.from({ length: 30 }, () => call({ ...options, body })))
  const before = JSON.parse((await call({ ...options, status: true })).output).demo
  expect(before.usedUsd).toBeGreaterThan(0.47)
  expect(before.usedUsd).toBeLessThanOrEqual(before.limitUsd)
  await call({ ...options, path: '/__companion/demo/disable' })
  await call({ ...options, path: '/__companion/demo/enable' })
  const after = JSON.parse((await call({ ...options, status: true })).output).demo
  expect(after.usedUsd).toBe(before.usedUsd)
  expect((await call({ ...options, body })).status).toBe(429)
})
