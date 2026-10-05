import { observationEvidenceAvailable } from './observationEvidence'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { loadHistoryAccessPolicy } from '../history/access'
import { createHistoryTools } from '../history/tools'
import { CompanionError } from '../companion/openai'
import { periodEnded, type ProfileOrigin, type ProfileScope } from '@/domain/approvedProfile'

/** Every call reads current data. Accepted content never bypasses source exclusions. */
export async function originAvailable(origin: ProfileOrigin) {
  const repo = approvedProfileRepository(),
    { db } = repo
  if (origin.kind === 'observation') {
    const available = await observationEvidenceAvailable(origin)
    repo.guard()
    return available
  }
  const policy = await loadHistoryAccessPolicy(db)
  if (origin.kind === 'legacy') {
    const legacy = origin.legacyId ? await db.userProfiles.get(origin.legacyId) : undefined
    // Old narrative has incomplete provenance. Fail closed under any exclusion.
    if (
      !legacy ||
      legacy.updatedAt !== origin.legacyVersion ||
      policy.excludedKinds.length ||
      policy.excludedSources.length
    )
      return false
  }
  if (origin.kind === 'introduction') {
    if (
      policy.excludedKinds.includes('conversation') ||
      policy.excludedSources.some(
        r => r.collection === 'companionIntroductions' && r.id === origin.introductionId
      )
    )
      return false
    const introduction = origin.introductionId
      ? await db.companionIntroductions.get(origin.introductionId)
      : undefined
    if (
      !introduction ||
      !origin.messageIds?.every(id =>
        introduction.messages.some(m => m.id === id && m.role === 'user')
      )
    )
      return false
  }
  if (origin.kind === 'conversation') {
    if (
      policy.excludedKinds.includes('conversation') ||
      policy.excludedSources.some(
        r => r.collection === 'companionConversations' && r.id === origin.conversationId
      )
    )
      return false
    const conversation = origin.conversationId
      ? await db.companionConversations.get(origin.conversationId)
      : undefined
    if (conversation?.surface !== 'journal' && policy.excludedKinds.includes('reflection'))
      return false
    if (conversation?.surface === 'journal') {
      if (policy.excludedKinds.includes('journal')) return false
      if (conversation.journalEntryId) {
        const result = await createHistoryTools().readSources({
          requests: [{ ref: { collection: 'journalEntries', id: conversation.journalEntryId } }],
          maxCharsPerSource: 1,
        })
        if (result.items[0]?.status !== 'ok') return false
      }
    }
    if (
      !conversation ||
      !origin.messageIds?.every(id => conversation.messages.some(m => m.id === id))
    )
      return false
  }
  const tools = createHistoryTools()
  for (let offset = 0; offset < origin.citations.length; offset += 8) {
    const result = await tools.readSources({
      requests: origin.citations
        .slice(offset, offset + 8)
        .map(c => ({ ref: c.ref, expectedVersion: c.version })),
      maxCharsPerSource: 1,
    })
    if (result.items.some(item => item.status !== 'ok')) return false
  }
  repo.guard()
  return true
}

export async function approvedProfileContext(scope: ProfileScope = 'general') {
  const repo = approvedProfileRepository()
  const initial = await repo.snapshot()
  const revision = JSON.stringify(initial.items.map(i => [i.id, i.version]).sort())
  const items = []
  for (const item of initial.items) {
    if (
      item.status !== 'active' ||
      periodEnded(item) ||
      (item.scope !== 'general' && item.scope !== scope)
    )
      continue
    if (!(await originAvailable(item.origin))) continue
    if (item.linkedObject) {
      const result = await createHistoryTools().readSources({
        requests: [{ ref: item.linkedObject }],
        maxCharsPerSource: 1,
      })
      if (result.items[0]?.status !== 'ok') continue
    }
    items.push({
      id: item.id,
      category: item.category,
      text: item.text,
      scope: item.scope,
      confirmedAt: item.confirmedAt,
      ...(item.origin.observation
        ? {
            epistemicStatus: 'user-accepted-hypothesis',
            observation: {
              from: item.origin.observation.from,
              to: item.origin.observation.to,
              limitations: item.origin.observation.limitations,
              counterexamples: item.origin.observation.counterexamples.map(e => e.quote),
            },
          }
        : {}),
      ...(item.reviewAfter ? { reviewAfter: item.reviewAfter } : {}),
      ...(item.validUntil ? { validUntil: item.validUntil } : {}),
      ...(item.linkedObject ? { linkedObject: item.linkedObject } : {}),
    })
  }
  const observationDecisions = []
  for (const proposal of initial.proposals
    .filter(p => p.status === 'rejected' && p.origin.kind === 'observation')
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(-20)) {
    if (
      (proposal.content.scope === 'general' || proposal.content.scope === scope) &&
      (await originAvailable(proposal.origin))
    )
      observationDecisions.push({
        id: proposal.id,
        version: proposal.version,
        status: 'rejected' as const,
        text: proposal.content.text,
      })
  }
  if (JSON.stringify({ items, observationDecisions }).length > 24000)
    throw new CompanionError('profile-context-limit')
  repo.guard()
  // Include filtered content: source deletion/exclusion also invalidates a resumed chat.
  const fingerprint = JSON.stringify({ revision, items, observationDecisions })
  async function assertCurrent() {
    repo.guard()
    const next = await approvedProfileContext(scope)
    if (next.fingerprint !== fingerprint) throw new CompanionError('profile-changed')
  }
  return { items, observationDecisions, fingerprint, assertCurrent }
}
