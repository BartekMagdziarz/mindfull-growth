import { userDatabaseOperation } from './userDatabaseOperation'
import { pendingProgramPlanKey } from '@/domain/exercisePlan'
import type {
  CreateExercisePlanItemPayload,
  ExercisePlanItem,
  UpdateExercisePlanItemPayload,
} from '@/domain/exercisePlan'
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
  async getById(id: string): Promise<ExercisePlanItem | undefined> {
    return userDatabaseOperation('r', ['exercisePlanItems'], async db => {
      try {
        return await db.exercisePlanItems.get(id)
      } catch (error) {
        console.error(`Failed to get exercise plan item with id ${id}:`, error)
        throw new Error(`Failed to retrieve exercise plan item with id ${id}`)
      }
    })
  }

  async listAll(): Promise<ExercisePlanItem[]> {
    return userDatabaseOperation('r', ['exercisePlanItems'], async db => {
      try {
        return await db.exercisePlanItems.toArray()
      } catch (error) {
        console.error('Failed to list exercise plan items:', error)
        throw new Error('Failed to retrieve exercise plan items from database')
      }
    })
  }

  async listPendingBySlug(slug: string): Promise<ExercisePlanItem[]> {
    return userDatabaseOperation('r', ['exercisePlanItems'], async db => {
      try {
        return await db.exercisePlanItems
          .where('exerciseSlug')
          .equals(slug)
          .filter(item => item.status === 'pending')
          .toArray()
      } catch (error) {
        console.error(`Failed to list pending exercise plans for ${slug}:`, error)
        throw new Error(`Failed to retrieve pending exercise plans for ${slug}`)
      }
    })
  }

  async listPendingByProgramSourceRef(sourceRef: string): Promise<ExercisePlanItem[]> {
    return userDatabaseOperation('r', ['exercisePlanItems'], async db => {
      try {
        return await db.exercisePlanItems
          .where('source')
          .equals('program')
          .filter(item => item.sourceRef === sourceRef && item.status === 'pending')
          .toArray()
      } catch (error) {
        console.error(`Failed to list pending program plans for ${sourceRef}:`, error)
        throw new Error(`Failed to retrieve pending program plans for ${sourceRef}`)
      }
    })
  }

  /** Every item (any status) of one program enrollment — practice history lookups. */
  async listByProgramSourceRef(sourceRef: string): Promise<ExercisePlanItem[]> {
    return userDatabaseOperation('r', ['exercisePlanItems'], async db => {
      try {
        return await db.exercisePlanItems
          .where('source')
          .equals('program')
          .filter(item => item.sourceRef === sourceRef)
          .toArray()
      } catch (error) {
        console.error(`Failed to list program plans for ${sourceRef}:`, error)
        throw new Error(`Failed to retrieve program plans for ${sourceRef}`)
      }
    })
  }

  async create(payload: CreateExercisePlanItemPayload): Promise<ExercisePlanItem> {
    return userDatabaseOperation('rw', ['exercisePlanItems'], async db => {
      try {
        const item = createPlanningRecord<ExercisePlanItem>({
          ...payload,
          status: 'pending',
        })
        item.pendingProgramKey = pendingProgramPlanKey(item)
        await db.exercisePlanItems.add(toPlain(item))
        return item
      } catch (error) {
        console.error('Failed to create exercise plan item:', error)
        throw new Error('Failed to create exercise plan item in database')
      }
    })
  }

  async update(id: string, patch: UpdateExercisePlanItemPayload): Promise<ExercisePlanItem> {
    return userDatabaseOperation('rw', ['exercisePlanItems'], async db => {
      try {
        const existing = requireRecord(
          await db.exercisePlanItems.get(id),
          `Exercise plan item with id ${id} not found`
        )
        const updated = updatePlanningRecord(existing, { ...existing, ...patch })
        updated.pendingProgramKey = pendingProgramPlanKey(updated)
        await db.exercisePlanItems.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update exercise plan item with id ${id}:`, error)
        throw new Error(`Failed to update exercise plan item with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['exercisePlanItems'], async db => {
      try {
        await db.exercisePlanItems.delete(id)
      } catch (error) {
        console.error(`Failed to delete exercise plan item with id ${id}:`, error)
        throw new Error(`Failed to delete exercise plan item with id ${id}`)
      }
    })
  }
}

export const exercisePlanDexieRepository = new ExercisePlanDexieRepository()
