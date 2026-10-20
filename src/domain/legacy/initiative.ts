import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { GoalStatus, PlanningObjectBase } from '@/domain/planning'
import type { PlanningStateRecordBase } from '@/domain/planningState'

/**
 * Table shapes of the dormant initiative entity.
 *
 * Initiatives were replaced by weekly intentions in July 2026 and their code
 * paths were removed on 2026-10-20 (backlog P-6). The Dexie tables
 * `initiatives` and `initiativePlanStates` and every migration that touches
 * them stay, so existing user databases keep opening — these types exist only
 * to keep that schema typed. Nothing reads or writes the records any more.
 */
export type InitiativeStatus = GoalStatus

export interface Initiative extends PlanningObjectBase {
  goalId?: string
  icon?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  status: InitiativeStatus
}

export interface InitiativePlanState extends PlanningStateRecordBase {
  initiativeId: string
  monthRef?: MonthRef
  weekRef?: WeekRef
  dayRef?: DayRef
}

/**
 * Subject type persisted by priority links, Today hidden rows and period
 * object reflections written while initiatives existed. Readers tolerate the
 * value; the writable subject-type unions no longer contain it.
 */
export type LegacyInitiativeSubjectType = 'initiative'

export function isLegacyInitiativeSubjectType(
  value: unknown
): value is LegacyInitiativeSubjectType {
  return value === 'initiative'
}
