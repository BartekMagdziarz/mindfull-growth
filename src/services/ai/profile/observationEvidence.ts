import { getUserDatabase } from '@/services/userDatabase.service'
import type { ProfileOrigin } from '@/domain/approvedProfile'
import { createHistoryTools } from '../history/tools'
import { loadHistoryAccessPolicy } from '../history/access'
import {
  SOURCE_COLLECTIONS,
  sourceKey,
  type ContentBlock,
  type SourceCollection,
} from '../history/contracts'
import { CompanionError } from '../companion/openai'
// Reuse the history allowlist; conversations remain excluded to avoid recycling AI claims.
export const OBSERVATION_COLLECTIONS = (
  Object.keys(SOURCE_COLLECTIONS) as SourceCollection[]
).filter(collection => SOURCE_COLLECTIONS[collection] !== 'conversation')
export const OBSERVATION_KINDS = [
  'journal',
  'emotion',
  'exercise',
  'reflection',
  'planning',
  'measurement',
  'assessment',
] as const
export const observationBlock = (b: ContentBlock, collection?: SourceCollection) =>
  b.author !== 'assistant' &&
  (b.label !== 'title' || (collection && SOURCE_COLLECTIONS[collection] === 'planning')) &&
  (!/(?:Id|Ids|Ref|At)$/.test(b.label) || b.label === 'checkedItemIds') &&
  b.label !== 'schemaVersion' &&
  b.text.trim().length > 0 &&
  b.text.length <= 8000
export const normalizeObservationText = (text: string) =>
  text
    .toLocaleLowerCase('pl')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const day = (date: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))

type Read = Awaited<
  ReturnType<ReturnType<typeof createHistoryTools>['readSources']>
>['items'][number]
export type CompleteRead = Extract<Read, { status: 'ok' }>
/** Conservative equivalence: one date is at most one episode; literal copies
 * across dates are merged as well. Distinct groups remain clues, not proof. */
export function evidenceCatalog(sources: CompleteRead[], timeZone: string) {
  const parents = sources.map((_, i) => i)
  const root = (i: number): number => (parents[i] === i ? i : (parents[i] = root(parents[i])))
  const texts = sources.map(s =>
    s.blocks
      .filter(b => b.label !== 'title' && observationBlock(b, s.ref.collection))
      .map(b => normalizeObservationText(b.text))
      .filter(t => t.length >= 20)
  )
  for (let i = 0; i < sources.length; i++)
    for (let j = 0; j < i; j++)
      if (
        (sources[i].eventDay ?? day(sources[i].occurredAt, timeZone)) ===
          (sources[j].eventDay ?? day(sources[j].occurredAt, timeZone)) ||
        sources[i].relatedRefs.some(
          ref =>
            ['journalEntries', 'assessmentAttempts', 'assessmentResponses'].includes(
              ref.collection
            ) && sourceKey(ref) === sourceKey(sources[j].ref)
        ) ||
        sources[j].relatedRefs.some(
          ref =>
            ['journalEntries', 'assessmentAttempts', 'assessmentResponses'].includes(
              ref.collection
            ) && sourceKey(ref) === sourceKey(sources[i].ref)
        ) ||
        texts[i].some(t => texts[j].includes(t))
      )
        parents[root(i)] = root(j)
  return sources.flatMap((s, i) =>
    s.blocks
      .filter(b => observationBlock(b, s.ref.collection))
      .slice(0, 12)
      .map((b, k) => ({
        id: `e${i}-${k}`,
        citation: { ref: s.ref, version: s.version },
        title: s.title,
        occurredAt: s.occurredAt,
        episode: `episode-${root(i)}`,
        quote: b.text,
        field: b.label,
        role:
          s.kind === 'planning'
            ? 'plan'
            : s.kind === 'measurement'
              ? 'execution'
              : s.kind === 'reflection'
                ? 'retrospective'
                : 'record',
        eventDay: s.eventDay,
        relatedRefs: s.relatedRefs,
      }))
  )
}
export function validateObservation(origin: ProfileOrigin) {
  const o = origin.observation
  if (
    origin.kind !== 'observation' ||
    !o ||
    o.schemaVersion !== 1 ||
    !o.limitations.trim() ||
    o.support.length < 2 ||
    o.support.length > 6 ||
    o.counterexamples.length > 6 ||
    new Set(o.support.map(s => s.episode)).size < 2
  )
    throw new CompanionError('insufficient-evidence')
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: o.timeZone }).format(new Date())
  } catch {
    throw new CompanionError('invalid-observation')
  }
  if (!o.focus.trim() || !o.searches.some(s => s.purpose === 'counterexample') || o.from > o.to)
    throw new CompanionError('invalid-observation')
  const support = new Set(o.support.map(s => sourceKey(s.citation.ref)))
  for (const item of [...o.support, ...o.counterexamples]) {
    if (
      !OBSERVATION_COLLECTIONS.includes(item.citation.ref.collection) ||
      !item.quote.trim() ||
      !origin.citations.some(
        c =>
          sourceKey(c.ref) === sourceKey(item.citation.ref) && c.version === item.citation.version
      )
    )
      throw new CompanionError('unverified-citation')
  }
  if (o.counterexamples.some(s => support.has(sourceKey(s.citation.ref))))
    throw new CompanionError('invalid-observation')
}
export async function observationEvidenceAvailable(origin: ProfileOrigin) {
  try {
    validateObservation(origin)
  } catch {
    return false
  }
  const o = origin.observation!
  const tools = createHistoryTools({ locale: 'pl', timeZone: o.timeZone })
  if ((await loadHistoryAccessPolicy(getUserDatabase())).revision !== o.policyRevision) return false
  const evidence = [...o.support, ...o.counterexamples]
  const found: CompleteRead[] = []
  for (let offset = 0; offset < origin.citations.length; offset += 3) {
    const result = await tools.readSources({
      requests: origin.citations
        .slice(offset, offset + 3)
        .map(e => ({ ref: e.ref, expectedVersion: e.version })),
      maxCharsPerSource: 8000,
    })
    if (result.items.some(s => s.status !== 'ok' || !s.complete)) return false
    found.push(...(result.items as CompleteRead[]))
  }
  const supporting = [
    ...new Map(
      found
        .filter(s => o.support.some(e => sourceKey(e.citation.ref) === sourceKey(s.ref)))
        .map(s => [sourceKey(s.ref), s])
    ).values(),
  ]
  if (new Set(evidenceCatalog(supporting, o.timeZone).map(e => e.episode)).size < 2) return false
  return evidence.every(e =>
    found.some(
      s =>
        sourceKey(s.ref) === sourceKey(e.citation.ref) &&
        s.blocks.some(
          b =>
            observationBlock(b, s.ref.collection) &&
            (!e.field || b.label === e.field) &&
            b.text === e.quote
        )
    )
  )
}
