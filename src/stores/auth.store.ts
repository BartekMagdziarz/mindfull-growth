import { defineStore } from 'pinia'
import { ref, computed, onScopeDispose } from 'vue'
import type { User, AuthenticatedUser } from '@/domain/user'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { hashPassword, verifyPassword } from '@/services/cryptoService'
import { getSession, setSession, clearSession } from '@/services/sessionService'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabaseService'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 1000 // 30 seconds

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loginAttempts = ref(0)
  const lockoutUntil = ref<number | null>(null)
  const now = ref(Date.now())
  let authRevision = 0
  let countdown: ReturnType<typeof setInterval> | undefined
  let initialization: Promise<void> | null = null

  function clearLockout(): void {
    loginAttempts.value = 0
    lockoutUntil.value = null
    clearInterval(countdown)
    countdown = undefined
  }
  function updateClock(): void {
    now.value = Date.now()
    if (lockoutUntil.value !== null && now.value >= lockoutUntil.value) clearLockout()
  }
  onScopeDispose(() => clearInterval(countdown))
  function assertAuthCurrent(revision: number): void {
    if (revision !== authRevision) throw new Error('Authentication operation cancelled')
  }

  const isAuthenticated = computed(() => user.value !== null)
  const isLockedOut = computed(() => lockoutUntil.value !== null && now.value < lockoutUntil.value)
  const lockoutRemainingSeconds = computed(() => {
    if (!lockoutUntil.value) return 0
    return Math.max(0, Math.ceil((lockoutUntil.value - now.value) / 1000))
  })

  /**
   * Initialize auth state from session storage
   * Should be called once on app startup
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return
    if (initialization) return initialization
    initialization = initializeSession()
    try {
      await initialization
    } finally {
      initialization = null
    }
  }

  async function initializeSession(): Promise<void> {
    const revision = ++authRevision
    isLoading.value = true

    try {
      // Dev bypass: auto-login via VITE_DEV_AUTO_LOGIN_USER_ID env variable
      if (import.meta.env.DEV && import.meta.env.MODE !== 'ai-demo') {
        const devUserId = import.meta.env.VITE_DEV_AUTO_LOGIN_USER_ID as string | undefined
        if (devUserId) {
          const devUser = await authDexieRepository.getUserById(devUserId)
          assertAuthCurrent(revision)
          if (devUser) {
            await connectUserDatabase(devUser.id)
            assertAuthCurrent(revision)
            user.value = {
              id: devUser.id,
              username: devUser.username,
              displayName: devUser.displayName,
            }
            isInitialized.value = true
            return
          }
        }
      }

      const session = getSession()
      if (session) {
        // Verify user still exists
        const existingUser = await authDexieRepository.getUserById(session.userId)
        assertAuthCurrent(revision)
        if (existingUser) {
          await connectUserDatabase(existingUser.id)
          assertAuthCurrent(revision)
          user.value = {
            id: existingUser.id,
            username: existingUser.username,
            displayName: existingUser.displayName,
          }
        } else {
          // User no longer exists, clear session
          clearSession()
        }
      }
    } catch (err) {
      if (revision !== authRevision) return
      console.error('Failed to initialize auth:', err)
      user.value = null
      clearSession()
      await disconnectUserDatabase()
    } finally {
      if (revision === authRevision) {
        isInitialized.value = true
        isLoading.value = false
      }
    }
  }

  /**
   * Sign up a new user
   */
  async function signup(
    username: string,
    password: string,
    displayName?: string
  ): Promise<boolean> {
    if (isLoading.value) return false
    const revision = ++authRevision
    error.value = null
    isLoading.value = true

    try {
      const normalizedUsername = username.toLowerCase().trim()

      // Check username uniqueness
      const exists = await authDexieRepository.usernameExists(normalizedUsername)
      assertAuthCurrent(revision)
      if (exists) {
        error.value = 'Username already exists'
        return false
      }

      // Validate inputs
      if (normalizedUsername.length < 3) {
        error.value = 'Username must be at least 3 characters'
        return false
      }
      if (password.length < 6) {
        error.value = 'Password must be at least 6 characters'
        return false
      }

      // Hash password
      const passwordHash = await hashPassword(password)
      assertAuthCurrent(revision)

      // Create user
      const now = new Date().toISOString()
      const newUser: User = {
        id: crypto.randomUUID(),
        username: normalizedUsername,
        passwordHash,
        createdAt: now,
        lastLoginAt: now,
        displayName: displayName?.trim() || undefined,
      }

      await authDexieRepository.createUser(newUser)
      assertAuthCurrent(revision)

      // Connect to user's database (creates it if doesn't exist)
      await connectUserDatabase(newUser.id)
      assertAuthCurrent(revision)

      // Set session
      const authenticatedUser: AuthenticatedUser = {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
      }
      setSession(authenticatedUser)
      user.value = authenticatedUser

      return true
    } catch (err) {
      if (revision !== authRevision) return false
      user.value = null
      clearSession()
      await disconnectUserDatabase()
      console.error('Signup failed:', err)
      error.value = 'Failed to create account. Please try again.'
      return false
    } finally {
      if (revision === authRevision) isLoading.value = false
    }
  }

  /**
   * Log in an existing user
   */
  async function login(username: string, password: string): Promise<boolean> {
    if (isLoading.value) return false
    updateClock()
    const revision = ++authRevision
    error.value = null

    // Check lockout
    if (isLockedOut.value) {
      error.value = `Too many attempts. Try again in ${lockoutRemainingSeconds.value} seconds.`
      return false
    }

    isLoading.value = true

    try {
      const normalizedUsername = username.toLowerCase().trim()

      // Find user
      const existingUser = await authDexieRepository.getUserByUsername(normalizedUsername)
      assertAuthCurrent(revision)
      if (!existingUser) {
        handleFailedLogin()
        error.value = 'Invalid username or password'
        return false
      }

      // Verify password
      const isValid = await verifyPassword(password, existingUser.passwordHash)
      assertAuthCurrent(revision)
      if (!isValid) {
        handleFailedLogin()
        error.value = 'Invalid username or password'
        return false
      }

      // Reset login attempts on success
      clearLockout()

      // Update last login
      const updatedUser: User = {
        ...existingUser,
        lastLoginAt: new Date().toISOString(),
      }
      await authDexieRepository.updateUser(updatedUser)
      assertAuthCurrent(revision)

      // Connect to user's database
      await connectUserDatabase(existingUser.id)
      assertAuthCurrent(revision)

      // Set session
      const authenticatedUser: AuthenticatedUser = {
        id: existingUser.id,
        username: existingUser.username,
        displayName: existingUser.displayName,
      }
      setSession(authenticatedUser)
      user.value = authenticatedUser

      return true
    } catch (err) {
      if (revision !== authRevision) return false
      user.value = null
      clearSession()
      await disconnectUserDatabase()
      console.error('Login failed:', err)
      error.value = 'Login failed. Please try again.'
      return false
    } finally {
      if (revision === authRevision) isLoading.value = false
    }
  }

  /**
   * Handle failed login attempt (rate limiting)
   */
  function handleFailedLogin(): void {
    loginAttempts.value++
    if (loginAttempts.value >= MAX_LOGIN_ATTEMPTS) {
      now.value = Date.now()
      lockoutUntil.value = now.value + LOCKOUT_DURATION_MS
      clearInterval(countdown)
      countdown = setInterval(updateClock, 250)
    }
  }

  /**
   * Log out the current user
   */
  async function logout(): Promise<void> {
    authRevision++
    user.value = null
    isLoading.value = false
    clearLockout()
    clearSession()
    error.value = null
    try {
      await disconnectUserDatabase()
    } catch (err) {
      console.error('Error disconnecting database:', err)
    }
  }

  /**
   * Clear any error message
   */
  function clearError(): void {
    error.value = null
  }

  return {
    // State
    user,
    isInitialized,
    isLoading,
    error,
    // Computed
    isAuthenticated,
    isLockedOut,
    lockoutRemainingSeconds,
    // Actions
    initialize,
    signup,
    login,
    logout,
    clearError,
  }
})
