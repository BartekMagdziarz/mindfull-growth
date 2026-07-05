import type {
  CreateMicroExerciseEntryPayload,
  MicroExerciseEntry,
} from '@/domain/microExercises'

export interface MicroExerciseEntryRepository {
  create(payload: CreateMicroExerciseEntryPayload): Promise<MicroExerciseEntry>
  getAll(): Promise<MicroExerciseEntry[]>
  getBySlug(exerciseSlug: string): Promise<MicroExerciseEntry[]>
  delete(id: string): Promise<void>
}
