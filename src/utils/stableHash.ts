/**
 * cyrb53 — a fast, deterministic, NON-cryptographic 53-bit string hash.
 *
 * Used purely for cache-invalidation keys (e.g. the profile period-summary
 * `inputHash`), never for security. Stable across runs and platforms, so the
 * same input always yields the same key. A collision only causes a stale digest
 * to be reused, not a correctness/security issue — 53 bits is ample for that.
 *
 * Adapted from https://github.com/bryc/code (public domain).
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return hash.toString(36)
}
