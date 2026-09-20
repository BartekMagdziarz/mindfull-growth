import type { DayRef, MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { MeasurementTarget, MultiCompletionItem } from '@/domain/planning'
import type { MeasurementSubjectType, PriorityVerdict } from '@/domain/planningState'

/**
 * Read model of the rhythm calendar: everything the pure projections in
 * `rhythmProjections.ts` need, in one flat, already-joined shape.
 *
 * It exists because the projections were designed in the UX Lab against an
 * explicit fixture; keeping that shape means the calendar's reading of the data
 * (marks, sums, focus, completion) is the same code the Lab validated, and the
 * only production-specific part is the loader in `rhythmScenarioLoader.ts`.
 */

export type RhythmTarget = MeasurementTarget
export type RhythmFamily = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'intention'
export type RhythmEvidenceRole = 'action' | 'observation'

export interface RhythmPriority {
  key: string
  title: string
  /** Material Symbols name. */
  icon: string
  status: 'active' | 'paused' | 'closed' | 'draft'
  desiredDirection?: string
}

export interface RhythmObject {
  /** `${subjectType}:${id}` for measurables, `goal:${id}` for the container. */
  key: string
  title: string
  family: RhythmFamily
  /** Key result → its parent goal (priorities are inherited from it). */
  goalKey?: string
  priorityKeys: string[]
  entryMode: 'completion' | 'counter' | 'value' | 'rating' | 'multi-completion'
  cadence: 'weekly' | 'monthly'
  target?: RhythmTarget
  /** Unit label for read-outs; the product does not store one yet. */
  unit?: string
  evidenceRole: RhythmEvidenceRole
  ratingScale?: { min: number; max: number }
  multiItems?: MultiCompletionItem[]
  multiThreshold?: number
  /** Weekly intentions live only in their own week. */
  weekRef?: WeekRef
  icon?: string
  status?: 'open' | 'retired'
  subjectType?: MeasurementSubjectType
  subjectId?: string
}

export type RhythmAssignmentScope =
  | { kind: 'day'; ref: DayRef }
  | { kind: 'week'; ref: WeekRef }
  | { kind: 'month'; ref: MonthRef }

export interface RhythmAssignment {
  id: string
  objectKey: string
  scope: RhythmAssignmentScope
  /** The product has no cancelled placement; kept so the projections stay identical. */
  cancelled?: boolean
}

export interface RhythmEntry {
  id: string
  objectKey: string
  dayRef: DayRef
  /** 0 is a recorded zero; undefined = no value (completion / multi-completion). */
  value?: number
  checkedItemIds?: string[]
  /** The product has no explicit "skipped" entry. */
  skipped?: boolean
}

export interface RhythmTargetOverride {
  objectKey: string
  scope: { kind: 'week'; ref: WeekRef } | { kind: 'month'; ref: MonthRef }
  target: RhythmTarget
}

export interface RhythmWeeklyReflection {
  weekRef: WeekRef
  status: 'done' | 'draft'
  /**
   * Body · Emotions · Tasks · Close ones, 1–5 — the two axes of the reflection
   * (D10): load is the matrix `demands` field, state the matrix `state` field.
   * The historical `actions` column is not projected into the calendar.
   */
  load: (number | null)[]
  state: (number | null)[]
  anchors: { good: string; hard: string; lessons: string }
}

export interface RhythmMonthlyReflection {
  monthRef: MonthRef
  status: 'done' | 'draft'
  /** Balance · Purpose · Growth · Coherence · Agency, 1–5. */
  compass: (number | null)[]
  anchors: { proud: string; challenges: string; growth: string }
  priorityVerdicts: { priorityKey: string; effort: number | null; verdict: PriorityVerdict | '' }[]
}

export interface RhythmJournalRecord {
  id: string
  dayRef: DayRef
  time: string
  title?: string
  excerpt: string
  emotionWords: string[]
  tagCount: number
}

export interface RhythmEmotionRecord {
  id: string
  dayRef: DayRef
  time: string
  words: { label: string; intensity: number }[]
  pleasant: boolean
  note?: string
}

export interface RhythmExerciseRecord {
  id: string
  dayRef: DayRef
  title: string
  programStep?: string
}

export interface RhythmMonthPlan {
  monthRef: MonthRef
  topPriorityKeys: string[]
}

export interface RhythmWeekPlan {
  weekRef: WeekRef
  topObjectKeys: string[]
}

export interface RhythmYearPlan {
  yearRef: YearRef
  motif: string
  narrative: string
  topPriorityKeys: string[]
}

export interface RhythmScenario {
  /** Today. */
  clock: DayRef
  priorities: RhythmPriority[]
  objects: RhythmObject[]
  assignments: RhythmAssignment[]
  entries: RhythmEntry[]
  overrides: RhythmTargetOverride[]
  weeklyReflections: RhythmWeeklyReflection[]
  monthlyReflections: RhythmMonthlyReflection[]
  journal: RhythmJournalRecord[]
  emotions: RhythmEmotionRecord[]
  exercises: RhythmExerciseRecord[]
  monthPlans: RhythmMonthPlan[]
  weekPlans: RhythmWeekPlan[]
  yearPlans?: RhythmYearPlan[]
}

export function emptyRhythmScenario(clock: DayRef): RhythmScenario {
  return {
    clock,
    priorities: [],
    objects: [],
    assignments: [],
    entries: [],
    overrides: [],
    weeklyReflections: [],
    monthlyReflections: [],
    journal: [],
    emotions: [],
    exercises: [],
    monthPlans: [],
    weekPlans: [],
    yearPlans: [],
  }
}
