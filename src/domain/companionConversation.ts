import type {
  CompanionReply,
  CompanionSessionState,
  Citation,
} from '@/services/ai/companion/runtime'
export interface CompanionMessage {
  id: string
  role: 'user' | 'assistant' | 'notice'
  text: string
  topicId?: string
  topicTitle?: string
  citations: Citation[]
  createdAt: string
}
export interface CompanionConversation {
  id: string
  periodRef: string
  surface: 'weekly-reflection' | 'monthly-reflection' | 'journal'
  journalEntryId?: string
  historyStartIndex?: number
  historyAccessRevision?: string
  profileDecisionEvidence?: Array<{ id: string; version: number }>
  profileEvidence?: Array<{ id: string; version: number }>
  revision: number
  enabled: boolean
  topics: CompanionReply['topics']
  messages: CompanionMessage[]
  state?: CompanionSessionState
  profileRevision?: string
  historyRevision?: string
  asOf?: string
  locale?: 'pl' | 'en'
  model?: string
  timeZone?: string
  analyzedDraft?: string
  topicsInitialized: boolean
  topicNotice: string
  spentUsd: number
  pending?: { token: string; expiresAt: number }
  updatedAt: string
}
