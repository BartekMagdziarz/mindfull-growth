import type {
  CreateExercisePlanItemPayload,
  ExercisePlanItem,
  UpdateExercisePlanItemPayload,
} from '@/domain/exercisePlan'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { ExercisePlanRepository } from './exercisePlanRepository'
import {
  createPlanningRecord,
  requireRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

/**
 * Deliberately does NOT call `invalidatePlanningQueryCache()`: plan
 * items are not part of the Zone B planning pipeline (design D5) —
 * their only reactive consumer is `exercisePlan.store`, which patches
 * its own cache on every write.
 */
class ExercisePlanDexieRepository implements ExercisePlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<ExercisePlanItem | undefined> {
    try {
      return await this.db.exercisePlanItems.get(id)
    } catch (error) {
      console.error(`Failed to get exercise plan item with id ${id}:`, error)
      throw new Error(`Failed to retrieve exercise plan item with id ${id}`)
    }
  }

  async listAll(): Promise<ExercisePlanItem[]> {
    try {
      return await this.db.exercisePlanItems.toArray()
    } catch (error) {
      console.error('Failed to list exercise plan items:', error)
      throw new Error('Failed to retrieve exercise plan items from database')
    }
  }

  async listPendingBySlug(slug: string): Promise<ExercisePlanItem[]> {
    try {
      return await this.db.exercisePlanItems
        .where('exerciseSlug')
        .equals(slug)
        .filter((item) => item.status === 'pending')
        .toArray()
    } catch (error) {
      console.error(`Failed to list pending exercise plans for ${slug}:`, error)
      throw new Error(`Failed to retrieve pending exercise plans for ${slug}`)
    }
  }

  async listPendingByProgramSourceRef(sourceRef: string): Promise<ExercisePlanItem[]> {
    try {
      return await this.db.exercisePlanItems
        .where('source')
        .equals('program')
        .filter((item) => item.sourceRef === sourceRef && item.status === 'pending')
        .toArray()
    } catch (error) {
      console.error(`Failed to list pending program plans for ${sourceRef}:`, error)
      throw new Error(`Failed to retrieve pending program plans for ${sourceRef}`)
    }
  }

  async create(payload: CreateExercisePlanItemPayload): Promise<ExercisePlanItem> {
    try {
      const item = createPlanningRecord<ExercisePlanItem>({
        ...payload,
        status: 'pending',
      })
      await this.db.exercisePlanItems.add(toPlain(item))
      return item
    } catch (error) {
      console.error('Failed to create exercise plan item:', error)
      throw new Error('Failed to create exercise plan item in database')
    }
  }

  async update(id: string, patch: UpdateExercisePlanItemPayload): Promise<ExercisePlanItem> {
    try {
      const existing = requireRecord(
        await this.db.exercisePlanItems.get(id),
        `Exercise plan item with id ${id} not found`,
      )
      const updated = updatePlanningRecord(existing, { ...existing, ...patch })
      await this.db.exercisePlanItems.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update exercise plan item with id ${id}:`, error)
      throw new Error(`Failed to update exercise plan item with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.exercisePlanItems.delete(id)
    } catch (error) {
      console.error(`Failed to delete exercise plan item with id ${id}:`, error)
      throw new Error(`Failed to delete exercise plan item with id ${id}`)
    }
  }
}

export const exercisePlanDexieRepository = new ExercisePlanDexieRepository()
