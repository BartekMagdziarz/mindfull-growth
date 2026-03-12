import type { CreateHabitPayload, Habit, UpdateHabitPayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface HabitRepository
  extends PlanningObjectRepository<Habit, CreateHabitPayload, UpdateHabitPayload> {}
