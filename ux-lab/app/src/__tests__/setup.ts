import { vi } from 'vitest'

// Rich-v1 is deliberately relative to "today" in the running workbench, but
// the replica assertions describe the canonical July 2026 design fixture.
// Fake Date only, before registry/store modules build their module-level data,
// so calendar rollover cannot silently change week counts or reference URLs.
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-07-23T12:00:00.000Z'))
