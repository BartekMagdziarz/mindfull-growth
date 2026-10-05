import {
  getCurrentUserId,
  getUserDatabase,
  type UserDatabase,
} from '@/services/userDatabase.service'
import {
  HistoryToolError,
  SOURCE_COLLECTIONS,
  SOURCE_KINDS,
  sourceKey,
  type HistoryAccessPolicy,
  type SourceRef,
} from './contracts'

export const HISTORY_ACCESS_KEY = 'ai.history.access.v1'
export function validateRef(value: unknown): asserts value is SourceRef {
  if (!value || typeof value !== 'object')
    throw new HistoryToolError('invalid-input', 'Invalid source reference')
  const ref = value as SourceRef
  if (
    !Object.hasOwn(SOURCE_COLLECTIONS, ref.collection) ||
    typeof ref.id !== 'string' ||
    !ref.id ||
    ref.id.length > 256
  ) {
    throw new HistoryToolError('invalid-input', 'Invalid source reference')
  }
}
export function validatePolicy(value: unknown): asserts value is HistoryAccessPolicy {
  const policy = value as HistoryAccessPolicy | null
  if (
    !policy ||
    policy.schemaVersion !== 1 ||
    typeof policy.revision !== 'string' ||
    !policy.revision ||
    !Array.isArray(policy.excludedKinds) ||
    !policy.excludedKinds.every(k => SOURCE_KINDS.includes(k)) ||
    !Array.isArray(policy.excludedSources)
  )
    throw new HistoryToolError('access-policy-invalid', 'Invalid history access policy')
  try {
    policy.excludedSources.forEach(validateRef)
  } catch {
    throw new HistoryToolError('access-policy-invalid', 'Invalid history access policy')
  }
}
export async function loadHistoryAccessPolicy(db: UserDatabase): Promise<HistoryAccessPolicy> {
  const record = await db.userSettings.get(HISTORY_ACCESS_KEY)
  if (!record)
    return { schemaVersion: 1, revision: 'initial', excludedKinds: [], excludedSources: [] }
  let policy: unknown
  try {
    policy = JSON.parse(record.value)
  } catch {
    throw new HistoryToolError('access-policy-invalid', 'Cannot read history access policy')
  }
  validatePolicy(policy)
  return policy
}
/** Application/user action only; never expose this mutation as an LLM tool. */
export async function saveHistoryAccessPolicy(
  input: Pick<HistoryAccessPolicy, 'excludedKinds' | 'excludedSources'>
): Promise<HistoryAccessPolicy> {
  const db = getUserDatabase()
  const userId = getCurrentUserId()
  const policy: HistoryAccessPolicy = {
    ...structuredClone(input),
    schemaVersion: 1,
    revision: crypto.randomUUID(),
  }
  validatePolicy(policy)
  await db.userSettings.put({ key: HISTORY_ACCESS_KEY, value: JSON.stringify(policy) })
  if (getCurrentUserId() !== userId || getUserDatabase() !== db)
    throw new HistoryToolError('session-changed', 'User changed during access update')
  return policy
}
export function isExplicitlyAllowed(ref: SourceRef, policy: HistoryAccessPolicy): boolean {
  return (
    !policy.excludedKinds.includes(SOURCE_COLLECTIONS[ref.collection]) &&
    !policy.excludedSources.some(item => sourceKey(item) === sourceKey(ref))
  )
}
