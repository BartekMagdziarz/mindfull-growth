import type { Transaction } from 'dexie'

/**
 * One Dexie schema version of the per-user database. Versions are append-only:
 * a shipped version's `stores` and `upgrade` must never change (users' databases
 * are already at it) — fix data in a new version instead.
 */
export interface DexieMigration {
  version: number
  /** Table schema delta for this version (`null` deletes a table). */
  stores: Record<string, string | null>
  /** Runs once when an older database opens at this version. */
  upgrade?: (trans: Transaction) => PromiseLike<unknown> | void
}
