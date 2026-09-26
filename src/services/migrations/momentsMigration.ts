/**
 * Dexie v27: the shame and anger logs become Momenty.
 *
 * - `microExerciseEntries`: `shame-log` / `anger-log` → `moments` with a
 *   `kind` answer; anger's `trigger` → `situation`, `firstSign` → `body`
 *   (the shared step keys of the merged definition).
 * - `exerciseCompletions` and pending `exercisePlanItems`: the old slug →
 *   the catalog variant (`moment-shame` / `moment-anger`), which is what
 *   paths, practices and task links use from now on.
 *
 * Pure over row arrays so the upgrade is unit-testable; idempotent (rows
 * already migrated are left alone).
 *
 * Plan: ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §3.3.
 */

import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { MicroExerciseEntry, MicroStepValue } from '@/domain/microExercises'

export const LEGACY_LOG_SLUGS = {
  'shame-log': { kind: 'shame', variant: 'moment-shame' },
  'anger-log': { kind: 'anger', variant: 'moment-anger' },
} as const

type LegacySlug = keyof typeof LEGACY_LOG_SLUGS

function isLegacy(slug: unknown): slug is LegacySlug {
  return typeof slug === 'string' && slug in LEGACY_LOG_SLUGS
}

/** Anger-log keys that the merged definition names differently. */
const ANGER_KEY_RENAMES: Record<string, string> = {
  trigger: 'situation',
  firstSign: 'body',
  hadEpisode: 'hadMoment',
}

/** Entry rows as Momenty; unchanged rows are not returned. */
export function migrateMomentEntry(entry: MicroExerciseEntry): MicroExerciseEntry | null {
  if (!isLegacy(entry.exerciseSlug)) return null
  const { kind } = LEGACY_LOG_SLUGS[entry.exerciseSlug]
  const responses: Record<string, MicroStepValue> = {}
  for (const [key, value] of Object.entries(entry.responses ?? {})) {
    const target = kind === 'anger' ? (ANGER_KEY_RENAMES[key] ?? key) : key
    responses[target] = value
  }
  // Anger's three-way "none / mild / strong" collapses to the shared
  // "none / yes"; the 0–10 intensity keeps the gradation.
  if (kind === 'anger') {
    const had = responses.hadMoment
    responses.hadMoment = had === 'none' ? 'none' : 'yes'
  }
  responses.kind = kind
  return { ...entry, exerciseSlug: 'moments', responses }
}

export function migrateMomentCompletion(completion: ExerciseCompletion): ExerciseCompletion | null {
  if (!isLegacy(completion.exerciseSlug)) return null
  return { ...completion, exerciseSlug: LEGACY_LOG_SLUGS[completion.exerciseSlug].variant }
}

export function migrateMomentPlanItem(item: ExercisePlanItem): ExercisePlanItem | null {
  if (!isLegacy(item.exerciseSlug)) return null
  return { ...item, exerciseSlug: LEGACY_LOG_SLUGS[item.exerciseSlug].variant }
}

export interface MomentsMigrationIO {
  entries: MicroExerciseEntry[]
  completions: ExerciseCompletion[]
  planItems: ExercisePlanItem[]
  putEntry: (row: MicroExerciseEntry) => Promise<unknown>
  putCompletion: (row: ExerciseCompletion) => Promise<unknown>
  putPlanItem: (row: ExercisePlanItem) => Promise<unknown>
}

/** Runs the three migrations; returns how many rows changed per table. */
export async function migrateLogsToMoments(
  io: MomentsMigrationIO,
): Promise<{ entries: number; completions: number; planItems: number }> {
  const counts = { entries: 0, completions: 0, planItems: 0 }
  for (const entry of io.entries) {
    const next = migrateMomentEntry(entry)
    if (next) {
      await io.putEntry(next)
      counts.entries += 1
    }
  }
  for (const completion of io.completions) {
    const next = migrateMomentCompletion(completion)
    if (next) {
      await io.putCompletion(next)
      counts.completions += 1
    }
  }
  for (const item of io.planItems) {
    const next = migrateMomentPlanItem(item)
    if (next) {
      await io.putPlanItem(next)
      counts.planItems += 1
    }
  }
  return counts
}
