/** Invalidates work started before a database/account transition. */
let generation = 0
const listeners = new Set<() => void>()

export class UserSessionChangedError extends Error {
  constructor() {
    super('The user session changed during this operation.')
    this.name = 'UserSessionChangedError'
  }
}

export function invalidateUserSession(): void {
  generation++
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch (error) {
      console.error('Failed to cancel an outdated user operation:', error)
    }
  }
}

export function captureUserSession(isStoreCurrent: () => boolean = () => true) {
  const startedIn = generation
  const isCurrent = () => startedIn === generation && isStoreCurrent()
  const assertCurrent = () => {
    if (!isCurrent()) throw new UserSessionChangedError()
  }
  return {
    isCurrent,
    assertCurrent,
    async wait<T>(work: PromiseLike<T>): Promise<T> {
      assertCurrent()
      const result = await work
      assertCurrent()
      return result
    },
    onInvalidate(listener: () => void) {
      assertCurrent()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** A reset also invalidates pending work even if the account did not change. */
export function createStoreSessionScope() {
  let revision = 0
  return {
    capture() {
      const startedIn = revision
      return captureUserSession(() => revision === startedIn)
    },
    reset() {
      revision++
    },
  }
}
