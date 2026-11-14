import type { UserDatabase } from '@/services/userDatabaseService'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { MeasurementCriteriaChange } from '@/domain/planning'
import type { MeasureableSubject } from '@/services/measurementProgress'
import {
  changeMeasurementCriteria,
  criteriaScoringSignature,
  retainReferencedChecklistItems,
} from '@/domain/measurementCriteria'

/** Called inside the same transaction as the object write and execution read. */
export async function prepareMeasurementUpdate<
  T extends MeasureableSubject,
  P extends {
    entryMode?: T['entryMode']
    cadence?: T['cadence']
    criteriaChange?: MeasurementCriteriaChange
    criteriaVersions?: T['criteriaVersions']
  },
>(
  db: UserDatabase,
  subjectType: MeasurementSubjectType,
  existing: T,
  data: P,
  normalize: (data: P, existing: T) => Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  if (
    data.criteriaVersions !== undefined &&
    JSON.stringify(data.criteriaVersions) !== JSON.stringify(existing.criteriaVersions)
  )
    throw new Error('Criteria history is managed through scoped edits.')
  const entries = await db.dailyMeasurementEntries
    .where('[subjectType+subjectId]')
    .equals([subjectType, existing.id])
    .toArray()
  const hasEntries = entries.length > 0
  const shapeChanged =
    (data.entryMode !== undefined && data.entryMode !== existing.entryMode) ||
    (data.cadence !== undefined && data.cadence !== existing.cadence)
  if (hasEntries && shapeChanged) {
    throw new Error(
      'The entry mode and cadence cannot change after executions have been recorded. Create a new object instead.'
    )
  }
  const normalized = normalize(
    data,
    shapeChanged ? { ...existing, criteriaVersions: undefined } : existing
  )
  const next = retainReferencedChecklistItems(existing, { ...existing, ...normalized }, entries)
  normalized.multiItems = next.multiItems
  if (
    !data.criteriaChange &&
    criteriaScoringSignature(existing) === criteriaScoringSignature(next)
  ) {
    // Cosmetic edits stay immediate, including in date-resolved controls.
    const presentation = new Map(
      (next.multiItems ?? []).map((item, index) => [item.id, { item, index }])
    )
    return {
      ...normalized,
      criteriaVersions: normalized.criteriaVersions?.map(version => ({
        ...version,
        criteria: {
          ...version.criteria,
          multiItems: version.criteria.multiItems
            ?.map(item => {
              const current = presentation.get(item.id)?.item
              return current ? { ...item, label: current.label, icon: current.icon } : item
            })
            .sort(
              (a, b) =>
                (presentation.get(a.id)?.index ?? Infinity) -
                (presentation.get(b.id)?.index ?? Infinity)
            ),
        },
      })),
    }
  }
  if (!hasEntries && !existing.criteriaVersions) return normalized
  if (!data.criteriaChange) throw new Error('Choose when the new criteria should apply.')
  return changeMeasurementCriteria(existing, next, data.criteriaChange)
}
