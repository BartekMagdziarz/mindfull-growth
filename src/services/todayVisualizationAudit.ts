import type { Habit, KeyResult, Tracker } from '@/domain/planning'

/**
 * A single record flagged by {@link auditMeasurementRecords}. Captures just
 * enough to identify the offending subject (type + id + title) and the reason
 * it violates the Epic 10 chart rule invariants.
 */
export interface InvalidMeasurementRecord {
  subjectType: 'habit' | 'keyResult' | 'tracker'
  subjectId: string
  title: string
  reason: string
}

/**
 * Read-only audit for Today view chart invariants.
 *
 * Epic 10 depends on the rule that `entryMode === 'completion'` always pairs
 * with `target.kind === 'count'`. The normalizer in `src/domain/planning.ts`
 * enforces this on write, but legacy or imported records may have bypassed
 * normalization. This function surfaces those so a developer-facing dev-tools
 * integration (out of scope for Story 1) can display them for manual review.
 *
 * Trackers are accepted in the signature for API symmetry and future-proofing,
 * but they cannot be invalid today: the `Tracker` domain type has no `target`
 * field, so there is nothing to check. Including them keeps call sites that
 * pass all three collections from needing to pre-filter.
 */
export function auditMeasurementRecords(
  habits: Habit[],
  keyResults: KeyResult[],
  trackers: Tracker[],
): InvalidMeasurementRecord[] {
  const invalid: InvalidMeasurementRecord[] = []

  for (const habit of habits) {
    if (habit.entryMode === 'completion' && habit.target.kind !== 'count') {
      invalid.push({
        subjectType: 'habit',
        subjectId: habit.id,
        title: habit.title,
        reason: 'completion entry mode requires count target',
      })
    }
  }

  for (const kr of keyResults) {
    if (kr.entryMode === 'completion' && kr.target.kind !== 'count') {
      invalid.push({
        subjectType: 'keyResult',
        subjectId: kr.id,
        title: kr.title,
        reason: 'completion entry mode requires count target',
      })
    }
  }

  // Tracker has no `target` field in the domain type, so there is nothing to
  // audit. Reference the parameter so linters do not flag it as unused.
  void trackers

  return invalid
}
