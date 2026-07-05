import type {
  CreateExerciseCompletionPayload,
  ExerciseCompletion,
} from '@/domain/exerciseCompletion'
import type { DayRef } from '@/domain/period'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { ExerciseCompletionRepository } from './exerciseCompletionRepository'
import { toPlain } from './planningDexieRepository.shared'

class ExerciseCompletionDexieRepository implements ExerciseCompletionRepository {
  private get db() {
    return getUserDatabase()
  }

  async create(payload: CreateExerciseCompletionPayload): Promise<ExerciseCompletion> {
    try {
      // No createPlanningRecord here: completions carry an explicit
      // completedAt/dayRef pair instead of createdAt/updatedAt stamps.
      const completion: ExerciseCompletion = {
        id: crypto.randomUUID(),
        ...payload,
      }
      await this.db.exerciseCompletions.add(toPlain(completion))
      return completion
    } catch (error) {
      console.error('Failed to create exercise completion:', error)
      throw new Error('Failed to create exercise completion in database')
    }
  }

  async listAll(): Promise<ExerciseCompletion[]> {
    try {
      return await this.db.exerciseCompletions.toArray()
    } catch (error) {
      console.error('Failed to list exercise completions:', error)
      throw new Error('Failed to retrieve exercise completions from database')
    }
  }

  async listByDayRef(dayRef: DayRef): Promise<ExerciseCompletion[]> {
    try {
      return await this.db.exerciseCompletions.where('dayRef').equals(dayRef).toArray()
    } catch (error) {
      console.error(`Failed to list exercise completions for day ${dayRef}:`, error)
      throw new Error(`Failed to retrieve exercise completions for day ${dayRef}`)
    }
  }
}

export const exerciseCompletionDexieRepository = new ExerciseCompletionDexieRepository()
