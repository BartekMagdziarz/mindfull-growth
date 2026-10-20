/**
 * One sink for "log it, then rethrow" failures.
 *
 * Convention (docs/backlog.md P-2): a catch block that cannot recover calls
 * `reportError(scope, error)` and rethrows with the original attached,
 * `throw new Error('Failed to …', { cause: error })`, so the first failure is
 * never lost behind the wrapper's message.
 *
 * Tests replace this module (`src/test/setup.ts`) with a `vi.fn()`, so
 * expected failures stay out of the vitest stderr and specs can assert on
 * `reportError` instead of spying on `console.error`.
 *
 * @param scope - where it happened, e.g. `thoughtRecords.update` or
 *   `journalStore.loadEntries`; printed as a `[scope]` prefix.
 */
export function reportError(scope: string, error: unknown): void {
  console.error(`[${scope}]`, error)
}
