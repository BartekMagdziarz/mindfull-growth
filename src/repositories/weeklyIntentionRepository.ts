import type {
  CreateWeeklyIntentionPayload,
  UpdateWeeklyIntentionPayload,
  WeeklyIntention,
} from '@/domain/planning'
import type { WeekRef } from '@/domain/period'
import type { PlanningObjectRepository } from './planningObjectRepository'

export interface WeeklyIntentionRepository
  extends PlanningObjectRepository<
    WeeklyIntention,
    CreateWeeklyIntentionPayload,
    UpdateWeeklyIntentionPayload
  > {
  listByWeek(weekRef: WeekRef): Promise<WeeklyIntention[]>
}
