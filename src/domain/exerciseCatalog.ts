/**
 * Exercise Catalog domain types
 *
 * The catalog (`src/data/exerciseCatalog.ts`) is the single data-driven
 * source of truth for "which exercises exist": slugs, routes, card copy
 * keys, icons and scheduling metadata. Bespoke exercises keep their own
 * domain interfaces (`src/domain/exercises.ts`) — the catalog only
 * unifies their identity, per docs/exercise-scheduling-design.md §4.1.
 */

export type ExerciseKind = 'wizard' | 'assessment' | 'micro'

export type ExerciseCatalogCategory =
  | 'self-discovery'
  | 'cbt'
  | 'logotherapy'
  | 'ifs'
  | 'micro'

export interface ExerciseCatalogEntry {
  /** Stable id, reuses route slugs ('worry-tree', 'erq', …). */
  slug: string
  kind: ExerciseKind
  category: ExerciseCatalogCategory
  route: string
  /** camelCase key under `exercises.cards.*` (NOT the slug — e.g. 'valuesDiscovery' for slug 'values'). */
  i18nKey: string
  /** Material Symbols icon name. */
  icon: string
  estimatedMinutes: number
  /** Eligible for the daily "Ćwiczenie na dziś" suggestion. */
  micro?: boolean
  /** Prefill for "zaplanuj powtórkę" (Phase 2; dormant until then). */
  suggestedRepeatDays?: number
  aiAssisted?: boolean
  /** Card description is gendered copy rendered via tg() instead of t(). */
  descriptionGendered?: boolean
  /**
   * Dexie table holding this exercise's result records — the v23
   * completion-backfill source. Present on every `kind: 'wizard'` entry;
   * assessments backfill from `assessmentAttempts`, micro entries have
   * no history to backfill.
   */
  legacyTable?: string
}
