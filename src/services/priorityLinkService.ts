/**
 * Priority Link Service
 *
 * The single write-path for object↔priority relations (PriorityLink) and the
 * creator ritual's transactional finale. Links are the semantic layer
 * ("pomaga, ponieważ…", expected signal, lifecycle); the legacy priorityIds[]
 * arrays stay authoritative for existing readers, so every link mutation that
 * touches a real object dual-writes the array on that object.
 *
 * Spec: ideas/html-plans/2026-07-23-priority-creator-port.html
 */

import type {
  CreatePriorityPayload,
  Priority,
  PriorityLink,
  PriorityLinkProposal,
  PriorityLinkSubjectRef,
} from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { priorityLinkDexieRepository } from '@/repositories/priorityLinkDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { toPlain } from '@/repositories/planningDexieRepository.shared'
import { createWeeklyIntention } from '@/services/weeklyIntentionService'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getPeriodRefsForDate } from '@/utils/periods'
import { getUserDatabase, type UserDatabase } from '@/services/userDatabase.service'

export interface RitualLinkInput {
  contribution: string
  expectedSignal: string
  /** Existing library object — the link starts 'active'. Exactly one of subjectRef/proposal. */
  subjectRef?: PriorityLinkSubjectRef
  /** New object to create later — the link starts 'proposed'. */
  proposal?: PriorityLinkProposal
}

export interface CreatePriorityFromRitualInput {
  priority: CreatePriorityPayload
  links: RitualLinkInput[]
  /** draftStorage key of the in-progress ritual; deleted inside the finale transaction. */
  draftKey?: string
}

export interface RitualCreationResult {
  priority: Priority
  links: PriorityLink[]
}

/** Tables that carry a legacy priorityIds[] array (keyResult links via its goal). */
const DUAL_WRITE_TABLES = {
  goal: 'goals',
  habit: 'habits',
  tracker: 'trackers',
  weeklyIntention: 'weeklyIntentions',
  initiative: 'initiatives',
} as const

type DualWriteSubjectType = keyof typeof DUAL_WRITE_TABLES

/** Structural view of the object tables — just what the dual-write touches. */
interface LinkedObjectRecord {
  id: string
  priorityIds: string[]
  updatedAt: string
}

interface LinkedObjectTable {
  get(id: string): Promise<LinkedObjectRecord | undefined>
  put(record: LinkedObjectRecord): Promise<unknown>
}

function dualWriteTable(db: UserDatabase, subjectType: DualWriteSubjectType): LinkedObjectTable {
  return db[DUAL_WRITE_TABLES[subjectType]] as unknown as LinkedObjectTable
}

/** Add the priority id to the subject's legacy priorityIds[] (no-op for keyResult). */
async function addPriorityIdToSubject(
  db: UserDatabase,
  subjectRef: PriorityLinkSubjectRef,
  priorityId: string,
  at: string,
): Promise<void> {
  if (subjectRef.subjectType === 'keyResult') return

  const table = dualWriteTable(db, subjectRef.subjectType)
  const record = await table.get(subjectRef.subjectId)
  if (!record) {
    throw new Error(`Linked ${subjectRef.subjectType} with id ${subjectRef.subjectId} not found`)
  }
  if (record.priorityIds.includes(priorityId)) return

  await table.put(toPlain({
    ...record,
    priorityIds: [...record.priorityIds, priorityId],
    updatedAt: at,
  }))
}

/** Remove the priority id from the subject's legacy priorityIds[] (no-op for keyResult). */
async function removePriorityIdFromSubject(
  db: UserDatabase,
  subjectRef: PriorityLinkSubjectRef,
  priorityId: string,
  at: string,
): Promise<void> {
  if (subjectRef.subjectType === 'keyResult') return

  const table = dualWriteTable(db, subjectRef.subjectType)
  const record = await table.get(subjectRef.subjectId)
  if (!record || !record.priorityIds.includes(priorityId)) return

  await table.put(toPlain({
    ...record,
    priorityIds: record.priorityIds.filter(id => id !== priorityId),
    updatedAt: at,
  }))
}

function ritualTransactionTables(db: UserDatabase) {
  return [
    db.priorities,
    db.priorityLinks,
    db.goals,
    db.habits,
    db.trackers,
    db.weeklyIntentions,
    db.initiatives,
    db.drafts,
  ]
}

/**
 * The creator ritual's finale: create the priority, every selected link
 * (existing objects → 'active' + dual-write, new proposals → 'proposed') and
 * drop the ritual draft — atomically. Nothing half-created can leak: an error
 * anywhere rolls the whole finale back and keeps the draft.
 */
export async function createPriorityFromRitual(
  input: CreatePriorityFromRitualInput,
): Promise<RitualCreationResult> {
  for (const item of input.links) {
    if (Boolean(item.subjectRef) === Boolean(item.proposal)) {
      throw new Error('Each ritual link needs exactly one of subjectRef or proposal')
    }
  }

  const db = getUserDatabase()
  const now = new Date().toISOString()

  const result = await db.transaction('rw', ritualTransactionTables(db), async () => {
    const priority = await priorityDexieRepository.create(input.priority)
    const links: PriorityLink[] = []

    for (const item of input.links) {
      if (item.subjectRef) {
        links.push(await priorityLinkDexieRepository.create({
          priorityId: priority.id,
          status: 'active',
          subjectRef: item.subjectRef,
          contribution: item.contribution,
          expectedSignal: item.expectedSignal,
          validFrom: now,
        }))
        await addPriorityIdToSubject(db, item.subjectRef, priority.id, now)
      } else if (item.proposal) {
        links.push(await priorityLinkDexieRepository.create({
          priorityId: priority.id,
          status: 'proposed',
          proposal: item.proposal,
          contribution: item.contribution,
          expectedSignal: item.expectedSignal,
          validFrom: now,
        }))
      }
    }

    if (input.draftKey) {
      await db.drafts.delete(input.draftKey)
    }

    return { priority, links }
  })

  invalidatePlanningQueryCache()
  return result
}

/**
 * Finish a 'proposed' link once its real object exists: point it at the
 * object, activate it and dual-write the legacy array.
 */
export async function resolveProposedLink(
  linkId: string,
  subjectRef: PriorityLinkSubjectRef,
): Promise<PriorityLink> {
  const db = getUserDatabase()
  const now = new Date().toISOString()

  const resolved = await db.transaction('rw', ritualTransactionTables(db), async () => {
    const link = await priorityLinkDexieRepository.getById(linkId)
    if (!link) {
      throw new Error(`Priority link with id ${linkId} not found`)
    }
    if (link.status !== 'proposed') {
      throw new Error(`Priority link ${linkId} is ${link.status}, only proposed links can be resolved`)
    }

    const updated = await priorityLinkDexieRepository.update(linkId, {
      status: 'active',
      subjectRef,
    })
    await addPriorityIdToSubject(db, subjectRef, link.priorityId, now)
    return updated
  })

  invalidatePlanningQueryCache()
  return resolved
}

/** Drop an abandoned 'proposed' link entirely — no object ever existed. */
export async function abandonProposedLink(linkId: string): Promise<void> {
  const link = await priorityLinkDexieRepository.getById(linkId)
  if (!link) return
  if (link.status !== 'proposed') {
    throw new Error(`Priority link ${linkId} is ${link.status}, only proposed links can be abandoned`)
  }
  await priorityLinkDexieRepository.delete(linkId)
}

/**
 * Detach an 'active' link on user request: retire it (history kept) and
 * dual-write the legacy array. This is the service-level replacement for the
 * old inline `priorityIds` toggles.
 */
export async function retireActiveLink(linkId: string): Promise<PriorityLink> {
  const db = getUserDatabase()
  const now = new Date().toISOString()

  const retired = await db.transaction('rw', ritualTransactionTables(db), async () => {
    const link = await priorityLinkDexieRepository.getById(linkId)
    if (!link) {
      throw new Error(`Priority link with id ${linkId} not found`)
    }
    if (link.status !== 'active' || !link.subjectRef) {
      throw new Error(`Priority link ${linkId} is ${link.status}, only active links can be retired`)
    }

    const updated = await priorityLinkDexieRepository.update(linkId, {
      status: 'retired',
      validTo: now,
    })
    await removePriorityIdFromSubject(db, link.subjectRef, link.priorityId, now)
    return updated
  })

  invalidatePlanningQueryCache()
  return retired
}

/**
 * Link an existing object to a priority ('active' from the start) and
 * dual-write the legacy array. Used outside the ritual (library editing).
 */
export async function createActiveLink(
  priorityId: string,
  subjectRef: PriorityLinkSubjectRef,
  fields: { contribution?: string; expectedSignal?: string } = {},
): Promise<PriorityLink> {
  const db = getUserDatabase()
  const now = new Date().toISOString()

  const created = await db.transaction('rw', ritualTransactionTables(db), async () => {
    const existing = await priorityLinkDexieRepository.listBySubject(subjectRef)
    const duplicate = existing.find(link => link.priorityId === priorityId && link.status === 'active')
    if (duplicate) return duplicate

    const link = await priorityLinkDexieRepository.create({
      priorityId,
      status: 'active',
      subjectRef,
      contribution: fields.contribution ?? '',
      expectedSignal: fields.expectedSignal ?? '',
      validFrom: now,
    })
    await addPriorityIdToSubject(db, subjectRef, priorityId, now)
    return link
  })

  invalidatePlanningQueryCache()
  return created
}

export interface ResolvedProposalResult {
  link: PriorityLink
  subjectRef: PriorityLinkSubjectRef
  /** Objects library family the new object lives in — for navigate-to-configure. */
  family: 'goals' | 'habits' | 'trackers' | 'intentions'
}

/**
 * Finish a 'proposed' link by creating its real object with minimal valid
 * defaults (matching the objects library's own "create then configure"
 * defaults) and resolving the link. The object exists only from this explicit
 * step on — until now nothing but the proposal existed, so no half-built
 * objects ever leaked into Today or the planner.
 */
export async function createObjectFromProposal(link: PriorityLink): Promise<ResolvedProposalResult> {
  if (link.status !== 'proposed' || !link.proposal) {
    throw new Error(`Priority link ${link.id} is not a proposed link with a proposal`)
  }

  const title = link.proposal.title.trim()

  switch (link.proposal.objectType) {
    case 'goal': {
      const goal = await goalDexieRepository.create({
        title,
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
      })
      const resolvedLink = await resolveProposedLink(link.id, { subjectType: 'goal', subjectId: goal.id })
      return { link: resolvedLink, subjectRef: { subjectType: 'goal', subjectId: goal.id }, family: 'goals' }
    }
    case 'habit': {
      const habit = await habitDexieRepository.create({
        title,
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
        status: 'open',
      })
      const resolvedLink = await resolveProposedLink(link.id, { subjectType: 'habit', subjectId: habit.id })
      return { link: resolvedLink, subjectRef: { subjectType: 'habit', subjectId: habit.id }, family: 'habits' }
    }
    case 'tracker': {
      const tracker = await trackerDexieRepository.create({
        title,
        description: undefined,
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        status: 'open',
      })
      const resolvedLink = await resolveProposedLink(link.id, { subjectType: 'tracker', subjectId: tracker.id })
      return { link: resolvedLink, subjectRef: { subjectType: 'tracker', subjectId: tracker.id }, family: 'trackers' }
    }
    case 'weeklyIntention': {
      const intention = await createWeeklyIntention({
        weekRef: getPeriodRefsForDate(new Date()).week,
        title,
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 1 },
      })
      const resolvedLink = await resolveProposedLink(link.id, { subjectType: 'weeklyIntention', subjectId: intention.id })
      return { link: resolvedLink, subjectRef: { subjectType: 'weeklyIntention', subjectId: intention.id }, family: 'intentions' }
    }
  }
}

/** Links of one priority, active first, then proposed, then retired history. */
export async function listLinksForPriority(priorityId: string): Promise<PriorityLink[]> {
  const order = { active: 0, proposed: 1, retired: 2 } as const
  const links = await priorityLinkDexieRepository.listByPriority(priorityId)
  return links.sort((left, right) =>
    order[left.status] - order[right.status] || left.createdAt.localeCompare(right.createdAt),
  )
}
