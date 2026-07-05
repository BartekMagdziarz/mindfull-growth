import { describe, it, expect } from 'vitest'
import {
  EXERCISE_CATALOG,
  catalogEntriesForTab,
  microCandidates,
} from '@/data/exerciseCatalog'
import enExercises from '@/locales/en/exercises.json'
import plExercises from '@/locales/pl/exercises.json'

type CardCopy = Record<string, unknown> | undefined

function cards(locale: typeof enExercises): Record<string, CardCopy> {
  return locale.cards as unknown as Record<string, CardCopy>
}

/** Card copy fields are plain strings or gendered `{ m, f }` objects. */
function isCopyValue(value: unknown): boolean {
  if (typeof value === 'string') return value.length > 0
  if (value && typeof value === 'object') {
    const g = value as Record<string, unknown>
    return typeof g.m === 'string' && typeof g.f === 'string'
  }
  return false
}

describe('exercise catalog', () => {
  it('has unique slugs and unique i18n keys', () => {
    const slugs = EXERCISE_CATALOG.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const keys = EXERCISE_CATALOG.map((e) => e.i18nKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('matches the ExercisesView category counts', () => {
    expect(catalogEntriesForTab('self-discovery')).toHaveLength(14)
    expect(catalogEntriesForTab('cbt')).toHaveLength(10)
    expect(catalogEntriesForTab('logotherapy')).toHaveLength(8)
    expect(catalogEntriesForTab('ifs')).toHaveLength(10)
    expect(EXERCISE_CATALOG).toHaveLength(48)
  })

  it('has card copy for every entry in both locales', () => {
    for (const locale of [enExercises, plExercises]) {
      for (const entry of EXERCISE_CATALOG) {
        const card = cards(locale)[entry.i18nKey]
        expect(card, `cards.${entry.i18nKey} missing`).toBeDefined()
        for (const field of ['title', 'subtitle', 'description'] as const) {
          expect(
            isCopyValue(card?.[field]),
            `cards.${entry.i18nKey}.${field} invalid`,
          ).toBe(true)
        }
      }
    }
  })

  it('routes are exercise routes; assessment routes embed the slug', () => {
    for (const entry of EXERCISE_CATALOG) {
      expect(entry.route.startsWith('/exercises/')).toBe(true)
      if (entry.kind === 'assessment') {
        expect(entry.route).toBe(`/exercises/assessments/${entry.slug}`)
      }
    }
  })

  it('wizard entries carry a backfill table, other kinds do not', () => {
    for (const entry of EXERCISE_CATALOG) {
      if (entry.kind === 'wizard') {
        expect(entry.legacyTable, `${entry.slug} needs legacyTable`).toBeTruthy()
      } else {
        expect(entry.legacyTable, `${entry.slug} must not have legacyTable`).toBeUndefined()
      }
    }
  })

  it('flags exactly the expected micro candidates', () => {
    const microSlugs = microCandidates()
      .map((e) => e.slug)
      .sort()
    expect(microSlugs).toEqual(
      [
        'daily-ifs-checkin',
        'positive-data-log',
        'self-energy',
        'worry-tree',
        'gratitude-list',
        'savoring-moment',
        'self-compassion-break',
        'grounding-54321',
        'box-breathing',
        'one-small-win',
      ].sort(),
    )
    // The micro tab shows all micro-eligible entries (user decision 2026-07-04).
    expect(catalogEntriesForTab('micro')).toHaveLength(microSlugs.length)
  })

  it('every micro definition has a catalog entry and vice versa', async () => {
    const { MICRO_EXERCISES } = await import('@/data/microExercises')
    const microKindSlugs = EXERCISE_CATALOG.filter((e) => e.kind === 'micro').map((e) => e.slug)
    expect(MICRO_EXERCISES.map((d) => d.slug).sort()).toEqual(microKindSlugs.sort())
    for (const definition of MICRO_EXERCISES) {
      const entry = EXERCISE_CATALOG.find((e) => e.slug === definition.slug)
      expect(entry?.i18nKey).toBe(definition.i18nKey)
      expect(entry?.route).toBe(`/exercises/micro/${definition.slug}`)
    }
  })

  it('every micro candidate fits the 2–5 minute promise', () => {
    for (const entry of microCandidates()) {
      expect(entry.estimatedMinutes).toBeGreaterThanOrEqual(2)
      expect(entry.estimatedMinutes).toBeLessThanOrEqual(5)
    }
  })
})
