import { afterEach, describe, expect, it } from 'vitest'
import { getSession, clearSession, setSession } from '@/services/sessionService'

afterEach(clearSession)
describe('session validation', () => {
  it.each([
    null,
    [],
    {},
    { userId: 'u', username: 'u' },
    { userId: '', username: 'u', expiresAt: Date.now() + 1000 },
    { userId: 'u', username: 'u', expiresAt: 'tomorrow' },
    { userId: 'u', username: 'u', expiresAt: Date.now() },
    { userId: 'u', username: 'u', expiresAt: Date.now() + 1000, displayName: {} },
  ])('rejects malformed or expired session %j', value => {
    sessionStorage.setItem('mindfull_growth_session', JSON.stringify(value))
    expect(getSession()).toBeNull()
    expect(sessionStorage.getItem('mindfull_growth_session')).toBeNull()
  })
  it('round-trips a valid session', () => {
    const session = setSession({ id: 'u', username: 'name' })
    expect(getSession()).toEqual(session)
  })
})
