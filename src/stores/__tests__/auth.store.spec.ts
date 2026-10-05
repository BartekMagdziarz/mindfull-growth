import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import * as database from '@/services/userDatabase.service'
import { setSession, getSession, clearSession } from '@/services/session.service'
import type { User } from '@/domain/user'

const user: User = {
  id: 'auth-user',
  username: 'saved-name',
  displayName: 'Saved',
  passwordHash: 'hash',
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
}
beforeEach(() => {
  clearSession()
  vi.stubEnv('VITE_DEV_AUTO_LOGIN_USER_ID', '')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  clearSession()
})

describe('auth lifecycle', () => {
  it('updates the lockout countdown and unlocks automatically after 30 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.spyOn(authDexieRepository, 'getUserByUsername').mockResolvedValue(undefined)
    const store = useAuthStore()
    for (let i = 0; i < 5; i++) await store.login('unknown', 'wrong')
    expect(store.isLockedOut).toBe(true)
    expect(store.lockoutRemainingSeconds).toBe(30)
    vi.advanceTimersByTime(1000)
    expect(store.lockoutRemainingSeconds).toBe(29)
    vi.advanceTimersByTime(29000)
    expect(store.isLockedOut).toBe(false)
    expect(store.lockoutRemainingSeconds).toBe(0)
    await store.login('unknown', 'wrong')
    expect(authDexieRepository.getUserByUsername).toHaveBeenCalledTimes(6)
    expect(store.isLockedOut).toBe(false)
    store.$dispose()
  })
  it('leaves no authenticated state when opening the user database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(authDexieRepository, 'getUserById').mockResolvedValue(user)
    vi.spyOn(database, 'connectUserDatabase').mockRejectedValue(new Error('open failed'))
    setSession({ id: user.id, username: user.username })
    const store = useAuthStore()
    await store.initialize()
    expect(store.isAuthenticated).toBe(false)
    expect(getSession()).toBeNull()
    expect(store.isInitialized).toBe(true)
    expect(store.isLoading).toBe(false)
  })
  it('logout cancels initialization waiting for a user lookup', async () => {
    let resolve!: (value: User) => void
    vi.spyOn(authDexieRepository, 'getUserById').mockReturnValue(
      new Promise<User>(done => {
        resolve = done
      })
    )
    const connecting = vi.spyOn(database, 'connectUserDatabase')
    setSession({ id: user.id, username: user.username })
    const store = useAuthStore()
    const initialization = store.initialize()
    await store.logout()
    resolve(user)
    await initialization
    expect(connecting).not.toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(getSession()).toBeNull()
    expect(store.isLoading).toBe(false)
  })
})
