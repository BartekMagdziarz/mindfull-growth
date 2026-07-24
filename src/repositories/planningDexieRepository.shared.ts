import type { PriorityLink, PriorityLinkSubjectRef } from '@/domain/planning'
import type { Table } from 'dexie'

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

/**
 * Priority-link lifecycle helpers shared by the object repositories (they
 * cannot import priorityLinkService — the service imports them back). Callers
 * must already be inside a 'rw' transaction that includes `priorityLinks`.
 */

/** Retire the subject's non-retired links (history kept, validTo stamped). */
export async function retirePriorityLinksForSubject(
  priorityLinks: Table<PriorityLink, string>,
  subjectRef: PriorityLinkSubjectRef,
  at = new Date().toISOString(),
): Promise<void> {
  const links = await priorityLinks
    .where('[subjectRef.subjectType+subjectRef.subjectId]')
    .equals([subjectRef.subjectType, subjectRef.subjectId])
    .toArray()

  await Promise.all(links
    .filter(link => link.status !== 'retired')
    .map(link => priorityLinks.put(toPlain({
      ...link,
      status: 'retired' as const,
      proposal: undefined,
      validTo: at,
      updatedAt: at,
    }))))
}

/** Hard-delete every link of a priority — used when the priority itself is deleted. */
export async function deletePriorityLinksForPriority(
  priorityLinks: Table<PriorityLink, string>,
  priorityId: string,
): Promise<void> {
  await priorityLinks.where('priorityId').equals(priorityId).delete()
}

/** Retire the priority's non-retired links; proposed ones (no object yet) are dropped. */
export async function retirePriorityLinksForPriority(
  priorityLinks: Table<PriorityLink, string>,
  priorityId: string,
  at = new Date().toISOString(),
): Promise<void> {
  const links = await priorityLinks.where('priorityId').equals(priorityId).toArray()

  await Promise.all(links.map((link) => {
    if (link.status === 'retired') return Promise.resolve()
    if (link.status === 'proposed') return priorityLinks.delete(link.id)
    return priorityLinks.put(toPlain({
      ...link,
      status: 'retired' as const,
      validTo: at,
      updatedAt: at,
    }))
  }))
}
