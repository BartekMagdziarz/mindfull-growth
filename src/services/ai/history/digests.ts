import type { UserDatabase } from '@/services/userDatabase.service'
import type { HistoryDigest } from '@/domain/historyDigest'
import { assertPeriodRef, getPeriodBounds, getPeriodType } from '@/utils/periods'
import { sourceKey, type HistorySource, type SourceRef } from './contracts'
import { captureHistorySnapshot } from './snapshot'
import { dayInZone, fingerprint, invalid } from './validation'

export interface HistoryGuideInput {
  weeks?: string[]
  conversations?: SourceRef[]
}
const CONVERSATIONS = ['conversations', 'companionConversations', 'companionIntroductions']
/** Extract whole blocks only. Never drop a negation or silently rewrite an author's words. */
function extract(sources: HistorySource[]) {
  const fragments: HistoryDigest['fragments'] = []
  const represented = new Set<string>()
  const eligible = sources.map(source => ({
    source,
    blocks: source.blocks
      .map((block, blockIndex) => ({ block, blockIndex }))
      .filter(
        ({ block }) =>
          block.text.trim().length >= 12 &&
          block.text.length <= 700 &&
          !/^(id|.*Id|.*Ids|.*Ref|.*Refs|status|createdAt|updatedAt)$/.test(block.label)
      )
      .sort((a, b) => Number(b.block.author === 'user') - Number(a.block.author === 'user')),
  }))
  // Round robin over sources gives coverage instead of letting one long record dominate.
  for (let pass = 0; pass < 3 && fragments.length < 12; pass++) {
    for (const { source, blocks } of eligible) {
      const value = blocks[pass]
      if (!value || fragments.length >= 12) continue
      const { block, blockIndex } = value
      fragments.push({
        ...block,
        ref: source.ref,
        version: source.version,
        title: source.title,
        blockIndex,
      })
      represented.add(sourceKey(source.ref))
    }
  }
  const totalBlocks = sources.reduce((n, s) => n + s.blocks.length, 0)
  return {
    fragments,
    coverage: {
      permittedSources: sources.length,
      representedSources: represented.size,
      selectedBlocks: fragments.length,
      totalBlocks,
      partial: fragments.length !== totalBlocks,
    },
  }
}

export async function getHistoryGuide(
  db: UserDatabase,
  userId: string,
  options: { asOf: string; locale: 'pl' | 'en'; timeZone: string; omitRefs?: SourceRef[] },
  input: HistoryGuideInput
) {
  const weeks = input.weeks ?? [],
    conversations = input.conversations ?? []
  if (
    !Array.isArray(weeks) ||
    !Array.isArray(conversations) ||
    weeks.length + conversations.length < 1 ||
    weeks.length + conversations.length > 2
  )
    return invalid('Request one or two specific weeks/conversations')
  for (const week of weeks) {
    try {
      assertPeriodRef(week)
    } catch {
      return invalid('Invalid week reference')
    }
    if (getPeriodType(week) !== 'week') return invalid('Only week summaries are supported')
  }
  for (const ref of conversations)
    if (
      !ref ||
      !CONVERSATIONS.includes(ref.collection) ||
      typeof ref.id !== 'string' ||
      !ref.id ||
      ref.id.length > 256
    )
      return invalid('Invalid conversation reference')
  const capture = () =>
    captureHistorySnapshot(
      db,
      userId,
      options.asOf,
      options.locale,
      options.timeZone,
      options.omitRefs
    )
  const state = await capture()
  const requests = [
    ...weeks.map(subject => ({ kind: 'week' as const, subject, ref: null })),
    ...conversations.map(ref => ({ kind: 'conversation' as const, subject: sourceKey(ref), ref })),
  ]
  const items: Array<
    | { status: 'ok'; digest: HistoryDigest }
    | { status: 'unavailable' | 'period-open'; subject: string }
  > = []
  for (const request of requests) {
    let sources: HistorySource[]
    if (request.kind === 'week') {
      assertPeriodRef(request.subject)
      const bounds = getPeriodBounds(request.subject)
      if (bounds.end >= dayInZone(options.asOf, options.timeZone)) {
        items.push({ status: 'period-open', subject: request.subject })
        continue
      }
      sources = state.sources.filter(s => {
        // Plans/counters are a separate authoritative tool, not narrative trend evidence.
        if (['planning', 'measurement'].includes(s.kind)) return false
        if (s.ref.collection === 'weeklyReflections')
          return state.rows.get(sourceKey(s.ref))?.weekRef === request.subject
        if (s.ref.collection === 'companionConversations')
          return state.rows.get(sourceKey(s.ref))?.periodRef === request.subject
        const day = s.eventDay ?? dayInZone(s.occurredAt, options.timeZone)
        return day >= bounds.start && day <= bounds.end
      })
    } else sources = state.sources.filter(s => sourceKey(s.ref) === sourceKey(request.ref!))
    if (!sources.length) {
      items.push({ status: 'unavailable', subject: request.subject })
      continue
    }
    // Prefer user writing and conversations; keep ordering deterministic for cache reuse.
    sources.sort(
      (a, b) =>
        Number(b.blocks.some(x => x.author === 'user')) -
          Number(a.blocks.some(x => x.author === 'user')) ||
        b.occurredAt.localeCompare(a.occurredAt) ||
        sourceKey(a.ref).localeCompare(sourceKey(b.ref))
    )
    const id = `${request.kind}:${request.subject}:${options.locale}:${options.timeZone}:${fingerprint(JSON.stringify(options.omitRefs ?? []))}`
    const signature = fingerprint(
      JSON.stringify([
        'extractive-v1',
        state.policy.revision,
        sources.map(s => [sourceKey(s.ref), s.version]),
      ])
    )
    const existing = await db.historyDigests.get(id)
    const digest: HistoryDigest =
      existing?.signature === signature
        ? existing
        : {
            id,
            kind: request.kind,
            subject: request.subject,
            signature,
            algorithm: 'extractive-v1',
            createdAt: new Date().toISOString(),
            locale: options.locale,
            timeZone: options.timeZone,
            ...extract(sources),
            note: 'Selected complete quotations, not a complete account or a profile. Preserve author roles and negations. Assistant text is a suggestion, never a user commitment. Counts describe permitted records/coverage, not behavior frequency. Missing or omitted blocks mean unknown. Read original sources before interpreting patterns; use get_execution_summary for arithmetic.',
          }
    await state.assertCurrent()
    if ((await capture()).revision !== state.revision)
      return invalid('History changed; request the guide again')
    if (existing?.signature !== signature) await db.historyDigests.put(digest)
    items.push({ status: 'ok', digest })
  }
  await state.assertCurrent()
  if ((await capture()).revision !== state.revision)
    return invalid('History changed; request the guide again')
  return { items, generatedWith: 'local-extractive', modelCostUsd: 0, maxSubjects: 2 }
}
