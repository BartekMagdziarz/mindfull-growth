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

  function auditTargeted(
    subjectType: 'habit' | 'keyResult',
    subject: Habit | KeyResult,
  ): void {
    if (subject.entryMode === 'completion' && subject.target.kind !== 'count') {
      invalid.push({
        subjectType,
        subjectId: subject.id,
        title: subject.title,
        reason: 'completion entry mode requires count target',
      })
    }
    if (subject.entryMode === 'completion' && subject.target.entryDays) {
      invalid.push({
        subjectType,
        subjectId: subject.id,
        title: subject.title,
        reason: 'completion entry mode must not carry an entryDays condition',
      })
    }
    if (subject.entryMode === 'multi-completion' && subject.target.kind !== 'count') {
      invalid.push({
        subjectType,
        subjectId: subject.id,
        title: subject.title,
        reason: 'multi-completion entry mode requires count target',
      })
    }
    if (
      subject.entryMode === 'multi-completion' &&
      !subject.multiItems?.some((item) => !item.archived)
    ) {
      invalid.push({
        subjectType,
        subjectId: subject.id,
        title: subject.title,
        reason: 'multi-completion entry mode requires at least one active item',
      })
    }
  }

  for (const habit of habits) {
    auditTargeted('habit', habit)
  }

  for (const kr of keyResults) {
    auditTargeted('keyResult', kr)
  }

  // Trackers have no `target`, but the multi-completion item invariant applies.
  for (const tracker of trackers) {
    if (
      tracker.entryMode === 'multi-completion' &&
      !tracker.multiItems?.some((item) => !item.archived)
    ) {
      invalid.push({
        subjectType: 'tracker',
        subjectId: tracker.id,
        title: tracker.title,
        reason: 'multi-completion entry mode requires at least one active item',
      })
    }
  }

  return invalid
}
