/**
 * Week series of load/state pairs per life area, built from stored weekly
 * reflections through the reflection matrix (the only place that knows field
 * names). A week without a reflection is a gap (`null` pair), not a 3·3.
 */

import type { WeekRef } from '@/domain/period'
import type { WeeklyReflection } from '@/domain/reflection'
import { REFLECTION_MATRIX_AREAS, type LifeAreaKey, type ReflectionMatrixArea } from '@/domain/reflectionMatrix'
import { toRating, type LoadStatePair } from '@/domain/loadState'
import { getPeriodBounds, getPreviousPeriod } from '@/utils/periods'

export interface WeekPoint extends LoadStatePair {
  weekRef: WeekRef
  /** Short axis label — the Monday as `d.MM`. */
  label: string
}

export type AreaSeries = Record<LifeAreaKey, WeekPoint[]>

type RatingSource = Partial<Pick<WeeklyReflection, ReflectionMatrixArea['fields'][keyof ReflectionMatrixArea['fields']]>>

/** load ← matrix `demands` field, state ← matrix `state` field. */
export function reflectionToPair(reflection: RatingSource | null | undefined, area: LifeAreaKey): LoadStatePair {
  const def = REFLECTION_MATRIX_AREAS.find(a => a.key === area)
  if (!def || !reflection) return { load: null, state: null }
  return {
    load: toRating(reflection[def.fields.demands] ?? null),
    state: toRating(reflection[def.fields.state] ?? null),
  }
}

/** All four areas for one reflection (or gaps when missing). */
export function reflectionToPairs(reflection: RatingSource | null | undefined): Record<LifeAreaKey, LoadStatePair> {
  return Object.fromEntries(REFLECTION_MATRIX_AREAS.map(a => [a.key, reflectionToPair(reflection, a.key)])) as Record<LifeAreaKey, LoadStatePair>
}

/** `d.MM` of the week's Monday, e.g. "7.09". */
export function weekPointLabel(weekRef: WeekRef): string {
  const start = getPeriodBounds(weekRef).start
  const [, month, day] = start.split('-')
  return `${Number(day)}.${month}`
}

/** `count` consecutive week refs ending at `last` (inclusive), oldest first. */
export function trailingWeekRefs(last: WeekRef, count: number): WeekRef[] {
  const refs: WeekRef[] = []
  let cursor = last
  for (let i = 0; i < count; i++) {
    refs.unshift(cursor)
    cursor = getPreviousPeriod(cursor) as WeekRef
  }
  return refs
}

/**
 * Series per area over `weekRefs` (in the given order). Reflections are matched
 * by `weekRef`; missing weeks become gaps.
 */
export function buildAreaSeries(reflections: readonly (RatingSource & { weekRef: WeekRef })[], weekRefs: readonly WeekRef[]): AreaSeries {
  const byWeek = new Map(reflections.map(r => [r.weekRef, r]))
  return Object.fromEntries(
    REFLECTION_MATRIX_AREAS.map(area => [
      area.key,
      weekRefs.map(weekRef => ({ weekRef, label: weekPointLabel(weekRef), ...reflectionToPair(byWeek.get(weekRef), area.key) })),
    ]),
  ) as AreaSeries
}
