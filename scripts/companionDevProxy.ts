import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { StringDecoder } from 'node:string_decoder'

/** Local development only. The benchmark key stays in Node, never in Vite's client bundle. */
export function companionDevProxy(): Plugin {
  return {
    name: 'companion-local-openai',
    apply: 'serve',
    configureServer(server) {
      const demo = server.config.mode === 'ai-demo'
      const session = { id: crypto.randomUUID(), enabled: false, usedUsd: 0, limitUsd: 0.5 }
      const active = new Set<AbortController>()
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__companion/')) return next()
        const end = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(body))
        }
        const host = req.headers.host ?? ''
        const hostname = host.replace(/:\d+$/, '')
        if (
          !['localhost', '127.0.0.1', '[::1]'].includes(hostname) ||
          !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
        )
          return end(403, { error: 'local-only' })
        if (req.headers.origin && req.headers.origin !== `http://${host}`)
          return end(403, { error: 'origin' })
        if (demo && host !== '127.0.0.1:5203') return end(403, { error: 'demo-origin' })
        let key = ''
        try {
          key =
            process.env.OPENAI_API_KEY ||
            parseEnv(readFileSync('.env.ai-companion.local', 'utf8')).OPENAI_API_KEY ||
            ''
        } catch {
          /* optional local config */
        }
        if (server.config.mode === 'verification') key = ''
        if (req.url === '/__companion/status' && req.method === 'GET')
          return end(200, {
            available: Boolean(key.trim()) && (!demo || session.enabled),
            ...(demo ? { demo: { ...session, configured: Boolean(key.trim()) } } : {}),
          })
        if (demo && ['/__companion/demo/enable', '/__companion/demo/disable'].includes(req.url)) {
          if (
            req.method !== 'POST' ||
            req.headers.origin !== `http://${host}` ||
            !req.headers['content-type']?.startsWith('application/json')
          )
            return end(403, { error: 'origin' })
          session.enabled =
            req.url.endsWith('/enable') && Boolean(key.trim()) && session.usedUsd < session.limitUsd
          if (!session.enabled) for (const controller of active) controller.abort()
          return end(200, { ...session, configured: Boolean(key.trim()) })
        }
        if (req.url !== '/__companion/responses' || req.method !== 'POST')
          return end(404, { error: 'not-found' })
        if (
          req.headers.origin !== `http://${host}` ||
          !req.headers['content-type']?.startsWith('application/json')
        )
          return end(403, { error: 'origin' })
        if (demo && !session.enabled) return end(403, { error: 'demo-disabled' })
        if (!key.trim()) return end(503, { error: 'missing-key' })
        let bytes = 0,
          text = ''
        const decoder = new StringDecoder('utf8')
        try {
          for await (const chunk of req) {
            bytes += Buffer.byteLength(chunk)
            if (bytes > 150000) return end(413, { error: 'body-limit' })
            text += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          text += decoder.end()
          const body = JSON.parse(text)
          if (
            body.model !== 'gpt-6-luna' ||
            body.max_output_tokens > 8192 ||
            body.max_output_tokens < 1 ||
            !Number.isInteger(body.max_output_tokens) ||
            body.store !== false ||
            body.stream !== false ||
            body.service_tier !== 'default' ||
            !Array.isArray(body.tools) ||
            body.tools.some((t: { type?: string }) => t.type !== 'function')
          )
            return end(400, { error: 'invalid-request' })
          // Same conservative rates as the local companion runtime; estimate, not billing.
          const reserved = ((bytes + 4096) * 0.125 + body.max_output_tokens * 0.5) / 1e6
          if (demo) {
            if (session.usedUsd + reserved > session.limitUsd)
              return end(429, { error: 'demo-budget-limit' })
            session.usedUsd += reserved
          }
          const controller = new AbortController()
          if (demo) active.add(controller)
          const timer = setTimeout(() => controller.abort(), 180000)
          res.on('close', () => controller.abort())
          try {
            const upstream = await fetch('https://api.openai.com/v1/responses', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${key.trim()}`,
                'Content-Type': 'application/json',
              },
              body: text,
              signal: controller.signal,
            })
            if (!upstream.ok) {
              await upstream.body?.cancel()
              return end(upstream.status, { error: 'openai-error' })
            }
            const reader = upstream.body?.getReader()
            if (!reader) return end(502, { error: 'empty-response' })
            const chunks: Uint8Array[] = []
            let size = 0
            while (true) {
              const item = await reader.read()
              if (item.done) break
              size += item.value.byteLength
              if (size > 2000000) {
                await reader.cancel()
                return end(502, { error: 'response-limit' })
              }
              chunks.push(item.value)
            }
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            const requestId = upstream.headers.get('x-request-id')
            if (requestId) res.setHeader('x-request-id', requestId)
            const response = Buffer.concat(chunks)
            if (demo) {
              try {
                const usage = JSON.parse(response.toString()).usage
                if (
                  Number.isFinite(usage?.input_tokens) &&
                  usage.input_tokens >= 0 &&
                  Number.isFinite(usage?.output_tokens) &&
                  usage.output_tokens >= 0
                )
                  session.usedUsd +=
                    (usage.input_tokens * 0.125 + usage.output_tokens * 0.5) / 1e6 - reserved
              } catch {
                /* Unknown charges stay reserved, including interrupted responses. */
              }
            }
            res.end(response)
          } finally {
            clearTimeout(timer)
            active.delete(controller)
          }
        } catch {
          if (!res.destroyed) end(502, { error: 'connection-failed' })
        }
      })
    },
  }
}
