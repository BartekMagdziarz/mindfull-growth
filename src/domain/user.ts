/**
 * User stored in the authentication database (MindfullGrowthAuthDB)
 */
export interface User {
  id: string
  username: string // unique, stored lowercase for case-insensitive comparison
  passwordHash: string // Argon2id encoded hash (includes salt)
  createdAt: string // ISO timestamp
  lastLoginAt: string // ISO timestamp
  displayName?: string
}

/**
 * Authenticated user session data (no sensitive info)
 * Used in-memory and in sessionStorage
 */
export interface AuthenticatedUser {
  id: string
  username: string
  displayName?: string
}

/**
 * Session data stored in sessionStorage
 */
export interface SessionData {
  userId: string
  username: string
  displayName?: string
  expiresAt: number // Unix timestamp (ms)
}
