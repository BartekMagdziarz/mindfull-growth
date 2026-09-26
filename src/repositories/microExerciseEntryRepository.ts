import type {
  CreateMicroExerciseEntryPayload,
  MicroExerciseEntry,
  UpdateMicroExerciseEntryPayload,
} from '@/domain/microExercises'

export interface MicroExerciseEntryRepository {
  create(payload: CreateMicroExerciseEntryPayload): Promise<MicroExerciseEntry>
  getAll(): Promise<MicroExerciseEntry[]>
  getBySlug(exerciseSlug: string): Promise<MicroExerciseEntry[]>
  update(id: string, patch: UpdateMicroExerciseEntryPayload): Promise<MicroExerciseEntry>
  delete(id: string): Promise<void>
}
