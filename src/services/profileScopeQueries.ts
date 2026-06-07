/**
 * Profile scope queries.
 *
 * Given a set of data types, a date range, and optional filters, produce the
 * preview numbers the wizard needs on Step 2 — counts per type, a flat list
 * of object headers, and an estimated token count.
 *
 * The actual "pack full records for the LLM" logic lives elsewhere (Stories
 * 4-5). Here we only need shallow, fast queries — enough to let the user
 * decide whether the scope is what they want before they spend tokens.
 */

import { getQuadrant, type Quadrant } from '@/domain/emotion'
import { getDisplayTitle } from '@/domain/journal'
import {
  PROFILE_DATA_TYPES,
  type ProfileAgeBucket,
  type ProfileDataType,
  type ProfileDateRange,
  type ProfileScopeFilters,
} from '@/domain/userProfile'
import type { LocaleId } from '@/services/locale.service'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useJournalStore } from '@/stores/journal.store'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import {
  computeFoundationStatuses,
  foundationCompletionCount,
  type FoundationItemId,
} from '@/services/foundationCompleteness'
import { getExerciseSessionBundlesForPeriod } from '@/services/reflectionDataQueries'
import {
  assembleProfilePayload,
  ensureProfileStoresLoaded,
} from '@/services/profilePayloadAssembler'

export interface ProfilePreviewObjectHeader {
  type: ProfileDataType
  id: string
  title: string
  date: string // ISO timestamp — used for sort desc
}

// Short-code → full Quadrant mapping. Short codes live in
// `ProfileScopeFilters.emotionQuadrants` to keep the stored scope compact.
const QUADRANT_CODE_MAP: Record<
  NonNullable<ProfileScopeFilters['emotionQuadrants']>[number],
  Quadrant
> = {
  'hp-he': 'high-energy-high-pleasantness',
  'hp-le': 'low-energy-high-pleasantness',
  'lp-he': 'high-energy-low-pleasantness',
  'lp-le': 'low-energy-low-pleasantness',
}

const FOUNDATION_PREVIEW_TITLES: Record<FoundationItemId, string> = {
  valuesDiscovery: 'Values discovery',
  valueMap: 'Value map',
  transformativePurpose: 'Transformative purpose',
  threePathways: 'Three pathways to meaning',
  mountainRange: 'Mountain range of meaning',
  ifsPartsMap: 'Parts map',
  bigFive: 'Big Five personality',
  vlq: 'VLQ',
  'hexaco-60': 'HEXACO-60',
  'ipip-via': 'Character strengths (IPIP-VIA)',
  shadowBeliefs: 'Shadow beliefs',
  wheelOfLife: 'Wheel of life',
  'pvq-40': 'PVQ-40',
  erq: 'Emotion regulation (ERQ)',
  rrq: 'Rumination & reflection (RRQ)',
  'ecr-rs': 'Attachment (ECR-RS)',
}

export interface ScopePreviewArgs {
  dataTypes: ProfileDataType[]
  start: string // ISO
  end: string // ISO
  filters?: ProfileScopeFilters
  /** Locale for the assembled-payload estimate; defaults to 'en'. */
  locale?: LocaleId
  /**
   * The scope's date-range descriptor. Passed through to the assembler so the
   * [SCOPE] line (and thus the token estimate) matches the build exactly.
   * Defaults to a custom range derived from `start`/`end`.
   */
  dateRange?: ProfileDateRange
}

export interface ScopePreviewResult {
  countsByType: Partial<Record<ProfileDataType, number>>
  objectIdsByType: Partial<Record<ProfileDataType, string[]>>
  headers: ProfilePreviewObjectHeader[]
  /**
   * Honest token estimate — `estimateTokens` of the exact payload the build
   * would assemble for this scope (single source of truth with the build).
   */
  approxTokens: number
  /** Per-type contribution to `approxTokens`. */
  tokensByType: Partial<Record<ProfileDataType, number>>
  /** Per record-age contribution to `approxTokens` (snapshots → 'undated'). */
  tokensByAge: Record<ProfileAgeBucket, number>
  /**
   * Per-type counts of records the budget-aware assembler trimmed to fit the
   * model's window (empty when nothing was dropped). `countsByType` stays the
   * pre-trim match count, so the UI can show "kept of matched".
   */
  droppedByType: Partial<Record<ProfileDataType, number>>
  /** Number of older periods rendered as digests (Pillar 3). */
  summarizedPeriods: number
  /** Number of summarized periods dropped to fit the budget. */
  droppedSummarizedPeriods: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

function hasAnyOverlap<T>(needles: T[] | undefined, haystack: T[] | undefined): boolean {
  if (!needles || needles.length === 0) return true
  if (!haystack || haystack.length === 0) return false
  return haystack.some((h) => needles.includes(h))
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function queryScopePreview(
  args: ScopePreviewArgs,
): Promise<ScopePreviewResult> {
  const { dataTypes, start, end, filters, locale = 'en', dateRange } = args
  const enabled = new Set(dataTypes)
  const emotionQuadrantCodes = filters?.emotionQuadrants ?? []
  const resolvedQuadrants = emotionQuadrantCodes.map((code) => QUADRANT_CODE_MAP[code])

  // Journal/emotion records (+ names) and foundation data live in lazily-loaded
  // Pinia stores the wizard doesn't otherwise hydrate — load them before counting,
  // or the preview reports 0 even when data exists. (Other types read Dexie directly.)
  await ensureProfileStoresLoaded(enabled)

  const countsByType: Partial<Record<ProfileDataType, number>> = {}
  const objectIdsByType: Partial<Record<ProfileDataType, string[]>> = {}
  const headers: ProfilePreviewObjectHeader[] = []

  // --- Journal ----------------------------------------------------------
  if (enabled.has('journal')) {
    const journalStore = useJournalStore()
    const matches = journalStore.sortedEntries.filter((entry) => {
      if (!isInRange(entry.createdAt, start, end)) return false
      if (
        filters?.peopleTagIds?.length &&
        !hasAnyOverlap(filters.peopleTagIds, entry.peopleTagIds)
      ) {
        return false
      }
      if (
        filters?.contextTagIds?.length &&
        !hasAnyOverlap(filters.contextTagIds, entry.contextTagIds)
      ) {
        return false
      }
      // Note: `JournalEntry` has no `lifeAreaIds`. The filter is stored for
      // future parity with planning data but is a no-op here.
      return true
    })
    countsByType.journal = matches.length
    objectIdsByType.journal = matches.map((e) => e.id)
    for (const entry of matches) {
      const title = getDisplayTitle(entry) || '(no title)'
      headers.push({
        type: 'journal',
        id: entry.id,
        title,
        date: entry.createdAt,
      })
    }
  }

  // --- Emotion logs -----------------------------------------------------
  if (enabled.has('emotionLogs')) {
    const emotionLogStore = useEmotionLogStore()
    const emotionStore = useEmotionStore()
    const matches = emotionLogStore.sortedLogs.filter((log) => {
      if (!isInRange(log.createdAt, start, end)) return false
      if (
        filters?.peopleTagIds?.length &&
        !hasAnyOverlap(filters.peopleTagIds, log.peopleTagIds)
      ) {
        return false
      }
      if (
        filters?.contextTagIds?.length &&
        !hasAnyOverlap(filters.contextTagIds, log.contextTagIds)
      ) {
        return false
      }
      if (resolvedQuadrants.length > 0) {
        const logQuadrants = log.emotionIds
          .map((id) => emotionStore.getEmotionById(id))
          .filter((e): e is NonNullable<typeof e> => !!e)
          .map(getQuadrant)
        const overlap = logQuadrants.some((q) => resolvedQuadrants.includes(q))
        if (!overlap) return false
      }
      // `EmotionLog` has no `lifeAreaIds`, so that filter is skipped for logs.
      return true
    })
    countsByType.emotionLogs = matches.length
    objectIdsByType.emotionLogs = matches.map((l) => l.id)
    for (const log of matches) {
      const note = log.note?.trim()
      const title = note ? note.slice(0, 60) : '(no note)'
      headers.push({
        type: 'emotionLogs',
        id: log.id,
        title,
        date: log.createdAt,
      })
    }
  }

  // --- Exercise sessions -------------------------------------------------
  if (enabled.has('exerciseSessions')) {
    // Use the SAME bundle source + id as the assembler — `b.id` (the row's real
    // id when it has one, else `type-createdAt`). The preview previously always
    // synthesised `type-createdAt`, so for rows WITH a real id the preview's
    // object ids never matched the build's `ids.has(b.id)` filter and exercises
    // silently dropped out of the build. (Fix #4.)
    const bundles = await getExerciseSessionBundlesForPeriod(start, end)
    countsByType.exerciseSessions = bundles.length
    const ids: string[] = []
    for (const b of bundles) {
      ids.push(b.id)
      headers.push({
        type: 'exerciseSessions',
        id: b.id,
        title: b.type,
        date: b.createdAt,
      })
    }
    objectIdsByType.exerciseSessions = ids
  }

  // --- Weekly + monthly reflections -------------------------------------
  const wantsWeekly = enabled.has('weeklyReflections')
  const wantsMonthly = enabled.has('monthlyReflections')
  if (wantsWeekly || wantsMonthly) {
    const reflectionStore = useStructuredReflectionStore()
    if (
      reflectionStore.weeklyReflections.length === 0 &&
      reflectionStore.monthlyReflections.length === 0
    ) {
      try {
        await reflectionStore.loadAll()
      } catch {
        // Fall through — empty store means zero counts.
      }
    }

    if (wantsWeekly) {
      const matches = reflectionStore.weeklyReflections.filter((r) =>
        isInRange(r.createdAt, start, end),
      )
      countsByType.weeklyReflections = matches.length
      objectIdsByType.weeklyReflections = matches.map((r) => r.id)
      for (const r of matches) {
        headers.push({
          type: 'weeklyReflections',
          id: r.id,
          title: `Week ${r.weekRef}`,
          date: r.createdAt,
        })
      }
    }

    if (wantsMonthly) {
      const matches = reflectionStore.monthlyReflections.filter((r) =>
        isInRange(r.createdAt, start, end),
      )
      countsByType.monthlyReflections = matches.length
      objectIdsByType.monthlyReflections = matches.map((r) => r.id)
      for (const r of matches) {
        headers.push({
          type: 'monthlyReflections',
          id: r.id,
          title: `Month ${r.monthRef}`,
          date: r.createdAt,
        })
      }
    }
  }

  // --- Foundation --------------------------------------------------------
  if (enabled.has('foundation')) {
    const statuses = computeFoundationStatuses()
    const completed = statuses.filter(
      (s) => s.state === 'completed' || s.state === 'outdated',
    )

    countsByType.foundation = foundationCompletionCount(statuses)
    objectIdsByType.foundation = completed.map((s) => s.id)

    for (const status of completed) {
      headers.push({
        type: 'foundation',
        id: status.id,
        title: FOUNDATION_PREVIEW_TITLES[status.id],
        date: status.lastCompletedAt ?? new Date(0).toISOString(),
      })
    }
  }

  // --- Planning ----------------------------------------------------------
  if (enabled.has('planning')) {
    // TODO(epic 12+): planning stores (goals, habits, trackers, etc.) are
    // not summarised here — only diary-like sources are included in Story 3.
    // When wired up, this branch should filter by `filters.lifeAreaIds`.
    countsByType.planning = 0
    objectIdsByType.planning = []
  }

  // Guarantee stable ordering for the source list.
  headers.sort((a, b) => b.date.localeCompare(a.date))

  // Ensure unchecked types don't accidentally appear in counts.
  for (const key of Object.keys(countsByType) as ProfileDataType[]) {
    if (!enabled.has(key)) delete countsByType[key]
  }
  for (const key of Object.keys(objectIdsByType) as ProfileDataType[]) {
    if (!enabled.has(key)) delete objectIdsByType[key]
  }

  // Honest token estimate: assemble the EXACT payload the build would send for
  // this scope (with the resolved object-id selection) and count it. This is the
  // single source of truth shared with the build — preview == build minus the LLM.
  const assembled = await assembleProfilePayload({
    dataTypes,
    start,
    end,
    dateRange: dateRange ?? { kind: 'custom', start, end },
    includedObjectIds: objectIdsByType,
    locale,
  })

  return {
    countsByType,
    objectIdsByType,
    headers,
    approxTokens: assembled.approxTokens,
    tokensByType: assembled.tokensByType,
    tokensByAge: assembled.tokensByAge,
    droppedByType: assembled.droppedByType,
    summarizedPeriods: assembled.summarizedPeriods ?? 0,
    droppedSummarizedPeriods: assembled.droppedSummarizedPeriods,
  }
}

/**
 * Exported for tests only — lets specs iterate over types without assuming
 * the order in `@/domain/userProfile`.
 */
export const ALL_PROFILE_DATA_TYPES = PROFILE_DATA_TYPES
