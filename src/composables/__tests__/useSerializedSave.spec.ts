import { describe, expect, it } from 'vitest'
import { useSerializedSave } from '@/composables/useSerializedSave'

/** Let queued microtasks (the drain loop's continuations) run to completion. */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

describe('useSerializedSave', () => {
  it('never overlaps writes and the final write reflects the latest state', async () => {
    // Mirrors the weekly top-3 toggle race: rapid requests while a write is in flight.
    let current = ''
    const observed: string[] = []
    let inFlight = 0
    let maxConcurrent = 0
    const pending: Array<() => void> = []
    const write = () =>
      new Promise<void>((resolve) => {
        inFlight++
        maxConcurrent = Math.max(maxConcurrent, inFlight)
        observed.push(current) // capture the source-of-truth at write time
        pending.push(() => {
          inFlight--
          resolve()
        })
      })

    const { save, isSaving, hasSaved } = useSerializedSave(write)

    // Three quick "toggles"; only the first should have actually started writing.
    current = 'a'
    void save()
    current = 'b'
    void save()
    current = 'c'
    const last = save()

    expect(observed).toEqual(['a'])
    expect(isSaving.value).toBe(true)

    // Drain the write queue as writes complete.
    while (pending.length > 0) {
      pending.shift()!()
      await flush()
    }
    await last

    expect(maxConcurrent).toBe(1) // writes never overlapped
    expect(observed).toEqual(['a', 'c']) // coalesced middle 'b', last write saw latest 'c'
    expect(observed.at(-1)).toBe('c')
    expect(isSaving.value).toBe(false)
    expect(hasSaved.value).toBe(true)
  })

  it('resolves the returned promise only after the latest state is flushed', async () => {
    // onDeleteIntention awaits persist before reloading — the awaited promise must not
    // resolve until the last requested write has hit the store.
    let current = 0
    let flushed = -1
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let firstStarted = false

    const write = () =>
      new Promise<void>((resolve) => {
        const value = current
        if (!firstStarted) {
          firstStarted = true
          // Hold the first write open so a second request queues behind it.
          void gate.then(() => {
            flushed = value
            resolve()
          })
        } else {
          flushed = value
          resolve()
        }
      })

    const { save } = useSerializedSave(write)

    current = 1
    void save()
    current = 2
    const awaited = save()

    let settled = false
    void awaited.then(() => (settled = true))

    await flush()
    expect(settled).toBe(false) // still blocked on the in-flight write

    release()
    await awaited

    expect(flushed).toBe(2) // the last requested state was persisted
  })

  it('starts a fresh drain for a save that arrives after the previous one settled', async () => {
    const observed: number[] = []
    let current = 0
    const write = () =>
      Promise.resolve().then(() => {
        observed.push(current)
      })

    const { save } = useSerializedSave(write)

    current = 1
    await save()
    current = 2
    await save()

    expect(observed).toEqual([1, 2])
  })
})
