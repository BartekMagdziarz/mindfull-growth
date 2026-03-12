interface CacheEntry<T> {
  revision: number
  value: T | Promise<T>
}

let planningQueryRevision = 0

export function invalidatePlanningQueryCache(): void {
  planningQueryRevision += 1
}

export function getPlanningQueryRevision(): number {
  return planningQueryRevision
}

export async function loadPlanningCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const revision = getPlanningQueryRevision()
  const cached = cache.get(key)

  if (cached && cached.revision === revision) {
    return await cached.value
  }

  const pending = loader()
  cache.set(key, { revision, value: pending })

  try {
    const resolved = await pending
    cache.set(key, { revision, value: resolved })
    return resolved
  } catch (error) {
    const current = cache.get(key)
    if (current?.revision === revision && current.value === pending) {
      cache.delete(key)
    }
    throw error
  }
}
