import type { Citation } from '@/services/ai/companion/runtime'
import type { SourceRef } from '@/services/ai/history/contracts'

export const PROFILE_CATEGORIES = [
  'identity',
  'values',
  'strengths',
  'priorities',
  'preferences',
  'currentContext',
  'focus',
] as const
export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number]
export const PROFILE_SCOPES = [
  'general',
  'weekly-reflection',
  'monthly-reflection',
  'journal',
] as const
export type ProfileScope = (typeof PROFILE_SCOPES)[number]
export const CATEGORY_LABELS: Record<ProfileCategory, string> = {
  identity: 'O mnie',
  values: 'Wartości',
  strengths: 'Zasoby i to, co pomaga',
  priorities: 'Długoterminowe priorytety',
  preferences: 'Jak ma wspierać mnie AI',
  currentContext: 'Obecna sytuacja',
  focus: 'Na czym chcę się teraz skupić',
}
export const SCOPE_LABELS: Record<ProfileScope, string> = {
  general: 'Wszędzie',
  'weekly-reflection': 'Refleksja tygodniowa',
  'monthly-reflection': 'Refleksja miesięczna',
  journal: 'Dziennik',
}
export interface ProfileContent {
  category: ProfileCategory
  text: string
  scope: ProfileScope
  reviewAfter: string | null
  validUntil: string | null
  linkedObject: SourceRef | null
}
export interface ProfileOrigin {
  kind: 'user' | 'conversation' | 'legacy' | 'introduction' | 'observation'
  label: string
  citations: Citation[]
  introductionId?: string
  conversationId?: string
  messageIds?: string[]
  legacyId?: string
  legacyVersion?: string
  quote?: string
  observation?: ProfileObservation
}
/** An interpretation with provenance, never a verified causal fact. */
export interface ObservationEvidence {
  citation: Citation
  title: string
  occurredAt: string
  episode: string
  quote: string
  field?: string
  role?: string
  eventDay?: string
}
export interface ProfileObservation {
  schemaVersion: 1
  contextSources?: Array<{ citation: Citation; title: string }>
  from: string
  to: string
  focus: string
  timeZone: string
  support: ObservationEvidence[]
  counterexamples: ObservationEvidence[]
  limitations: string
  searches: Array<{
    purpose: 'context' | 'topic' | 'counterexample'
    kind?: string
    query: string
    matches: number
    complete: boolean
  }>
  examined: number
  omitted: number
  policyRevision: string
}
export interface ApprovedProfileItem extends ProfileContent {
  id: string
  version: number
  status: 'active' | 'ended' | 'outdated'
  origin: ProfileOrigin
  confirmedAt: string
  updatedAt: string
}
export interface ProfileProposal {
  id: string
  dedupeKey: string
  version: number
  status: 'pending' | 'accepted' | 'rejected'
  operation: 'add' | 'update' | 'end'
  targetId: string | null
  targetVersion: number | null
  content: ProfileContent
  origin: ProfileOrigin
  reason: string
  discussion: Array<{ role: 'user' | 'assistant'; text: string }>
  createdAt: string
  updatedAt: string
}
export interface ProfileChange {
  id: string
  itemId: string
  proposalId?: string
  before: ApprovedProfileItem | null
  after: ApprovedProfileItem
  at: string
}
export interface ProfileTask {
  id: string
  status: 'running' | 'done' | 'failed'
  token: string
  expiresAt: number
  spentUsd: number
}
export function blankProfileContent(): ProfileContent {
  return {
    category: 'identity',
    text: '',
    scope: 'general',
    reviewAfter: null,
    validUntil: null,
    linkedObject: null,
  }
}
function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function needsReview(item: ProfileContent, today = localToday()) {
  return Boolean(item.reviewAfter && item.reviewAfter <= today)
}
export function periodEnded(item: ProfileContent, today = localToday()) {
  return Boolean(item.validUntil && item.validUntil < today)
}
