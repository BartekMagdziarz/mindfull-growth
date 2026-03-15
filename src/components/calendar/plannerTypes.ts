import type { MeasurementTarget } from '@/domain/planning'
import type { DayRef, WeekRef } from '@/domain/period'
import type { MeasurementMonthState, MeasurementWeekState } from '@/domain/planningState'

export type SubjectKind = 'keyResult' | 'habit' | 'tracker'
export type EditableSubjectKind = 'keyResult' | 'habit'

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
  weekScopeByRef: Partial<Record<string, MeasurementWeekState['scheduleScope']>>
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

export interface PlannerWeekDay {
  dayRef: DayRef
  label: string
  inMonth: boolean
  monthLabel: string
  items: CalendarAssignmentItem[]
}

export interface PlannerWeek {
  weekRef: WeekRef
  label: string
  days: PlannerWeekDay[]
}

export interface CalendarAssignmentItem {
  key: string
  title: string
  icon?: string
  subjectType: SubjectKind
  isActiveAssignment: boolean
}

export interface ActiveAssignment {
  subjectType: SubjectKind
  subjectId: string
  cadence: 'weekly' | 'monthly'
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
