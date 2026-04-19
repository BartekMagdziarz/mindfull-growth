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
  type ProfileDataType,
  type ProfileScopeFilters,
} from '@/domain/userProfile'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useJournalStore } from '@/stores/journal.store'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { getExerciseEntriesForPeriod } from '@/services/reflectionDataQueries'

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

export interface ScopePreviewArgs {
  dataTypes: ProfileDataType[]
  start: string // ISO
  end: string // ISO
  filters?: ProfileScopeFilters
}

export interface ScopePreviewResult {
  countsByType: Partial<Record<ProfileDataType, number>>
  objectIdsByType: Partial<Record<ProfileDataType, string[]>>
  headers: ProfilePreviewObjectHeader[]
  approxTokens: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
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
  const { dataTypes, start, end, filters } = args
  const enabled = new Set(dataTypes)
  const emotionQuadrantCodes = filters?.emotionQuadrants ?? []
  const resolvedQuadrants = emotionQuadrantCodes.map((code) => QUADRANT_CODE_MAP[code])

  const countsByType: Partial<Record<ProfileDataType, number>> = {}
  const objectIdsByType: Partial<Record<ProfileDataType, string[]>> = {}
  const headers: ProfilePreviewObjectHeader[] = []
  let approxTokens = 0

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
      approxTokens += estimateTokens(`${entry.title ?? ''} ${entry.body ?? ''}`)
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
      approxTokens += estimateTokens(log.note ?? '') + 20
    }
  }

  // --- Exercise sessions -------------------------------------------------
  if (enabled.has('exerciseSessions')) {
    const entries = await getExerciseEntriesForPeriod(start, end)
    countsByType.exerciseSessions = entries.length
    const ids: string[] = []
    for (const entry of entries) {
      // Exercise tables don't share a common `id` field in the slim bundle
      // returned here, so synthesise one from (type, createdAt). Good enough
      // for "reproduce which sessions were in scope".
      const id = `${entry.type}-${entry.createdAt}`
      ids.push(id)
      headers.push({
        type: 'exerciseSessions',
        id,
        title: entry.type,
        date: entry.createdAt,
      })
      approxTokens += 200
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
        approxTokens += estimateTokens(r.freeformReflection ?? '') + 150
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
        approxTokens += estimateTokens(r.freeformReflection ?? '') + 250
      }
    }
  }

  // --- Questionnaires ----------------------------------------------------
  if (enabled.has('questionnaires')) {
    // TODO(epic 12+): no questionnaire store exists yet. Report 0 for now.
    countsByType.questionnaires = 0
    objectIdsByType.questionnaires = []
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

  return {
    countsByType,
    objectIdsByType,
    headers,
    approxTokens,
  }
}

/**
 * Exported for tests only — lets specs iterate over types without assuming
 * the order in `@/domain/userProfile`.
 */
export const ALL_PROFILE_DATA_TYPES = PROFILE_DATA_TYPES
