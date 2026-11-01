import type { DexieMigration } from './types'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * v23 completion-backfill sources — FROZEN at authoring time (2026-07-05).
 * Dexie upgrades must behave identically forever; never edit this list after
 * ship (new exercises log completions live and need no backfill). A unit test
 * cross-checks it against the exercise catalog.
 *
 * Deliberately absent: `ifsParts` (shared parts registry enriched by many IFS
 * exercises — its rows are not completions; parts-mapping backfills from
 * `ifsPartsMaps`). `lifeAreaAssessments` (wheel-of-life, full assessments
 * only) and `assessmentAttempts` (completed attempts only) are special-cased
 * in the upgrade body.
 */
export const V23_BACKFILL_SOURCES: ReadonlyArray<{
  slug: string
  table: string
  /** Timestamp field to use as `completedAt`; defaults to `createdAt`. */
  timestampField?: 'updatedAt'
}> = [
  { slug: 'values', table: 'valuesDiscoveries' },
  { slug: 'value-map', table: 'valueMaps' },
  { slug: 'shadow-beliefs', table: 'shadowBeliefs' },
  { slug: 'purpose', table: 'transformativePurposes' },
  { slug: 'thought-record', table: 'thoughtRecords' },
  { slug: 'cognitive-distortions', table: 'distortionAssessments' },
  { slug: 'worry-tree', table: 'worryTreeEntries' },
  { slug: 'core-beliefs', table: 'coreBeliefsExplorations' },
  { slug: 'compassionate-letter', table: 'compassionateLetters' },
  // Entries accumulate into an existing log via updates, so the last
  // touch — not the log's creation — is the completion signal.
  { slug: 'positive-data-log', table: 'positiveDataLogs', timestampField: 'updatedAt' },
  { slug: 'behavioral-experiment', table: 'behavioralExperiments' },
  { slug: 'behavioral-activation', table: 'behavioralActivations' },
  { slug: 'structured-problem-solving', table: 'structuredProblemSolvings' },
  { slug: 'graded-exposure', table: 'gradedExposureHierarchies' },
  { slug: 'three-pathways', table: 'threePathwaysToMeaning' },
  { slug: 'socratic-dialogue', table: 'socraticSelfDialogues' },
  { slug: 'mountain-range', table: 'mountainRangesOfMeaning' },
  { slug: 'paradoxical-intention', table: 'paradoxicalIntentionLabs' },
  { slug: 'dereflection', table: 'dereflectionPractices' },
  { slug: 'tragic-optimism', table: 'tragicOptimisms' },
  { slug: 'attitudinal-shift', table: 'attitudinalShifts' },
  { slug: 'legacy-letter', table: 'legacyLetters' },
  { slug: 'parts-mapping', table: 'ifsPartsMaps' },
  { slug: 'unblending', table: 'ifsUnblendingSessions' },
  { slug: 'direct-access', table: 'ifsDirectAccessSessions' },
  { slug: 'trailhead', table: 'ifsTrailheadEntries' },
  { slug: 'protector-appreciation', table: 'ifsProtectorAppreciations' },
  { slug: 'exile-witnessing', table: 'ifsExileWitnessings' },
  { slug: 'self-energy', table: 'ifsSelfEnergyCheckIns' },
  { slug: 'parts-dialogue', table: 'ifsPartsDialogues' },
  { slug: 'daily-ifs-checkin', table: 'ifsDailyCheckIns' },
  { slug: 'constellation', table: 'ifsConstellations' },
]

// Exercise scheduling Phase 1 (docs/exercise-scheduling-design.md §4.2/§5):
// unified completion log + micro-exercise entries. The upgrade backfills one
// completion per historical exercise record so "what was completed when" is
// a single indexed query instead of loading 30+ stores. Fresh databases
// (new users, verification seeds) skip the upgrade entirely.
export const v23: DexieMigration = {
  version: 23,
  stores: {
    exerciseCompletions: 'id, exerciseSlug, dayRef, completedAt',
    microExerciseEntries: 'id, exerciseSlug, createdAt',
  },
  upgrade: async trans => {
    const rows: ExerciseCompletion[] = []
    const addRow = (slug: string, timestamp: unknown, recordId: unknown) => {
      // Defensive per-record skips: a malformed row must not strand the
      // user at a failed DB open.
      if (typeof timestamp !== 'string' || timestamp.length === 0) return
      const date = new Date(timestamp)
      if (Number.isNaN(date.getTime())) return
      rows.push({
        id: crypto.randomUUID(),
        exerciseSlug: slug,
        dayRef: getPeriodRefsForDate(date).day,
        completedAt: timestamp,
        recordId: typeof recordId === 'string' ? recordId : undefined,
        source: 'standalone',
      })
    }

    for (const source of V23_BACKFILL_SOURCES) {
      for (const record of await trans.table(source.table).toArray()) {
        addRow(source.slug, record[source.timestampField ?? 'createdAt'], record.id)
      }
    }

    // Wheel of Life shares `lifeAreaAssessments` with per-life-area
    // partials — only full assessments count as exercise completions.
    for (const assessment of await trans.table('lifeAreaAssessments').toArray()) {
      if (assessment.scope === 'full') {
        addRow('wheel-of-life', assessment.createdAt, assessment.id)
      }
    }

    // Psychometric assessments: completed attempts only; slug = assessmentId.
    for (const attempt of await trans.table('assessmentAttempts').toArray()) {
      if (attempt.status === 'completed') {
        addRow(attempt.assessmentId, attempt.completedAt ?? attempt.updatedAt, attempt.id)
      }
    }

    await trans.table('exerciseCompletions').bulkAdd(rows)
  },
}
