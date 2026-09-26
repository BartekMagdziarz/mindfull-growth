/**
 * Momenty — read helpers over `moments` micro entries (one universal
 * moment log with a `kind`; paths log through the `moment-<kind>`
 * variants). Pure, so views, the weekly reflection and tests share them.
 *
 * Plan: ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §6.
 */

import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef, WeekRef } from '@/domain/period'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

export const MOMENTS_SLUG = 'moments'

export type MomentKind = 'shame' | 'anger' | 'anxiety' | 'other'

export function isMoment(entry: MicroExerciseEntry, kind?: MomentKind): boolean {
  if (entry.exerciseSlug !== MOMENTS_SLUG) return false
  return kind === undefined || entry.responses.kind === kind
}

/** A moment that actually happened (not a calm-day note). */
export function hadMoment(entry: MicroExerciseEntry): boolean {
  return entry.responses.hadMoment === 'yes'
}

/** Local day of the entry — a 23:30 moment belongs to the user's day. */
export function momentDayRef(entry: MicroExerciseEntry): DayRef {
  return getPeriodRefsForDate(new Date(entry.createdAt)).day
}

/** Moments of `kind` whose local day falls in `weekRef`, newest first. */
export function momentsInWeek(
  entries: readonly MicroExerciseEntry[],
  kind: MomentKind,
  weekRef: WeekRef,
): MicroExerciseEntry[] {
  const { start, end } = getPeriodBounds(weekRef)
  return entries
    .filter((entry) => isMoment(entry, kind))
    .filter((entry) => {
      const day = momentDayRef(entry)
      return day >= start && day <= end
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Moments of `kind` from the last `days` days (today included), newest first. */
export function recentMoments(
  entries: readonly MicroExerciseEntry[],
  kind: MomentKind,
  days: number,
  now: Date = new Date(),
): MicroExerciseEntry[] {
  const cutoff = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  const cutoffDay = getPeriodRefsForDate(cutoff).day
  return entries
    .filter((entry) => isMoment(entry, kind) && momentDayRef(entry) >= cutoffDay)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface MomentsSummary {
  /** Entries with a moment. */
  moments: number
  /** Calm-day notes. */
  quiet: number
  /** Counts per option of a choice step (e.g. `about`, `compass`, `response`). */
  counts: Record<string, Record<string, number>>
  /** Newest first. */
  recent: MicroExerciseEntry[]
}

/** Distribution of a kind's moments over the given entries. */
export function summarizeMoments(
  entries: readonly MicroExerciseEntry[],
  kind: MomentKind,
  steps: readonly string[] = ['about', 'compass', 'response'],
  recentLimit = 5,
): MomentsSummary {
  const sorted = entries.filter((entry) => isMoment(entry, kind)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const counts: Record<string, Record<string, number>> = Object.fromEntries(steps.map((step) => [step, {}]))
  let moments = 0
  let quiet = 0
  for (const entry of sorted) {
    if (!hadMoment(entry)) {
      quiet += 1
      continue
    }
    moments += 1
    for (const step of steps) {
      const value = entry.responses[step]
      const picked = typeof value === 'string' ? [value] : Array.isArray(value) ? value : []
      for (const option of picked) {
        if (typeof option !== 'string') continue
        counts[step]![option] = (counts[step]![option] ?? 0) + 1
      }
    }
  }
  return { moments, quiet, counts, recent: sorted.filter(hadMoment).slice(0, recentLimit) }
}
