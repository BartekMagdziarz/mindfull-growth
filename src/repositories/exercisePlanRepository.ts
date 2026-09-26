import type {
  CreateExercisePlanItemPayload,
  ExercisePlanItem,
  UpdateExercisePlanItemPayload,
} from '@/domain/exercisePlan'

export interface ExercisePlanRepository {
  getById(id: string): Promise<ExercisePlanItem | undefined>
  listAll(): Promise<ExercisePlanItem[]>
  listPendingBySlug(slug: string): Promise<ExercisePlanItem[]>
  /** Pending program items (steps and practices) for one enrollment (`sourceRef` = enrollment id). */
  listPendingByProgramSourceRef(sourceRef: string): Promise<ExercisePlanItem[]>
  /** All program items (any status) for one enrollment. */
  listByProgramSourceRef(sourceRef: string): Promise<ExercisePlanItem[]>
  create(payload: CreateExercisePlanItemPayload): Promise<ExercisePlanItem>
  update(id: string, patch: UpdateExercisePlanItemPayload): Promise<ExercisePlanItem>
  delete(id: string): Promise<void>
}
