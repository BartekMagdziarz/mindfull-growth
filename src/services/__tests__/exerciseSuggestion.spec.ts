import { describe, expect, it } from 'vitest'
import { microCandidates } from '@/data/exerciseCatalog'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'
import { suggestExercise, suggestionPoolSize } from '@/services/exerciseSuggestion'

const DAY = '2026-07-05' as DayRef

function completion(
  exerciseSlug: string,
  dayRef: string,
  time = '12:00:00.000Z',
): ExerciseCompletion {
  return {
    id: `${exerciseSlug}-${dayRef}`,
    exerciseSlug,
    dayRef: dayRef as DayRef,
    completedAt: `${dayRef}T${time}`,
    source: 'standalone',
  }
}

describe('suggestExercise', () => {
  it('is deterministic for the same inputs', () => {
    const completions = [completion('worry-tree', '2026-06-20')]
    const first = suggestExercise(DAY, completions)
    for (let i = 0; i < 5; i++) {
      expect(suggestExercise(DAY, completions)?.slug).toBe(first?.slug)
    }
  })

  it('ranks never-done candidates before previously done ones', () => {
    // Everything except box-breathing was done long ago.
    const completions = microCandidates()
      .filter((entry) => entry.slug !== 'box-breathing')
      .map((entry) => completion(entry.slug, '2026-05-01'))
    expect(suggestExercise(DAY, completions)?.slug).toBe('box-breathing')
  })

  it('excludes exercises done within the last 3 days, boundary exact', () => {
    const poolSlugs = (completions: ExerciseCompletion[]) => {
      const size = suggestionPoolSize(DAY, completions)
      return new Set(
        Array.from({ length: size }, (_, offset) =>
          suggestExercise(DAY, completions, offset)?.slug,
        ),
      )
    }

    // dayRef−2 → still excluded.
    expect(poolSlugs([completion('gratitude-list', '2026-07-03')]).has('gratitude-list')).toBe(
      false,
    )
    // dayRef−3 → eligible again.
    expect(poolSlugs([completion('gratitude-list', '2026-07-02')]).has('gratitude-list')).toBe(
      true,
    )
  })

  it('falls back to the full pool when everything is recent', () => {
    const completions = microCandidates().map((entry) => completion(entry.slug, DAY))
    expect(suggestExercise(DAY, completions)).not.toBeNull()
    expect(suggestionPoolSize(DAY, completions)).toBe(microCandidates().length)
  })

  it('cycles the whole pool through offsets before repeating', () => {
    const size = suggestionPoolSize(DAY, [])
    expect(size).toBe(microCandidates().length)
    const seen = new Set(
      Array.from({ length: size }, (_, offset) => suggestExercise(DAY, [], offset)?.slug),
    )
    expect(seen.size).toBe(size)
    // Wrap-around: offset === size repeats offset 0.
    expect(suggestExercise(DAY, [], size)?.slug).toBe(suggestExercise(DAY, [], 0)?.slug)
  })

  it('prefers the longest-ago completion among previously done candidates', () => {
    // All candidates done, all outside the window, distinct dates.
    const candidates = microCandidates()
    const completions = candidates.map((entry, index) =>
      completion(entry.slug, `2026-06-${String(28 - index).padStart(2, '0')}`),
    )
    const oldest = candidates[candidates.length - 1]!
    const pick = suggestExercise(DAY, completions)
    // Category interleaving may promote a different category's oldest,
    // but the overall oldest must appear before the newest.
    const size = suggestionPoolSize(DAY, completions)
    const order = Array.from(
      { length: size },
      (_, offset) => suggestExercise(DAY, completions, offset)?.slug,
    )
    expect(order.indexOf(oldest.slug)).toBeLessThan(order.indexOf(candidates[0]!.slug))
    expect(pick).not.toBeNull()
  })
})
