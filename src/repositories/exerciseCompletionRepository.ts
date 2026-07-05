import type {
  CreateExerciseCompletionPayload,
  ExerciseCompletion,
} from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'

export interface ExerciseCompletionRepository {
  create(payload: CreateExerciseCompletionPayload): Promise<ExerciseCompletion>
  listAll(): Promise<ExerciseCompletion[]>
  listByDayRef(dayRef: DayRef): Promise<ExerciseCompletion[]>
}
