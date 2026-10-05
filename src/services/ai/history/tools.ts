import { getCurrentUserId, getUserDatabase } from '@/services/userDatabase.service'
import {
  HistoryToolError,
  LIMITS,
  sourceKey,
  type HistoryFilter,
  type HistorySource,
  type ReadSourcesInput,
  type SearchHistoryInput,
  type SourceRef,
} from './contracts'
import { captureHistorySnapshot } from './snapshot'
import { validateRef } from './access'
import {
  dayInZone,
  fingerprint,
  inRange,
  instant,
  integer,
  invalid,
  normalizeText,
  refEquals,
  validDay,
  validateFilter,
} from './validation'
import { getHistoryGuide, type HistoryGuideInput } from './digests'
import { summarizeExecution, type ExecutionSummaryInput } from './execution'

export interface HistoryToolsOptions {
  /** Application/test clock, not supplied by the model. No time-travel reconstruction of edited records. */
  omitRefs?: SourceRef[]
  asOf?: string
  locale?: 'pl' | 'en'
  timeZone?: string
}
function matches(source: HistorySource, filter: HistoryFilter, timeZone: string): boolean {
  const overlaps = (wanted: string[] | undefined, actual: Array<{ id: string }>) =>
    !wanted || actual.some(a => wanted.includes(a.id))
  const effectiveFilter = source.eventDay
    ? {
        ...filter,
        from: filter.from && validDay(filter.from) ? undefined : filter.from,
        to: filter.to && validDay(filter.to) ? undefined : filter.to,
      }
    : filter
  const eventDayMatches =
    !source.eventDay ||
    ((!filter.from || !validDay(filter.from) || source.eventDay >= filter.from) &&
      (!filter.to || !validDay(filter.to) || source.eventDay <= filter.to))
  return (
    eventDayMatches &&
    inRange(source.occurredAt, effectiveFilter, timeZone) &&
    (!filter.kinds || filter.kinds.includes(source.kind)) &&
    (!filter.collections || filter.collections.includes(source.ref.collection)) &&
    overlaps(filter.contextTagIds, source.contextTags) &&
    overlaps(filter.peopleTagIds, source.peopleTags) &&
    overlaps(filter.emotionIds, source.emotions) &&
    overlaps(filter.emotionFamilyIds, source.emotionFamilies) &&
    (!filter.relatedRefs ||
      filter.relatedRefs.some(
        ref => refEquals(ref, source.ref) || source.relatedRefs.some(r => refEquals(r, ref))
      ))
  )
}
function textForSearch(source: HistorySource) {
  return [
    source.title,
    ...source.blocks.map(b => `${b.author}: ${b.text}`),
    ...source.contextTags.map(t => t.name),
    ...source.peopleTags.map(t => t.name),
    ...source.emotions.map(e => e.name),
    ...source.emotionFamilies.map(e => e.name),
  ].join('\n')
}
function terms(query?: string): string[] {
  if (query === undefined || query === '') return []
  if (typeof query !== 'string' || query.length > 512 || (query.match(/"/g)?.length ?? 0) % 2)
    invalid('Invalid query (max 512 characters; balanced quotes required)')
  const result = (normalizeText(query).match(/"[^"]+"|[^\s"]+/g) ?? []).map(t =>
    t.replace(/^"|"$/g, '')
  )
  if (result.length > LIMITS.terms) invalid('Too many search terms')
  return result
}
function metadata(source: HistorySource) {
  const { blocks: _blocks, ...meta } = source
  const cap = (items: Array<{ id: string; name: string }>) =>
    items.slice(0, 12).map(item => ({ id: item.id, name: item.name.slice(0, 120) }))
  return {
    ...meta,
    authors: [...new Set(source.blocks.map(block => block.author))],
    contextTags: cap(meta.contextTags),
    peopleTags: cap(meta.peopleTags),
    emotions: cap(meta.emotions),
    emotionFamilies: cap(meta.emotionFamilies),
    relatedRefs: meta.relatedRefs.slice(0, 12),
    metadataTruncated: [
      meta.contextTags,
      meta.peopleTags,
      meta.emotions,
      meta.emotionFamilies,
      meta.relatedRefs,
    ].some(items => items.length > 12),
  }
}

/** Bound to one user/database. Switching accounts invalidates existing tool instances. */
export function createHistoryTools(options: HistoryToolsOptions = {}) {
  const db = getUserDatabase()
  const userId = getCurrentUserId()
  if (!userId) throw new HistoryToolError('session-changed', 'No connected user')
  const locale = options.locale ?? 'pl'
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    dayInZone(new Date().toISOString(), timeZone)
  } catch {
    invalid('Unknown timezone')
  }
  const frozenAsOf = options.asOf === undefined ? undefined : instant(options.asOf)
  const snapshot = () =>
    captureHistorySnapshot(
      db,
      userId,
      frozenAsOf ?? new Date().toISOString(),
      locale,
      timeZone,
      options.omitRefs
    )

  return {
    getHistoryGuide(input: HistoryGuideInput) {
      return getHistoryGuide(
        db,
        userId,
        {
          asOf: frozenAsOf ?? new Date().toISOString(),
          locale,
          timeZone,
          omitRefs: options.omitRefs,
        },
        input
      )
    },
    async searchHistory(input: SearchHistoryInput = {}) {
      validateFilter(input)
      const limit = integer(input.limit, LIMITS.defaultSearch, 1, LIMITS.search)
      const queryTerms = terms(input.query)
      const sort = input.sort ?? 'newest'
      if (!['newest', 'oldest'].includes(sort)) invalid('Unknown sort')
      const state = await snapshot()
      const queryId = fingerprint(
        JSON.stringify({
          ...input,
          cursor: undefined,
          limit: undefined,
          sort,
          timeZone,
          frozenAsOf,
        })
      )
      let offset = 0
      if (input.cursor !== undefined) {
        if (typeof input.cursor !== 'string' || input.cursor.length > 1000)
          invalid('Invalid cursor')
        let cursor: { version?: number; query?: string; snapshot?: string; offset?: number }
        try {
          cursor = JSON.parse(input.cursor)
        } catch {
          return invalid('Invalid cursor')
        }
        if (
          !cursor ||
          cursor.version !== 1 ||
          cursor.query !== queryId ||
          cursor.snapshot !== state.revision
        ) {
          throw new HistoryToolError(
            'stale-cursor',
            'Data, policy or query changed; restart search'
          )
        }
        offset = integer(cursor.offset, 0, 0, Number.MAX_SAFE_INTEGER)
      }
      const results = state.sources
        .filter(
          source =>
            matches(source, input, timeZone) &&
            queryTerms.every(term => normalizeText(textForSearch(source)).includes(term))
        )
        .sort(
          (a, b) =>
            (sort === 'newest'
              ? b.occurredAt.localeCompare(a.occurredAt)
              : a.occurredAt.localeCompare(b.occurredAt)) ||
            sourceKey(a.ref).localeCompare(sourceKey(b.ref))
        )
      const page = results.slice(offset, offset + limit).map(source => {
        const body = textForSearch(source)
        const firstMatch = queryTerms.length ? normalizeText(body).indexOf(queryTerms[0]) : 0
        const start = Math.max(0, firstMatch - 60)
        return {
          ...metadata(source),
          excerpt: body.slice(start, start + 320),
          excerptTruncated: start > 0 || body.length > start + 320,
        }
      })
      const nextOffset = offset + page.length
      await state.assertCurrent()
      return {
        items: page,
        totalMatches: results.length,
        complete: nextOffset >= results.length,
        nextCursor:
          nextOffset < results.length
            ? JSON.stringify({
                version: 1,
                query: queryId,
                snapshot: state.revision,
                offset: nextOffset,
              })
            : null,
        asOf: state.asOf,
        timeZone,
        policyRevision: state.policy.revision,
      }
    },

    async readSources(input: ReadSourcesInput) {
      if (
        !input ||
        !Array.isArray(input.requests) ||
        !input.requests.length ||
        input.requests.length > LIMITS.reads
      )
        invalid('Expected 1–8 source requests')
      const maxChars = integer(input.maxCharsPerSource, 4000, 1, LIMITS.readChars)
      for (const request of input.requests) {
        if (!request || typeof request !== 'object') invalid('Invalid read request')
        validateRef(request.ref)
        integer(request.offset, 0, 0, Number.MAX_SAFE_INTEGER)
        if (request.expectedVersion !== undefined && typeof request.expectedVersion !== 'string')
          invalid('Invalid expected version')
      }
      const state = await snapshot()
      let remaining = LIMITS.totalReadChars as number
      const items = input.requests.map(request => {
        const doc = state.sources.find(s => refEquals(s.ref, request.ref))
        // Missing and excluded are intentionally indistinguishable.
        if (!doc) return { ref: request.ref, status: 'unavailable' as const }
        if (request.expectedVersion && request.expectedVersion !== doc.version)
          return { ref: request.ref, status: 'changed' as const }
        const offset = request.offset ?? 0
        const totalChars = doc.blocks.reduce((sum, b) => sum + b.text.length, 0)
        if (offset > totalChars) invalid('Read offset beyond source length')
        let skip = offset
        let allowance = Math.min(maxChars, remaining)
        let consumed = 0
        const blocks = doc.blocks.flatMap(block => {
          if (skip >= block.text.length) {
            skip -= block.text.length
            return []
          }
          if (!allowance) return []
          const text = block.text.slice(skip, skip + allowance)
          skip = 0
          allowance -= text.length
          consumed += text.length
          return [{ ...block, text }]
        })
        remaining -= consumed
        return {
          ...metadata(doc),
          status: 'ok' as const,
          blocks,
          offset,
          totalChars,
          complete: offset + consumed >= totalChars,
          nextOffset: offset + consumed < totalChars ? offset + consumed : null,
        }
      })
      await state.assertCurrent()
      return {
        items,
        asOf: state.asOf,
        policyRevision: state.policy.revision,
        budgetExhausted: remaining === 0,
      }
    },

    async getHistoryOverview(filter: HistoryFilter = {}) {
      validateFilter(filter)
      const state = await snapshot()
      const visible = state.sources.filter(s => matches(s, filter, timeZone))
      const months = new Map<string, { month: string; counts: Record<string, number> }>()
      const counts: Record<string, number> = {}
      for (const doc of visible) {
        const month = (doc.eventDay ?? dayInZone(doc.occurredAt, timeZone)).slice(0, 7)
        const group = months.get(month) ?? { month, counts: {} }
        group.counts[doc.kind] = (group.counts[doc.kind] ?? 0) + 1
        months.set(month, group)
        counts[doc.kind] = (counts[doc.kind] ?? 0) + 1
      }
      const periods = [...months.values()].sort((a, b) => b.month.localeCompare(a.month))
      const timestamps = visible.map(s => s.occurredAt).sort()
      await state.assertCurrent()
      return {
        totalSources: visible.length,
        counts,
        earliest: timestamps[0] ?? null,
        latest: timestamps.at(-1) ?? null,
        periods: periods.slice(0, 24),
        periodsTruncated: periods.length > 24,
        asOf: state.asOf,
        timeZone,
        policyRevision: state.policy.revision,
        note: 'Counts describe accessible records, not distinct life events. No narrative inference.',
      }
    },

    async listHistoryFacets(filter: HistoryFilter = {}) {
      validateFilter(filter)
      const state = await snapshot()
      const visible = state.sources.filter(s => matches(s, filter, timeZone))
      const facet = (key: 'contextTags' | 'peopleTags' | 'emotions' | 'emotionFamilies') => {
        const map = new Map<string, { id: string; name: string; count: number }>()
        for (const source of visible)
          for (const item of new Map(source[key].map(v => [v.id, v])).values()) {
            map.set(item.id, {
              id: item.id,
              name: item.name.slice(0, 120),
              count: (map.get(item.id)?.count ?? 0) + 1,
            })
          }
        const items = [...map.values()].sort(
          (a, b) => b.count - a.count || a.id.localeCompare(b.id)
        )
        return { items: items.slice(0, LIMITS.facets), truncated: items.length > LIMITS.facets }
      }
      const collections = [...new Set(visible.map(s => s.ref.collection))].sort()
      // Discover linked object IDs without leaking the entire planning text.
      const subjects = visible.filter(s =>
        ['goals', 'habits', 'keyResults', 'trackers', 'priorities', 'weeklyIntentions'].includes(
          s.ref.collection
        )
      )
      await state.assertCurrent()
      return {
        contexts: facet('contextTags'),
        people: facet('peopleTags'),
        emotions: facet('emotions'),
        emotionFamilies: facet('emotionFamilies'),
        collections,
        subjects: subjects.slice(0, LIMITS.facets).map(s => ({ ref: s.ref, title: s.title })),
        subjectsTruncated: subjects.length > LIMITS.facets,
        policyRevision: state.policy.revision,
      }
    },

    async getExecutionSummary(input: ExecutionSummaryInput) {
      const state = await snapshot()
      const result = summarizeExecution(state, input, timeZone)
      await state.assertCurrent()
      return { ...result, asOf: state.asOf, timeZone, policyRevision: state.policy.revision }
    },
  }
}
export type HistoryTools = ReturnType<typeof createHistoryTools>
export type { SourceRef }
