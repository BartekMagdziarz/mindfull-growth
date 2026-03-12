import type {
  Goal,
  GoalStatus,
  Habit,
  HabitStatus,
  Initiative,
  InitiativeStatus,
  KeyResult,
  KeyResultStatus,
  Tracker,
  TrackerStatus,
} from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'

export interface PlanningObjectFilters<TStatus extends string = never> {
  isActive?: boolean
  status?: TStatus
}

export interface InitiativeLinkRef {
  type: 'goal' | 'priority' | 'lifeArea'
  id: string
}

function matchesIsActiveFilter<T extends { isActive: boolean }>(
  object: T,
  filters: Pick<PlanningObjectFilters, 'isActive'>,
): boolean {
  return filters.isActive === undefined || object.isActive === filters.isActive
}

function matchesStatusFilter<T extends { status: string }, TStatus extends string>(
  object: T,
  filters: Pick<PlanningObjectFilters<TStatus>, 'status'>,
): boolean {
  return filters.status === undefined || object.status === filters.status
}

export async function listGoalsByPriority(
  priorityId: string,
  filters: PlanningObjectFilters<GoalStatus> = {},
): Promise<Goal[]> {
  const goals = await goalDexieRepository.listAll()
  return goals.filter(
    (goal) =>
      goal.priorityIds.includes(priorityId) &&
      matchesIsActiveFilter(goal, filters) &&
      matchesStatusFilter(goal, filters),
  )
}

export async function listGoalsByLifeArea(
  lifeAreaId: string,
  filters: PlanningObjectFilters<GoalStatus> = {},
): Promise<Goal[]> {
  const goals = await goalDexieRepository.listAll()
  return goals.filter(
    (goal) =>
      goal.lifeAreaIds.includes(lifeAreaId) &&
      matchesIsActiveFilter(goal, filters) &&
      matchesStatusFilter(goal, filters),
  )
}

export async function listKeyResultsByGoal(
  goalId: string,
  filters: PlanningObjectFilters<KeyResultStatus> = {},
): Promise<KeyResult[]> {
  const keyResults = await keyResultDexieRepository.listAll()
  return keyResults.filter(
    (keyResult) =>
      keyResult.goalId === goalId &&
      matchesIsActiveFilter(keyResult, filters) &&
      matchesStatusFilter(keyResult, filters),
  )
}

export async function listHabitsByPriority(
  priorityId: string,
  filters: PlanningObjectFilters<HabitStatus> = {},
): Promise<Habit[]> {
  const habits = await habitDexieRepository.listAll()
  return habits.filter(
    (habit) =>
      habit.priorityIds.includes(priorityId) &&
      matchesIsActiveFilter(habit, filters) &&
      matchesStatusFilter(habit, filters),
  )
}

export async function listHabitsByLifeArea(
  lifeAreaId: string,
  filters: PlanningObjectFilters<HabitStatus> = {},
): Promise<Habit[]> {
  const habits = await habitDexieRepository.listAll()
  return habits.filter(
    (habit) =>
      habit.lifeAreaIds.includes(lifeAreaId) &&
      matchesIsActiveFilter(habit, filters) &&
      matchesStatusFilter(habit, filters),
  )
}

export async function listTrackersByPriority(
  priorityId: string,
  filters: PlanningObjectFilters<TrackerStatus> = {},
): Promise<Tracker[]> {
  const trackers = await trackerDexieRepository.listAll()
  return trackers.filter(
    (tracker) =>
      tracker.priorityIds.includes(priorityId) &&
      matchesIsActiveFilter(tracker, filters) &&
      matchesStatusFilter(tracker, filters),
  )
}

export async function listTrackersByLifeArea(
  lifeAreaId: string,
  filters: PlanningObjectFilters<TrackerStatus> = {},
): Promise<Tracker[]> {
  const trackers = await trackerDexieRepository.listAll()
  return trackers.filter(
    (tracker) =>
      tracker.lifeAreaIds.includes(lifeAreaId) &&
      matchesIsActiveFilter(tracker, filters) &&
      matchesStatusFilter(tracker, filters),
  )
}

export async function listInitiativesByGoal(
  goalId: string,
  filters: PlanningObjectFilters<InitiativeStatus> = {},
): Promise<Initiative[]> {
  return listInitiativesByLink({ type: 'goal', id: goalId }, filters)
}

export async function listInitiativesByPriority(
  priorityId: string,
  filters: PlanningObjectFilters<InitiativeStatus> = {},
): Promise<Initiative[]> {
  return listInitiativesByLink({ type: 'priority', id: priorityId }, filters)
}

export async function listInitiativesByLifeArea(
  lifeAreaId: string,
  filters: PlanningObjectFilters<InitiativeStatus> = {},
): Promise<Initiative[]> {
  return listInitiativesByLink({ type: 'lifeArea', id: lifeAreaId }, filters)
}

export async function listInitiativesByLink(
  link: InitiativeLinkRef,
  filters: PlanningObjectFilters<InitiativeStatus> = {},
): Promise<Initiative[]> {
  const initiatives = await initiativeDexieRepository.listAll()

  return initiatives.filter((initiative) => {
    if (
      !matchesIsActiveFilter(initiative, filters) ||
      !matchesStatusFilter(initiative, filters)
    ) {
      return false
    }

    switch (link.type) {
      case 'goal':
        return initiative.goalId === link.id
      case 'priority':
        return initiative.priorityIds.includes(link.id)
      case 'lifeArea':
        return initiative.lifeAreaIds.includes(link.id)
    }
  })
}
