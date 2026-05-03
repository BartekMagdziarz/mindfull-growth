/**
 * Tests for the cross-account data-leak fix coordinator.
 *
 * Verifies that `resetAppState()`:
 *   1. Wipes Pinia store state (sample: journal store).
 *   2. Does NOT touch `auth.store` (it owns the user/session).
 *   3. Calls every service-cache clearer exactly once.
 *
 * Plus a CI guard:
 *   4. Every `*.store.ts` under `src/stores` (except `auth.store`)
 *      is imported into `appStateReset.ts`. This is the safety net
 *      that catches "I added a 46th store and forgot to wire it up"
 *      in code review instead of in production.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// --- Mock service caches BEFORE importing the coordinator -------------------
// These four modules host the cache-clearing functions; we replace them with
// spies so we can assert `resetAppState()` invokes each one. Other exports
// from these modules are forwarded via `importOriginal()` so anything that
// the stores transitively depend on still works.
vi.mock('@/services/calendarChartData', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/calendarChartData')>()
  return { ...mod, clearTrendCache: vi.fn() }
})
vi.mock('@/services/calendarViewQueries', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/calendarViewQueries')>()
  return { ...mod, clearCalendarViewCaches: vi.fn() }
})
vi.mock('@/services/planningQueryCache', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/services/planningQueryCache')>()
  return { ...mod, invalidatePlanningQueryCache: vi.fn() }
})
vi.mock('@/composables/useChartScale', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/composables/useChartScale')>()
  return { ...mod, clearChartScalePreferences: vi.fn() }
})

import { resetAppState } from '../appStateReset'
import { clearTrendCache } from '@/services/calendarChartData'
import { clearCalendarViewCaches } from '@/services/calendarViewQueries'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { clearChartScalePreferences } from '@/composables/useChartScale'
import { useJournalStore } from '@/stores/journal.store'
import { useAuthStore } from '@/stores/auth.store'
import type { JournalEntry } from '@/domain/journal'

describe('resetAppState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('wipes a sample standard store back to defaults', () => {
    const store = useJournalStore()

    // Inject some "user A" state directly into the refs.
    const fakeEntry: JournalEntry = {
      id: 'leaked-from-user-a',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      title: 'User A note',
      body: 'should not survive a reset',
      emotionIds: [],
      peopleTagIds: [],
      contextTagIds: [],
    }
    store.entries = [fakeEntry]
    store.isLoading = true
    store.error = 'something blew up earlier'

    resetAppState()

    expect(store.entries).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('does not touch the auth store (it owns the user/session)', () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 'user-a',
      username: 'alice',
      displayName: 'Alice',
    }

    resetAppState()

    expect(authStore.user).toEqual({
      id: 'user-a',
      username: 'alice',
      displayName: 'Alice',
    })
  })

  it('invokes every service-cache clearer exactly once', () => {
    resetAppState()

    expect(clearTrendCache).toHaveBeenCalledTimes(1)
    expect(clearCalendarViewCaches).toHaveBeenCalledTimes(1)
    expect(invalidatePlanningQueryCache).toHaveBeenCalledTimes(1)
    expect(clearChartScalePreferences).toHaveBeenCalledTimes(1)
  })
})

/**
 * CI guard: forces every new store to be registered in `appStateReset.ts`.
 *
 * If you add `src/stores/foo.store.ts` and forget to wire its
 * `useFooStore()` into `resetAppState()`, this test fails — preventing
 * the cross-account data leak from sneaking back in for the new store.
 *
 * `auth.store.ts` is the only intentional exception (auth owns the
 * user/session and resetting it would log the user out mid-flow).
 */
describe('appStateReset.ts store registration (CI guard)', () => {
  it('imports every *.store.ts file (except auth.store)', () => {
    const storesDir = path.resolve(__dirname, '../../stores')
    const storeFiles = fs
      .readdirSync(storesDir)
      .filter((f) => f.endsWith('.store.ts') && f !== 'auth.store.ts')

    const resetSrc = fs.readFileSync(
      path.resolve(__dirname, '../appStateReset.ts'),
      'utf-8',
    )

    const missing: string[] = []
    for (const file of storeFiles) {
      const baseName = file.replace('.store.ts', '')
      // Match e.g. `from '@/stores/journal.store'` (single, double, or backtick quotes).
      const importRe = new RegExp(`from\\s+['"\`][^'"\`]*${baseName}\\.store['"\`]`)
      if (!importRe.test(resetSrc)) {
        missing.push(file)
      }
    }

    expect(
      missing,
      `appStateReset.ts is missing imports for these stores. Add ` +
        `\`useFooStore().reset()\` to the coordinator (and a \`reset()\` ` +
        `function to the store itself). Missing:\n  - ${missing.join('\n  - ')}`,
    ).toEqual([])
  })
})
