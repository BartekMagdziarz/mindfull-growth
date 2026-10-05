import { captureUserSession } from '@/services/userSessionScope'
import {
  validateObservation,
  observationEvidenceAvailable,
} from '@/services/ai/profile/observationEvidence'
import { getCurrentUserId, getUserDatabase } from '@/services/userDatabase.service'
import { CompanionError } from '@/services/ai/companion/openai'
import { validateRef } from '@/services/ai/history/access'
import { SOURCE_COLLECTIONS } from '@/services/ai/history/contracts'
import {
  PROFILE_CATEGORIES,
  PROFILE_SCOPES,
  type ApprovedProfileItem,
  type ProfileContent,
  type ProfileOrigin,
  type ProfileProposal,
} from '@/domain/approvedProfile'

export function validateProfileContent(content: ProfileContent) {
  if (
    !PROFILE_CATEGORIES.includes(content.category) ||
    !PROFILE_SCOPES.includes(content.scope) ||
    typeof content.text !== 'string' ||
    !content.text.trim() ||
    content.text.length > 4000
  )
    throw new CompanionError('invalid-profile')
  for (const date of [content.reviewAfter, content.validUntil]) {
    if (
      date !== null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new CompanionError('invalid-profile')
  }
  if (content.linkedObject) {
    validateRef(content.linkedObject)
    if (SOURCE_COLLECTIONS[content.linkedObject.collection] !== 'planning')
      throw new CompanionError('invalid-profile')
  }
}
export function approvedProfileRepository() {
  const db = getUserDatabase(),
    user = getCurrentUserId()
  const session = captureUserSession()
  const guard = () => {
    if (!session.isCurrent()) throw new CompanionError('session-changed')
    if (getUserDatabase() !== db || getCurrentUserId() !== user)
      throw new CompanionError('session-changed')
  }
  const tables = [db.approvedProfileItems, db.profileProposals, db.profileChanges]
  async function transaction<T>(work: () => Promise<T>, allTables = false): Promise<T> {
    guard()
    const result = await db.transaction('rw', allTables ? db.tables : tables, async () => {
      guard()
      return work()
    })
    guard()
    return result
  }
  async function snapshot() {
    guard()
    const result = await db.transaction('r', tables, async () => ({
      items: await db.approvedProfileItems.toArray(),
      proposals: await db.profileProposals.toArray(),
      changes: await db.profileChanges.toArray(),
    }))
    guard()
    return result
  }
  async function writeItem(
    before: ApprovedProfileItem | null,
    content: ProfileContent,
    origin: ProfileOrigin,
    status: ApprovedProfileItem['status'],
    proposalId?: string
  ) {
    validateProfileContent(content)
    const at = new Date().toISOString()
    const after: ApprovedProfileItem = {
      ...structuredClone(content),
      text: content.text.trim(),
      id: before?.id ?? crypto.randomUUID(),
      version: (before?.version ?? 0) + 1,
      status,
      origin: structuredClone(origin),
      confirmedAt: at,
      updatedAt: at,
    }
    await db.approvedProfileItems.put(after)
    await db.profileChanges.add({
      id: crypto.randomUUID(),
      itemId: after.id,
      proposalId,
      before,
      after,
      at,
    })
    return after
  }
  async function pending(id: string, version: number) {
    const proposal = await db.profileProposals.get(id)
    if (!proposal || proposal.status !== 'pending' || proposal.version !== version)
      throw new CompanionError('proposal-conflict')
    return proposal
  }
  return {
    db,
    guard,
    snapshot,
    save(
      content: ProfileContent,
      id?: string,
      version?: number,
      status: ApprovedProfileItem['status'] = 'active'
    ) {
      return transaction(async () => {
        const before = id ? await db.approvedProfileItems.get(id) : undefined
        if (id && (!before || before.version !== version))
          throw new CompanionError('profile-conflict')
        return writeItem(
          before ?? null,
          content,
          before?.origin ?? { kind: 'user', label: 'Wpis użytkownika', citations: [] },
          status
        )
      })
    },
    propose(
      input: Pick<
        ProfileProposal,
        'dedupeKey' | 'operation' | 'targetId' | 'targetVersion' | 'content' | 'origin' | 'reason'
      >
    ) {
      return transaction(async () => {
        const existing = await db.profileProposals
          .where('dedupeKey')
          .equals(input.dedupeKey)
          .first()
        if (existing) return existing
        validateProfileContent(input.content)
        if (input.origin.kind === 'observation') validateObservation(input.origin)
        if (input.operation !== 'add' && (!input.targetId || !input.targetVersion))
          throw new CompanionError('invalid-profile')
        const at = new Date().toISOString()
        const proposal: ProfileProposal = {
          ...structuredClone(input),
          id: crypto.randomUUID(),
          version: 1,
          status: 'pending',
          discussion: [],
          createdAt: at,
          updatedAt: at,
        }
        await db.profileProposals.add(proposal)
        return proposal
      })
    },
    decide(id: string, version: number, accept: boolean, content?: ProfileContent) {
      return transaction(async () => {
        const p = await pending(id, version)
        if (accept) {
          if (p.origin.kind === 'observation' && !(await observationEvidenceAvailable(p.origin)))
            throw new CompanionError('source-unavailable')
          const target = p.targetId ? await db.approvedProfileItems.get(p.targetId) : undefined
          if (p.operation !== 'add' && (!target || target.version !== p.targetVersion))
            throw new CompanionError('profile-conflict')
          await writeItem(
            target ?? null,
            content ?? p.content,
            p.origin,
            p.operation === 'end' ? 'ended' : 'active',
            p.id
          )
          p.content = structuredClone(content ?? p.content)
        }
        p.status = accept ? 'accepted' : 'rejected'
        p.version++
        p.updatedAt = new Date().toISOString()
        await db.profileProposals.put(p)
        return p
      }, true)
    },
    revise(id: string, version: number, content: ProfileContent, targetVersion?: number) {
      return transaction(async () => {
        const p = await pending(id, version)
        validateProfileContent(content)
        if (targetVersion !== undefined) {
          const target = p.targetId ? await db.approvedProfileItems.get(p.targetId) : undefined
          if (!target || target.version !== targetVersion)
            throw new CompanionError('profile-conflict')
          p.targetVersion = targetVersion
        }
        p.content = structuredClone(content)
        p.version++
        p.updatedAt = new Date().toISOString()
        await db.profileProposals.put(p)
        return p
      })
    },
    discuss(id: string, version: number, question: string, answer: string) {
      return transaction(async () => {
        const p = await pending(id, version)
        p.discussion.push({ role: 'user', text: question }, { role: 'assistant', text: answer })
        p.version++
        p.updatedAt = new Date().toISOString()
        await db.profileProposals.put(p)
        return p
      })
    },
  }
}
