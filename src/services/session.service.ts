import type { SessionData, AuthenticatedUser } from '@/domain/user'

const SESSION_KEY = 'mindfull_growth_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Get the current session from sessionStorage
 * Returns null if no valid session exists
 */
export function getSession(): SessionData | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const session: SessionData = JSON.parse(stored)

    // Check expiration
    if (session.expiresAt < Date.now()) {
      clearSession()
      return null
    }

    return session
  } catch {
    clearSession()
    return null
  }
}

/**
 * Store a new session in sessionStorage
 */
export function setSession(user: AuthenticatedUser): SessionData {
  const session: SessionData = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

/**
 * Clear the current session
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Extend the current session expiration
 */
export function refreshSession(): void {
  const session = getSession()
  if (session) {
    session.expiresAt = Date.now() + SESSION_DURATION_MS
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}
