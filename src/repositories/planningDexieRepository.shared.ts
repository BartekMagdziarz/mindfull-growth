interface PersistedRecordBase {
  id: string
  createdAt: string
  updatedAt: string
}

export function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function createPlanningRecord<T extends PersistedRecordBase>(
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
): T {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  } as T
}

export function updatePlanningRecord<T extends PersistedRecordBase>(
  existing: T,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
): T {
  return {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }
}

export function requireRecord<T>(record: T | undefined, errorMessage: string): T {
  if (!record) {
    throw new Error(errorMessage)
  }

  return record
}
