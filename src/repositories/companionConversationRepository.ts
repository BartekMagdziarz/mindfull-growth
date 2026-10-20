import { captureUserSession } from '@/services/userSessionScope'
import { getUserDatabase, getCurrentUserId } from '@/services/userDatabaseService'
import type { CompanionConversation } from '@/domain/companionConversation'
import { CompanionError } from '@/services/ai/companion/openai'
import { assertPeriodRef, getPeriodType } from '@/utils/periods'

/** One durable row per user/surface/period. Transactional lease covers duplicate tabs. */
export interface ConversationPlace {
  surface?: CompanionConversation['surface']
  conversationId?: string
  journalEntryId?: string
}
export function companionConversationRepository(periodRef: string, place: ConversationPlace = {}) {
  assertPeriodRef(periodRef)
  const db = getUserDatabase(),
    user = getCurrentUserId()
  const surface = place.surface ?? 'weekly-reflection'
  if (
    (surface === 'weekly-reflection' && getPeriodType(periodRef) !== 'week') ||
    (surface === 'monthly-reflection' && getPeriodType(periodRef) !== 'month') ||
    (surface === 'journal' && getPeriodType(periodRef) !== 'day')
  )
    throw new CompanionError('invalid-input')
  if (
    surface === 'journal' &&
    (!place.conversationId || !/^journal:[a-zA-Z0-9_-]{1,200}$/.test(place.conversationId))
  )
    throw new CompanionError('invalid-input')
  const id = surface === 'journal' ? place.conversationId! : `${surface}:${periodRef}`
  const session = captureUserSession()
  const guard = () => {
    if (!session.isCurrent()) throw new CompanionError('session-changed')
    if (getUserDatabase() !== db || getCurrentUserId() !== user)
      throw new CompanionError('session-changed')
  }
  const empty = (): CompanionConversation => ({
    id,
    periodRef,
    surface,
    ...(place.journalEntryId ? { journalEntryId: place.journalEntryId } : {}),
    revision: 0,
    enabled: false,
    topics: [],
    messages: [],
    topicsInitialized: false,
    topicNotice: '',
    spentUsd: 0,
    updatedAt: new Date().toISOString(),
  })
  const load = async () => {
    guard()
    const row = await db.companionConversations.get(id)
    guard()
    return row ?? empty()
  }
  const mutate = async (fn: (row: CompanionConversation) => void) => {
    guard()
    const row = await db.transaction('rw', db.companionConversations, async () => {
      guard()
      const row = (await db.companionConversations.get(id)) ?? empty()
      if (row.surface !== surface) throw new CompanionError('conversation-changed')
      fn(row)
      row.revision++
      row.updatedAt = new Date().toISOString()
      await db.companionConversations.put(row)
      return row
    })
    guard()
    return row
  }
  return {
    load,
    setEnabled: (enabled: boolean) =>
      mutate(row => {
        row.enabled = enabled
        if (!enabled) delete row.pending
      }),
    async acquire() {
      const token = crypto.randomUUID()
      const row = await mutate(row => {
        if (!row.enabled) throw new CompanionError('disabled')
        if (row.pending && row.pending.expiresAt > Date.now())
          throw new CompanionError('conversation-busy')
        if (row.periodRef !== periodRef) {
          delete row.state
          delete row.asOf
          delete row.historyRevision
          row.topics = []
          row.topicsInitialized = false
        }
        row.periodRef = periodRef
        if (place.journalEntryId) row.journalEntryId = place.journalEntryId
        row.pending = { token, expiresAt: Date.now() + 240000 }
      })
      return { row, token }
    },
    async assertLease(token: string) {
      const row = await load()
      if (!row.enabled || row.pending?.token !== token || row.pending.expiresAt <= Date.now())
        throw new CompanionError('conversation-changed')
    },
    commit: (token: string, next: CompanionConversation) =>
      mutate(row => {
        if (!row.enabled || row.pending?.token !== token || row.pending.expiresAt <= Date.now())
          throw new CompanionError('conversation-changed')
        const revision = row.revision
        Object.assign(row, structuredClone(next), { revision })
        delete row.pending
      }),
    release: (token: string, spentUsd = 0) =>
      mutate(row => {
        if (row.pending?.token === token) {
          delete row.pending
          row.spentUsd += spentUsd
        }
      }),
    clearConversation: () =>
      mutate(row => {
        if (row.pending && row.pending.expiresAt > Date.now())
          throw new CompanionError('conversation-busy')
        delete row.pending
        delete row.state
        delete row.historyRevision
        delete row.historyStartIndex
        delete row.asOf
        delete row.analyzedDraft
        row.messages = []
        row.topics = []
        row.topicsInitialized = false
        row.topicNotice = ''
      }),
    resetContext: () =>
      mutate(row => {
        if (row.pending && row.pending.expiresAt > Date.now())
          throw new CompanionError('conversation-busy')
        delete row.pending
        delete row.state
        delete row.historyRevision
        delete row.asOf
        row.topics = []
        row.topicsInitialized = false
        row.topicNotice = ''
        delete row.analyzedDraft
        row.messages.push({
          id: crypto.randomUUID(),
          role: 'notice',
          text: 'Odświeżono kontekst. Wcześniejsze wiadomości pozostają do wglądu, ale nie są przesyłane do AI.',
          citations: [],
          createdAt: new Date().toISOString(),
        })
      }),
  }
}
