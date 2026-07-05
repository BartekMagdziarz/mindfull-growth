import type {
  CreateExercisePlanItemPayload,
  ExercisePlanItem,
  UpdateExercisePlanItemPayload,
} from '@/domain/exercisePlan'

export interface ExercisePlanRepository {
  getById(id: string): Promise<ExercisePlanItem | undefined>
  listAll(): Promise<ExercisePlanItem[]>
  listPendingBySlug(slug: string): Promise<ExercisePlanItem[]>
  create(payload: CreateExercisePlanItemPayload): Promise<ExercisePlanItem>
  update(id: string, patch: UpdateExercisePlanItemPayload): Promise<ExercisePlanItem>
  delete(id: string): Promise<void>
}
