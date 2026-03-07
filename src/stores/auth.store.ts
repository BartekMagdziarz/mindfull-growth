import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, AuthenticatedUser } from '@/domain/user'
import { authDexieRepository } from '@/repositories/authDexieRepository'
import { hashPassword, verifyPassword } from '@/services/crypto.service'
import { getSession, setSession, clearSession } from '@/services/session.service'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabase.service'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 1000 // 30 seconds

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loginAttempts = ref(0)
  const lockoutUntil = ref<number | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isLockedOut = computed(
    () => lockoutUntil.value !== null && Date.now() < lockoutUntil.value
  )
  const lockoutRemainingSeconds = computed(() => {
    if (!lockoutUntil.value) return 0
    return Math.ceil((lockoutUntil.value - Date.now()) / 1000)
  })

  /**
   * Initialize auth state from session storage
   * Should be called once on app startup
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return

    try {
      const session = getSession()
      if (session) {
        // Verify user still exists
        const existingUser = await authDexieRepository.getUserById(session.userId)
        if (existingUser) {
          user.value = {
            id: session.userId,
            username: session.username,
            displayName: session.displayName,
          }
          await connectUserDatabase(session.userId)
        } else {
          // User no longer exists, clear session
          clearSession()
        }
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err)
      clearSession()
    } finally {
      isInitialized.value = true
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
    error.value = null
    isLoading.value = true

    try {
      const normalizedUsername = username.toLowerCase().trim()

      // Check username uniqueness
      if (await authDexieRepository.usernameExists(normalizedUsername)) {
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

      // Connect to user's database (creates it if doesn't exist)
      await connectUserDatabase(newUser.id)

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
      console.error('Signup failed:', err)
      error.value = 'Failed to create account. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Log in an existing user
   */
  async function login(username: string, password: string): Promise<boolean> {
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
      if (!existingUser) {
        handleFailedLogin()
        error.value = 'Invalid username or password'
        return false
      }

      // Verify password
      const isValid = await verifyPassword(password, existingUser.passwordHash)
      if (!isValid) {
        handleFailedLogin()
        error.value = 'Invalid username or password'
        return false
      }

      // Reset login attempts on success
      loginAttempts.value = 0
      lockoutUntil.value = null

      // Update last login
      const updatedUser: User = {
        ...existingUser,
        lastLoginAt: new Date().toISOString(),
      }
      await authDexieRepository.updateUser(updatedUser)

      // Connect to user's database
      await connectUserDatabase(existingUser.id)

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
      console.error('Login failed:', err)
      error.value = 'Login failed. Please try again.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Handle failed login attempt (rate limiting)
   */
  function handleFailedLogin(): void {
    loginAttempts.value++
    if (loginAttempts.value >= MAX_LOGIN_ATTEMPTS) {
      lockoutUntil.value = Date.now() + LOCKOUT_DURATION_MS
    }
  }

  /**
   * Log out the current user
   */
  async function logout(): Promise<void> {
    try {
      await disconnectUserDatabase()
    } catch (err) {
      console.error('Error disconnecting database:', err)
    }

    clearSession()
    user.value = null
    error.value = null
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
