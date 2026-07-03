import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VERIFY_USER_ID } from '../verificationAccount'

describe('verification account constants', () => {
  it('VERIFY_USER_ID matches VITE_DEV_AUTO_LOGIN_USER_ID in .env.verification', () => {
    // vitest runs with cwd = project root (jsdom rewrites import.meta.url to http).
    const envPath = resolve(process.cwd(), '.env.verification')
    const env = readFileSync(envPath, 'utf-8')
    const match = env.match(/^VITE_DEV_AUTO_LOGIN_USER_ID=(.+)$/m)
    expect(match?.[1]?.trim()).toBe(VERIFY_USER_ID)
  })
})
