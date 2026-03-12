import type { CreateKeyResultPayload, KeyResult, UpdateKeyResultPayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface KeyResultRepository
  extends PlanningObjectRepository<KeyResult, CreateKeyResultPayload, UpdateKeyResultPayload> {}
