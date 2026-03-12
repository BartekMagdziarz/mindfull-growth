import type { CreatePriorityPayload, Priority, UpdatePriorityPayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface PriorityRepository
  extends PlanningObjectRepository<Priority, CreatePriorityPayload, UpdatePriorityPayload> {}
