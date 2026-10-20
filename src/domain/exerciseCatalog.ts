/**
 * Exercise Catalog domain types
 *
 * The catalog (`src/data/exerciseCatalog.ts`) is the single data-driven
 * source of truth for "which exercises exist": slugs, routes, card copy
 * keys, icons and scheduling metadata. Bespoke exercises keep their own
 * domain interfaces (`src/domain/exercises.ts`) — the catalog only
 * unifies their identity, per docs/exercise-scheduling-design.md §4.1.
 */

import type { MicroStepValue } from '@/domain/microExercises'

export type ExerciseKind = 'wizard' | 'assessment' | 'micro'

/**
 * The form of work a path step asks for (decision 2026-10-17, four groups):
 * `imagery` = inner work in the imagination or with a part, `reflection` =
 * writing and thinking (records, letters, maps, beliefs), `action` = plans,
 * experiments, decisions and checks. Questionnaires (`kind: 'assessment'`)
 * are the fourth group, `measure`, derived from the kind — see
 * `exerciseStepForm`. Shown as a small glyph before the step's title.
 */
export type ExerciseForm = 'imagery' | 'reflection' | 'action'
export type ExerciseStepForm = ExerciseForm | 'measure'

export function exerciseStepForm(
  entry: Pick<ExerciseCatalogEntry, 'kind' | 'form'> | undefined
): ExerciseStepForm | undefined {
  if (!entry) return undefined
  return entry.kind === 'assessment' ? 'measure' : entry.form
}

export type ExerciseCatalogCategory = 'self-discovery' | 'cbt' | 'logotherapy' | 'ifs' | 'micro'

export interface ExerciseCatalogEntry {
  /** Stable id, reuses route slugs ('worry-tree', 'erq', …). */
  slug: string
  kind: ExerciseKind
  /** Form of work for path step glyphs; assessments are `measure` implicitly. */
  form?: ExerciseForm
  category: ExerciseCatalogCategory
  route: string
  /** camelCase key under `exercises.cards.*` (NOT the slug — e.g. 'valuesDiscovery' for slug 'values'). */
  i18nKey: string
  /** Material Symbols icon name. */
  icon: string
  estimatedMinutes: number
  /** Eligible for the daily "Ćwiczenie na dziś" suggestion. */
  micro?: boolean
  /**
   * A micro variant: this slug runs another definition with answers
   * fixed up front (e.g. `moment-shame` = `moments` with `kind: 'shame'`).
   * Plan items, practices, completions and task links use the variant
   * slug; entries are stored under the definition's slug.
   */
  variantOf?: { slug: string; preset: Record<string, MicroStepValue> }
  /** Not listed on the exercises tabs (variants), still a valid slug everywhere else. */
  hiddenInCatalog?: boolean
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
