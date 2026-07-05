/**
 * Deterministic daily micro-exercise suggestion for the Today card.
 *
 * Pure functions — same (dayRef, completions, offset) always yield the
 * same pick, so the suggestion is stable within a day and "pokaż inne"
 * cycles the ranked pool deterministically. No LLM in v1 (design §4.3;
 * emotion-aware ranking is a deferred v2).
 */

import { EXERCISE_CATALOG } from '@/data/exerciseCatalog'
import type { ExerciseCatalogEntry } from '@/domain/exerciseCatalog'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'
import { addDaysToDayRef } from '@/utils/periods'
import { cyrb53 } from '@/utils/stableHash'

/** Completed within the last 3 days (incl. today) → excluded from the pool. */
const EXCLUDE_WINDOW_DAYS = 3

function rotate<T>(items: T[], by: number): T[] {
  if (items.length === 0) return items
  const shift = by % items.length
  return [...items.slice(shift), ...items.slice(0, shift)]
}

/**
 * Round-robin across categories (first-appearance order) so consecutive
 * picks don't cluster in one modality.
 */
function interleaveByCategory(entries: ExerciseCatalogEntry[]): ExerciseCatalogEntry[] {
  const byCategory = new Map<string, ExerciseCatalogEntry[]>()
  for (const entry of entries) {
    byCategory.set(entry.category, [...(byCategory.get(entry.category) ?? []), entry])
  }
  const queues = [...byCategory.values()]
  const result: ExerciseCatalogEntry[] = []
  while (result.length < entries.length) {
    for (const queue of queues) {
      const next = queue.shift()
      if (next) result.push(next)
    }
  }
  return result
}

function rankedCandidates(
  dayRef: DayRef,
  completions: ExerciseCompletion[],
): ExerciseCatalogEntry[] {
  const candidates = EXERCISE_CATALOG.filter((entry) => entry.micro)

  const lastDayBySlug = new Map<string, string>()
  const lastCompletedBySlug = new Map<string, string>()
  for (const completion of completions) {
    const day = lastDayBySlug.get(completion.exerciseSlug)
    if (!day || completion.dayRef > day) {
      lastDayBySlug.set(completion.exerciseSlug, completion.dayRef)
    }
    const ts = lastCompletedBySlug.get(completion.exerciseSlug)
    if (!ts || completion.completedAt > ts) {
      lastCompletedBySlug.set(completion.exerciseSlug, completion.completedAt)
    }
  }

  // dayRef−2 and later count as "recent"; dayRef−3 is eligible again.
  const cutoff = addDaysToDayRef(dayRef, -(EXCLUDE_WINDOW_DAYS - 1))
  let eligible = candidates.filter((entry) => {
    const last = lastDayBySlug.get(entry.slug)
    return !last || last < cutoff
  })
  // Everything done recently → better to repeat something than go blank.
  if (eligible.length === 0) eligible = candidates

  const neverDone = interleaveByCategory(
    eligible.filter((entry) => !lastCompletedBySlug.has(entry.slug)),
  )
  const doneLongestAgoFirst = interleaveByCategory(
    eligible
      .filter((entry) => lastCompletedBySlug.has(entry.slug))
      .sort((a, b) =>
        lastCompletedBySlug.get(a.slug)!.localeCompare(lastCompletedBySlug.get(b.slug)!),
      ),
  )

  // Day-seeded rotation varies which never-done entry leads (they have
  // no history to rank by); cyrb53 returns base36 of a 53-bit int.
  const seed = parseInt(cyrb53(dayRef), 36)
  return [...rotate(neverDone, neverDone.length ? seed % neverDone.length : 0), ...doneLongestAgoFirst]
}

export function suggestExercise(
  dayRef: DayRef,
  completions: ExerciseCompletion[],
  offset = 0,
): ExerciseCatalogEntry | null {
  const ranked = rankedCandidates(dayRef, completions)
  if (ranked.length === 0) return null
  return ranked[offset % ranked.length] ?? null
}

/** Pool size for the same inputs — lets "pokaż inne" wrap the offset. */
export function suggestionPoolSize(
  dayRef: DayRef,
  completions: ExerciseCompletion[],
): number {
  return rankedCandidates(dayRef, completions).length
}
