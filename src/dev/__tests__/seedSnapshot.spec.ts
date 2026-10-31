import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { connectTestDatabase, getTestDatabase } from '@/test/testDatabase'
import { seedDemoData } from '@/dev/demo/demoSeed'
import { seedVerificationData } from '@/dev/verificationSeed'

/**
 * Guards the dev seeds against unintended data changes (P-1): each seed runs
 * against fake-indexeddb on a frozen date, and every table is reduced to its
 * row count and a digest of its rows with generated ids masked. The digests
 * live in `__snapshots__/seedSnapshot.spec.ts.snap`; a deliberate dataset
 * change updates them with `npx vitest run -u src/dev/__tests__/seedSnapshot`.
 *
 * Ids come from `crypto.randomUUID()`, so every UUID (as a value, inside a
 * string, or as an object key such as `promptResponses.program.<enrollment>`)
 * is replaced by a placeholder. Arrays of objects are sorted, because a few
 * of them (the closing snapshot's key results) follow IndexedDB's order of
 * UUID keys, which differs between runs; timestamps are stable because the
 * seeds only read the faked clock. The frozen instant is given in UTC (`Z`):
 * a local-time literal would freeze a different instant per time zone, and
 * the CI runner (UTC) would then disagree with a developer's machine.
 */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(stable)
    return items.every(item => item && typeof item === 'object')
      ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      : items
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key.replace(UUID, '<id>'), stable(item)] as const)
        .sort(([a], [b]) => a.localeCompare(b))
    )
  }
  if (typeof value === 'string') return value.replace(UUID, '<id>')
  return value
}

async function snapshotTables(): Promise<Record<string, { rows: number; digest: string }>> {
  const db = getTestDatabase()
  const snapshot: Record<string, { rows: number; digest: string }> = {}
  for (const table of [...db.tables].sort((a, b) => a.name.localeCompare(b.name))) {
    const rows = (await table.toArray()).map(row => JSON.stringify(stable(row))).sort()
    if (rows.length === 0) continue
    snapshot[table.name] = {
      rows: rows.length,
      digest: createHash('sha256').update(rows.join('\n')).digest('hex').slice(0, 16),
    }
  }
  return snapshot
}

async function runSeed(seed: () => Promise<void>, now: Date) {
  vi.setSystemTime(now)
  const db = await connectTestDatabase()
  await Promise.all(db.tables.map(table => table.clear()))
  await seed()
  return snapshotTables()
}

describe('dev seeds produce the same data as before (table digests)', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterAll(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('verification seed (rich-v1) on 2026-10-17', async () => {
    const snapshot = await runSeed(seedVerificationData, new Date('2026-10-17T10:00:00Z'))
    expect(Object.keys(snapshot).length).toBeGreaterThan(20)
    expect(snapshot).toMatchSnapshot()
  }, 240_000)

  it('demo seed („Julia”) on 2026-10-17', async () => {
    const snapshot = await runSeed(seedDemoData, new Date('2026-10-17T10:00:00Z'))
    expect(Object.keys(snapshot).length).toBeGreaterThan(20)
    expect(snapshot).toMatchSnapshot()
  }, 240_000)
})
