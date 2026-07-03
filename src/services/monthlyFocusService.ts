import type { MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import { getChildPeriods } from '@/utils/periods'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'

/**
 * M4 — weekly↔monthly focus confrontation.
 *
 * Rolls a month's *weekly* top-3 picks up by *priority* so monthly reflection can confront the
 * start-of-month plan (the month's top-3 Priorities) with what actually mattered week to week.
 * A pick links to a priority via the object: habit/tracker → `priorityIds`; keyResult → its goal's
 * `priorityIds`; weeklyIntention → `priorityIds` (M5a). Picks that link to no *active* month
 * priority (or to none at all) land in `drift` — a first-class signal, not noise.
 */

/** A weekly top-3 pick already resolved to its object title + linked priorities. */
export interface ResolvedPick {
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  /** Linked priority ids (KR resolved via goal); `[]` = unlinked. */
  priorityIds: string[]
}

/** A distinct object that was a weekly top-3 pick, with the weeks it was picked. */
export interface WeeklyFocusObject {
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  weekRefs: WeekRef[]
}

export interface PriorityWeeklyFocus {
  priorityId: string
  /** Distinct weeks (in month order) where ≥1 weekly pick linked to this priority. */
  focusWeekRefs: WeekRef[]
  objects: WeeklyFocusObject[]
}

export interface DriftPick {
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  weekRefs: WeekRef[]
  /** true = the object has no priority link at all; false = linked, but to no active month priority. */
  unlinked: boolean
}

export interface MonthlyFocusConfrontation {
  /** The month's child weeks (denominator context for "focus N / W"). */
  weekRefs: WeekRef[]
  /** One entry per active priority passed in, in the same order. */
  perPriority: PriorityWeeklyFocus[]
  /** Weekly picks that didn't land on any active month priority (off-plan / unlinked). */
  drift: DriftPick[]
}

/**
 * Pure roll-up: given the month's weeks, the resolved picks per week, and the active priority
 * ids shown in the reflection step, produce the per-priority focus + the drift bucket.
 */
export function computeMonthlyFocus(
  weekRefs: WeekRef[],
  picksByWeek: Map<WeekRef, ResolvedPick[]>,
  activePriorityIds: string[],
): MonthlyFocusConfrontation {
  const activeSet = new Set(activePriorityIds)
  const buckets = new Map<string, { focus: Set<WeekRef>; objects: Map<string, WeeklyFocusObject> }>()
  for (const id of activePriorityIds) buckets.set(id, { focus: new Set(), objects: new Map() })
  const driftByKey = new Map<string, DriftPick>()

  for (const weekRef of weekRefs) {
    for (const pick of picksByWeek.get(weekRef) ?? []) {
      const key = `${pick.subjectType}:${pick.subjectId}`
      const linkedActive = pick.priorityIds.filter((pid) => activeSet.has(pid))

      if (linkedActive.length > 0) {
        for (const pid of linkedActive) {
          const bucket = buckets.get(pid)!
          bucket.focus.add(weekRef)
          const obj =
            bucket.objects.get(key) ??
            { subjectType: pick.subjectType, subjectId: pick.subjectId, title: pick.title, weekRefs: [] }
          if (!obj.weekRefs.includes(weekRef)) obj.weekRefs.push(weekRef)
          bucket.objects.set(key, obj)
        }
        continue
      }

      // Drift: linked to no active priority (off-plan), or unlinked entirely.
      const existing = driftByKey.get(key)
      const drift: DriftPick =
        existing ??
        { subjectType: pick.subjectType, subjectId: pick.subjectId, title: pick.title, weekRefs: [], unlinked: true }
      if (!drift.weekRefs.includes(weekRef)) drift.weekRefs.push(weekRef)
      // "unlinked" only if every occurrence has no link at all.
      drift.unlinked = drift.unlinked && pick.priorityIds.length === 0
      driftByKey.set(key, drift)
    }
  }

  const perPriority: PriorityWeeklyFocus[] = activePriorityIds.map((pid) => {
    const bucket = buckets.get(pid)!
    return {
      priorityId: pid,
      focusWeekRefs: weekRefs.filter((w) => bucket.focus.has(w)),
      objects: [...bucket.objects.values()],
    }
  })

  return { weekRefs, perPriority, drift: [...driftByKey.values()] }
}

/**
 * Load + resolve a month's weekly top-3 picks and roll them up by priority. `activePriorityIds`
 * are the priorities shown in the monthly reflection step (the rows the focus attaches to).
 */
export async function getMonthlyFocusConfrontation(
  monthRef: MonthRef,
  activePriorityIds: string[],
): Promise<MonthlyFocusConfrontation> {
  const weekRefs = getChildPeriods(monthRef)
  const [weekPlans, keyResults, habits, trackers, intentions, goals] = await Promise.all([
    periodPlanDexieRepository.listWeekPlans(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    weeklyIntentionDexieRepository.listAll(),
    goalDexieRepository.listAll(),
  ])

  const weekSet = new Set<WeekRef>(weekRefs)
  const planByWeek = new Map(weekPlans.filter((p) => weekSet.has(p.weekRef)).map((p) => [p.weekRef, p]))
  const krById = new Map(keyResults.map((k) => [k.id, k]))
  const habitById = new Map(habits.map((h) => [h.id, h]))
  const trackerById = new Map(trackers.map((t) => [t.id, t]))
  const intentionById = new Map(intentions.map((i) => [i.id, i]))
  const goalById = new Map(goals.map((g) => [g.id, g]))

  function resolve(ref: WeekTopPriorityRef): ResolvedPick | null {
    switch (ref.subjectType) {
      case 'habit': {
        const h = habitById.get(ref.subjectId)
        return h ? { subjectType: 'habit', subjectId: ref.subjectId, title: h.title, priorityIds: h.priorityIds ?? [] } : null
      }
      case 'tracker': {
        const t = trackerById.get(ref.subjectId)
        return t ? { subjectType: 'tracker', subjectId: ref.subjectId, title: t.title, priorityIds: t.priorityIds ?? [] } : null
      }
      case 'keyResult': {
        const k = krById.get(ref.subjectId)
        if (!k) return null
        const g = goalById.get(k.goalId)
        return { subjectType: 'keyResult', subjectId: ref.subjectId, title: k.title, priorityIds: g?.priorityIds ?? [] }
      }
      case 'weeklyIntention': {
        const i = intentionById.get(ref.subjectId)
        return i ? { subjectType: 'weeklyIntention', subjectId: ref.subjectId, title: i.title, priorityIds: i.priorityIds ?? [] } : null
      }
      default:
        return null
    }
  }

  const picksByWeek = new Map<WeekRef, ResolvedPick[]>()
  for (const weekRef of weekRefs) {
    const refs = planByWeek.get(weekRef)?.topPriorities ?? []
    picksByWeek.set(weekRef, refs.map(resolve).filter((p): p is ResolvedPick => p !== null))
  }

  return computeMonthlyFocus(weekRefs, picksByWeek, activePriorityIds)
}
