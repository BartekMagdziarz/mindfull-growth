import type { ConversationPlace } from '@/repositories/companionConversationRepository'
import { loadHistoryAccessPolicy } from '../history/access'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { approvedProfileContext } from '../profile/context'
import { companionConversationRepository } from '@/repositories/companionConversationRepository'
import {
  createCompanionHistoryAccess,
  createCompanionSession,
  SpendingBudget,
  type CompanionEvent,
  type CompanionReply,
} from './runtime'
import { CompanionError, OPENAI_COMPANION_MODEL, type ModelTransport } from './openai'
import { browserCompanionTransport } from './browserTransport'
import type { CompanionMessage } from '@/domain/companionConversation'

/** Existing topics stay put. A manual refresh may introduce at most one new topic. */
export function reconcileTopics(
  existing: CompanionReply['topics'],
  incoming: CompanionReply['topics']
) {
  if (!existing.length) return incoming.slice(0, 5)
  const result = [...existing]
  const fresh = incoming.find(t => !existing.some(e => e.id === t.id || e.title === t.title))
  if (fresh) {
    if (result.length < 5) result.push(fresh)
    else result[result.length - 1] = fresh
  }
  return result
}
export function companionConversation(
  periodRef: string,
  options: { locale: 'pl' | 'en'; timeZone: string; transport?: ModelTransport } & ConversationPlace
) {
  const repository = companionConversationRepository(periodRef, options)
  async function run(input: {
    mode: 'topics' | 'conversation'
    draft: string
    message?: string
    topicId?: string
    signal: AbortSignal
    onEvent?: (event: CompanionEvent) => void
  }) {
    const { row, token } = await repository.acquire()
    let budget: SpendingBudget | undefined
    try {
      if (!input.topicId && row.spentUsd >= 0.5) throw new CompanionError('cost-limit')
      const profile = await approvedProfileContext(row.surface)
      const context = {
        surface: row.surface,
        ...(row.journalEntryId ? { journalEntryId: row.journalEntryId } : {}),
        periodRef,
        asOf: row.asOf ?? new Date().toISOString(),
        locale: options.locale,
        timeZone: options.timeZone,
        approvedProfile: profile.items,
        observationDecisions: profile.observationDecisions,
        omitRefs: conversationOmissions(row),
      }
      const access = await createCompanionHistoryAccess(context)
      if (
        row.state &&
        (row.historyRevision !== access.revision ||
          row.profileRevision !== profile.fingerprint ||
          row.locale !== options.locale ||
          row.timeZone !== options.timeZone ||
          row.model !== OPENAI_COMPANION_MODEL)
      )
        throw new CompanionError('history-changed')
      if (input.mode === 'conversation' && input.topicId) {
        const chosen = row.topics.find(t => t.id === input.topicId)
        if (!chosen || !row.state) throw new CompanionError('invalid-topic')
        if (input.signal.aborted) throw new CompanionError('cancelled')
        await access.assertCurrent()
        await profile.assertCurrent()
        if (
          row.messages.at(-1)?.topicId !== chosen.id ||
          row.messages.at(-1)?.text !== chosen.invitation
        ) {
          row.messages.push({
            id: crypto.randomUUID(),
            role: 'assistant',
            text: chosen.invitation,
            topicId: chosen.id,
            topicTitle: chosen.title,
            citations: chosen.citations,
            createdAt: new Date().toISOString(),
          })
          row.state.history.push({ role: 'assistant', content: chosen.invitation })
        }
        if (input.signal.aborted) throw new CompanionError('cancelled')
        return await repository.commit(token, row)
      }
      budget = new SpendingBudget(0.5 - row.spentUsd)
      const transport = options.transport ?? (await browserCompanionTransport())
      if (!row.state) row.historyStartIndex = row.messages.length
      const session = createCompanionSession({
        context,
        access: {
          ...access,
          assertCurrent: async () => {
            await access.assertCurrent()
            await profile.assertCurrent()
          },
        },
        budget,
        initialState: row.state,
        onEvent: input.onEvent,
        transport: async request => {
          await repository.assertLease(token)
          const result = await transport(request)
          await repository.assertLease(token)
          return result
        },
      })
      const result = await session.run(input)
      if (input.signal.aborted) throw new CompanionError('cancelled')
      await access.assertCurrent()
      await profile.assertCurrent()
      row.historyAccessRevision = (
        await loadHistoryAccessPolicy(approvedProfileRepository().db)
      ).revision
      row.profileDecisionEvidence = profile.observationDecisions.map(d => ({
        id: d.id,
        version: d.version,
      }))
      row.profileEvidence = (await approvedProfileRepository().snapshot()).items
        .filter(i => profile.items.some(p => p.id === i.id))
        .map(i => ({ id: i.id, version: i.version }))
      row.profileRevision = profile.fingerprint
      row.state = session.getState()
      row.asOf = context.asOf
      row.historyRevision = access.revision
      row.locale = options.locale
      row.timeZone = options.timeZone
      row.model = OPENAI_COMPANION_MODEL
      if (input.mode === 'topics') {
        row.topics = reconcileTopics(row.topics, result.reply.topics)
        row.state.topics = row.topics
        row.topicsInitialized = true
        row.analyzedDraft = input.draft
        row.topicNotice = result.reply.message
      } else {
        const chosen = row.topics.find(t => t.id === input.topicId)
        const message = (
          role: CompanionMessage['role'],
          text: string,
          citations: CompanionMessage['citations'] = []
        ): CompanionMessage => ({
          id: crypto.randomUUID(),
          role,
          text,
          citations,
          createdAt: new Date().toISOString(),
        })
        row.messages.push(
          message('user', input.message?.trim() || chosen?.title || ''),
          message('assistant', result.reply.message, result.reply.citations)
        )
      }
      row.spentUsd += budget.usedUsd
      return await repository.commit(token, row)
    } catch (error) {
      try {
        await repository.release(token, budget?.usedUsd ?? 0)
      } catch {
        /* Account/lease may no longer belong to this operation. */
      }
      throw error instanceof CompanionError ? error : new CompanionError('runtime-error')
    }
  }
  return { ...repository, run }
}

/** Keep the original weekly API and durable IDs compatible. */
export const weeklyConversation = companionConversation
export function conversationOmissions(
  row: import('@/domain/companionConversation').CompanionConversation
) {
  const refs: import('../history/contracts').SourceRef[] = [
    { collection: 'companionConversations', id: row.id },
  ]
  if (row.surface === 'journal' && row.journalEntryId)
    refs.push({ collection: 'journalEntries', id: row.journalEntryId })
  return refs
}
