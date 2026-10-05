import type { UserDatabase } from '@/services/userDatabase.service'
import { getCurrentUserId, getUserDatabase } from '@/services/userDatabase.service'
import plEmotions from '@/locales/pl/emotions.json'
import enEmotions from '@/locales/en/emotions.json'
import plGroups from '@/locales/pl/emotionGroups.json'
import enGroups from '@/locales/en/emotionGroups.json'
import { GROUP_OF_WORD, resolveGroupSlug } from '@/domain/emotionGroups'
import {
  SOURCE_COLLECTIONS,
  sourceKey,
  HistoryToolError,
  type SourceCollection,
  type SourceRef,
  type HistorySource,
  type ContentBlock,
  type HistoryAccessPolicy,
} from './contracts'
import { isExplicitlyAllowed, loadHistoryAccessPolicy } from './access'
import { dayInZone, fingerprint, instant, validDay } from './validation'

export type SourceRow = Record<string, unknown> & {
  id: string
  createdAt?: string
  updatedAt?: string
}
export interface HistorySnapshot {
  sources: HistorySource[]
  rows: Map<string, SourceRow>
  policy: HistoryAccessPolicy
  revision: string
  asOf: string
  assertCurrent: () => Promise<void>
}
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const string = (v: unknown): string => (typeof v === 'string' ? v : '')
const subjectCollections: Record<string, SourceCollection> = {
  habit: 'habits',
  keyResult: 'keyResults',
  tracker: 'trackers',
  weeklyIntention: 'weeklyIntentions',
}
export function subjectRef(row: SourceRow): SourceRef | undefined {
  const collection = subjectCollections[string(row.subjectType)]
  return collection && typeof row.subjectId === 'string'
    ? { collection, id: row.subjectId }
    : undefined
}
function dependencies(row: SourceRow): SourceRef[] {
  const refs: SourceRef[] = []
  const add = (collection: SourceCollection, value: unknown) => {
    if (typeof value === 'string' && value) refs.push({ collection, id: value })
  }
  add('journalEntries', row.journalEntryId)
  add('goals', row.goalId)
  add('priorities', row.priorityId)
  add('ifsParts', row.partId)
  add('assessmentAttempts', row.attemptId)
  for (const id of strings(row.priorityIds)) add('priorities', id)
  for (const id of strings(row.partIds)) add('ifsParts', id)
  const subject = subjectRef(row)
  if (subject) refs.push(subject)
  return refs
}
// Unprovenanced generated summaries and embedded conversation text are never silently
// treated as user-authored data. Conversations are projected independently below.
const OMIT_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'chatSessions',
  'aiSummary',
  'rawResponse',
  'llmAssistUsed',
])
function recordedContent(row: SourceRow): ContentBlock[] {
  return Object.entries(row)
    .filter(
      ([key, value]) =>
        !OMIT_FIELDS.has(key) &&
        !/^(ai[A-Z_]|llm|generated)/i.test(key) &&
        value !== undefined &&
        value !== null
    )
    .map(([label, value]) => ({
      label,
      author: 'recorded' as const,
      text: typeof value === 'string' ? value : JSON.stringify(value),
    }))
}
function safeInstant(value: unknown): string | undefined {
  try {
    return instant(value)
  } catch {
    return undefined
  }
}

/** Fresh snapshot on each invocation: no stale cache or lazily hydrated Pinia stores. */
export async function captureHistorySnapshot(
  db: UserDatabase,
  userId: string,
  asOf: string,
  locale: 'pl' | 'en',
  timeZone: string,
  omitRefs: SourceRef[] = []
): Promise<HistorySnapshot> {
  const guard = () => {
    if (getCurrentUserId() !== userId || getUserDatabase() !== db)
      throw new HistoryToolError('session-changed', 'History session changed')
  }
  guard()
  const collections = Object.keys(SOURCE_COLLECTIONS).filter(c => c !== 'conversations') as Exclude<
    SourceCollection,
    'conversations'
  >[]
  const snapshot = await db.transaction(
    'r',
    [
      ...collections.map(c => db.table(c)),
      db.userSettings,
      db.peopleTags,
      db.contextTags,
      db.approvedProfileItems,
      db.profileProposals,
      db.userProfiles,
    ],
    async () => {
      const policy = await loadHistoryAccessPolicy(db)
      const profileDecisions = await db.profileProposals.toArray()
      const profileItems = await db.approvedProfileItems.toArray()
      const legacyProfiles = await db.userProfiles.toArray()
      const [people, contexts] = await Promise.all([
        db.peopleTags.toArray(),
        db.contextTags.toArray(),
      ])
      const peopleNames = new Map(people.map(t => [t.id, t.name]))
      const contextNames = new Map(contexts.map(t => [t.id, t.name]))
      const emotionNames = (locale === 'pl' ? plEmotions : enEmotions) as Record<
        string,
        { name: string }
      >
      const familyNames = (locale === 'pl' ? plGroups.groups : enGroups.groups) as Record<
        string,
        { name: string }
      >
      const docs = new Map<string, HistorySource>()
      const rows = new Map<string, SourceRow>()
      const evidence = new Map<string, Array<{ ref: SourceRef; version: string }>>()
      const assessmentResponses = new Map<string, SourceRef[]>()
      const names = (ids: string[], map: Map<string, string>) =>
        ids.map(id => ({ id, name: map.get(id) ?? id }))
      const makeDoc = (collection: SourceCollection, row: SourceRow): HistorySource | undefined => {
        const ref = { collection, id: row.id }
        if (typeof row.id !== 'string' || !row.id || row.id.length > 256) return
        if (
          !isExplicitlyAllowed(ref, policy) ||
          omitRefs.some(r => sourceKey(r) === sourceKey(ref))
        )
          return
        const createdAt = safeInstant(row.createdAt)
        const updatedAt = safeInstant(row.updatedAt ?? row.createdAt)
        if (!createdAt || !updatedAt || createdAt > asOf || updatedAt > asOf) return
        const eventDay =
          typeof row.dayRef === 'string' && validDay(row.dayRef) ? row.dayRef : undefined
        if (
          collection === 'dailyMeasurementEntries' &&
          eventDay &&
          eventDay > dayInZone(asOf, timeZone)
        )
          return
        const occurredAt = safeInstant(row.situationDate) ?? createdAt
        if (occurredAt > asOf) return
        const selected = Array.isArray(row.emotions)
          ? (row.emotions as Array<{ emotionId?: string }>)
          : []
        const emotionIds = [
          ...new Set([
            ...strings(row.emotionIds),
            ...selected.map(e => string(e.emotionId)).filter(id => !!emotionNames[id]),
          ]),
        ]
        const familyIds = [
          ...new Set(
            [
              ...strings(row.emotionFamilyIds),
              ...selected.map(e => string(e.emotionId)),
              ...emotionIds.map(id => GROUP_OF_WORD[id]),
            ]
              .map(id => resolveGroupSlug(id))
              .filter((id): id is string => !!id)
          ),
        ]
        const blocks =
          collection === 'journalEntries'
            ? [
                { label: 'title', author: 'user' as const, text: string(row.title) },
                { label: 'body', author: 'user' as const, text: string(row.body) },
              ]
            : recordedContent(row)
        const doc: HistorySource = {
          ref,
          kind: SOURCE_COLLECTIONS[collection],
          title: (
            string(row.title) ||
            string(row.weekRef) ||
            string(row.monthRef) ||
            collection
          ).slice(0, 160),
          occurredAt,
          eventDay,
          updatedAt,
          version: '',
          blocks,
          contextTags: names(strings(row.contextTagIds), contextNames),
          peopleTags: names(strings(row.peopleTagIds), peopleNames),
          emotions: emotionIds.map(id => ({ id, name: emotionNames[id]?.name ?? id })),
          emotionFamilies: familyIds.map(id => ({ id, name: familyNames[id]?.name ?? id })),
          relatedRefs: dependencies(row),
        }
        doc.version = fingerprint(JSON.stringify(doc))
        return doc
      }
      await Promise.all(
        collections.map(async collection => {
          // Categories denied in the policy do not even have their bodies loaded.
          if (policy.excludedKinds.includes(SOURCE_COLLECTIONS[collection])) return
          const records = await db.table<SourceRow>(collection).toArray()
          for (const original of records) {
            let row = original
            const decisions = Array.isArray(row.profileDecisionEvidence)
              ? (row.profileDecisionEvidence as Array<{ id: string; version: number }>)
              : []
            const companion =
              collection === 'companionConversations' || collection === 'companionIntroductions'
            if (collection === 'companionIntroductions' && row.status !== 'complete') continue
            if (companion) {
              if (collection === 'companionConversations') {
                if (
                  row.surface === 'journal' &&
                  (typeof row.journalEntryId !== 'string' || !row.journalEntryId)
                )
                  continue
                // A context refresh retains old messages for the reader, not for AI retrieval.
                if (row.profileRevision !== undefined && row.historyStartIndex === undefined)
                  continue
                const start =
                  typeof row.historyStartIndex === 'number' &&
                  Number.isInteger(row.historyStartIndex) &&
                  row.historyStartIndex >= 0
                    ? row.historyStartIndex
                    : 0
                row = {
                  ...row,
                  messages: Array.isArray(row.messages) ? row.messages.slice(start) : [],
                }
              }
              // Derived dialogue may contain uncited context. Changing access or an approved
              // premise invalidates the whole dialogue as AI history, while retaining it locally.
              if (
                row.historyAccessRevision !== undefined
                  ? row.historyAccessRevision !== policy.revision
                  : policy.excludedKinds.length || policy.excludedSources.length
              )
                continue
              if (
                decisions.some(
                  d =>
                    !profileDecisions.some(
                      p =>
                        p.id === d.id &&
                        p.version === d.version &&
                        p.status === 'rejected' &&
                        p.origin.observation?.policyRevision === policy.revision
                    )
                )
              )
                continue
              const premises = Array.isArray(row.profileEvidence)
                ? (row.profileEvidence as Array<{ id: string; version: number }>)
                : []
              if (
                premises.some(
                  p =>
                    !profileItems.some(
                      i =>
                        i.id === p.id &&
                        i.version === p.version &&
                        i.status === 'active' &&
                        (!i.validUntil || i.validUntil >= asOf.slice(0, 10)) &&
                        (i.origin.kind !== 'legacy' ||
                          legacyProfiles.some(
                            old =>
                              old.id === i.origin.legacyId &&
                              old.updatedAt === i.origin.legacyVersion
                          ))
                    )
                )
              )
                continue
              const messages = Array.isArray(row.messages)
                ? (row.messages as Array<Record<string, unknown>>)
                : []
              if (!messages.length) continue
              row = {
                ...row,
                createdAt: row.createdAt ?? (string(messages[0].createdAt) || string(row.asOf)),
              }
            }
            if (collection === 'assessmentResponses' && typeof row.attemptId === 'string') {
              const refs = assessmentResponses.get(row.attemptId) ?? []
              refs.push({ collection, id: row.id })
              assessmentResponses.set(row.attemptId, refs)
            }
            const doc = makeDoc(collection, row)
            if (!doc) continue
            if (companion) {
              const messages = row.messages as Array<Record<string, unknown>>
              doc.blocks = messages.flatMap((m, i): ContentBlock[] =>
                ['user', 'assistant'].includes(string(m.role))
                  ? [
                      {
                        label: `message:${i}`,
                        author: m.role as 'user' | 'assistant',
                        text: string(m.text),
                        timestamp: safeInstant(m.createdAt),
                      },
                    ]
                  : []
              )
              doc.title =
                collection === 'companionIntroductions'
                  ? locale === 'pl'
                    ? 'Rozmowa zapoznawcza'
                    : 'Introduction'
                  : `${locale === 'pl' ? 'Rozmowa' : 'Conversation'}: ${string(row.periodRef)}`
              const citations = [
                ...(Array.isArray(row.exercises) ? row.exercises : []),
                ...messages.flatMap(m => (Array.isArray(m.citations) ? m.citations : [])),
              ] as Array<{ ref: SourceRef; version: string }>
              const checkpoint = row.state as { evidence?: Array<[string, string]> } | undefined
              for (const [key, version] of checkpoint?.evidence ?? []) {
                try {
                  const [collection, id] = JSON.parse(key)
                  if (Object.hasOwn(SOURCE_COLLECTIONS, collection) && typeof id === 'string')
                    citations.push({ ref: { collection, id }, version })
                } catch {
                  /* Ignore corrupt, non-reference checkpoint keys. */
                }
              }
              const premises = Array.isArray(row.profileEvidence)
                ? (row.profileEvidence as Array<{ id: string; version: number }>)
                : []
              for (const decision of decisions) {
                const proposal = profileDecisions.find(p => p.id === decision.id)!
                citations.push(...proposal.origin.citations)
              }
              const profileSources: SourceRef[] = []
              for (const premise of premises) {
                const item = profileItems.find(i => i.id === premise.id)!
                citations.push(...item.origin.citations)
                if (item.linkedObject) profileSources.push(item.linkedObject)
                if (item.origin.kind === 'introduction' && item.origin.introductionId)
                  profileSources.push({
                    collection: 'companionIntroductions',
                    id: item.origin.introductionId,
                  })
                if (item.origin.kind === 'conversation' && item.origin.conversationId)
                  profileSources.push({
                    collection: 'companionConversations',
                    id: item.origin.conversationId,
                  })
              }
              doc.relatedRefs = [
                ...citations.map(c => c.ref),
                ...profileSources,
                ...(row.surface === 'journal' && typeof row.journalEntryId === 'string'
                  ? [{ collection: 'journalEntries' as const, id: row.journalEntryId }]
                  : []),
              ]
              evidence.set(sourceKey(doc.ref), citations)
              doc.version = fingerprint(JSON.stringify({ ...doc, version: '' }))
            }
            docs.set(sourceKey(doc.ref), doc)
            rows.set(sourceKey(doc.ref), row)
            if (collection !== 'journalEntries' || !Array.isArray(row.chatSessions)) continue
            for (const session of row.chatSessions as Array<Record<string, unknown>>) {
              if (typeof session.id !== 'string') continue
              const conversation = makeDoc('conversations', {
                ...session,
                id: session.id,
                journalEntryId: row.id,
                createdAt: string(session.createdAt),
                updatedAt: row.updatedAt ?? row.createdAt,
              })
              if (!conversation) continue
              const messages = Array.isArray(session.messages)
                ? (session.messages as Array<Record<string, unknown>>)
                : []
              conversation.blocks = messages.flatMap((message, i): ContentBlock[] => {
                const timestamp = safeInstant(message.timestamp)
                if (
                  !timestamp ||
                  timestamp > asOf ||
                  !['user', 'assistant'].includes(string(message.role))
                )
                  return []
                return [
                  {
                    label: `message:${i}`,
                    author: message.role as 'user' | 'assistant',
                    text: string(message.content),
                    timestamp,
                  },
                ]
              })
              conversation.title =
                `${locale === 'pl' ? 'Rozmowa' : 'Conversation'}: ${doc.title}`.slice(0, 160)
              conversation.version = fingerprint(JSON.stringify({ ...conversation, version: '' }))
              if (!conversation.blocks.length) continue
              docs.set(sourceKey(conversation.ref), conversation)
            }
          }
        })
      )
      // Assessment scores are derived from answers. Excluding/deleting one answer
      // must not leave its contribution visible through the stored score.
      for (const [key, doc] of docs)
        if (doc.ref.collection === 'assessmentAttempts') {
          const answers = assessmentResponses.get(doc.ref.id) ?? []
          const attempt = rows.get(key)!
          if (
            typeof attempt.responseCount !== 'number' ||
            answers.length !== attempt.responseCount
          ) {
            docs.delete(key)
            rows.delete(key)
          } else {
            doc.relatedRefs.push(...answers)
            doc.version = fingerprint(JSON.stringify({ ...doc, version: '' }))
          }
        }
      // Deny dependency chains, including orphaned/deleted parents. Cycles alone do
      // not grant access; every node is already explicitly permitted above.
      let changed = true
      while (changed) {
        changed = false
        for (const [key, doc] of docs)
          if (
            doc.relatedRefs.some(ref => !docs.has(sourceKey(ref))) ||
            evidence.get(key)?.some(c => docs.get(sourceKey(c.ref))?.version !== c.version)
          ) {
            docs.delete(key)
            rows.delete(key)
            changed = true
          }
      }
      const sources = [...docs.values()].sort((a, b) =>
        sourceKey(a.ref).localeCompare(sourceKey(b.ref))
      )
      return {
        sources,
        rows,
        policy,
        asOf,
        revision: fingerprint(
          JSON.stringify([userId, policy.revision, sources.map(d => [sourceKey(d.ref), d.version])])
        ),
      }
    }
  )
  const assertCurrent = async () => {
    guard()
    if ((await loadHistoryAccessPolicy(db)).revision !== snapshot.policy.revision)
      throw new HistoryToolError('session-changed', 'History access changed; retry')
    guard()
  }
  await assertCurrent()
  return { ...snapshot, assertCurrent }
}
