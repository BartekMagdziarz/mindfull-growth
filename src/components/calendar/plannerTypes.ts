import type { MeasurementTarget } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementMonthState, MeasurementWeekState } from '@/domain/planningState'

export type SubjectKind = 'keyResult' | 'habit' | 'tracker'
export type EditableSubjectKind = 'keyResult' | 'habit'
export type PlannerPlacementMode = 'weeks' | 'days'
export type PlannerPlacementStatus = 'inactive' | 'needs-planning' | 'planned'
export type PlannerPlacementEditState = 'idle' | 'pick-weeks' | 'pick-days'

export interface PlannerMeasurementRow {
  id: string
  title: string
  description?: string
  icon?: string
  subjectType: SubjectKind
  cadence: 'weekly' | 'monthly'
  target?: MeasurementTarget
  targetOverride?: MeasurementTarget
  goalId?: string
  isActive: boolean
  monthScheduleScope?: MeasurementMonthState['scheduleScope']
  /** Month the governing month state belongs to (weekly planner: parent-month preferred). */
  monthStateRef?: MonthRef
  weekScopeByRef: Partial<Record<string, MeasurementWeekState['scheduleScope']>>
  weekTargetOverrideByRef: Partial<Record<string, MeasurementTarget>>
  scheduledDayRefs: DayRef[]
}

export interface GoalSection {
  id: string
  title: string
  description?: string
  icon?: string
  isActive: boolean
  keyResults: PlannerMeasurementRow[]
}

/** One day card of the weekly planner's day-assignment step. */
export interface PlannerWeekDay {
  dayRef: DayRef
  label: string
  inMonth: boolean
  monthLabel: string
  items: CalendarAssignmentItem[]
}

export interface PlannerMonthWeekDayBadge {
  count: number
  /** Short weekday names of the scheduled days, e.g. "wt, czw, sob". */
  days: string
}

/** One row of the month planner's week grid. */
export interface PlannerMonthWeekRow {
  weekRef: WeekRef
  /** Week number, e.g. "10". */
  label: string
  /** Localized date range, e.g. "9–15 mar". */
  rangeLabel: string
  /** Week overlaps the adjacent month. */
  isBoundary: boolean
  /** Idle mode: objects placed in this week. Empty while an assignment is active. */
  chips: CalendarAssignmentItem[]
  /** Active assignment row's schedule scope in this week. */
  assignmentScope?: MeasurementWeekState['scheduleScope']
  /** Active row counts as assigned here (explicit placement, scheduled days, or whole-month). */
  isAssignedInWeek: boolean
  /** Active monthly-cadence row covers this week via its whole-month placement. */
  viaWholeMonth: boolean
  /** Read-only summary of the active row's day assignments in this week (edited in the weekly ritual). */
  dayBadge?: PlannerMonthWeekDayBadge
  /** The active row's explicit sub-target for this week. */
  weekTargetOverride?: MeasurementTarget
  /** week override → month override → base target. */
  effectiveTarget?: MeasurementTarget
  /** Sub-target pill is offered only on explicitly placed weeks of a non-tracker row. */
  canEditTarget: boolean
}

/** Soft "rozpisane X z Y" indicator inputs for the active monthly-cadence row. */
export interface PlannerWeekTargetSummary {
  assigned: number
  total: number
}

export interface CalendarAssignmentItem {
  key: string
  title: string
  icon?: string
  subjectType: SubjectKind
  isActiveAssignment: boolean
  /** Used to group items sharing the same icon (e.g. KRs from the same goal) */
  groupKey?: string
}

/** An icon-collapsed group: one icon representing 1+ items */
export interface CollapsedIconItem {
  key: string
  title: string
  icon?: string
  subjectType: SubjectKind
  isActiveAssignment: boolean
  count: number
}

export interface ActiveAssignment {
  subjectType: SubjectKind
  subjectId: string
  cadence: 'weekly' | 'monthly'
  mode: PlannerPlacementMode
}

export interface PlannerDisplayRow extends PlannerMeasurementRow {
  placementStatus: PlannerPlacementStatus
  placementEditState: PlannerPlacementEditState
  placementSummary: string | null
  isWholePeriod: boolean
}

export interface PlannerSectionRows {
  id: string
  label: string
  needsPlanning: PlannerDisplayRow[]
  planned: PlannerDisplayRow[]
}

export interface PlannerInitiativeRow {
  id: string
  title: string
  description?: string
  goalId?: string
  goalTitle?: string
  isPlannedThisWeek: boolean
  assignedDayRefs: DayRef[]
}
