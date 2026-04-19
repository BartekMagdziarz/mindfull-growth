/**
 * Profile LLM assist helpers — small, purely-functional utilities used by
 * the psychological-profile build pipeline. Kept separate from
 * `profileLLMAssists.ts` so the heavy prompt/parser file stays focused.
 *
 * Contents:
 *   - `summariseExerciseSession(bundle)` — picks the most meaningful
 *     free-text field from an exercise session row and produces a short
 *     one-line summary.
 *   - `extractWeeklyRatings(reflection)` / `extractMonthlyRatings(reflection)` —
 *     pull only the numeric rating fields into a plain record.
 *   - `buildPlanningSnapshot()` — reads goals / key results / habits / trackers
 *     directly from the repositories and returns a compact bulleted summary
 *     of what's currently active.
 */

import type {
  MonthlyReflection,
  WeeklyReflection,
} from '@/domain/reflection'
import {
  MONTHLY_RATING_KEYS,
  WEEKLY_CONTEXT_KEYS,
  WEEKLY_EVALUATION_KEYS,
  WEEKLY_STATE_KEYS,
} from '@/domain/reflection'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import type { ExerciseSessionBundle } from '@/services/reflectionDataQueries'

// ---------------------------------------------------------------------------
// Exercise summariser
// ---------------------------------------------------------------------------

/**
 * Field names in priority order — the first non-empty string value from a
 * session row is used as the body of the summary. Kept deliberately short;
 * Story 4 does not attempt per-exercise bespoke summarisation (that's a
 * future improvement called out in "Out of scope").
 */
const MEANINGFUL_FIELDS = [
  'situation',
  'hotThought',
  'freeformReflection',
  'reflection',
  'note',
  'notes',
  'insights',
  'insight',
  'description',
  'body',
  'content',
  'question',
] as const

function firstMeaningfulString(raw: Record<string, unknown>): string | null {
  for (const key of MEANINGFUL_FIELDS) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function dateOnly(iso: string): string {
  // Take just the "YYYY-MM-DD" part, tolerant of malformed timestamps.
  const idx = iso.indexOf('T')
  return idx >= 0 ? iso.slice(0, idx) : iso
}

/**
 * Produces a single-line summary `"<type> on <date>. <firstMeaningfulField>"`
 * (or a fallback when no free-text is recorded). Used to build the
 * `[EXERCISE SESSIONS]` block of the profile prompt payload.
 */
export function summariseExerciseSession(bundle: ExerciseSessionBundle): string {
  const date = dateOnly(bundle.createdAt)
  const body = firstMeaningfulString(bundle.raw)
  if (!body) {
    return `${bundle.type} on ${date}. (no free-text details recorded)`
  }
  return `${bundle.type} on ${date}. ${body}`
}

// ---------------------------------------------------------------------------
// Weekly / monthly rating extractors
// ---------------------------------------------------------------------------

/**
 * Returns a plain `{ key: number | null }` record with just the numeric
 * rating fields for a weekly reflection. Keys preserve the domain names so
 * the LLM can interpret them (they're already descriptive).
 */
export function extractWeeklyRatings(
  reflection: WeeklyReflection,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const key of [
    ...WEEKLY_CONTEXT_KEYS,
    ...WEEKLY_STATE_KEYS,
    ...WEEKLY_EVALUATION_KEYS,
  ]) {
    out[key] = reflection[key]
  }
  return out
}

/**
 * Returns a plain `{ key: number | null }` record with just the numeric
 * rating fields for a monthly reflection.
 */
export function extractMonthlyRatings(
  reflection: MonthlyReflection,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const key of MONTHLY_RATING_KEYS) {
    out[key] = reflection[key]
  }
  return out
}

// ---------------------------------------------------------------------------
// Planning snapshot
// ---------------------------------------------------------------------------

export interface PlanningSnapshot {
  activeGoals: Array<{ id: string; title: string; status: string }>
  activeKeyResults: Array<{ id: string; title: string; goalId: string; status: string }>
  activeHabits: Array<{ id: string; title: string; status: string; isActive: boolean }>
  activeTrackers: Array<{ id: string; title: string; status: string; isActive: boolean }>
  /** Bulleted, human-readable summary suitable for dropping straight into a prompt. */
  snapshot: string
}

/**
 * Safe wrapper around a repository `listAll()` call that returns an empty
 * array on error so planning snapshot failures never block profile builds.
 */
async function safeListAll<T>(
  label: string,
  fn: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await fn()
  } catch (err) {
    console.warn(`buildPlanningSnapshot: failed to load ${label}`, err)
    return []
  }
}

function formatBulletSection(title: string, items: string[]): string {
  if (items.length === 0) return ''
  const header = `${title}:`
  const lines = items.map((t) => `- ${t}`)
  return [header, ...lines].join('\n')
}

/**
 * Reads currently-active planning objects from the repositories and returns
 * both a structured view and a bulleted-text snapshot suitable for the
 * `[PLANNING SNAPSHOT]` block of the profile prompt.
 *
 * "Active" rules (matches existing UI filters):
 *   - Goal:     `status === 'open'`
 *   - KeyResult: `status === 'open'`
 *   - Habit:    `status === 'open' && isActive !== false`
 *   - Tracker:  `status === 'open' && isActive !== false`
 */
export async function buildPlanningSnapshot(): Promise<PlanningSnapshot> {
  const [goals, keyResults, habits, trackers] = await Promise.all([
    safeListAll('goals', () => goalDexieRepository.listAll()),
    safeListAll('keyResults', () => keyResultDexieRepository.listAll()),
    safeListAll('habits', () => habitDexieRepository.listAll()),
    safeListAll('trackers', () => trackerDexieRepository.listAll()),
  ])

  const activeGoals = goals
    .filter((g) => g.status === 'open')
    .map((g) => ({ id: g.id, title: g.title, status: g.status }))

  const activeKeyResults = keyResults
    .filter((kr) => kr.status === 'open')
    .map((kr) => ({ id: kr.id, title: kr.title, goalId: kr.goalId, status: kr.status }))

  const activeHabits = habits
    .filter((h) => h.status === 'open' && h.isActive !== false)
    .map((h) => ({ id: h.id, title: h.title, status: h.status, isActive: h.isActive }))

  const activeTrackers = trackers
    .filter((t) => t.status === 'open' && t.isActive !== false)
    .map((t) => ({ id: t.id, title: t.title, status: t.status, isActive: t.isActive }))

  const parts = [
    formatBulletSection(
      'Active goals',
      activeGoals.map((g) => g.title),
    ),
    formatBulletSection(
      'Active key results',
      activeKeyResults.map((kr) => kr.title),
    ),
    formatBulletSection(
      'Active habits',
      activeHabits.map((h) => h.title),
    ),
    formatBulletSection(
      'Active trackers',
      activeTrackers.map((t) => t.title),
    ),
  ].filter((part) => part.length > 0)

  const snapshot = parts.join('\n\n')

  return {
    activeGoals,
    activeKeyResults,
    activeHabits,
    activeTrackers,
    snapshot,
  }
}
