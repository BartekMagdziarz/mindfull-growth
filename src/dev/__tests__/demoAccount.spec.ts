import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEMO_PORT, DEMO_USER_ID } from '../demoAccount'

describe('demo account constants', () => {
  it('DEMO_USER_ID matches VITE_DEV_AUTO_LOGIN_USER_ID in .env.demo', () => {
    const env = readFileSync(resolve(process.cwd(), '.env.demo'), 'utf-8')
    expect(env.match(/^VITE_DEV_AUTO_LOGIN_USER_ID=(.+)$/m)?.[1]?.trim()).toBe(DEMO_USER_ID)
    expect(env).toMatch(/^VITE_DEMO_MODE=1$/m)
  })

  it('dev:demo runs on DEMO_PORT', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    expect(pkg.scripts['dev:demo']).toContain(`--port ${DEMO_PORT}`)
    expect(pkg.scripts['dev:demo']).toContain('--mode demo')
  })
})
