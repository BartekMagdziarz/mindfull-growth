import type { CreateGoalPayload, Goal, UpdateGoalPayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface GoalRepository
  extends PlanningObjectRepository<Goal, CreateGoalPayload, UpdateGoalPayload> {}
