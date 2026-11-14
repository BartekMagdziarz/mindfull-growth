import type { DayRef } from './period'
import type {
  MeasurementCriteria,
  MeasurementCriteriaChange,
  MeasurementCriteriaVersion,
  MeasurementEntryMode,
  PlanningCadence,
} from './planning'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

export const CRITERIA_HISTORY_START = '0001-01-01' as DayRef

export interface CriteriaDefinition extends MeasurementCriteria {
  criteriaVersions?: MeasurementCriteriaVersion[]
  measurementTargetOverride?: MeasurementCriteria['target']
}

export function criteriaSnapshot(subject: MeasurementCriteria): MeasurementCriteria {
  return {
    ...(subject.target !== undefined ? { target: subject.target } : {}),
    multiItems: subject.multiItems,
    multiDailyThreshold: subject.multiDailyThreshold,
    ratingScaleMin: subject.ratingScaleMin,
    ratingScale: subject.ratingScale,
  }
}

export function criteriaSignature(subject: CriteriaDefinition): string {
  return JSON.stringify([criteriaSnapshot(subject), subject.criteriaVersions])
}

/** Labels, icons and ordering do not change whether an execution meets the rules. */
export function criteriaScoringSignature(subject: MeasurementCriteria): string {
  return JSON.stringify({
    target: subject.target,
    items: subject.multiItems
      ?.map(i => ({ id: i.id, weight: i.weight, archived: Boolean(i.archived) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    threshold: subject.multiDailyThreshold,
    ratingScaleMin: subject.ratingScaleMin,
    ratingScale: subject.ratingScale,
  })
}

/** Preview and persistence both retain definitions for referenced checklist IDs. */
export function retainReferencedChecklistItems<T extends CriteriaDefinition>(
  existing: T,
  next: T,
  entries: readonly { checkedItemIds?: string[] }[]
): T {
  if (!next.multiItems) return next
  const referenced = new Set(entries.flatMap(entry => entry.checkedItemIds ?? []))
  const retained = new Set(next.multiItems.map(item => item.id))
  const known = new Map(
    [
      ...(existing.criteriaVersions ?? []).flatMap(v => v.criteria.multiItems ?? []),
      ...(existing.multiItems ?? []),
    ].map(item => [item.id, item])
  )
  return {
    ...next,
    multiItems: [
      ...next.multiItems,
      ...[...known.values()]
        .filter(item => referenced.has(item.id) && !retained.has(item.id))
        .map(item => ({ ...item, archived: true })),
    ],
  }
}

export function resolveMeasurementCriteria<T extends CriteriaDefinition>(
  subject: T,
  day: DayRef
): T {
  const version = [...(subject.criteriaVersions ?? [])].reverse().find(v => v.effectiveFrom <= day)
  const resolved = version ? { ...subject, ...criteriaSnapshot(version.criteria) } : subject
  return subject.measurementTargetOverride
    ? { ...resolved, target: subject.measurementTargetOverride }
    : resolved
}

export function criteriaPeriodStart(cadence: PlanningCadence, day: DayRef): DayRef {
  const refs = getPeriodRefsForDate(day)
  return getPeriodBounds(cadence === 'weekly' ? refs.week : refs.month).start
}

/** Apply a deliberate change to all rules from a boundary onward, including scheduled ones. */
export function changeMeasurementCriteria<
  T extends CriteriaDefinition & {
    entryMode: MeasurementEntryMode
    cadence: PlanningCadence
  },
>(existing: T, next: T, change: MeasurementCriteriaChange): T {
  if (change.expectedSignature && change.expectedSignature !== criteriaSignature(existing)) {
    throw new Error('Criteria changed while editing. Reopen the edit and try again.')
  }
  if (!['all-history', 'from-date'].includes(change.scope))
    throw new Error('Invalid criteria scope')
  const effectiveFrom =
    change.scope === 'all-history' ? CRITERIA_HISTORY_START : change.effectiveFrom
  if (
    !effectiveFrom ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) ||
    !Number.isFinite(Date.parse(effectiveFrom)) ||
    new Date(effectiveFrom).toISOString().slice(0, 10) !== effectiveFrom ||
    (effectiveFrom !== CRITERIA_HISTORY_START &&
      criteriaPeriodStart(existing.cadence, effectiveFrom) !== effectiveFrom)
  ) {
    throw new Error('Choose the first day of a cadence period.')
  }
  const versions = existing.criteriaVersions ?? [
    {
      effectiveFrom: CRITERIA_HISTORY_START,
      criteria: criteriaSnapshot(existing),
      origin: 'legacy' as const,
    },
  ]
  return {
    ...next,
    criteriaVersions: [
      ...versions.filter(v => v.effectiveFrom < effectiveFrom),
      { effectiveFrom, criteria: criteriaSnapshot(next), origin: 'user' },
    ],
  }
}
