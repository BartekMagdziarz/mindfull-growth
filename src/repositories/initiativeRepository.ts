import type { CreateInitiativePayload, Initiative, UpdateInitiativePayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface InitiativeRepository
  extends PlanningObjectRepository<Initiative, CreateInitiativePayload, UpdateInitiativePayload> {}
