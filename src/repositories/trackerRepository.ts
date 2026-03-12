import type { CreateTrackerPayload, Tracker, UpdateTrackerPayload } from '@/domain/planning'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface TrackerRepository
  extends PlanningObjectRepository<Tracker, CreateTrackerPayload, UpdateTrackerPayload> {}
