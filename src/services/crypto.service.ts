/**
 * Password hashing using Web Crypto API (PBKDF2)
 * Uses browser-native cryptography - no WASM required
 */

const PBKDF2_ITERATIONS = 310000 // OWASP recommended for SHA-256
const SALT_LENGTH = 16
const HASH_LENGTH = 32

/**
 * Hash a password using PBKDF2-SHA256
 * Returns a string in format: base64(salt):base64(hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))

  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    HASH_LENGTH * 8
  )

  const saltBase64 = btoa(String.fromCharCode(...salt))
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)))

  return `${saltBase64}:${hashBase64}`
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltBase64, expectedHashBase64] = storedHash.split(':')
    if (!saltBase64 || !expectedHashBase64) {
      return false
    }

    // Decode salt
    const salt = new Uint8Array(
      atob(saltBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    )

    // Hash the provided password with the same salt
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      HASH_LENGTH * 8
    )

    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)))

    // Constant-time comparison
    if (hashBase64.length !== expectedHashBase64.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < hashBase64.length; i++) {
      result |= hashBase64.charCodeAt(i) ^ expectedHashBase64.charCodeAt(i)
    }

    return result === 0
  } catch {
    return false
  }
}
